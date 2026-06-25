import { startDb, stopDb, clearDb } from './setup';

beforeAll(startDb);
afterEach(clearDb);
afterAll(stopDb);

jest.mock('../src/services/r2.service', () => ({
  getPresignedGetUrl: jest.fn().mockResolvedValue('https://mocked-r2.com/video.mp4'),
  getObjectStream: jest.fn().mockImplementation((key: string) => {
    const { Readable } = require('stream');
    const stream = new Readable();
    stream.push('mocked file content');
    stream.push(null);
    return Promise.resolve({
      stream,
      contentType: key.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T',
      contentLength: 19,
    });
  }),
}));

import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { Course } from '../src/models/Course';
import { Lesson } from '../src/models/Lesson';
import { Enrollment } from '../src/models/Enrollment';
import { signToken } from '../src/services/jwt.service';
import { Session } from '../src/models/Session';

describe('Lesson Streaming & HLS Routes', () => {
  let adminToken: string;
  let studentToken: string;
  let unenrolledStudentToken: string;
  let courseId: mongoose.Types.ObjectId;
  let sectionId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create Users
    const admin = await User.create({ name: 'Admin', email: 'admin@test.com', passwordHash: 'x', role: 'admin' });
    const adminSession = await Session.create({ userId: admin._id, deviceInfo: 'Test Admin Device', ipAddress: '127.0.0.1' });
    adminToken = signToken({ id: admin._id.toString(), email: admin.email, role: admin.role, sessionId: adminSession._id.toString() });

    const student = await User.create({ name: 'Student', email: 'student@test.com', passwordHash: 'x', role: 'student' });
    const studentSession = await Session.create({ userId: student._id, deviceInfo: 'Test Student Device', ipAddress: '127.0.0.1' });
    studentToken = signToken({ id: student._id.toString(), email: student.email, role: student.role, sessionId: studentSession._id.toString() });

    const unenrolled = await User.create({ name: 'Unenrolled', email: 'unenrolled@test.com', passwordHash: 'x', role: 'student' });
    const unenrolledSession = await Session.create({ userId: unenrolled._id, deviceInfo: 'Test Unenrolled Device', ipAddress: '127.0.0.1' });
    unenrolledStudentToken = signToken({ id: unenrolled._id.toString(), email: unenrolled.email, role: unenrolled.role, sessionId: unenrolledSession._id.toString() });

    // Create Course
    const course = await Course.create({
      title: 'HLS Test Course',
      slug: 'hls-test-course',
      thumbnail: 'x',
      description: 'd',
      shortDescription: 's',
      instructor: 'Instructor',
      price: 1000,
      isPublished: true,
      createdBy: admin._id,
    });
    courseId = course._id;
    sectionId = new mongoose.Types.ObjectId();

    // Enroll student
    await Enrollment.create({
      userId: student._id,
      courseId: course._id,
      paymentStatus: 'paid',
      razorpayOrderId: 'order_hls_test_123',
    });
  });

  describe('GET /api/lessons/:id/stream', () => {
    it('requires authentication', async () => {
      const lesson = await Lesson.create({
        courseId,
        sectionId,
        title: 'L1',
        videoKey: 'videos/raw/v.mp4',
        hlsKey: 'videos/hls/v/master.m3u8',
        order: 1,
        status: 'ready',
      });

      const res = await request(app).get(`/api/lessons/${lesson._id}/stream`);
      expect(res.status).toBe(401);
    });

    it('denies streaming to non-enrolled students', async () => {
      const lesson = await Lesson.create({
        courseId,
        sectionId,
        title: 'L1',
        videoKey: 'videos/raw/v.mp4',
        hlsKey: 'videos/hls/v/master.m3u8',
        order: 1,
        status: 'ready',
      });

      const res = await request(app)
        .get(`/api/lessons/${lesson._id}/stream`)
        .set('Authorization', `Bearer ${unenrolledStudentToken}`);
      expect(res.status).toBe(403);
    });

    it('returns public preview lesson even if not enrolled', async () => {
      const lesson = await Lesson.create({
        courseId,
        sectionId,
        title: 'L1',
        videoKey: 'videos/raw/v.mp4',
        hlsKey: 'videos/hls/v/master.m3u8',
        order: 1,
        status: 'ready',
        isPreview: true,
      });

      const res = await request(app)
        .get(`/api/lessons/${lesson._id}/stream`)
        .set('Authorization', `Bearer ${unenrolledStudentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isHls).toBe(true);
      expect(res.body.url).toContain('/api/lessons/');
      expect(res.body.url).toContain('/hls/');
      expect(res.body.url).toContain('/master.m3u8');
    });

    it('returns backend proxy url if HLS is ready', async () => {
      const lesson = await Lesson.create({
        courseId,
        sectionId,
        title: 'L1',
        videoKey: 'videos/raw/v.mp4',
        hlsKey: 'videos/hls/v/master.m3u8',
        order: 1,
        status: 'ready',
      });

      const res = await request(app)
        .get(`/api/lessons/${lesson._id}/stream`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isHls).toBe(true);
      expect(res.body.url).toContain('/api/lessons/');
      expect(res.body.url).toContain('/hls/');
      expect(res.body.url).toContain('/master.m3u8');
      expect(res.body.url).toContain(studentToken);
    });

    it('returns direct presigned MP4 url if HLS key does not exist', async () => {
      const lesson = await Lesson.create({
        courseId,
        sectionId,
        title: 'L1',
        videoKey: 'videos/raw/v.mp4',
        order: 1,
        status: 'ready',
      });

      const res = await request(app)
        .get(`/api/lessons/${lesson._id}/stream`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isHls).toBe(false);
      expect(res.body.url).toBe('https://mocked-r2.com/video.mp4');
    });
  });

  describe('GET /api/lessons/:id/hls/*', () => {
    it('authenticates via token query parameter', async () => {
      const lesson = await Lesson.create({
        courseId,
        sectionId,
        title: 'L1',
        videoKey: 'videos/raw/v.mp4',
        hlsKey: 'videos/hls/v/master.m3u8',
        order: 1,
        status: 'ready',
      });

      const res = await request(app)
        .get(`/api/lessons/${lesson._id}/hls/master.m3u8?token=${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toBe('mocked file content');
      expect(res.headers['content-type']).toContain('application/x-mpegURL');
      expect(res.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
    });

    it('authenticates via Authorization header', async () => {
      const lesson = await Lesson.create({
        courseId,
        sectionId,
        title: 'L1',
        videoKey: 'videos/raw/v.mp4',
        hlsKey: 'videos/hls/v/master.m3u8',
        order: 1,
        status: 'ready',
      });

      const res = await request(app)
        .get(`/api/lessons/${lesson._id}/hls/master.m3u8`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toBe('mocked file content');
    });

    it('sets long cache duration for TS chunks', async () => {
      const lesson = await Lesson.create({
        courseId,
        sectionId,
        title: 'L1',
        videoKey: 'videos/raw/v.mp4',
        hlsKey: 'videos/hls/v/master.m3u8',
        order: 1,
        status: 'ready',
      });

      const res = await request(app)
        .get(`/api/lessons/${lesson._id}/hls/360p/file_001.ts?token=${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.toString()).toBe('mocked file content');
      expect(res.headers['content-type']).toContain('video/MP2T');
      expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    });

    it('denies access if token is invalid or missing', async () => {
      const lesson = await Lesson.create({
        courseId,
        sectionId,
        title: 'L1',
        videoKey: 'videos/raw/v.mp4',
        hlsKey: 'videos/hls/v/master.m3u8',
        order: 1,
        status: 'ready',
      });

      const res = await request(app).get(`/api/lessons/${lesson._id}/hls/master.m3u8`);
      expect(res.status).toBe(401);
    });

    it('denies access if student is not enrolled', async () => {
      const lesson = await Lesson.create({
        courseId,
        sectionId,
        title: 'L1',
        videoKey: 'videos/raw/v.mp4',
        hlsKey: 'videos/hls/v/master.m3u8',
        order: 1,
        status: 'ready',
      });

      const res = await request(app)
        .get(`/api/lessons/${lesson._id}/hls/master.m3u8?token=${unenrolledStudentToken}`);
      expect(res.status).toBe(403);
    });
  });
});
