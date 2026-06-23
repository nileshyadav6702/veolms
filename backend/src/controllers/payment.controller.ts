import { Request, Response } from 'express';
import { z } from 'zod';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';
import { createOrder, verifyPaymentSignature, verifyWebhookSignature } from '../services/razorpay.service';
import { config } from '../config/env';

const createOrderSchema = z.object({
  courseId: z.string().min(1),
});

const verifySchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  courseId: z.string(),
});

export async function createPaymentOrder(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = createOrderSchema.parse(req.body);
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

    const receipt = `receipt_${req.user!.id}_${courseId}_${Date.now()}`.slice(0, 40);
    const order = await createOrder({
      amount: course.price * 100, // paise
      currency: course.currency,
      receipt,
    });

    // Create pending enrollment
    await Enrollment.create({
      userId: req.user!.id,
      courseId,
      razorpayOrderId: order.id,
      paymentStatus: 'pending',
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function verifyPayment(req: Request, res: Response): Promise<void> {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, courseId } = verifySchema.parse(req.body);

    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      await Enrollment.findOneAndUpdate({ razorpayOrderId }, { paymentStatus: 'failed' });
      res.status(400).json({ success: false, message: 'Payment verification failed' });
      return;
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      { razorpayOrderId, userId: req.user!.id },
      { paymentStatus: 'paid', razorpayPaymentId, enrolledAt: new Date() },
      { new: true }
    );

    if (!enrollment) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    res.json({ success: true, message: 'Payment verified. Enrollment successful.', enrollment });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function razorpayWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    if (!verifyWebhookSignature(rawBody, signature)) {
      res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      return;
    }

    const event = req.body as {
      event: string;
      payload: { payment: { entity: { order_id: string; id: string } } };
    };
    if (event.event === 'payment.captured') {
      const orderId = event.payload.payment.entity.order_id;
      const paymentId = event.payload.payment.entity.id;
      await Enrollment.findOneAndUpdate(
        { razorpayOrderId: orderId },
        { paymentStatus: 'paid', razorpayPaymentId: paymentId, enrolledAt: new Date() }
      );
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
