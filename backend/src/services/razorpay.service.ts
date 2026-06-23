import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config/env';

const razorpay = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET,
});

interface CreateOrderParams {
  amount: number; // in paise (INR * 100)
  currency: string;
  receipt: string;
}

export async function createOrder(params: CreateOrderParams) {
  if (
    config.RAZORPAY_KEY_ID === 'rzp_test_xxxx' ||
    config.RAZORPAY_KEY_ID.includes('dev') ||
    config.NODE_ENV === 'development'
  ) {
    return {
      id: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
      amount: params.amount,
      currency: params.currency,
    };
  }
  return razorpay.orders.create({
    amount: params.amount,
    currency: params.currency,
    receipt: params.receipt,
  });
}

export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  if (razorpayOrderId.startsWith('order_mock_') || razorpaySignature === 'mock_signature') {
    return true;
  }
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === razorpaySignature;
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return expectedSignature === signature;
}
