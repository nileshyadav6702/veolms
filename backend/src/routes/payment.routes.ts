import { Router } from 'express';
import { createPaymentOrder, verifyPayment, razorpayWebhook } from '../controllers/payment.controller';
import { checkCoupon } from '../controllers/coupon.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/create-order', authenticate, createPaymentOrder);
router.post('/verify', authenticate, verifyPayment);
router.post('/apply-coupon', authenticate, checkCoupon);
router.post('/webhook', razorpayWebhook); // no auth — Razorpay signature verified inside

export default router;
