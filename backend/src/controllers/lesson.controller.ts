import { Request, Response } from 'express';
import { z } from 'zod';
import { Lesson } from '../models/Lesson';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';
import { getPresignedGetUrl, deleteObject } from '../services/r2.service';

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

    if (lesson.status !== 'ready') {
      res.status(422).json({ success: false, message: 'Video is still processing. Try again later.' });
      return;
    }

    const key = lesson.hlsKey || lesson.videoKey;
    // Short-lived URL: 2 hours for video streaming
    const url = await getPresignedGetUrl(key, 7200);
    res.json({ success: true, url, isHls: !!lesson.hlsKey });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
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
    const lesson = await Lesson.create(data);
    // Update course totalLessons
    await Course.findByIdAndUpdate(data.courseId, { $inc: { totalLessons: 1 } });
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

    // If new videoKey is supplied and differs from the old one, clean up R2 objects
    if (data.videoKey && data.videoKey !== oldLesson.videoKey) {
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

    const lesson = await Lesson.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
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
