import { Request, Response } from 'express';
import { z } from 'zod';
import { Progress } from '../models/Progress';
import { Enrollment } from '../models/Enrollment';
import { formatThumbnailUrl } from './course.controller';

const updateProgressSchema = z.object({
  lessonId: z.string().min(1),
  courseId: z.string().min(1),
  watchedSeconds: z.number().min(0),
  duration: z.number().min(0),
  completed: z.boolean().optional(),
});

export async function updateProgress(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId, courseId, watchedSeconds, duration, completed } = updateProgressSchema.parse(req.body);

    // Verify enrollment
    const enrollment = await Enrollment.findOne({ userId: req.user!.id, courseId, paymentStatus: 'paid' });
    if (!enrollment) {
      res.status(403).json({ success: false, message: 'Not enrolled in this course' });
      return;
    }

    const isCompleted = completed ?? (duration > 0 && watchedSeconds / duration >= 0.9);

    const progress = await Progress.findOneAndUpdate(
      { userId: req.user!.id, lessonId },
      { courseId, watchedSeconds, duration, completed: isCompleted, lastWatchedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true, progress });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getCourseProgress(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    const progressList = await Progress.find({ userId: req.user!.id, courseId });
    const completedCount = progressList.filter((p) => p.completed).length;
    res.json({ success: true, progress: progressList, completedCount });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getRecentProgress(req: Request, res: Response): Promise<void> {
  try {
    const recent = await Progress.find({ userId: req.user!.id })
      .sort({ lastWatchedAt: -1 })
      .limit(5)
      .populate('lessonId', 'title duration courseId')
      .populate('courseId', 'title slug thumbnail');
    
    const formattedRecent = recent.map((item) => {
      const doc = item.toObject();
      if (doc.courseId && typeof doc.courseId === 'object' && (doc.courseId as any).thumbnail) {
        (doc.courseId as any).thumbnail = formatThumbnailUrl((doc.courseId as any).thumbnail, req);
      }
      return doc;
    });
    
    res.json({ success: true, recent: formattedRecent });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
