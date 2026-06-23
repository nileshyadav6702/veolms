import { Request, Response } from 'express';
import { User } from '../models/User';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const [totalStudents, totalCourses, totalEnrollments, revenueResult] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Course.countDocuments(),
      Enrollment.countDocuments({ paymentStatus: 'paid' }),
      Enrollment.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'course' } },
        { $unwind: '$course' },
        { $group: { _id: null, total: { $sum: '$course.price' } } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.total ?? 0;

    res.json({
      success: true,
      stats: { totalStudents, totalCourses, totalEnrollments, totalRevenue },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getStudents(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const [students, total] = await Promise.all([
      User.find({ role: 'student' }).select('-passwordHash').skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments({ role: 'student' }),
    ]);
    res.json({ success: true, students, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getAllEnrollments(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const [enrollments, total] = await Promise.all([
      Enrollment.find({ paymentStatus: 'paid' })
        .populate('userId', 'name email')
        .populate('courseId', 'title price')
        .skip(skip)
        .limit(limit)
        .sort({ enrolledAt: -1 }),
      Enrollment.countDocuments({ paymentStatus: 'paid' }),
    ]);
    res.json({ success: true, enrollments, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getAllCourses(req: Request, res: Response): Promise<void> {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json({ success: true, courses });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
