import { Request, Response } from 'express';
import { User } from '../models/User';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';
import { formatThumbnailUrl } from './course.controller';

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const [totalStudents, totalCourses, totalEnrollments, revenueResult, enrollments, courseEnrollmentsResult] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Course.countDocuments(),
      Enrollment.countDocuments({ paymentStatus: 'paid' }),
      Enrollment.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'course' } },
        { $unwind: '$course' },
        { $group: { _id: null, total: { $sum: '$course.price' } } },
      ]),
      Enrollment.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'course' } },
        { $unwind: '$course' },
        {
          $project: {
            date: { $ifNull: ['$enrolledAt', '$createdAt'] },
            price: '$course.price'
          }
        }
      ]),
      Enrollment.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: '$courseId', count: { $sum: 1 } } },
        { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
        { $unwind: '$course' },
        { $project: { name: '$course.title', count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    const totalRevenue = revenueResult[0]?.total ?? 0;

    const now = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data7d = last7Days.map(date => {
      const dayStart = date.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const dayEnrollments = enrollments.filter((e: any) => {
        const t = new Date(e.date).getTime();
        return t >= dayStart && t < dayEnd;
      });

      const revenue = dayEnrollments.reduce((sum: number, e: any) => sum + e.price, 0);
      const count = dayEnrollments.length;

      return { label: dayNames[date.getDay()], revenue, enrollments: count };
    });

    const data30d = Array.from({ length: 4 }).map((_, i) => {
      const endOffset = (3 - i) * 7;
      const startOffset = endOffset + 7;
      
      const start = new Date();
      start.setDate(now.getDate() - startOffset);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date();
      end.setDate(now.getDate() - endOffset);
      end.setHours(23, 59, 59, 999);

      const weekEnrollments = enrollments.filter((e: any) => {
        const t = new Date(e.date).getTime();
        return t >= start.getTime() && t <= end.getTime();
      });

      const revenue = weekEnrollments.reduce((sum: number, e: any) => sum + e.price, 0);
      return {
        label: `W${i + 1}`,
        revenue,
        enrollments: weekEnrollments.length
      };
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data12m = Array.from({ length: 12 }).map((_, i) => {
      const d = new Date();
      d.setMonth(now.getMonth() - (11 - i));
      const year = d.getFullYear();
      const month = d.getMonth();

      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const monthEnrollments = enrollments.filter((e: any) => {
        const t = new Date(e.date).getTime();
        return t >= start.getTime() && t <= end.getTime();
      });

      const revenue = monthEnrollments.reduce((sum: number, e: any) => sum + e.price, 0);
      return {
        label: monthNames[month],
        revenue,
        enrollments: monthEnrollments.length
      };
    });

    const totalEnrollmentsCount = courseEnrollmentsResult.reduce((sum: number, c: any) => sum + c.count, 0) || 1;
    const colors = ['bg-primary', 'bg-zinc-600', 'bg-zinc-400', 'bg-zinc-300', 'bg-zinc-200'];
    const courseData = courseEnrollmentsResult.map((c: any, idx: number) => ({
      name: c.name,
      count: c.count,
      percentage: Math.round((c.count / totalEnrollmentsCount) * 100),
      color: colors[idx % colors.length]
    }));

    res.json({
      success: true,
      stats: { totalStudents, totalCourses, totalEnrollments, totalRevenue },
      chartData: {
        data7d,
        data30d,
        data12m,
        courseData,
        topCourseName: courseData[0]?.name ?? 'None'
      }
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
    const formattedCourses = courses.map((course) => {
      const doc = course.toObject();
      doc.thumbnail = formatThumbnailUrl(doc.thumbnail, req);
      return doc;
    });
    res.json({ success: true, courses: formattedCourses });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

