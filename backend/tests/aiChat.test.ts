import { startDb, stopDb, clearDb } from './setup';

beforeAll(startDb);
afterEach(clearDb);
afterAll(stopDb);

jest.mock('../src/services/r2.service', () => ({
  getObjectStream: jest.fn().mockImplementation((key: string) => {
    const { Readable } = require('stream');
    const stream = new Readable();
    stream.push('WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nHello Speech');
    stream.push(null);
    return Promise.resolve({
      stream,
      contentLength: 50,
    });
  }),
}));

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: jest.fn().mockResolvedValue({
            text: 'Mocked Chat Gemini Reply',
          }),
        },
      };
    }),
  };
});

jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: 'Mocked Chat OpenAI Reply',
                  },
                },
              ],
            }),
          },
        },
      };
    }),
  };
});

import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { Course } from '../src/models/Course';
import { Lesson } from '../src/models/Lesson';
import { Enrollment } from '../src/models/Enrollment';
import { signToken } from '../src/services/jwt.service';
import { Session } from '../src/models/Session';
import { AIConversation } from '../src/models/AIConversation';
import { ChatMessage } from '../src/models/ChatMessage';

describe('AI Conversations API', () => {
  let adminToken: string;
  let studentToken: string;
  let unenrolledStudentToken: string;
  let courseId: mongoose.Types.ObjectId;
  let sectionId: mongoose.Types.ObjectId;
  let lessonId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Set required env keys
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

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

    // Create Course & Lesson
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

    const lesson = await Lesson.create({
      courseId,
      sectionId,
      title: 'L1 Chat Lesson',
      videoKey: 'videos/raw/v.mp4',
      hlsKey: 'videos/hls/v/master.m3u8',
      subtitles: [{ lang: 'en', label: 'English', vttKey: 'subtitles/en.vtt' }],
      order: 1,
      status: 'ready',
    });
    lessonId = lesson._id;

    // Enroll student
    await Enrollment.create({
      userId: student._id,
      courseId: course._id,
      paymentStatus: 'paid',
      razorpayOrderId: 'order_hls_test_123',
    });
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  describe('POST /api/ai-chats', () => {
    it('requires authentication', async () => {
      const res = await request(app).post('/api/ai-chats').send({ title: 'New Conversation' });
      expect(res.status).toBe(401);
    });

    it('creates a new conversation without lessonId', async () => {
      const res = await request(app)
        .post('/api/ai-chats')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'General Python Help' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.conversation.title).toBe('General Python Help');
      expect(res.body.conversation.lessonId).toBeUndefined();

      const conversations = await AIConversation.find();
      expect(conversations).toHaveLength(1);
    });

    it('creates a new conversation with lessonId', async () => {
      const res = await request(app)
        .post('/api/ai-chats')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Lesson 1 Query', lessonId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.conversation.lessonId.toString()).toBe(lessonId.toString());
    });
  });

  describe('GET /api/ai-chats', () => {
    it('returns all conversations for the authenticated user', async () => {
      const studentUser = await User.findOne({ email: 'student@test.com' });
      await AIConversation.create({ userId: studentUser!._id, title: 'Chat A' });
      await AIConversation.create({ userId: studentUser!._id, title: 'Chat B' });

      const res = await request(app)
        .get('/api/ai-chats')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.conversations).toHaveLength(2);
      expect(res.body.conversations[0].title).toBe('Chat B'); // sorted by updatedAt desc
    });
  });

  describe('GET /api/ai-chats/:id/messages', () => {
    it('returns messages in a conversation', async () => {
      const studentUser = await User.findOne({ email: 'student@test.com' });
      const conversation = await AIConversation.create({ userId: studentUser!._id, title: 'Chat A' });

      await ChatMessage.create({
        userId: studentUser!._id,
        conversationId: conversation._id,
        sender: 'user',
        text: 'hello',
      });

      const res = await request(app)
        .get(`/api/ai-chats/${conversation._id}/messages`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.history).toHaveLength(1);
      expect(res.body.history[0].text).toBe('hello');
    });
  });

  describe('POST /api/ai-chats/:id/messages', () => {
    it('sends message and gets AI response (Gemini by default)', async () => {
      const studentUser = await User.findOne({ email: 'student@test.com' });
      const conversation = await AIConversation.create({ userId: studentUser!._id, title: 'Chat A', lessonId });

      const res = await request(app)
        .post(`/api/ai-chats/${conversation._id}/messages`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ message: 'What is this lesson about?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reply).toBe('Mocked Chat Gemini Reply');

      const messages = await ChatMessage.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
      expect(messages).toHaveLength(2);
      expect(messages[0].sender).toBe('user');
      expect(messages[0].text).toBe('What is this lesson about?');
      expect(messages[1].sender).toBe('ai');
      expect(messages[1].text).toBe('Mocked Chat Gemini Reply');
    });
  });

  describe('DELETE /api/ai-chats/:id', () => {
    it('deletes conversation and messages', async () => {
      const studentUser = await User.findOne({ email: 'student@test.com' });
      const conversation = await AIConversation.create({ userId: studentUser!._id, title: 'Chat A' });
      await ChatMessage.create({
        userId: studentUser!._id,
        conversationId: conversation._id,
        sender: 'user',
        text: 'hello',
      });

      const res = await request(app)
        .delete(`/api/ai-chats/${conversation._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const convCount = await AIConversation.countDocuments({ _id: conversation._id });
      const msgCount = await ChatMessage.countDocuments({ conversationId: conversation._id });
      expect(convCount).toBe(0);
      expect(msgCount).toBe(0);
    });
  });
});
