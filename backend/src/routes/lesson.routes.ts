import { Router, Request, Response, NextFunction } from 'express';
import { getLessonsForCourse, getLessonStreamUrl, getLessonHlsFile, getLessonSubtitle, createLesson, updateLesson, deleteLesson } from '../controllers/lesson.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { verifyToken } from '../services/jwt.service';

const router = Router();

// Optional auth — attaches req.user if valid token present, but never blocks
function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(auth.split(' ')[1]);
      req.user = { id: payload.id, email: payload.email, role: payload.role, sessionId: payload.sessionId };
    } catch {
      // Invalid token — proceed without user
    }
  }
  next();
}

router.get('/course/:courseId', optionalAuth, getLessonsForCourse);

router.get('/:id/stream', authenticate, getLessonStreamUrl);
router.get('/:id/hls/:token/*', authenticate, getLessonHlsFile);
router.get('/:id/subtitles/:lang', optionalAuth, getLessonSubtitle);
router.post('/', authenticate, authorize('admin'), createLesson);
router.put('/:id', authenticate, authorize('admin'), updateLesson);
router.delete('/:id', authenticate, authorize('admin'), deleteLesson);

export default router;

