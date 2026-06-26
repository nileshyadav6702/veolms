import { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Review } from '../models/Review';
import { Enrollment } from '../models/Enrollment';
import { Course } from '../models/Course';

const reviewSchema = z.object({
  courseId: z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: 'Invalid Course ID',
  }),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
});

export async function createOrUpdateReview(req: Request, res: Response): Promise<void> {
  try {
    const data = reviewSchema.parse(req.body);
    const userId = req.user!.id;

    // 1. Check if course exists
    const course = await Course.findById(data.courseId);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    // 2. Security Check: Verify user has purchased this course
    const enrollment = await Enrollment.findOne({
      userId,
      courseId: data.courseId,
      paymentStatus: 'paid',
    });

    if (!enrollment) {
      res.status(403).json({
        success: false,
        message: 'Access Denied: You can only review courses you have purchased.',
      });
      return;
    }

    // 3. Create or update the review
    const review = await Review.findOneAndUpdate(
      { userId, courseId: data.courseId },
      { rating: data.rating, comment: data.comment },
      { upsert: true, new: true, runValidators: true }
    ).populate('userId', 'name');

    res.status(200).json({
      success: true,
      message: 'Review submitted successfully',
      review,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: err.flatten().fieldErrors,
      });
      return;
    }
    console.error('Error creating review:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function listReviews(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.query;
    const query: Record<string, any> = {};

    if (courseId && typeof courseId === 'string' && Types.ObjectId.isValid(courseId)) {
      query.courseId = courseId;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('userId', 'name')
        .populate('courseId', 'title slug thumbnail')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(query),
    ]);

    res.json({
      success: true,
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Error listing reviews:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteReview(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid Review ID' });
      return;
    }

    const review = await Review.findById(id);
    if (!review) {
      res.status(404).json({ success: false, message: 'Review not found' });
      return;
    }

    // Allow deleting if user is the reviewer OR user is an admin
    if (review.userId.toString() !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Unauthorized action' });
      return;
    }

    await Review.findByIdAndDelete(id);
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function checkCanReview(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    if (!Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ success: false, message: 'Invalid Course ID' });
      return;
    }

    const enrollment = await Enrollment.findOne({
      userId: req.user!.id,
      courseId,
      paymentStatus: 'paid',
    });

    if (!enrollment) {
      res.json({ success: true, canReview: false, reason: 'not_purchased' });
      return;
    }

    const existingReview = await Review.findOne({
      userId: req.user!.id,
      courseId,
    });

    res.json({
      success: true,
      canReview: true,
      hasReviewed: !!existingReview,
      review: existingReview,
    });
  } catch (err) {
    console.error('Error checking review permission:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
