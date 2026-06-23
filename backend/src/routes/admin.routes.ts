import { Router } from 'express';
import { getDashboard, getStudents, getAllEnrollments, getAllCourses } from '../controllers/admin.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/students', getStudents);
router.get('/enrollments', getAllEnrollments);
router.get('/courses', getAllCourses);

export default router;
