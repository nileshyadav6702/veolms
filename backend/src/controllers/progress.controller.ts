import { Request, Response } from 'express';
import { z } from 'zod';
import { Progress } from '../models/Progress';
import { Enrollment } from '../models/Enrollment';
import { formatThumbnailUrl } from './course.controller';
import mongoose from 'mongoose';

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
      .limit(3)
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

export async function getStudyStreak(req: Request, res: Response): Promise<void> {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);

    // Build a 365-day window ending today (UTC midnight)
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    const yearAgo = new Date(today);
    yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
    yearAgo.setUTCHours(0, 0, 0, 0);

    const results = await Progress.aggregate([
      {
        $match: {
          userId,
          lastWatchedAt: { $gte: yearAgo, $lte: today },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$lastWatchedAt' },
            month: { $month: '$lastWatchedAt' },
            day: { $dayOfMonth: '$lastWatchedAt' },
          },
          totalSeconds: { $sum: '$watchedSeconds' },
          lessonsWatched: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const streakData = results.map((r) => ({
      date: `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`,
      minutes: Math.round(r.totalSeconds / 60),
      lessonsWatched: r.lessonsWatched,
    }));

    // Calculate current streak (consecutive days with activity ending today/yesterday)
    const dateSet = new Set(streakData.map((d) => d.date));
    let currentStreak = 0;
    const todayCursor = new Date();
    todayCursor.setUTCHours(12, 0, 0, 0);
    const todayStr = todayCursor.toISOString().slice(0, 10);
    const yesterdayCursor = new Date(todayCursor);
    yesterdayCursor.setUTCDate(yesterdayCursor.getUTCDate() - 1);
    const yesterdayStr = yesterdayCursor.toISOString().slice(0, 10);

    if (dateSet.has(todayStr) || dateSet.has(yesterdayStr)) {
      const startDay = dateSet.has(todayStr) ? new Date(todayCursor) : new Date(yesterdayCursor);
      let check = new Date(startDay);
      while (true) {
        const ds = check.toISOString().slice(0, 10);
        if (dateSet.has(ds)) {
          currentStreak++;
          check.setUTCDate(check.getUTCDate() - 1);
        } else {
          break;
        }
      }
    }

    // Longest streak
    let longest = 0;
    let running = 0;
    const allDays = streakData.map((d) => d.date);
    for (let i = 0; i < allDays.length; i++) {
      if (i === 0) {
        running = 1;
      } else {
        const prev = new Date(allDays[i - 1] + 'T12:00:00Z');
        const curr = new Date(allDays[i] + 'T12:00:00Z');
        const diff = (curr.getTime() - prev.getTime()) / 86400000;
        running = diff === 1 ? running + 1 : 1;
      }
      if (running > longest) longest = running;
    }

    res.json({
      success: true,
      streak: streakData,
      currentStreak,
      longestStreak: longest,
      totalMinutes: streakData.reduce((a, d) => a + d.minutes, 0),
      activeDays: streakData.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
