import { Router } from 'express';
import { listCourses, getCourse, createCourse, updateCourse, deleteCourse, publishCourse } from '../controllers/course.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.get('/', listCourses);
router.get('/:slug', getCourse);
router.post('/', authenticate, authorize('admin'), createCourse);
router.put('/:id', authenticate, authorize('admin'), updateCourse);
router.delete('/:id', authenticate, authorize('admin'), deleteCourse);
router.patch('/:id/publish', authenticate, authorize('admin'), publishCourse);

export default router;
