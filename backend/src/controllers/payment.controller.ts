import { Request, Response } from 'express';
import { z } from 'zod';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';
import { Coupon } from '../models/Coupon';
import { validateCouponAndCalculateDiscount } from './coupon.controller';
import { createOrder, verifyPaymentSignature, verifyWebhookSignature } from '../services/razorpay.service';
import { config } from '../config/env';

const createOrderSchema = z.object({
  courseId: z.string().min(1),
  couponCode: z.string().optional(),
});

const verifySchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  courseId: z.string(),
});

export async function createPaymentOrder(req: Request, res: Response): Promise<void> {
  try {
    const { courseId, couponCode } = createOrderSchema.parse(req.body);
    const course = await Course.findById(courseId);
    if (!course || !course.isPublished) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({ userId: req.user!.id, courseId, paymentStatus: 'paid' });
    if (existingEnrollment) {
      res.status(409).json({ success: false, message: 'Already enrolled in this course' });
      return;
    }

    let finalPrice = course.price;
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      try {
        const result = await validateCouponAndCalculateDiscount({
          code: couponCode,
          coursePrice: course.price,
          userId: req.user!.id,
        });
        finalPrice = result.finalPrice;
        discountAmount = result.discount;
        appliedCoupon = result.coupon;
      } catch (err: any) {
        res.status(400).json({ success: false, message: err.message || 'Invalid coupon code' });
        return;
      }
    }

    if (finalPrice === 0) {
      // 100% discount, enroll immediately!
      const enrollment = await Enrollment.create({
        userId: req.user!.id,
        courseId,
        paymentStatus: 'paid',
        couponCode: appliedCoupon?.code,
        discountAmount,
        originalPrice: course.price,
        paidPrice: 0,
        enrolledAt: new Date(),
      });

      if (appliedCoupon) {
        await Coupon.updateOne({ code: appliedCoupon.code }, { $inc: { usedCount: 1 } });
      }

      res.json({
        success: true,
        free: true,
        enrollment,
        course: { title: course.title, thumbnail: course.thumbnail },
      });
      return;
    }

    const receipt = `receipt_${req.user!.id}_${courseId}_${Date.now()}`.slice(0, 40);
    const order = await createOrder({
      amount: Math.round(finalPrice * 100), // paise
      currency: course.currency,
      receipt,
    });

    // Create pending enrollment
    await Enrollment.create({
      userId: req.user!.id,
      courseId,
      razorpayOrderId: order.id,
      paymentStatus: 'pending',
      couponCode: appliedCoupon?.code,
      discountAmount,
      originalPrice: course.price,
      paidPrice: finalPrice,
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      key: config.RAZORPAY_KEY_ID,
      course: { title: course.title, thumbnail: course.thumbnail },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    console.error('Error creating payment order:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function verifyPayment(req: Request, res: Response): Promise<void> {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = verifySchema.parse(req.body);

    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      await Enrollment.findOneAndUpdate({ razorpayOrderId, paymentStatus: 'pending' }, { paymentStatus: 'failed' });
      res.status(400).json({ success: false, message: 'Payment verification failed' });
      return;
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      { razorpayOrderId, userId: req.user!.id, paymentStatus: 'pending' },
      { paymentStatus: 'paid', razorpayPaymentId, enrolledAt: new Date() },
      { new: true }
    );

    if (!enrollment) {
      // Check if already paid (webhook might have processed it first)
      const alreadyPaid = await Enrollment.findOne({
        razorpayOrderId,
        userId: req.user!.id,
        paymentStatus: 'paid',
      });
      if (alreadyPaid) {
        res.json({ success: true, message: 'Payment verified. Enrollment successful.', enrollment: alreadyPaid });
        return;
      }
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    if (enrollment.couponCode) {
      await Coupon.updateOne({ code: enrollment.couponCode }, { $inc: { usedCount: 1 } });
    }

    res.json({ success: true, message: 'Payment verified. Enrollment successful.', enrollment });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    console.error('Error verifying payment:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function razorpayWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);
    const event = JSON.parse(rawBody) as {
      event: string;
      payload: { payment: { entity: { order_id: string; id: string } } };
    };

    if (!verifyWebhookSignature(rawBody, signature)) {
      res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      return;
    }

    if (event.event === 'payment.captured') {
      const orderId = event.payload.payment.entity.order_id;
      const paymentId = event.payload.payment.entity.id;
      
      const enrollment = await Enrollment.findOneAndUpdate(
        { razorpayOrderId: orderId, paymentStatus: 'pending' },
        { paymentStatus: 'paid', razorpayPaymentId: paymentId, enrolledAt: new Date() },
        { new: true }
      );

      if (enrollment && enrollment.couponCode) {
        await Coupon.updateOne({ code: enrollment.couponCode }, { $inc: { usedCount: 1 } });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
