import { Request, Response } from 'express';
import { User } from '../models/User';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';
import { Session } from '../models/Session';
import { Progress } from '../models/Progress';
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

    const studentsWithSessions = await Promise.all(
      students.map(async (student) => {
        const sessionCount = await Session.countDocuments({ userId: student._id });
        return {
          ...student.toObject(),
          sessionCount,
        };
      })
    );

    res.json({ success: true, students: studentsWithSessions, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getStudentDetail(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const student = await User.findOne({ _id: id, role: 'student' }).select('-passwordHash');
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const sessions = await Session.find({ userId: student._id }).sort({ lastActive: -1 });

    const enrollments = await Enrollment.find({ userId: student._id })
      .populate('courseId', 'title description price thumbnail')
      .sort({ enrolledAt: -1 });

    const allCourses = await Course.find().select('title price thumbnail description');

    const formattedEnrollments = enrollments.map(e => {
      const doc = e.toObject() as any;
      if (doc.courseId) {
        doc.courseId.thumbnail = formatThumbnailUrl(doc.courseId.thumbnail, req);
      }
      return doc;
    });

    const formattedAllCourses = allCourses.map(c => {
      const doc = c.toObject();
      doc.thumbnail = formatThumbnailUrl(doc.thumbnail, req);
      return doc;
    });

    res.json({
      success: true,
      student,
      sessions,
      enrollments: formattedEnrollments,
      allCourses: formattedAllCourses
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function grantCourseAccess(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { courseId } = req.body;

    const student = await User.findOne({ _id: id, role: 'student' });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    let enrollment = await Enrollment.findOne({ userId: student._id, courseId: course._id });
    if (enrollment) {
      enrollment.paymentStatus = 'paid';
      enrollment.enrolledAt = new Date();
      await enrollment.save();
    } else {
      enrollment = await Enrollment.create({
        userId: student._id,
        courseId: course._id,
        paymentStatus: 'paid',
        enrolledAt: new Date()
      });
    }

    res.json({ success: true, message: 'Access granted successfully', enrollment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function revokeCourseAccess(req: Request, res: Response): Promise<void> {
  try {
    const { id, courseId } = req.params;

    const student = await User.findOne({ _id: id, role: 'student' });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const result = await Enrollment.deleteOne({ userId: student._id, courseId });
    await Progress.deleteMany({ userId: student._id, courseId });

    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'Enrollment not found' });
      return;
    }

    res.json({ success: true, message: 'Access revoked successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteStudent(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const student = await User.findOne({ _id: id, role: 'student' });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    await Promise.all([
      User.deleteOne({ _id: student._id }),
      Enrollment.deleteMany({ userId: student._id }),
      Progress.deleteMany({ userId: student._id }),
      Session.deleteMany({ userId: student._id })
    ]);

    res.json({ success: true, message: 'Student deleted permanently from system' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function revokeStudentSession(req: Request, res: Response): Promise<void> {
  try {
    const { id, sessionId } = req.params;

    const student = await User.findOne({ _id: id, role: 'student' });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const session = await Session.findOneAndDelete({ _id: sessionId, userId: student._id });
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getAllEnrollments(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const query: any = { paymentStatus: 'paid' };

    if (req.query.courseId) {
      query.courseId = req.query.courseId;
    }

    if (req.query.startDate || req.query.endDate) {
      query.enrolledAt = {};
      if (req.query.startDate) {
        const start = new Date(req.query.startDate as string);
        if (!isNaN(start.getTime())) {
          query.enrolledAt.$gte = start;
        }
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate as string);
        if (!isNaN(end.getTime())) {
          query.enrolledAt.$lte = end;
        }
      }
      if (Object.keys(query.enrolledAt).length === 0) {
        delete query.enrolledAt;
      }
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      const users = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      }).select('_id');
      const userIds = users.map(u => u._id);
      query.userId = { $in: userIds };
    }

    const [enrollments, total] = await Promise.all([
      Enrollment.find(query)
        .populate('userId', 'name email')
        .populate('courseId', 'title price')
        .skip(skip)
        .limit(limit)
        .sort({ enrolledAt: -1 }),
      Enrollment.countDocuments(query),
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

