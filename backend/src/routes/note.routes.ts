import { Router } from 'express';
import { saveNote, getNoteForLesson, getNotesForCourse, getAllNotes } from '../controllers/note.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/', authenticate, saveNote);
router.get('/all', authenticate, getAllNotes);
router.get('/lesson/:lessonId', authenticate, getNoteForLesson);
router.get('/course/:courseId', authenticate, getNotesForCourse);

export default router;
