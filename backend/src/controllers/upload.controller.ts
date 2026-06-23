import { Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { getPresignedPutUrl, getPresignedGetUrl, deleteObject } from '../services/r2.service';
import { Lesson } from '../models/Lesson';
import { config } from '../config/env';


const thumbnailSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

const videoSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.enum(['video/mp4', 'video/webm', 'video/quicktime']),
  lessonId: z.string().optional(),
});

export async function getThumbnailUploadUrl(req: Request, res: Response): Promise<void> {
  try {
    const { fileName, contentType } = thumbnailSchema.parse(req.body);
    const ext = fileName.split('.').pop();
    const key = `thumbnails/${randomUUID()}.${ext}`;
    const uploadUrl = await getPresignedPutUrl(key, contentType);
    res.json({
      success: true,
      uploadUrl,
      key,
      publicUrl: `${config.R2_PUBLIC_URL}/${key}`
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getVideoUploadUrl(req: Request, res: Response): Promise<void> {
  try {
    const { fileName, contentType } = videoSchema.parse(req.body);
    const ext = fileName.split('.').pop();
    const key = `videos/raw/${randomUUID()}.${ext}`;
    const uploadUrl = await getPresignedPutUrl(key, contentType);
    res.json({
      success: true,
      uploadUrl,
      key,
      publicUrl: `${config.R2_PUBLIC_URL}/${key}`
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function triggerTranscode(req: Request, res: Response): Promise<void> {
  try {
    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }
    await Lesson.findByIdAndUpdate(req.params.lessonId, { status: 'processing' });

    // Notify Cloudflare Worker to start FFmpeg transcoding
    // Worker URL stored in env: TRANSCODE_WORKER_URL
    const workerUrl = process.env.TRANSCODE_WORKER_URL;
    if (workerUrl) {
      fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': process.env.WORKER_SECRET || '' },
        body: JSON.stringify({ lessonId: lesson._id, videoKey: lesson.videoKey }),
      }).catch(console.error); // fire-and-forget
    }

    res.json({ success: true, message: 'Transcoding job queued', lessonId: lesson._id });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateLessonVideoKey(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId, hlsKey, status } = z.object({
      lessonId: z.string(),
      hlsKey: z.string(),
      status: z.enum(['ready', 'error']),
    }).parse(req.body);

    // This endpoint is called by the Cloudflare Worker after transcoding
    const workerSecret = req.headers['x-worker-secret'];
    if (workerSecret !== process.env.WORKER_SECRET) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    await Lesson.findByIdAndUpdate(lessonId, { hlsKey, status });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteFile(req: Request, res: Response): Promise<void> {
  try {
    const { key } = z.object({ key: z.string() }).parse(req.body);
    await deleteObject(key);
    res.json({ success: true, message: 'File deleted from R2' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getFile(req: Request, res: Response): Promise<void> {
  try {
    const { key } = req.query;
    if (!key || typeof key !== 'string') {
      res.status(400).json({ success: false, message: 'Key is required' });
      return;
    }
    const url = await getPresignedGetUrl(key, 3600);
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}


