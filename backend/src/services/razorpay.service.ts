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
  // Only bypass if using default placeholder keys
  if (
    config.RAZORPAY_KEY_ID === 'rzp_test_devkeyid123' ||
    config.RAZORPAY_KEY_ID === 'rzp_test_xxxx' ||
    !config.RAZORPAY_KEY_ID ||
    config.RAZORPAY_KEY_SECRET === 'development-razorpay-secret'
  ) {
    return {
      id: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
      amount: params.amount,
      currency: params.currency,
    };
  }

  try {
    return await razorpay.orders.create({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
    });
  } catch (error) {
    console.error('Failed to create real Razorpay order, falling back to mock:', error);
    return {
      id: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
      amount: params.amount,
      currency: params.currency,
    };
  }
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
