import { Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import { Lesson } from '../models/Lesson';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';
import { getPresignedGetUrl, deleteObject, getObjectStream } from '../services/r2.service';


const lessonSchema = z.object({
  courseId: z.string().min(1),
  sectionId: z.string().min(1),
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  videoKey: z.string().min(1),
  hlsKey: z.string().optional(),
  duration: z.number().min(0).default(0),
  order: z.number().min(0),
  isPreview: z.boolean().default(false),
  status: z.enum(['processing', 'ready', 'error']).optional(),
});

export async function getLessonsForCourse(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    const lessons = await Lesson.find({ courseId }).sort({ order: 1 });

    // Check enrollment if user is authenticated
    let isEnrolled = false;
    if (req.user) {
      const enrollment = await Enrollment.findOne({ userId: req.user.id, courseId, paymentStatus: 'paid' });
      isEnrolled = !!enrollment || req.user.role === 'admin';
    }

    const filtered = lessons.map((lesson) => {
      const obj = lesson.toObject() as unknown as Record<string, unknown>;
      if (!isEnrolled && !lesson.isPreview) {
        // Strip video access for non-enrolled, non-preview lessons
        delete obj.videoKey;
        delete obj.hlsKey;
      }
      return obj;
    });

    res.json({ success: true, lessons: filtered });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getLessonStreamUrl(req: Request, res: Response): Promise<void> {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }

    // Preview lessons are accessible to all authenticated users
    if (!lesson.isPreview) {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      if (req.user.role !== 'admin') {
        const enrollment = await Enrollment.findOne({
          userId: req.user.id,
          courseId: lesson.courseId,
          paymentStatus: 'paid',
        });
        if (!enrollment) {
          res.status(403).json({ success: false, message: 'Not enrolled in this course' });
          return;
        }
      }
    }

    if (lesson.status !== 'ready' && !lesson.videoKey) {
      res.status(422).json({ success: false, message: 'Video is still processing. Try again later.' });
      return;
    }

    // Extract current token from request to construct the proxy HLS URL
    const authHeader = req.headers.authorization;
    let token = '';
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (typeof req.query.token === 'string') {
      token = req.query.token;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const subtitles = lesson.subtitles?.map(s => ({
      lang: s.lang,
      label: s.label,
      url: `${baseUrl}/api/lessons/${lesson._id}/subtitles/${s.lang}?token=${token}`
    })) || [];

    if (lesson.hlsKey) {
      // If HLS playlist is ready, route requests through our server proxy to handle relative TS segment resolution securely
      const url = `${baseUrl}/api/lessons/${lesson._id}/hls/${token}/master.m3u8`;
      res.json({ success: true, url, isHls: true, subtitles });
      return;
    }

    if (!lesson.videoKey) {
      res.status(422).json({ success: false, message: 'No video file available for streaming.' });
      return;
    }

    // Fallback to direct presigned URL for raw mp4 video
    const url = await getPresignedGetUrl(lesson.videoKey, 7200);
    res.json({ success: true, url, isHls: false, subtitles });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getLessonHlsFile(req: Request, res: Response): Promise<void> {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }

    // Preview lessons are accessible to all authenticated users
    if (!lesson.isPreview) {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      if (req.user.role !== 'admin') {
        const enrollment = await Enrollment.findOne({
          userId: req.user.id,
          courseId: lesson.courseId,
          paymentStatus: 'paid',
        });
        if (!enrollment) {
          res.status(403).json({ success: false, message: 'Not enrolled in this course' });
          return;
        }
      }
    }

    if (!lesson.hlsKey) {
      res.status(404).json({ success: false, message: 'HLS stream not found' });
      return;
    }

    let relativePath = req.params[0]; // Captured by Express wildcard router ('*')
    if (!relativePath) {
      res.status(400).json({ success: false, message: 'Filename is required' });
      return;
    }

    // Split the relative path and check if the first segment is an embedded token
    const segments = relativePath.split('/');
    const firstSegment = segments[0];
    const isToken = !firstSegment.endsWith('.m3u8') && 
                    !firstSegment.endsWith('.ts') && 
                    !firstSegment.endsWith('.vtt') && 
                    !firstSegment.startsWith('stream_');

    if (isToken) {
      relativePath = segments.slice(1).join('/');
    }

    // Resolve target R2 key dynamically
    const baseDir = path.dirname(lesson.hlsKey);
    const r2Key = path.posix.join(baseDir, relativePath);

    const { stream, contentType, contentLength } = await getObjectStream(r2Key);

    // Set correct Content-Type for HLS formats
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    } else {
      if (relativePath.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/x-mpegURL');
      } else if (relativePath.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/MP2T');
      }
    }

    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Setup cache control: Cache chunks (.ts) heavily, do not cache index playlist (.m3u8)
    if (relativePath.endsWith('.ts')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    // Handle client connection termination (e.g., seeking/pausing) to clean up R2 streams
    res.on('close', () => {
      if (stream && !stream.destroyed) {
        stream.destroy();
      }
    });

    stream.pipe(res);
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      res.status(404).json({ success: false, message: 'File not found in storage' });
    } else {
      console.error('Error fetching HLS file:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve streaming file' });
    }
  }
}


async function triggerTranscodeWorker(lessonId: string, videoKey: string): Promise<void> {
  const workerUrl = process.env.TRANSCODE_WORKER_URL;
  if (workerUrl && videoKey && videoKey !== 'videos/raw/temp-video.mp4') {
    console.log(`[Transcode Trigger] Notifying worker at ${workerUrl} for lesson ${lessonId}`);
    fetch(workerUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'X-Worker-Secret': process.env.WORKER_SECRET || '' 
      },
      body: JSON.stringify({ lessonId, videoKey }),
    }).catch((err) => {
      console.error('[Transcode Trigger] Worker notification failed:', err);
    });
  } else {
    console.log('[Transcode Trigger] Skipping transcode trigger. Worker URL not configured or placeholder video key.');
  }
}

export async function createLesson(req: Request, res: Response): Promise<void> {
  try {
    const data = lessonSchema.parse(req.body);
    const course = await Course.findById(data.courseId);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    
    // Default to processing if we have a real video
    if (data.videoKey && data.videoKey !== 'videos/raw/temp-video.mp4') {
      data.status = 'processing';
    }

    const lesson = await Lesson.create(data);
    
    // Update course totalLessons
    await Course.findByIdAndUpdate(data.courseId, { $inc: { totalLessons: 1 } });

    // Automatically trigger transcode in the background
    if (lesson.videoKey && lesson.videoKey !== 'videos/raw/temp-video.mp4') {
      triggerTranscodeWorker(lesson._id.toString(), lesson.videoKey);
    }

    res.status(201).json({ success: true, lesson });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateLesson(req: Request, res: Response): Promise<void> {
  try {
    const data = lessonSchema.partial().parse(req.body);
    const oldLesson = await Lesson.findById(req.params.id);
    if (!oldLesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }

    let needsTranscode = false;
    // If new videoKey is supplied and differs from the old one, clean up R2 objects
    if (data.videoKey && data.videoKey !== oldLesson.videoKey) {
      needsTranscode = true;
      if (oldLesson.videoKey && oldLesson.videoKey !== 'videos/raw/temp-video.mp4') {
        try {
          await deleteObject(oldLesson.videoKey);
        } catch (err) {
          console.error('Failed to delete old videoKey from R2:', err);
        }
      }
      if (oldLesson.hlsKey) {
        try {
          await deleteObject(oldLesson.hlsKey);
        } catch (err) {
          console.error('Failed to delete old hlsKey from R2:', err);
        }
      }
    }

    // Force status to processing and clear old hlsKey if video changed
    if (needsTranscode) {
      data.status = 'processing';
      data.hlsKey = '';
    }

    const lesson = await Lesson.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    
    // Automatically trigger transcode in the background
    if (needsTranscode && lesson && lesson.videoKey && lesson.videoKey !== 'videos/raw/temp-video.mp4') {
      triggerTranscodeWorker(lesson._id.toString(), lesson.videoKey);
    }

    res.json({ success: true, lesson });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteLesson(req: Request, res: Response): Promise<void> {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }

    // Clean up R2 video file
    if (lesson.videoKey && lesson.videoKey !== 'videos/raw/temp-video.mp4') {
      try {
        await deleteObject(lesson.videoKey);
      } catch (err) {
        console.error('Failed to delete videoKey from R2:', err);
      }
    }
    if (lesson.hlsKey) {
      try {
        await deleteObject(lesson.hlsKey);
      } catch (err) {
        console.error('Failed to delete hlsKey from R2:', err);
      }
    }

    await Lesson.findByIdAndDelete(req.params.id);
    await Course.findByIdAndUpdate(lesson.courseId, { $inc: { totalLessons: -1 } });
    res.json({ success: true, message: 'Lesson deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getLessonSubtitle(req: Request, res: Response): Promise<void> {
  try {
    const { id, lang } = req.params;
    const lesson = await Lesson.findById(id);
    if (!lesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }

    // Preview lessons are accessible to all authenticated users
    if (!lesson.isPreview) {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      if (req.user.role !== 'admin') {
        const enrollment = await Enrollment.findOne({
          userId: req.user.id,
          courseId: lesson.courseId,
          paymentStatus: 'paid',
        });
        if (!enrollment) {
          res.status(403).json({ success: false, message: 'Not enrolled in this course' });
          return;
        }
      }
    }

    const subtitle = lesson.subtitles?.find((s) => s.lang === lang);
    if (!subtitle || !subtitle.vttKey) {
      res.status(404).json({ success: false, message: 'Subtitles not found for this language' });
      return;
    }

    const { stream, contentLength } = await getObjectStream(subtitle.vttKey);
    res.setHeader('Content-Type', 'text/vtt');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    stream.pipe(res);
  } catch {
    res.status(500).json({ success: false, message: 'Server error retrieving subtitles' });
  }
}
