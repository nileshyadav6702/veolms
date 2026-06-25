import { Request, Response } from 'express';
import slugify from 'slugify';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Course } from '../models/Course';
import { Lesson } from '../models/Lesson';
import { deleteObject } from '../services/r2.service';
import { config } from '../config/env';
import { verifyToken } from '../services/jwt.service';

const courseSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().optional(),
  thumbnail: z.string().min(1),
  description: z.string().min(1),
  shortDescription: z.string().max(200),
  instructor: z.string().min(2),
  price: z.number().min(0),
  isPublished: z.boolean().optional(),
  sections: z.array(z.object({ title: z.string(), order: z.number() })).optional(),
});

export function extractR2Key(urlStr: string): string | null {
  if (!urlStr) return null;
  try {
    if (urlStr.includes('/api/upload/file')) {
      const url = new URL(urlStr);
      return url.searchParams.get('key');
    }
    if (urlStr.includes('r2.cloudflarestorage.com/')) {
      return urlStr.split('r2.cloudflarestorage.com/').slice(1).join('r2.cloudflarestorage.com/');
    }
    const url = new URL(urlStr);
    const pathname = url.pathname;
    if (pathname && pathname.length > 1) {
      return pathname.startsWith('/') ? pathname.slice(1) : pathname;
    }
  } catch {
    if (!urlStr.startsWith('http') && urlStr.includes('/')) {
      return urlStr;
    }
  }
  return null;
}

export function formatThumbnailUrl(thumbnail: string, req: Request): string {
  if (!thumbnail) return '';
  // Migrate old /api/upload/file thumbnail URLs to /api/upload/image
  if (thumbnail.includes('/api/upload/file')) {
    return thumbnail.replace('/api/upload/file', '/api/upload/image');
  }
  if (thumbnail.includes('r2.cloudflarestorage.com') || thumbnail.startsWith('thumbnails/')) {
    const key = extractR2Key(thumbnail);
    if (key) {
      const host = req.protocol + '://' + req.get('host');
      return `${host}/api/upload/image?key=${encodeURIComponent(key)}`;
    }
  }
  return thumbnail;
}


export async function listCourses(req: Request, res: Response): Promise<void> {
  try {
    const { search } = req.query as Record<string, string>;
    const query: Record<string, unknown> = { isPublished: true };
    if (search) query.title = { $regex: search, $options: 'i' };
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 12));
    const skip = (page - 1) * limit;
    const [courses, total] = await Promise.all([
      Course.find(query).select('-createdBy').skip(skip).limit(limit).sort({ createdAt: -1 }),
      Course.countDocuments(query),
    ]);
    const formattedCourses = courses.map((c) => {
      const obj = c.toObject();
      obj.thumbnail = formatThumbnailUrl(obj.thumbnail, req);
      return obj;
    });
    res.json({ success: true, courses: formattedCourses, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getCourse(req: Request, res: Response): Promise<void> {
  try {
    let isAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = verifyToken(token);
        if (payload.role === 'admin') {
          isAdmin = true;
        }
      } catch {
        // ignore
      }
    }

    const query: Record<string, any> = Types.ObjectId.isValid(req.params.slug)
      ? { _id: req.params.slug }
      : { slug: req.params.slug };

    if (!isAdmin) {
      query.isPublished = true;
    }

    const course = await Course.findOne(query);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    const lessons = await Lesson.find({ courseId: course._id }).select('title description duration order sectionId isPreview status videoKey').sort({ order: 1 });
    const obj = course.toObject();
    obj.thumbnail = formatThumbnailUrl(obj.thumbnail, req);
    res.json({ success: true, course: obj, lessons });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function createCourse(req: Request, res: Response): Promise<void> {
  try {
    const data = courseSchema.parse(req.body);
    const slug = data.slug || slugify(data.title, { lower: true, strict: true });
    const existing = await Course.findOne({ slug });
    if (existing) {
      res.status(409).json({ success: false, message: 'Slug already exists' });
      return;
    }
    const course = await Course.create({ ...data, slug, createdBy: req.user!.id });
    const obj = course.toObject();
    obj.thumbnail = formatThumbnailUrl(obj.thumbnail, req);
    res.status(201).json({ success: true, course: obj });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateCourse(req: Request, res: Response): Promise<void> {
  try {
    const data = courseSchema.partial().parse(req.body);
    const oldCourse = await Course.findById(req.params.id);
    if (!oldCourse) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    // Clean up old thumbnail from R2 if a new one is saved
    if (data.thumbnail && data.thumbnail !== oldCourse.thumbnail) {
      const oldKey = extractR2Key(oldCourse.thumbnail);
      if (oldKey) {
        try {
          await deleteObject(oldKey);
        } catch (err) {
          console.error('Failed to delete old thumbnail from R2:', err);
        }
      }
    }

    const course = await Course.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    const obj = course.toObject();
    obj.thumbnail = formatThumbnailUrl(obj.thumbnail, req);
    res.json({ success: true, course: obj });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteCourse(req: Request, res: Response): Promise<void> {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    // Clean up thumbnail
    const key = extractR2Key(course.thumbnail);
    if (key) {
      try {
        await deleteObject(key);
      } catch (err) {
        console.error('Failed to delete course thumbnail from R2:', err);
      }
    }

    // Clean up all lesson video/HLS keys of this course
    const lessons = await Lesson.find({ courseId: course._id });
    for (const lesson of lessons) {
      if (lesson.videoKey && lesson.videoKey !== 'videos/raw/temp-video.mp4') {
        try {
          await deleteObject(lesson.videoKey);
        } catch (err) {
          console.error('Failed to delete lesson videoKey from R2:', err);
        }
      }
      if (lesson.hlsKey) {
        try {
          await deleteObject(lesson.hlsKey);
        } catch (err) {
          console.error('Failed to delete lesson hlsKey from R2:', err);
        }
      }
    }

    await Course.findByIdAndDelete(req.params.id);
    await Lesson.deleteMany({ courseId: req.params.id });
    res.json({ success: true, message: 'Course deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function publishCourse(req: Request, res: Response): Promise<void> {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { isPublished: true }, { new: true });
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    const obj = course.toObject();
    obj.thumbnail = formatThumbnailUrl(obj.thumbnail, req);
    res.json({ success: true, course: obj });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

const sectionSchema = z.object({
  title: z.string().min(1).max(200),
  order: z.number().min(0),
});

export async function addSection(req: Request, res: Response): Promise<void> {
  try {
    const { title, order } = sectionSchema.parse(req.body);
    const course = await Course.findById(req.params.id);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    const section = { _id: new Types.ObjectId(), title, order };
    course.sections.push(section);
    course.sections.sort((a, b) => a.order - b.order);
    await course.save();
    const obj = course.toObject();
    obj.thumbnail = formatThumbnailUrl(obj.thumbnail, req);
    res.status(201).json({ success: true, section, course: obj });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateSection(req: Request, res: Response): Promise<void> {
  try {
    const { title, order } = sectionSchema.partial().parse(req.body);
    const course = await Course.findById(req.params.id);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    const section = course.sections.find(
      (s) => s._id.toString() === req.params.sectionId
    );
    if (!section) {
      res.status(404).json({ success: false, message: 'Section not found' });
      return;
    }
    if (title !== undefined) section.title = title;
    if (order !== undefined) section.order = order;
    course.sections.sort((a, b) => a.order - b.order);
    await course.save();
    const obj = course.toObject();
    obj.thumbnail = formatThumbnailUrl(obj.thumbnail, req);
    res.json({ success: true, section, course: obj });

  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteSection(req: Request, res: Response): Promise<void> {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    const sectionIndex = course.sections.findIndex(
      (s) => s._id.toString() === req.params.sectionId
    );
    if (sectionIndex === -1) {
      res.status(404).json({ success: false, message: 'Section not found' });
      return;
    }
    const sectionId = course.sections[sectionIndex]._id;
    // Delete all lessons in this section and get the count
    const { deletedCount } = await Lesson.deleteMany({ courseId: course._id, sectionId });
    course.sections.splice(sectionIndex, 1);
    course.totalLessons = Math.max(0, course.totalLessons - (deletedCount ?? 0));
    await course.save();
    res.json({ success: true, message: 'Section and its lessons deleted', deletedLessons: deletedCount });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
