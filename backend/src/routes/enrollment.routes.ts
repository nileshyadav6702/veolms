import { Router } from 'express';
import { getMyEnrollments, checkEnrollment } from '../controllers/enrollment.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, getMyEnrollments);
router.get('/:courseId', authenticate, checkEnrollment);

export default router;
