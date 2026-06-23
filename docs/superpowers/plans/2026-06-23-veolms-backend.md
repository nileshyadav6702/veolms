# VeoLMS Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready REST API for VeoLMS with authentication, course management, video upload to Cloudflare R2, Razorpay payments, enrollment, and progress tracking.

**Architecture:** Express + TypeScript monolith deployed on Railway, connected to MongoDB Atlas (free tier). Videos stored in Cloudflare R2 via S3-compatible SDK. Razorpay handles payments in test mode. Custom JWT (Bearer token) for auth with role-based access control.

**Tech Stack:** Express 4, TypeScript 5, Mongoose 8, Zod 3, jsonwebtoken 9, bcryptjs, Razorpay SDK, @aws-sdk/client-s3, Jest + Supertest + mongodb-memory-server

## Global Constraints

- Node.js >=18
- All env vars validated at startup via Zod — crash fast if missing
- JWT access token expiry: 7 days (single token, no refresh for now)
- All route handlers must be async/await with try/catch — no unhandled promise rejections
- All request bodies validated with Zod schemas before hitting controllers
- Passwords hashed with bcryptjs (saltRounds=12)
- No secrets hardcoded — all from `process.env`
- File size limit: 500MB for video uploads (presigned URL approach — file goes direct to R2, not through server)
- CORS restricted to `FRONTEND_URL` env var
- Rate limit: 100 req/15min on auth routes, 500 req/15min globally

---

## File Map

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts          # Zod env validation, exports typed config object
│   │   ├── db.ts           # Mongoose connect/disconnect
│   │   └── r2.ts           # S3Client configured for Cloudflare R2
│   ├── models/
│   │   ├── User.ts         # Mongoose schema + TypeScript interface
│   │   ├── Course.ts
│   │   ├── Lesson.ts
│   │   ├── Enrollment.ts
│   │   └── Progress.ts
│   ├── middleware/
│   │   ├── authenticate.ts # Verifies Bearer JWT, attaches req.user
│   │   ├── authorize.ts    # Role guard factory: authorize('admin')
│   │   └── validate.ts     # Zod schema validator factory
│   ├── services/
│   │   ├── jwt.service.ts      # sign / verify tokens
│   │   ├── r2.service.ts       # presigned PUT/GET URLs, delete object
│   │   └── razorpay.service.ts # createOrder, verifySignature
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── course.controller.ts
│   │   ├── lesson.controller.ts
│   │   ├── enrollment.controller.ts
│   │   ├── payment.controller.ts
│   │   ├── progress.controller.ts
│   │   ├── upload.controller.ts
│   │   └── admin.controller.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── course.routes.ts
│   │   ├── lesson.routes.ts
│   │   ├── enrollment.routes.ts
│   │   ├── payment.routes.ts
│   │   ├── progress.routes.ts
│   │   ├── upload.routes.ts
│   │   └── admin.routes.ts
│   ├── types/
│   │   └── express.d.ts    # Augments Request with req.user
│   └── app.ts              # Express app (no listen — exported for tests)
│   └── index.ts            # Entry point: connects DB then starts server
├── tests/
│   ├── setup.ts            # mongodb-memory-server lifecycle
│   ├── auth.test.ts
│   ├── course.test.ts
│   ├── payment.test.ts
│   └── enrollment.test.ts
├── .env.example
├── jest.config.ts
├── tsconfig.json
└── package.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/jest.config.ts`
- Create: `backend/.env.example`
- Create: `backend/.gitignore`
- Create: `backend/src/types/express.d.ts`

- [ ] **Step 1: Initialise package.json**

Run inside `backend/`:
```bash
npm init -y
```

- [ ] **Step 2: Install production dependencies**

```bash
npm install express mongoose bcryptjs jsonwebtoken zod cors helmet express-rate-limit razorpay @aws-sdk/client-s3 @aws-sdk/s3-request-presigner cookie-parser morgan dotenv slugify uuid
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D typescript ts-node nodemon @types/express @types/bcryptjs @types/jsonwebtoken @types/cors @types/morgan @types/cookie-parser @types/node @types/uuid jest @types/jest ts-jest supertest @types/supertest mongodb-memory-server
```

- [ ] **Step 4: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 5: Write jest.config.ts**

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterFramework: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
};

export default config;
```

- [ ] **Step 6: Update package.json scripts**

Add to `package.json`:
```json
{
  "scripts": {
    "dev": "nodemon --watch src --ext ts --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --runInBand --forceExit"
  }
}
```

- [ ] **Step 7: Write .env.example**

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/veolms
JWT_SECRET=change-me-to-a-random-64-char-string
FRONTEND_URL=http://localhost:3000

# Cloudflare R2
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=veolms-videos
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

- [ ] **Step 8: Write .gitignore**

```
node_modules/
dist/
.env
*.log
```

- [ ] **Step 9: Write src/types/express.d.ts**

```typescript
import { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'student' | 'admin';
      };
    }
  }
}

export {};
```

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: scaffold backend project with dependencies and tsconfig"
```

---

## Task 2: Config Layer

**Files:**
- Create: `backend/src/config/env.ts`
- Create: `backend/src/config/db.ts`
- Create: `backend/src/config/r2.ts`

**Produces:**
- `config` object (typed) from `env.ts`
- `connectDB()` and `disconnectDB()` from `db.ts`
- `s3Client` from `r2.ts`

- [ ] **Step 1: Write src/config/env.ts**

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url(),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
```

- [ ] **Step 2: Write src/config/db.ts**

```typescript
import mongoose from 'mongoose';
import { config } from './env';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
```

- [ ] **Step 3: Write src/config/r2.ts**

```typescript
import { S3Client } from '@aws-sdk/client-s3';
import { config } from './env';

export const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.R2_ACCESS_KEY_ID,
    secretAccessKey: config.R2_SECRET_ACCESS_KEY,
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add src/config/
git commit -m "feat: add env validation, DB connection, and R2 client config"
```

---

## Task 3: Mongoose Models

**Files:**
- Create: `backend/src/models/User.ts`
- Create: `backend/src/models/Course.ts`
- Create: `backend/src/models/Lesson.ts`
- Create: `backend/src/models/Enrollment.ts`
- Create: `backend/src/models/Progress.ts`

**Produces:** `IUser`, `ICourse`, `ILesson`, `IEnrollment`, `IProgress` interfaces + Mongoose models

- [ ] **Step 1: Write src/models/User.ts**

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'student' | 'admin';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    avatar: { type: String },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
```

- [ ] **Step 2: Write src/models/Course.ts**

```typescript
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISection {
  _id: Types.ObjectId;
  title: string;
  order: number;
}

export interface ICourse extends Document {
  title: string;
  slug: string;
  thumbnail: string;
  description: string;
  shortDescription: string;
  instructor: string;
  price: number;
  currency: string;
  sections: ISection[];
  isPublished: boolean;
  totalLessons: number;
  totalDuration: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<ISection>({
  title: { type: String, required: true },
  order: { type: Number, required: true },
});

const courseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    thumbnail: { type: String, required: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true, maxlength: 200 },
    instructor: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    sections: [sectionSchema],
    isPublished: { type: Boolean, default: false },
    totalLessons: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

courseSchema.index({ slug: 1 });
courseSchema.index({ isPublished: 1 });

export const Course = mongoose.model<ICourse>('Course', courseSchema);
```

- [ ] **Step 3: Write src/models/Lesson.ts**

```typescript
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILesson extends Document {
  courseId: Types.ObjectId;
  sectionId: Types.ObjectId;
  title: string;
  description?: string;
  videoKey: string;
  hlsKey?: string;
  duration: number;
  order: number;
  isPreview: boolean;
  status: 'processing' | 'ready' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = new Schema<ILesson>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    sectionId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    videoKey: { type: String, required: true },
    hlsKey: { type: String },
    duration: { type: Number, default: 0 },
    order: { type: Number, required: true },
    isPreview: { type: Boolean, default: false },
    status: { type: String, enum: ['processing', 'ready', 'error'], default: 'processing' },
  },
  { timestamps: true }
);

lessonSchema.index({ courseId: 1, order: 1 });

export const Lesson = mongoose.model<ILesson>('Lesson', lessonSchema);
```

- [ ] **Step 4: Write src/models/Enrollment.ts**

```typescript
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEnrollment extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  enrolledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    enrolledAt: { type: Date },
  },
  { timestamps: true }
);

enrollmentSchema.index({ userId: 1, courseId: 1 });
enrollmentSchema.index({ razorpayOrderId: 1 });

export const Enrollment = mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);
```

- [ ] **Step 5: Write src/models/Progress.ts**

```typescript
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProgress extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  lessonId: Types.ObjectId;
  watchedSeconds: number;
  duration: number;
  completed: boolean;
  lastWatchedAt: Date;
}

const progressSchema = new Schema<IProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    watchedSeconds: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    lastWatchedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

progressSchema.index({ userId: 1, courseId: 1 });
progressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export const Progress = mongoose.model<IProgress>('Progress', progressSchema);
```

- [ ] **Step 6: Commit**

```bash
git add src/models/
git commit -m "feat: add Mongoose models for User, Course, Lesson, Enrollment, Progress"
```

---

## Task 4: Services (JWT, R2, Razorpay)

**Files:**
- Create: `backend/src/services/jwt.service.ts`
- Create: `backend/src/services/r2.service.ts`
- Create: `backend/src/services/razorpay.service.ts`

**Produces:**
- `signToken(payload)` → `string`
- `verifyToken(token)` → `{ id, email, role }`
- `getPresignedPutUrl(key, contentType)` → `string`
- `getPresignedGetUrl(key, expiresIn?)` → `string`
- `deleteObject(key)` → `void`
- `createOrder(amount, currency, receipt)` → Razorpay order
- `verifyPaymentSignature(orderId, paymentId, signature)` → `boolean`

- [ ] **Step 1: Write src/services/jwt.service.ts**

```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

interface TokenPayload {
  id: string;
  email: string;
  role: 'student' | 'admin';
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
}
```

- [ ] **Step 2: Write src/services/r2.service.ts**

```typescript
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../config/r2';
import { config } from '../config/env';

export async function getPresignedPutUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: config.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour to upload
}

export async function getPresignedGetUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.R2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: config.R2_BUCKET_NAME,
    Key: key,
  });
  await s3Client.send(command);
}
```

- [ ] **Step 3: Write src/services/razorpay.service.ts**

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add src/services/
git commit -m "feat: add JWT, R2, and Razorpay service modules"
```

---

## Task 5: Middleware

**Files:**
- Create: `backend/src/middleware/authenticate.ts`
- Create: `backend/src/middleware/authorize.ts`
- Create: `backend/src/middleware/validate.ts`

**Produces:**
- `authenticate` — Express middleware, attaches `req.user` or sends 401
- `authorize(role)` — factory returning middleware that sends 403 if role mismatch
- `validate(schema)` — factory that validates `req.body` against Zod schema

- [ ] **Step 1: Write src/middleware/authenticate.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwt.service';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
```

- [ ] **Step 2: Write src/middleware/authorize.ts**

```typescript
import { Request, Response, NextFunction } from 'express';

export function authorize(role: 'admin' | 'student') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
      return;
    }
    next();
  };
}
```

- [ ] **Step 3: Write src/middleware/validate.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/middleware/
git commit -m "feat: add authenticate, authorize, and validate middleware"
```

---

## Task 6: Auth Routes

**Files:**
- Create: `backend/src/controllers/auth.controller.ts`
- Create: `backend/src/routes/auth.routes.ts`
- Create: `backend/tests/setup.ts`
- Create: `backend/tests/auth.test.ts`

**Endpoints:**
- `POST /api/auth/signup` — public
- `POST /api/auth/login` — public
- `GET /api/auth/me` — authenticated

- [ ] **Step 1: Write tests/setup.ts**

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
```

- [ ] **Step 2: Write tests/auth.test.ts**

```typescript
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
});
```

- [ ] **Step 3: Run tests — expect FAIL (app not defined yet)**

```bash
npm test -- --testPathPattern=auth
```

Expected: FAIL with "Cannot find module '../src/app'"

- [ ] **Step 4: Write src/controllers/auth.controller.ts**

```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { signToken } from '../services/jwt.service';

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = signupSchema.parse(req.body);
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: 'student' });
    const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, user });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
```

- [ ] **Step 5: Write src/routes/auth.routes.ts**

```typescript
import { Router } from 'express';
import { signup, login, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authenticate, me);

export default router;
```

- [ ] **Step 6: Write src/app.ts**

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import authRoutes from './routes/auth.routes';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

app.use(globalLimiter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authLimiter, authRoutes);

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
```

- [ ] **Step 7: Write src/index.ts**

```typescript
import { app } from './app';
import { connectDB } from './config/db';
import { config } from './config/env';

async function main() {
  await connectDB();
  app.listen(Number(config.PORT), () => {
    console.log(`🚀 Server running on port ${config.PORT}`);
  });
}

main();
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
npm test -- --testPathPattern=auth
```

Expected: 6 passing tests

- [ ] **Step 9: Commit**

```bash
git add src/ tests/
git commit -m "feat: auth routes with signup, login, me endpoint + tests"
```

---

## Task 7: Course Routes

**Files:**
- Create: `backend/src/controllers/course.controller.ts`
- Create: `backend/src/routes/course.routes.ts`
- Create: `backend/tests/course.test.ts`
- Modify: `backend/src/app.ts` — add course routes

**Endpoints:**
- `GET /api/courses` — public, list published courses
- `GET /api/courses/:slug` — public, get course with sections and preview lessons
- `POST /api/courses` — admin only
- `PUT /api/courses/:id` — admin only
- `DELETE /api/courses/:id` — admin only
- `PATCH /api/courses/:id/publish` — admin only

- [ ] **Step 1: Write tests/course.test.ts**

```typescript
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { Course } from '../src/models/Course';
import bcrypt from 'bcryptjs';
import { signToken } from '../src/services/jwt.service';

async function createAdmin() {
  const user = await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash: await bcrypt.hash('Password123!', 12),
    role: 'admin',
  });
  return signToken({ id: user._id.toString(), email: user.email, role: user.role });
}

async function createStudent() {
  const user = await User.create({
    name: 'Student',
    email: 'student@example.com',
    passwordHash: await bcrypt.hash('Password123!', 12),
    role: 'student',
  });
  return signToken({ id: user._id.toString(), email: user.email, role: user.role });
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- --testPathPattern=course
```

Expected: FAIL with route not found

- [ ] **Step 3: Write src/controllers/course.controller.ts**

```typescript
import { Request, Response } from 'express';
import slugify from 'slugify';
import { z } from 'zod';
import { Course } from '../models/Course';
import { Lesson } from '../models/Lesson';

const courseSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().optional(),
  thumbnail: z.string().url(),
  description: z.string().min(10),
  shortDescription: z.string().max(200),
  instructor: z.string().min(2),
  price: z.number().min(0),
  sections: z.array(z.object({ title: z.string(), order: z.number() })).optional(),
});

export async function listCourses(req: Request, res: Response): Promise<void> {
  try {
    const { search, page = '1', limit = '12' } = req.query as Record<string, string>;
    const query: Record<string, unknown> = { isPublished: true };
    if (search) query.title = { $regex: search, $options: 'i' };
    const skip = (Number(page) - 1) * Number(limit);
    const [courses, total] = await Promise.all([
      Course.find(query).select('-createdBy').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Course.countDocuments(query),
    ]);
    res.json({ success: true, courses, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getCourse(req: Request, res: Response): Promise<void> {
  try {
    const course = await Course.findOne({ slug: req.params.slug, isPublished: true });
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    const lessons = await Lesson.find({ courseId: course._id }).select('title duration order sectionId isPreview status').sort({ order: 1 });
    res.json({ success: true, course, lessons });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function createCourse(req: Request, res: Response): Promise<void> {
  try {
    const data = courseSchema.parse(req.body);
    const slug = data.slug || slugify(data.title, { lower: true, strict: true });
    const existing = await Course.findOne({ slug });
    if (existing) {
      res.status(409).json({ success: false, message: 'Slug already exists' });
      return;
    }
    const course = await Course.create({ ...data, slug, createdBy: req.user!.id });
    res.status(201).json({ success: true, course });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateCourse(req: Request, res: Response): Promise<void> {
  try {
    const data = courseSchema.partial().parse(req.body);
    const course = await Course.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    res.json({ success: true, course });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteCourse(req: Request, res: Response): Promise<void> {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    await Lesson.deleteMany({ courseId: req.params.id });
    res.json({ success: true, message: 'Course deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function publishCourse(req: Request, res: Response): Promise<void> {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { isPublished: true }, { new: true });
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    res.json({ success: true, course });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
```

Note: install slugify — `npm install slugify @types/slugify` (slugify has its own types, no @types needed).

- [ ] **Step 4: Write src/routes/course.routes.ts**

```typescript
import { Router } from 'express';
import { listCourses, getCourse, createCourse, updateCourse, deleteCourse, publishCourse } from '../controllers/course.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.get('/', listCourses);
router.get('/:slug', getCourse);
router.post('/', authenticate, authorize('admin'), createCourse);
router.put('/:id', authenticate, authorize('admin'), updateCourse);
router.delete('/:id', authenticate, authorize('admin'), deleteCourse);
router.patch('/:id/publish', authenticate, authorize('admin'), publishCourse);

export default router;
```

- [ ] **Step 5: Add course routes to src/app.ts**

Add after auth routes import:
```typescript
import courseRoutes from './routes/course.routes';
```

Add after auth route registration:
```typescript
app.use('/api/courses', courseRoutes);
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
npm test -- --testPathPattern=course
```

Expected: 3 passing

- [ ] **Step 7: Commit**

```bash
git add src/ tests/course.test.ts
git commit -m "feat: course CRUD routes with admin authorization"
```

---

## Task 8: Lesson Routes

**Files:**
- Create: `backend/src/controllers/lesson.controller.ts`
- Create: `backend/src/routes/lesson.routes.ts`
- Modify: `backend/src/app.ts`

**Endpoints:**
- `GET /api/lessons/course/:courseId` — returns lessons; hides `videoKey`/`hlsKey` for non-enrolled non-preview
- `GET /api/lessons/:id/stream` — authenticated + enrolled (or preview); returns signed streaming URL
- `POST /api/lessons` — admin only
- `PUT /api/lessons/:id` — admin only
- `DELETE /api/lessons/:id` — admin only

- [ ] **Step 1: Write src/controllers/lesson.controller.ts**

```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { Lesson } from '../models/Lesson';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';
import { getPresignedGetUrl } from '../services/r2.service';

const lessonSchema = z.object({
  courseId: z.string().min(1),
  sectionId: z.string().min(1),
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  videoKey: z.string().min(1),
  hlsKey: z.string().optional(),
  duration: z.number().min(0).default(0),
  order: z.number().min(0),
  isPreview: z.boolean().default(false),
});

export async function getLessonsForCourse(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    const lessons = await Lesson.find({ courseId }).sort({ order: 1 });

    // Check enrollment if user is authenticated
    let isEnrolled = false;
    if (req.user) {
      const enrollment = await Enrollment.findOne({ userId: req.user.id, courseId, paymentStatus: 'paid' });
      isEnrolled = !!enrollment || req.user.role === 'admin';
    }

    const filtered = lessons.map((lesson) => {
      const obj = lesson.toObject();
      if (!isEnrolled && !lesson.isPreview) {
        // Strip video access for non-enrolled, non-preview lessons
        delete (obj as Record<string, unknown>).videoKey;
        delete (obj as Record<string, unknown>).hlsKey;
      }
      return obj;
    });

    res.json({ success: true, lessons: filtered });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getLessonStreamUrl(req: Request, res: Response): Promise<void> {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }

    // Preview lessons are accessible to all authenticated users
    if (!lesson.isPreview) {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      if (req.user.role !== 'admin') {
        const enrollment = await Enrollment.findOne({
          userId: req.user.id,
          courseId: lesson.courseId,
          paymentStatus: 'paid',
        });
        if (!enrollment) {
          res.status(403).json({ success: false, message: 'Not enrolled in this course' });
          return;
        }
      }
    }

    const key = lesson.hlsKey || lesson.videoKey;
    // Short-lived URL: 2 hours for video streaming
    const url = await getPresignedGetUrl(key, 7200);
    res.json({ success: true, url, isHls: !!lesson.hlsKey });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function createLesson(req: Request, res: Response): Promise<void> {
  try {
    const data = lessonSchema.parse(req.body);
    const course = await Course.findById(data.courseId);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    const lesson = await Lesson.create(data);
    // Update course totalLessons
    await Course.findByIdAndUpdate(data.courseId, { $inc: { totalLessons: 1 } });
    res.status(201).json({ success: true, lesson });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateLesson(req: Request, res: Response): Promise<void> {
  try {
    const data = lessonSchema.partial().parse(req.body);
    const lesson = await Lesson.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!lesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }
    res.json({ success: true, lesson });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function deleteLesson(req: Request, res: Response): Promise<void> {
  try {
    const lesson = await Lesson.findByIdAndDelete(req.params.id);
    if (!lesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }
    await Course.findByIdAndUpdate(lesson.courseId, { $inc: { totalLessons: -1 } });
    res.json({ success: true, message: 'Lesson deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
```

- [ ] **Step 2: Write src/routes/lesson.routes.ts**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { getLessonsForCourse, getLessonStreamUrl, createLesson, updateLesson, deleteLesson } from '../controllers/lesson.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { verifyToken } from '../services/jwt.service';

const router = Router();

// Optional auth — attaches req.user if valid token present, but never blocks
function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(auth.split(' ')[1]);
      req.user = { id: payload.id, email: payload.email, role: payload.role };
    } catch {
      // Invalid token — proceed without user
    }
  }
  next();
}

router.get('/course/:courseId', optionalAuth, getLessonsForCourse);

router.get('/:id/stream', authenticate, getLessonStreamUrl);
router.post('/', authenticate, authorize('admin'), createLesson);
router.put('/:id', authenticate, authorize('admin'), updateLesson);
router.delete('/:id', authenticate, authorize('admin'), deleteLesson);

export default router;
```

- [ ] **Step 3: Add to src/app.ts**

```typescript
import lessonRoutes from './routes/lesson.routes';
// ...
app.use('/api/lessons', lessonRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add src/controllers/lesson.controller.ts src/routes/lesson.routes.ts src/app.ts
git commit -m "feat: lesson routes with enrollment-aware streaming access"
```

---

## Task 9: Upload Routes (R2 Presigned URLs)

**Files:**
- Create: `backend/src/controllers/upload.controller.ts`
- Create: `backend/src/routes/upload.routes.ts`
- Modify: `backend/src/app.ts`

**Endpoints:**
- `POST /api/upload/thumbnail` — admin: returns presigned PUT URL for thumbnail
- `POST /api/upload/video` — admin: returns presigned PUT URL for raw video
- `POST /api/upload/transcode/:lessonId` — admin: updates lesson status to 'processing', triggers Cloudflare Worker webhook

**Flow:** Admin uploads file directly to R2 using presigned URL from client. Server never handles the file binary.

- [ ] **Step 1: Write src/controllers/upload.controller.ts**

```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPresignedPutUrl } from '../services/r2.service';
import { Lesson } from '../models/Lesson';

// Install uuid: npm install uuid @types/uuid

const thumbnailSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

const videoSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.enum(['video/mp4', 'video/webm', 'video/quicktime']),
  lessonId: z.string().optional(),
});

export async function getThumbnailUploadUrl(req: Request, res: Response): Promise<void> {
  try {
    const { fileName, contentType } = thumbnailSchema.parse(req.body);
    const ext = fileName.split('.').pop();
    const key = `thumbnails/${uuidv4()}.${ext}`;
    const uploadUrl = await getPresignedPutUrl(key, contentType);
    res.json({ success: true, uploadUrl, key });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getVideoUploadUrl(req: Request, res: Response): Promise<void> {
  try {
    const { fileName, contentType } = videoSchema.parse(req.body);
    const ext = fileName.split('.').pop();
    const key = `videos/raw/${uuidv4()}.${ext}`;
    const uploadUrl = await getPresignedPutUrl(key, contentType);
    res.json({ success: true, uploadUrl, key });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function triggerTranscode(req: Request, res: Response): Promise<void> {
  try {
    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }
    await Lesson.findByIdAndUpdate(req.params.lessonId, { status: 'processing' });

    // Notify Cloudflare Worker to start FFmpeg transcoding
    // Worker URL stored in env: TRANSCODE_WORKER_URL
    const workerUrl = process.env.TRANSCODE_WORKER_URL;
    if (workerUrl) {
      fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': process.env.WORKER_SECRET || '' },
        body: JSON.stringify({ lessonId: lesson._id, videoKey: lesson.videoKey }),
      }).catch(console.error); // fire-and-forget
    }

    res.json({ success: true, message: 'Transcoding job queued', lessonId: lesson._id });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateLessonVideoKey(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId, hlsKey, status } = z.object({
      lessonId: z.string(),
      hlsKey: z.string(),
      status: z.enum(['ready', 'error']),
    }).parse(req.body);

    // This endpoint is called by the Cloudflare Worker after transcoding
    const workerSecret = req.headers['x-worker-secret'];
    if (workerSecret !== process.env.WORKER_SECRET) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    await Lesson.findByIdAndUpdate(lessonId, { hlsKey, status });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
```

- [ ] **Step 2: Write src/routes/upload.routes.ts**

```typescript
import { Router } from 'express';
import { getThumbnailUploadUrl, getVideoUploadUrl, triggerTranscode, updateLessonVideoKey } from '../controllers/upload.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.post('/thumbnail', authenticate, authorize('admin'), getThumbnailUploadUrl);
router.post('/video', authenticate, authorize('admin'), getVideoUploadUrl);
router.post('/transcode/:lessonId', authenticate, authorize('admin'), triggerTranscode);
router.post('/transcode-callback', updateLessonVideoKey); // called by Worker, secret-verified

export default router;
```

- [ ] **Step 3: Add to src/app.ts**

```typescript
import uploadRoutes from './routes/upload.routes';
// ...
app.use('/api/upload', uploadRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add src/controllers/upload.controller.ts src/routes/upload.routes.ts src/app.ts
git commit -m "feat: R2 presigned upload URLs and transcode trigger endpoints"
```

---

## Task 10: Payment & Enrollment Routes

**Files:**
- Create: `backend/src/controllers/payment.controller.ts`
- Create: `backend/src/controllers/enrollment.controller.ts`
- Create: `backend/src/routes/payment.routes.ts`
- Create: `backend/src/routes/enrollment.routes.ts`
- Create: `backend/tests/payment.test.ts`
- Modify: `backend/src/app.ts`

**Endpoints:**
- `POST /api/payments/create-order` — authenticated student: create Razorpay order
- `POST /api/payments/verify` — authenticated student: verify payment + create enrollment
- `POST /api/payments/webhook` — public, signature-verified: Razorpay webhook (backup)
- `GET /api/enrollments` — authenticated: list my enrolled courses
- `GET /api/enrollments/:courseId` — authenticated: check enrollment for specific course

- [ ] **Step 1: Write tests/payment.test.ts**

```typescript
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
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- --testPathPattern=payment
```

Expected: FAIL with route not found

- [ ] **Step 3: Write src/controllers/payment.controller.ts**

```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';
import { createOrder, verifyPaymentSignature, verifyWebhookSignature } from '../services/razorpay.service';
import { config } from '../config/env';

const createOrderSchema = z.object({
  courseId: z.string().min(1),
});

const verifySchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  courseId: z.string(),
});

export async function createPaymentOrder(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = createOrderSchema.parse(req.body);
    const course = await Course.findById(courseId);
    if (!course || !course.isPublished) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({ userId: req.user!.id, courseId, paymentStatus: 'paid' });
    if (existingEnrollment) {
      res.status(409).json({ success: false, message: 'Already enrolled in this course' });
      return;
    }

    const receipt = `receipt_${req.user!.id}_${courseId}_${Date.now()}`.slice(0, 40);
    const order = await createOrder({
      amount: course.price * 100, // paise
      currency: course.currency,
      receipt,
    });

    // Create pending enrollment
    await Enrollment.create({
      userId: req.user!.id,
      courseId,
      razorpayOrderId: order.id,
      paymentStatus: 'pending',
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      key: config.RAZORPAY_KEY_ID,
      course: { title: course.title, thumbnail: course.thumbnail },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function verifyPayment(req: Request, res: Response): Promise<void> {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, courseId } = verifySchema.parse(req.body);

    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      await Enrollment.findOneAndUpdate({ razorpayOrderId }, { paymentStatus: 'failed' });
      res.status(400).json({ success: false, message: 'Payment verification failed' });
      return;
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      { razorpayOrderId, userId: req.user!.id },
      { paymentStatus: 'paid', razorpayPaymentId, enrolledAt: new Date() },
      { new: true }
    );

    if (!enrollment) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    res.json({ success: true, message: 'Payment verified. Enrollment successful.', enrollment });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function razorpayWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    if (!verifyWebhookSignature(rawBody, signature)) {
      res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      return;
    }

    const event = req.body;
    if (event.event === 'payment.captured') {
      const orderId = event.payload.payment.entity.order_id;
      const paymentId = event.payload.payment.entity.id;
      await Enrollment.findOneAndUpdate(
        { razorpayOrderId: orderId },
        { paymentStatus: 'paid', razorpayPaymentId: paymentId, enrolledAt: new Date() }
      );
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
```

- [ ] **Step 4: Write src/controllers/enrollment.controller.ts**

```typescript
import { Request, Response } from 'express';
import { Enrollment } from '../models/Enrollment';

export async function getMyEnrollments(req: Request, res: Response): Promise<void> {
  try {
    const enrollments = await Enrollment.find({ userId: req.user!.id, paymentStatus: 'paid' })
      .populate('courseId', 'title slug thumbnail shortDescription instructor totalLessons totalDuration')
      .sort({ enrolledAt: -1 });
    res.json({ success: true, enrollments });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function checkEnrollment(req: Request, res: Response): Promise<void> {
  try {
    const enrollment = await Enrollment.findOne({
      userId: req.user!.id,
      courseId: req.params.courseId,
      paymentStatus: 'paid',
    });
    res.json({ success: true, enrolled: !!enrollment, enrollment });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
```

- [ ] **Step 5: Write src/routes/payment.routes.ts**

```typescript
import { Router } from 'express';
import { createPaymentOrder, verifyPayment, razorpayWebhook } from '../controllers/payment.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/create-order', authenticate, createPaymentOrder);
router.post('/verify', authenticate, verifyPayment);
router.post('/webhook', razorpayWebhook); // no auth — Razorpay signature verified inside

export default router;
```

- [ ] **Step 6: Write src/routes/enrollment.routes.ts**

```typescript
import { Router } from 'express';
import { getMyEnrollments, checkEnrollment } from '../controllers/enrollment.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, getMyEnrollments);
router.get('/:courseId', authenticate, checkEnrollment);

export default router;
```

- [ ] **Step 7: Add to src/app.ts**

```typescript
import paymentRoutes from './routes/payment.routes';
import enrollmentRoutes from './routes/enrollment.routes';
// ...
app.use('/api/payments', paymentRoutes);
app.use('/api/enrollments', enrollmentRoutes);
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
npm test -- --testPathPattern=payment
```

Expected: 2 passing

- [ ] **Step 9: Commit**

```bash
git add src/ tests/payment.test.ts
git commit -m "feat: Razorpay payment order, verification, webhook, and enrollment routes"
```

---

## Task 11: Progress Routes

**Files:**
- Create: `backend/src/controllers/progress.controller.ts`
- Create: `backend/src/routes/progress.routes.ts`
- Modify: `backend/src/app.ts`

**Endpoints:**
- `POST /api/progress` — authenticated + enrolled: upsert lesson progress
- `GET /api/progress/course/:courseId` — authenticated: get all progress for a course
- `GET /api/progress/recent` — authenticated: last 5 watched lessons across all courses

- [ ] **Step 1: Write src/controllers/progress.controller.ts**

```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { Progress } from '../models/Progress';
import { Enrollment } from '../models/Enrollment';

const updateProgressSchema = z.object({
  lessonId: z.string().min(1),
  courseId: z.string().min(1),
  watchedSeconds: z.number().min(0),
  duration: z.number().min(0),
  completed: z.boolean().optional(),
});

export async function updateProgress(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId, courseId, watchedSeconds, duration, completed } = updateProgressSchema.parse(req.body);

    // Verify enrollment
    const enrollment = await Enrollment.findOne({ userId: req.user!.id, courseId, paymentStatus: 'paid' });
    if (!enrollment) {
      res.status(403).json({ success: false, message: 'Not enrolled in this course' });
      return;
    }

    const isCompleted = completed ?? (duration > 0 && watchedSeconds / duration >= 0.9);

    const progress = await Progress.findOneAndUpdate(
      { userId: req.user!.id, lessonId },
      { courseId, watchedSeconds, duration, completed: isCompleted, lastWatchedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true, progress });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getCourseProgress(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    const progressList = await Progress.find({ userId: req.user!.id, courseId });
    const completedCount = progressList.filter((p) => p.completed).length;
    res.json({ success: true, progress: progressList, completedCount });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getRecentProgress(req: Request, res: Response): Promise<void> {
  try {
    const recent = await Progress.find({ userId: req.user!.id })
      .sort({ lastWatchedAt: -1 })
      .limit(5)
      .populate('lessonId', 'title duration courseId')
      .populate('courseId', 'title slug thumbnail');
    res.json({ success: true, recent });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
```

- [ ] **Step 2: Write src/routes/progress.routes.ts**

```typescript
import { Router } from 'express';
import { updateProgress, getCourseProgress, getRecentProgress } from '../controllers/progress.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/', authenticate, updateProgress);
router.get('/recent', authenticate, getRecentProgress);
router.get('/course/:courseId', authenticate, getCourseProgress);

export default router;
```

- [ ] **Step 3: Add to src/app.ts**

```typescript
import progressRoutes from './routes/progress.routes';
// ...
app.use('/api/progress', progressRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add src/controllers/progress.controller.ts src/routes/progress.routes.ts src/app.ts
git commit -m "feat: progress tracking with upsert, course progress, and recent lessons"
```

---

## Task 12: Admin Dashboard Routes

**Files:**
- Create: `backend/src/controllers/admin.controller.ts`
- Create: `backend/src/routes/admin.routes.ts`
- Modify: `backend/src/app.ts`

**Endpoints:**
- `GET /api/admin/dashboard` — admin: aggregate stats
- `GET /api/admin/students` — admin: paginated student list
- `GET /api/admin/enrollments` — admin: all enrollments with user+course
- `GET /api/admin/courses` — admin: all courses (including unpublished)

- [ ] **Step 1: Write src/controllers/admin.controller.ts**

```typescript
import { Request, Response } from 'express';
import { User } from '../models/User';
import { Course } from '../models/Course';
import { Enrollment } from '../models/Enrollment';

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const [totalStudents, totalCourses, totalEnrollments, revenueResult] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Course.countDocuments(),
      Enrollment.countDocuments({ paymentStatus: 'paid' }),
      Enrollment.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'course' } },
        { $unwind: '$course' },
        { $group: { _id: null, total: { $sum: '$course.price' } } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.total ?? 0;

    res.json({
      success: true,
      stats: { totalStudents, totalCourses, totalEnrollments, totalRevenue },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getStudents(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (Number(page) - 1) * Number(limit);
    const [students, total] = await Promise.all([
      User.find({ role: 'student' }).select('-passwordHash').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      User.countDocuments({ role: 'student' }),
    ]);
    res.json({ success: true, students, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getAllEnrollments(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (Number(page) - 1) * Number(limit);
    const [enrollments, total] = await Promise.all([
      Enrollment.find({ paymentStatus: 'paid' })
        .populate('userId', 'name email')
        .populate('courseId', 'title price')
        .skip(skip)
        .limit(Number(limit))
        .sort({ enrolledAt: -1 }),
      Enrollment.countDocuments({ paymentStatus: 'paid' }),
    ]);
    res.json({ success: true, enrollments, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getAllCourses(req: Request, res: Response): Promise<void> {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json({ success: true, courses });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
```

- [ ] **Step 2: Write src/routes/admin.routes.ts**

```typescript
import { Router } from 'express';
import { getDashboard, getStudents, getAllEnrollments, getAllCourses } from '../controllers/admin.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/students', getStudents);
router.get('/enrollments', getAllEnrollments);
router.get('/courses', getAllCourses);

export default router;
```

- [ ] **Step 3: Add to src/app.ts**

```typescript
import adminRoutes from './routes/admin.routes';
// ...
app.use('/api/admin', adminRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add src/controllers/admin.controller.ts src/routes/admin.routes.ts src/app.ts
git commit -m "feat: admin dashboard, students, enrollments, and courses overview"
```

---

## Task 13: Seed Data + Final app.ts Verification

**Files:**
- Create: `backend/src/seed.ts`

- [ ] **Step 1: Write src/seed.ts**

```typescript
import { connectDB, disconnectDB } from './config/db';
import { User } from './models/User';
import { Course } from './models/Course';
import { Lesson } from './models/Lesson';
import bcrypt from 'bcryptjs';

async function seed() {
  await connectDB();

  await User.deleteMany({});
  await Course.deleteMany({});
  await Lesson.deleteMany({});

  const admin = await User.create({
    name: 'Admin',
    email: 'admin@veolms.com',
    passwordHash: await bcrypt.hash('Admin@123', 12),
    role: 'admin',
  });

  await User.create({
    name: 'Student Demo',
    email: 'student@veolms.com',
    passwordHash: await bcrypt.hash('Student@123', 12),
    role: 'student',
  });

  const sectionId = new (require('mongoose').Types.ObjectId)();

  const course = await Course.create({
    title: 'JavaScript Fundamentals',
    slug: 'javascript-fundamentals',
    thumbnail: 'https://via.placeholder.com/640x360',
    description: 'Master JavaScript from scratch. Learn variables, functions, closures, async/await, and DOM manipulation.',
    shortDescription: 'Complete JavaScript course for beginners',
    instructor: 'Admin',
    price: 999,
    currency: 'INR',
    sections: [{ _id: sectionId, title: 'Getting Started', order: 0 }],
    isPublished: true,
    totalLessons: 2,
    createdBy: admin._id,
  });

  await Lesson.create([
    {
      courseId: course._id,
      sectionId,
      title: 'Introduction to JavaScript',
      videoKey: 'videos/raw/sample.mp4',
      duration: 600,
      order: 0,
      isPreview: true,
      status: 'ready',
    },
    {
      courseId: course._id,
      sectionId,
      title: 'Variables and Data Types',
      videoKey: 'videos/raw/sample2.mp4',
      duration: 900,
      order: 1,
      isPreview: false,
      status: 'ready',
    },
  ]);

  console.log('✅ Seed complete');
  console.log('Admin: admin@veolms.com / Admin@123');
  console.log('Student: student@veolms.com / Student@123');
  await disconnectDB();
}

seed().catch(console.error);
```

- [ ] **Step 2: Add seed script to package.json**

```json
"seed": "ts-node src/seed.ts"
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: All tests passing

- [ ] **Step 4: Verify final app.ts has all routes**

`src/app.ts` final state should register:
- `/api/auth` — authRoutes
- `/api/courses` — courseRoutes
- `/api/lessons` — lessonRoutes
- `/api/upload` — uploadRoutes
- `/api/payments` — paymentRoutes
- `/api/enrollments` — enrollmentRoutes
- `/api/progress` — progressRoutes
- `/api/admin` — adminRoutes

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: seed data script and complete backend API"
```

---

## API Reference Summary

| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | /api/auth/signup | No | — |
| POST | /api/auth/login | No | — |
| GET | /api/auth/me | Yes | Any |
| GET | /api/courses | No | — |
| GET | /api/courses/:slug | No | — |
| POST | /api/courses | Yes | Admin |
| PUT | /api/courses/:id | Yes | Admin |
| DELETE | /api/courses/:id | Yes | Admin |
| PATCH | /api/courses/:id/publish | Yes | Admin |
| GET | /api/lessons/course/:courseId | Optional | — |
| GET | /api/lessons/:id/stream | Yes | Enrolled/Admin |
| POST | /api/lessons | Yes | Admin |
| PUT | /api/lessons/:id | Yes | Admin |
| DELETE | /api/lessons/:id | Yes | Admin |
| POST | /api/upload/thumbnail | Yes | Admin |
| POST | /api/upload/video | Yes | Admin |
| POST | /api/upload/transcode/:lessonId | Yes | Admin |
| POST | /api/payments/create-order | Yes | Student |
| POST | /api/payments/verify | Yes | Student |
| POST | /api/payments/webhook | No (sig) | — |
| GET | /api/enrollments | Yes | Any |
| GET | /api/enrollments/:courseId | Yes | Any |
| POST | /api/progress | Yes | Enrolled |
| GET | /api/progress/course/:courseId | Yes | Any |
| GET | /api/progress/recent | Yes | Any |
| GET | /api/admin/dashboard | Yes | Admin |
| GET | /api/admin/students | Yes | Admin |
| GET | /api/admin/enrollments | Yes | Admin |
| GET | /api/admin/courses | Yes | Admin |
