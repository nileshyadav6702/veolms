import { startDb, stopDb, clearDb } from './setup';

beforeAll(startDb);
afterEach(clearDb);
afterAll(stopDb);

jest.mock('../src/services/razorpay.service', () => ({
  createOrder: jest.fn().mockResolvedValue({ id: 'order_test123', amount: 99900, currency: 'INR' }),
  verifyPaymentSignature: jest.fn().mockReturnValue(true),
  verifyWebhookSignature: jest.fn().mockReturnValue(true),
}));

import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { Course } from '../src/models/Course';
import bcrypt from 'bcryptjs';
import { signToken } from '../src/services/jwt.service';
import { Session } from '../src/models/Session';

async function generateToken(user: any) {
  const session = await Session.create({
    userId: user._id,
    deviceInfo: 'Test Payment Device',
    ipAddress: '127.0.0.1',
  });
  return signToken({
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    sessionId: session._id.toString(),
  });
}

describe('Payment Routes', () => {
  describe('POST /api/payments/create-order', () => {
    it('requires authentication', async () => {
      const res = await request(app).post('/api/payments/create-order').send({ courseId: 'fakeid' });
      expect(res.status).toBe(401);
    });

    it('returns 404 for non-existent course', async () => {
      const user = await User.create({ name: 'S', email: 's@s.com', passwordHash: await bcrypt.hash('pass', 12), role: 'student' });
      const token = await generateToken(user);
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: '507f1f77bcf86cd799439011' });
      expect(res.status).toBe(404);
    });

    it('returns 200 with order for published course', async () => {
      const user = await User.create({ name: 'S', email: 's@s.com', passwordHash: await bcrypt.hash('pass', 12), role: 'student' });
      const token = await generateToken(user);
      const course = await Course.create({
        title: 'Test Course',
        slug: 'test-course',
        thumbnail: 'https://example.com/img.jpg',
        description: 'A test course',
        shortDescription: 'Short desc',
        instructor: 'Instructor Name',
        price: 999,
        currency: 'INR',
        isPublished: true,
        createdBy: user._id,
      });
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: course._id.toString() });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order.id).toBe('order_test123');
      expect(res.body.key).toBeDefined();
    });

    it('returns 404 for unpublished course', async () => {
      const user = await User.create({ name: 'S', email: 's@s.com', passwordHash: await bcrypt.hash('pass', 12), role: 'student' });
      const token = await generateToken(user);
      const course = await Course.create({
        title: 'Unpublished Course',
        slug: 'unpublished-course',
        thumbnail: 'https://example.com/img.jpg',
        description: 'A test course',
        shortDescription: 'Short desc',
        instructor: 'Instructor Name',
        price: 999,
        currency: 'INR',
        isPublished: false,
        createdBy: user._id,
      });
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: course._id.toString() });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/enrollments', () => {
    it('requires authentication', async () => {
      const res = await request(app).get('/api/enrollments');
      expect(res.status).toBe(401);
    });

    it('returns empty enrollments for new user', async () => {
      const user = await User.create({ name: 'S', email: 's@s.com', passwordHash: await bcrypt.hash('pass', 12), role: 'student' });
      const token = await generateToken(user);
      const res = await request(app)
        .get('/api/enrollments')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.enrollments).toHaveLength(0);
    });
  });

  describe('GET /api/enrollments/:courseId', () => {
    it('requires authentication', async () => {
      const res = await request(app).get('/api/enrollments/507f1f77bcf86cd799439011');
      expect(res.status).toBe(401);
    });

    it('returns enrolled false for unenrolled course', async () => {
      const user = await User.create({ name: 'S', email: 's@s.com', passwordHash: await bcrypt.hash('pass', 12), role: 'student' });
      const token = await generateToken(user);
      const res = await request(app)
        .get('/api/enrollments/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.enrolled).toBe(false);
    });
  });

  describe('POST /api/payments/verify', () => {
    it('verifies payment and marks enrollment as paid', async () => {
      // 1. Create user + course
      const user = await User.create({ name: 'S', email: 'sv@sv.com', passwordHash: await bcrypt.hash('pass', 12), role: 'student' });
      const token = await generateToken(user);
      const admin = await User.create({ name: 'A', email: 'av@av.com', passwordHash: 'x', role: 'admin' });
      const course = await Course.create({ title: 'JS', slug: 'js-v', thumbnail: 'https://x.com/t.jpg', description: 'desc', shortDescription: 'JS', instructor: 'I', price: 999, isPublished: true, createdBy: admin._id });
      // 2. Create pending enrollment
      await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: course._id.toString() });
      const { Enrollment } = await import('../src/models/Enrollment');
      const enrollment = await Enrollment.findOne({ userId: user._id });
      // 3. Verify payment
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          razorpayOrderId: enrollment!.razorpayOrderId,
          razorpayPaymentId: 'pay_test123',
          razorpaySignature: 'sig_test',
          courseId: course._id.toString(),
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.enrollment.paymentStatus).toBe('paid');
    });

    it('returns 401 without token', async () => {
      const res = await request(app).post('/api/payments/verify').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('processes payment.captured event and marks enrollment paid', async () => {
      // Create an enrollment in pending state
      const user = await User.create({ name: 'W', email: 'wh@wh.com', passwordHash: 'x', role: 'student' });
      const admin = await User.create({ name: 'AW', email: 'aw@aw.com', passwordHash: 'x', role: 'admin' });
      const course = await Course.create({ title: 'WH', slug: 'wh-test', thumbnail: 'https://x.com/t.jpg', description: 'desc', shortDescription: 'WH', instructor: 'I', price: 999, isPublished: true, createdBy: admin._id });
      const { Enrollment } = await import('../src/models/Enrollment');
      await Enrollment.create({ userId: user._id, courseId: course._id, razorpayOrderId: 'order_wh123', paymentStatus: 'pending' });

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', 'test_sig')
        .send({
          event: 'payment.captured',
          payload: { payment: { entity: { order_id: 'order_wh123', id: 'pay_wh456' } } },
        });
      expect(res.status).toBe(200);
      const updated = await Enrollment.findOne({ razorpayOrderId: 'order_wh123' });
      expect(updated!.paymentStatus).toBe('paid');
    });
  });
});
