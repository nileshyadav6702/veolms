import { startDb, stopDb, clearDb } from './setup';

beforeAll(startDb);
afterEach(clearDb);
afterAll(stopDb);

import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { Course } from '../src/models/Course';
import { Enrollment } from '../src/models/Enrollment';
import { Review } from '../src/models/Review';
import { Session } from '../src/models/Session';
import bcrypt from 'bcryptjs';
import { signToken } from '../src/services/jwt.service';

async function createAdmin() {
  const user = await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash: await bcrypt.hash('Password123!', 12),
    role: 'admin',
  });
  const session = await Session.create({
    userId: user._id,
    deviceInfo: 'Test Admin Device',
    ipAddress: '127.0.0.1',
  });
  return {
    user,
    token: signToken({ id: user._id.toString(), email: user.email, role: user.role, sessionId: session._id.toString() }),
  };
}

async function createStudent(email = 'student@example.com', name = 'Student') {
  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash('Password123!', 12),
    role: 'student',
  });
  const session = await Session.create({
    userId: user._id,
    deviceInfo: 'Test Student Device',
    ipAddress: '127.0.0.1',
  });
  return {
    user,
    token: signToken({ id: user._id.toString(), email: user.email, role: user.role, sessionId: session._id.toString() }),
  };
}

describe('Review Routes', () => {
  let admin: any;
  let student1: any;
  let student2: any;
  let course: any;

  beforeEach(async () => {
    admin = await createAdmin();
    student1 = await createStudent('student1@example.com', 'Student One');
    student2 = await createStudent('student2@example.com', 'Student Two');
    
    course = await Course.create({
      title: 'Next.js App Router Masterclass',
      slug: 'nextjs-masterclass',
      thumbnail: 'https://r2.example.com/thumb.jpg',
      description: 'Learn Next.js',
      shortDescription: 'Learn Next.js in hours',
      instructor: 'John Doe',
      price: 499,
      isPublished: true,
      createdBy: admin.user._id,
    });
  });

  describe('GET /api/reviews', () => {
    it('returns reviews publicly without token', async () => {
      // Create a dummy review
      await Review.create({
        userId: student1.user._id,
        courseId: course._id,
        rating: 5,
        comment: 'Absolutely amazing course! Learned a lot.',
      });

      const res = await request(app).get('/api/reviews');
      expect(res.status).toBe(200);
      expect(res.body.reviews).toHaveLength(1);
      expect(res.body.reviews[0].comment).toBe('Absolutely amazing course! Learned a lot.');
      expect(res.body.reviews[0].userId.name).toBe('Student One');
      expect(res.body.reviews[0].courseId.title).toBe('Next.js App Router Masterclass');
    });
  });

  describe('POST /api/reviews', () => {
    it('requires authentication to write a review', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          courseId: course._id.toString(),
          rating: 5,
          comment: 'Outstanding lessons!',
        });
      expect(res.status).toBe(401);
    });

    it('denies reviews for non-purchased courses', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${student1.token}`)
        .send({
          courseId: course._id.toString(),
          rating: 4,
          comment: 'Looks great so far, but cannot write review since not purchased.',
        });
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You can only review courses you have purchased');
    });

    it('denies reviews if purchase status is not paid (e.g. pending)', async () => {
      // Create pending enrollment
      await Enrollment.create({
        userId: student1.user._id,
        courseId: course._id,
        paymentStatus: 'pending',
      });

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${student1.token}`)
        .send({
          courseId: course._id.toString(),
          rating: 4,
          comment: 'Waiting for payment confirmation.',
        });
      expect(res.status).toBe(403);
    });

    it('allows review if course is purchased', async () => {
      // Create paid enrollment
      await Enrollment.create({
        userId: student1.user._id,
        courseId: course._id,
        paymentStatus: 'paid',
        enrolledAt: new Date(),
      });

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${student1.token}`)
        .send({
          courseId: course._id.toString(),
          rating: 5,
          comment: 'Perfect Next.js routing course. Highly recommended!',
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.review.rating).toBe(5);
      expect(res.body.review.comment).toBe('Perfect Next.js routing course. Highly recommended!');
    });

    it('allows updating an existing review (upsert behavior)', async () => {
      // Paid enrollment
      await Enrollment.create({
        userId: student1.user._id,
        courseId: course._id,
        paymentStatus: 'paid',
        enrolledAt: new Date(),
      });

      // Submit first review
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${student1.token}`)
        .send({
          courseId: course._id.toString(),
          rating: 4,
          comment: 'Initial feedback: good course.',
        });

      // Update same review
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${student1.token}`)
        .send({
          courseId: course._id.toString(),
          rating: 5,
          comment: 'Updated feedback: outstanding!',
        });

      expect(res.status).toBe(200);
      
      // Verify count is still 1
      const count = await Review.countDocuments({ userId: student1.user._id, courseId: course._id });
      expect(count).toBe(1);

      const review = await Review.findOne({ userId: student1.user._id });
      expect(review?.rating).toBe(5);
      expect(review?.comment).toBe('Updated feedback: outstanding!');
    });

    it('enforces validation rules (rating and comment length)', async () => {
      await Enrollment.create({
        userId: student1.user._id,
        courseId: course._id,
        paymentStatus: 'paid',
      });

      // Invalid rating (6)
      let res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${student1.token}`)
        .send({
          courseId: course._id.toString(),
          rating: 6,
          comment: 'Too high rating test.',
        });
      expect(res.status).toBe(400);

      // Short comment
      res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${student1.token}`)
        .send({
          courseId: course._id.toString(),
          rating: 5,
          comment: 'Short',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    let review: any;

    beforeEach(async () => {
      review = await Review.create({
        userId: student1.user._id,
        courseId: course._id,
        rating: 5,
        comment: 'This is my review, I want to manage it.',
      });
    });

    it('allows a user to delete their own review', async () => {
      const res = await request(app)
        .delete(`/api/reviews/${review._id}`)
        .set('Authorization', `Bearer ${student1.token}`);
      expect(res.status).toBe(200);
      
      const count = await Review.countDocuments({ _id: review._id });
      expect(count).toBe(0);
    });

    it('denies a user from deleting another user\'s review', async () => {
      const res = await request(app)
        .delete(`/api/reviews/${review._id}`)
        .set('Authorization', `Bearer ${student2.token}`);
      expect(res.status).toBe(403);

      const count = await Review.countDocuments({ _id: review._id });
      expect(count).toBe(1);
    });

    it('allows an admin to delete any review', async () => {
      const res = await request(app)
        .delete(`/api/reviews/${review._id}`)
        .set('Authorization', `Bearer ${admin.token}`);
      expect(res.status).toBe(200);

      const count = await Review.countDocuments({ _id: review._id });
      expect(count).toBe(0);
    });
  });
});
