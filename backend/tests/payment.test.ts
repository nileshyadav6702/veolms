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

describe('Payment Routes', () => {
  describe('POST /api/payments/create-order', () => {
    it('requires authentication', async () => {
      const res = await request(app).post('/api/payments/create-order').send({ courseId: 'fakeid' });
      expect(res.status).toBe(401);
    });

    it('returns 404 for non-existent course', async () => {
      const user = await User.create({ name: 'S', email: 's@s.com', passwordHash: await bcrypt.hash('pass', 12), role: 'student' });
      const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: '507f1f77bcf86cd799439011' });
      expect(res.status).toBe(404);
    });

    it('returns 200 with order for published course', async () => {
      const user = await User.create({ name: 'S', email: 's@s.com', passwordHash: await bcrypt.hash('pass', 12), role: 'student' });
      const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });
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
      const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });
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
      const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });
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
      const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });
      const res = await request(app)
        .get('/api/enrollments/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.enrolled).toBe(false);
    });
  });
});
