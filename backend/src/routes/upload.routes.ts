import { Router } from 'express';
import { getThumbnailUploadUrl, getVideoUploadUrl, triggerTranscode, updateLessonVideoKey } from '../controllers/upload.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.post('/thumbnail', authenticate, authorize('admin'), getThumbnailUploadUrl);
router.post('/video', authenticate, authorize('admin'), getVideoUploadUrl);
router.post('/transcode/:lessonId', authenticate, authorize('admin'), triggerTranscode);
router.post('/transcode-callback', updateLessonVideoKey); // called by Worker, secret-verified

export default router;
