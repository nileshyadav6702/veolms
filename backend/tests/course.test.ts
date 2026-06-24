import { startDb, stopDb, clearDb } from './setup';

beforeAll(startDb);
afterEach(clearDb);
afterAll(stopDb);

import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { Course } from '../src/models/Course';
import bcrypt from 'bcryptjs';
import { signToken } from '../src/services/jwt.service';
import { Session } from '../src/models/Session';

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
  return signToken({ id: user._id.toString(), email: user.email, role: user.role, sessionId: session._id.toString() });
}

async function createStudent() {
  const user = await User.create({
    name: 'Student',
    email: 'student@example.com',
    passwordHash: await bcrypt.hash('Password123!', 12),
    role: 'student',
  });
  const session = await Session.create({
    userId: user._id,
    deviceInfo: 'Test Student Device',
    ipAddress: '127.0.0.1',
  });
  return signToken({ id: user._id.toString(), email: user.email, role: user.role, sessionId: session._id.toString() });
}

describe('Course Routes', () => {
  describe('GET /api/courses', () => {
    it('returns only published courses to public', async () => {
      const admin = await User.create({ name: 'A', email: 'a@a.com', passwordHash: 'x', role: 'admin' });
      await Course.create({ title: 'Published', slug: 'pub', thumbnail: 'x', description: 'd', shortDescription: 's', instructor: 'I', price: 999, isPublished: true, createdBy: admin._id });
      await Course.create({ title: 'Draft', slug: 'draft', thumbnail: 'x', description: 'd', shortDescription: 's', instructor: 'I', price: 999, isPublished: false, createdBy: admin._id });
      const res = await request(app).get('/api/courses');
      expect(res.status).toBe(200);
      expect(res.body.courses).toHaveLength(1);
      expect(res.body.courses[0].slug).toBe('pub');
    });
  });

  describe('POST /api/courses', () => {
    it('admin can create a course', async () => {
      const token = await createAdmin();
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'JS Basics', slug: 'js-basics', thumbnail: 'https://r2.example.com/thumb.jpg', description: 'Learn JS', shortDescription: 'JS course', instructor: 'John', price: 999 });
      expect(res.status).toBe(201);
      expect(res.body.course.slug).toBe('js-basics');
    });

    it('student cannot create a course', async () => {
      const token = await createStudent();
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'JS', slug: 'js', thumbnail: 'x', description: 'd', shortDescription: 's', instructor: 'I', price: 0 });
      expect(res.status).toBe(403);
    });
  });
});
