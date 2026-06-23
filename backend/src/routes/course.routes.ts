import { Router } from 'express';
import { listCourses, getCourse, createCourse, updateCourse, deleteCourse, publishCourse, addSection, updateSection, deleteSection } from '../controllers/course.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

// Public routes
router.get('/', listCourses);
router.get('/:slug', getCourse);

// Admin course routes
router.post('/', authenticate, authorize('admin'), createCourse);
router.put('/:id', authenticate, authorize('admin'), updateCourse);
router.delete('/:id', authenticate, authorize('admin'), deleteCourse);
router.patch('/:id/publish', authenticate, authorize('admin'), publishCourse);

// Admin section routes
router.post('/:id/sections', authenticate, authorize('admin'), addSection);
router.put('/:id/sections/:sectionId', authenticate, authorize('admin'), updateSection);
router.delete('/:id/sections/:sectionId', authenticate, authorize('admin'), deleteSection);

export default router;
