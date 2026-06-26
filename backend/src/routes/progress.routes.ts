import { Router } from 'express';
import { updateProgress, getCourseProgress, getRecentProgress, getStudyStreak } from '../controllers/progress.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/', authenticate, updateProgress);
router.get('/recent', authenticate, getRecentProgress);
router.get('/streak', authenticate, getStudyStreak);
router.get('/course/:courseId', authenticate, getCourseProgress);

export default router;
