import { Request, Response } from 'express';
import { Enrollment } from '../models/Enrollment';

export async function getMyEnrollments(req: Request, res: Response): Promise<void> {
  try {
    const enrollments = await Enrollment.find({ userId: req.user!.id, paymentStatus: 'paid' })
      .populate('courseId', 'title slug thumbnail shortDescription instructor totalLessons totalDuration')
      .sort({ enrolledAt: -1 });
    res.json({ success: true, enrollments });
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
