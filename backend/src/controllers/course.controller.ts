import { Request, Response } from 'express';
import slugify from 'slugify';
import { z } from 'zod';
import { Types } from 'mongoose';
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
    res.status(201).json({ success: true, section, course });
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
    res.json({ success: true, section, course });
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
