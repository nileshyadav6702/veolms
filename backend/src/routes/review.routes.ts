import { Router } from 'express';
import { createOrUpdateReview, listReviews, deleteReview, checkCanReview } from '../controllers/review.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// Public routes
router.get('/', listReviews);

// Private routes
router.post('/', authenticate, createOrUpdateReview);
router.delete('/:id', authenticate, deleteReview);
router.get('/can-review/:courseId', authenticate, checkCanReview);

export default router;
