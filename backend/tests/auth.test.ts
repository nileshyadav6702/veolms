import { startDb, stopDb, clearDb } from './setup';

beforeAll(startDb);
afterEach(clearDb);
afterAll(stopDb);

import request from 'supertest';
import { app } from '../src/app';

describe('Auth Routes', () => {
  describe('POST /api/auth/signup', () => {
    it('creates a new student account and returns token', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('student');
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('rejects duplicate email', async () => {
      await request(app).post('/api/auth/signup').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      });
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Test User 2',
        email: 'test@example.com',
        password: 'Password123!',
      });
      expect(res.status).toBe(409);
    });

    it('rejects missing fields', async () => {
      const res = await request(app).post('/api/auth/signup').send({ email: 'bad' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/signup').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      });
    });

    it('returns token on valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'Password123!',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('rejects wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'WrongPassword!',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns user when authenticated', async () => {
      const signup = await request(app).post('/api/auth/signup').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      });
      const token = signup.body.token;
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('Sessions Management', () => {
    let token: string;

    beforeEach(async () => {
      const signup = await request(app).post('/api/auth/signup').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      });
      token = signup.body.token;
    });

    describe('GET /api/auth/sessions', () => {
      it('requires authentication', async () => {
        const res = await request(app).get('/api/auth/sessions');
        expect(res.status).toBe(401);
      });

      it('returns active sessions for the user', async () => {
        const res = await request(app)
          .get('/api/auth/sessions')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.sessions).toHaveLength(1);
        expect(res.body.sessions[0].deviceInfo).toBeDefined();
      });
    });

    describe('DELETE /api/auth/sessions/:id', () => {
      it('requires authentication', async () => {
        const res = await request(app).delete('/api/auth/sessions/some-id');
        expect(res.status).toBe(401);
      });

      it('revokes the session successfully', async () => {
        const getRes = await request(app)
          .get('/api/auth/sessions')
          .set('Authorization', `Bearer ${token}`);
        const session = getRes.body.sessions[0];

        const res = await request(app)
          .delete(`/api/auth/sessions/${session._id}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const checkRes = await request(app)
          .get('/api/auth/sessions')
          .set('Authorization', `Bearer ${token}`);
        expect(checkRes.status).toBe(401);

        const dbSession = await (require('../src/models/Session').Session).findById(session._id);
        expect(dbSession).toBeNull();
      });

      it('returns 404 for invalid/missing session ID', async () => {
        const fakeId = new (require('mongoose').Types.ObjectId)();
        const res = await request(app)
          .delete(`/api/auth/sessions/${fakeId}`)
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(404);
      });
    });
  });
});
