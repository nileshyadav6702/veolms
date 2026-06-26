import { Request, Response } from 'express';
import { z } from 'zod';
import { Note } from '../models/Note';
import { Enrollment } from '../models/Enrollment';

const saveNoteSchema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().min(1),
  content: z.string(),
});

export async function saveNote(req: Request, res: Response): Promise<void> {
  try {
    const { courseId, lessonId, content } = saveNoteSchema.parse(req.body);

    // Verify enrollment
    const enrollment = await Enrollment.findOne({ userId: req.user!.id, courseId, paymentStatus: 'paid' });
    if (!enrollment) {
      res.status(403).json({ success: false, message: 'Not enrolled in this course' });
      return;
    }

    const note = await Note.findOneAndUpdate(
      { userId: req.user!.id, lessonId },
      { courseId, content },
      { upsert: true, new: true }
    );

    res.json({ success: true, note });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getNoteForLesson(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId } = req.params;
    const note = await Note.findOne({ userId: req.user!.id, lessonId });
    res.json({ success: true, note });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getNotesForCourse(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    const notes = await Note.find({ userId: req.user!.id, courseId })
      .populate('lessonId', 'title order sectionId')
      .sort({ updatedAt: -1 });
    res.json({ success: true, notes });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getAllNotes(req: Request, res: Response): Promise<void> {
  try {
    const notes = await Note.find({ userId: req.user!.id })
      .populate('lessonId', 'title order courseId')
      .populate('courseId', 'title slug')
      .sort({ updatedAt: -1 });
    res.json({ success: true, notes });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
