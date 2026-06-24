import { Router } from 'express';
import { 
  getDashboard, 
  getStudents, 
  getAllEnrollments, 
  getAllCourses,
  getStudentDetail,
  grantCourseAccess,
  revokeCourseAccess,
  deleteStudent,
  revokeStudentSession
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/students', getStudents);
router.get('/students/:id', getStudentDetail);
router.post('/students/:id/courses', grantCourseAccess);
router.delete('/students/:id/courses/:courseId', revokeCourseAccess);
router.delete('/students/:id', deleteStudent);
router.delete('/students/:id/sessions/:sessionId', revokeStudentSession);
router.get('/enrollments', getAllEnrollments);
router.get('/courses', getAllCourses);

export default router;
