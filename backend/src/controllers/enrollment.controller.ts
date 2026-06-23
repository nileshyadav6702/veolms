import { Request, Response } from 'express';
import { Enrollment } from '../models/Enrollment';
import { formatThumbnailUrl } from './course.controller';

export async function getMyEnrollments(req: Request, res: Response): Promise<void> {
  try {
    const enrollments = await Enrollment.find({ userId: req.user!.id, paymentStatus: 'paid' })
      .populate('courseId', 'title slug thumbnail shortDescription instructor totalLessons totalDuration price')
      .sort({ enrolledAt: -1 });
    
    const formattedEnrollments = enrollments.map((enrollment) => {
      const doc = enrollment.toObject();
      if (doc.courseId && typeof doc.courseId === 'object' && (doc.courseId as any).thumbnail) {
        (doc.courseId as any).thumbnail = formatThumbnailUrl((doc.courseId as any).thumbnail, req);
      }
      return doc;
    });
    
    res.json({ success: true, enrollments: formattedEnrollments });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function checkEnrollment(req: Request, res: Response): Promise<void> {
  try {
    const enrollment = await Enrollment.findOne({
      userId: req.user!.id,
      courseId: req.params.courseId,
      paymentStatus: 'paid',
    });
    res.json({ success: true, enrolled: !!enrollment, enrollment });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
