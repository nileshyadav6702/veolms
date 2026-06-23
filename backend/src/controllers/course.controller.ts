import { Request, Response } from 'express';
import slugify from 'slugify';
import { z } from 'zod';
import { Course } from '../models/Course';
import { Lesson } from '../models/Lesson';

const courseSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().optional(),
  thumbnail: z.string().url(),
  description: z.string().min(1),
  shortDescription: z.string().max(200),
  instructor: z.string().min(2),
  price: z.number().min(0),
  sections: z.array(z.object({ title: z.string(), order: z.number() })).optional(),
});

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
    res.json({ success: true, courses, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getCourse(req: Request, res: Response): Promise<void> {
  try {
    const course = await Course.findOne({ slug: req.params.slug, isPublished: true });
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    const lessons = await Lesson.find({ courseId: course._id }).select('title duration order sectionId isPreview status').sort({ order: 1 });
    res.json({ success: true, course, lessons });
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
    res.status(201).json({ success: true, course });
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
    const course = await Course.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    res.json({ success: true, course });
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
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
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
    res.json({ success: true, course });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
