import { Request, Response } from 'express';
import { z } from 'zod';
import { Coupon } from '../models/Coupon';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';

// Validation schemas using Zod
const createCouponSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase().regex(/^[A-Z0-9_-]+$/, 'Code can only contain alphanumeric characters, underscores, or hyphens'),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0),
  maxDiscountAmount: z.number().min(0).optional(),
  minCoursePrice: z.number().min(0).optional(),
  expiryDate: z.string().datetime({ precision: 3 }).or(z.string().date()).optional().transform((val) => val ? new Date(val) : undefined),
  isActive: z.boolean().default(true),
  usageLimit: z.number().min(1).optional(),
});

const updateCouponSchema = createCouponSchema.partial();

const applyCouponSchema = z.object({
  courseId: z.string().min(1),
  code: z.string().min(1),
});

/**
 * Shared helper to validate coupon and calculate discount
 */
export async function validateCouponAndCalculateDiscount({
  code,
  coursePrice,
  userId,
}: {
  code: string;
  coursePrice: number;
  userId: string;
}) {
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (!coupon) {
    throw new Error('Coupon not found');
  }

  if (!coupon.isActive) {
    throw new Error('Coupon is inactive');
  }

  if (coupon.expiryDate && new Date() > coupon.expiryDate) {
    throw new Error('Coupon has expired');
  }

  if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    throw new Error('Coupon usage limit reached');
  }

  // Check if user has already used this coupon for any course (paid status)
  const alreadyUsed = await Enrollment.findOne({
    userId,
    couponCode: coupon.code,
    paymentStatus: 'paid',
  });

  if (alreadyUsed) {
    throw new Error('You have already used this coupon code');
  }

  if (coursePrice < (coupon.minCoursePrice || 0)) {
    throw new Error(`Minimum course price to apply this coupon is ${coupon.minCoursePrice}`);
  }

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = (coursePrice * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount !== undefined && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  } else if (coupon.discountType === 'fixed') {
    discount = coupon.discountValue;
  }

  // Sanitize discount
  discount = Math.min(discount, coursePrice);
  discount = Math.max(0, Math.round(discount * 100) / 100);

  const finalPrice = Math.max(0, Math.round((coursePrice - discount) * 100) / 100);

  return {
    coupon,
    discount,
    finalPrice,
  };
}

// ADMIN CONTROLLERS

export async function createCoupon(req: Request, res: Response): Promise<void> {
  try {
    const data = createCouponSchema.parse(req.body);

    const existing = await Coupon.findOne({ code: data.code });
    if (existing) {
      res.status(409).json({ success: false, message: 'Coupon code already exists' });
      return;
    }

    const coupon = await Coupon.create({
      ...data,
      createdBy: req.user!.id,
    });

    res.status(201).json({ success: true, coupon });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    console.error('Error creating coupon:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getCoupons(req: Request, res: Response): Promise<void> {
  try {
    const coupons = await Coupon.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (err) {
    console.error('Error getting coupons:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getCouponById(req: Request, res: Response): Promise<void> {
  try {
    const coupon = await Coupon.findById(req.params.id).populate('createdBy', 'name email');
    if (!coupon) {
      res.status(404).json({ success: false, message: 'Coupon not found' });
      return;
    }
    res.json({ success: true, coupon });
  } catch (err) {
    console.error('Error getting coupon by ID:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateCoupon(req: Request, res: Response): Promise<void> {
  try {
    const data = updateCouponSchema.parse(req.body);

    // If changing the code, check for duplicates
    if (data.code) {
      const existing = await Coupon.findOne({ code: data.code, _id: { $ne: req.params.id } });
      if (existing) {
        res.status(409).json({ success: false, message: 'Coupon code already exists' });
        return;
      }
    }

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!coupon) {
      res.status(404).json({ success: false, message: 'Coupon not found' });
      return;
    }

    res.json({ success: true, coupon });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    console.error('Error updating coupon:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteCoupon(req: Request, res: Response): Promise<void> {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      res.status(404).json({ success: false, message: 'Coupon not found' });
      return;
    }
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err) {
    console.error('Error deleting coupon:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// STUDENT CONTROLLERS

export async function checkCoupon(req: Request, res: Response): Promise<void> {
  try {
    const { courseId, code } = applyCouponSchema.parse(req.body);

    const course = await Course.findById(courseId);
    if (!course || !course.isPublished) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      userId: req.user!.id,
      courseId,
      paymentStatus: 'paid',
    });

    if (existingEnrollment) {
      res.status(409).json({ success: false, message: 'Already enrolled in this course' });
      return;
    }

    try {
      const { coupon, discount, finalPrice } = await validateCouponAndCalculateDiscount({
        code,
        coursePrice: course.price,
        userId: req.user!.id,
      });

      res.json({
        success: true,
        couponCode: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        originalPrice: course.price,
        discountAmount: discount,
        finalPrice,
        currency: course.currency,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Invalid coupon' });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    console.error('Error checking coupon:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
