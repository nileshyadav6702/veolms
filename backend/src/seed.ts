import { connectDB, disconnectDB } from './config/db';
import { User } from './models/User';
import { Course } from './models/Course';
import { Lesson } from './models/Lesson';
import { Types } from 'mongoose';
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

  // ── Course 1: JavaScript Fundamentals ──────────────────────────────
  const jsSection1 = new Types.ObjectId();
  const jsSection2 = new Types.ObjectId();

  const jsCourse = await Course.create({
    title: 'JavaScript Fundamentals',
    slug: 'javascript-fundamentals',
    thumbnail: 'https://via.placeholder.com/640x360/F7DF1E/000000?text=JavaScript',
    description: 'Master JavaScript from scratch. Learn variables, functions, closures, async/await, and DOM manipulation. Perfect for beginners who want to build interactive web pages.',
    shortDescription: 'Complete JavaScript course for beginners',
    instructor: 'Admin',
    price: 999,
    currency: 'INR',
    sections: [
      { _id: jsSection1, title: 'Getting Started', order: 0 },
      { _id: jsSection2, title: 'Core Concepts', order: 1 },
    ],
    isPublished: true,
    totalLessons: 5,
    createdBy: admin._id,
  });

  await Lesson.create([
    { courseId: jsCourse._id, sectionId: jsSection1, title: 'Introduction to JavaScript', videoKey: 'videos/raw/js-intro.mp4', duration: 600, order: 0, isPreview: true, status: 'ready' },
    { courseId: jsCourse._id, sectionId: jsSection1, title: 'Setting Up Your Environment', videoKey: 'videos/raw/js-setup.mp4', duration: 480, order: 1, isPreview: false, status: 'ready' },
    { courseId: jsCourse._id, sectionId: jsSection2, title: 'Variables and Data Types', videoKey: 'videos/raw/js-vars.mp4', duration: 900, order: 2, isPreview: false, status: 'ready' },
    { courseId: jsCourse._id, sectionId: jsSection2, title: 'Functions and Scope', videoKey: 'videos/raw/js-functions.mp4', duration: 1020, order: 3, isPreview: false, status: 'ready' },
    { courseId: jsCourse._id, sectionId: jsSection2, title: 'DOM Manipulation', videoKey: 'videos/raw/js-dom.mp4', duration: 1200, order: 4, isPreview: false, status: 'ready' },
  ]);

  // ── Course 2: React for Beginners ──────────────────────────────────
  const reactSection1 = new Types.ObjectId();
  const reactSection2 = new Types.ObjectId();

  const reactCourse = await Course.create({
    title: 'React for Beginners',
    slug: 'react-for-beginners',
    thumbnail: 'https://via.placeholder.com/640x360/61DAFB/000000?text=React',
    description: 'Build modern web applications with React. Learn components, hooks, state management, and how to connect to a REST API. Go from zero to building real projects.',
    shortDescription: 'Learn React from the ground up with hands-on projects',
    instructor: 'Admin',
    price: 1499,
    currency: 'INR',
    sections: [
      { _id: reactSection1, title: 'React Basics', order: 0 },
      { _id: reactSection2, title: 'Hooks & State', order: 1 },
    ],
    isPublished: true,
    totalLessons: 5,
    createdBy: admin._id,
  });

  await Lesson.create([
    { courseId: reactCourse._id, sectionId: reactSection1, title: 'What is React?', videoKey: 'videos/raw/react-intro.mp4', duration: 540, order: 0, isPreview: true, status: 'ready' },
    { courseId: reactCourse._id, sectionId: reactSection1, title: 'JSX and Components', videoKey: 'videos/raw/react-jsx.mp4', duration: 780, order: 1, isPreview: false, status: 'ready' },
    { courseId: reactCourse._id, sectionId: reactSection1, title: 'Props and Data Flow', videoKey: 'videos/raw/react-props.mp4', duration: 840, order: 2, isPreview: false, status: 'ready' },
    { courseId: reactCourse._id, sectionId: reactSection2, title: 'useState and useEffect', videoKey: 'videos/raw/react-hooks.mp4', duration: 1080, order: 3, isPreview: false, status: 'ready' },
    { courseId: reactCourse._id, sectionId: reactSection2, title: 'Fetching Data from APIs', videoKey: 'videos/raw/react-api.mp4', duration: 960, order: 4, isPreview: false, status: 'ready' },
  ]);

  // ── Course 3: Node.js & Express API Development ────────────────────
  const nodeSection1 = new Types.ObjectId();
  const nodeSection2 = new Types.ObjectId();

  const nodeCourse = await Course.create({
    title: 'Node.js & Express API Development',
    slug: 'nodejs-express-api',
    thumbnail: 'https://via.placeholder.com/640x360/339933/FFFFFF?text=Node.js',
    description: 'Build production-ready REST APIs with Node.js and Express. Learn routing, middleware, authentication with JWT, MongoDB integration, and how to deploy your API to the cloud.',
    shortDescription: 'Build REST APIs with Node.js, Express, and MongoDB',
    instructor: 'Admin',
    price: 1299,
    currency: 'INR',
    sections: [
      { _id: nodeSection1, title: 'Express Fundamentals', order: 0 },
      { _id: nodeSection2, title: 'Authentication & Database', order: 1 },
    ],
    isPublished: true,
    totalLessons: 5,
    createdBy: admin._id,
  });

  await Lesson.create([
    { courseId: nodeCourse._id, sectionId: nodeSection1, title: 'Introduction to Node.js', videoKey: 'videos/raw/node-intro.mp4', duration: 660, order: 0, isPreview: true, status: 'ready' },
    { courseId: nodeCourse._id, sectionId: nodeSection1, title: 'Express Routing & Middleware', videoKey: 'videos/raw/node-express.mp4', duration: 900, order: 1, isPreview: false, status: 'ready' },
    { courseId: nodeCourse._id, sectionId: nodeSection1, title: 'Request Validation with Zod', videoKey: 'videos/raw/node-zod.mp4', duration: 720, order: 2, isPreview: false, status: 'ready' },
    { courseId: nodeCourse._id, sectionId: nodeSection2, title: 'MongoDB with Mongoose', videoKey: 'videos/raw/node-mongo.mp4', duration: 1080, order: 3, isPreview: false, status: 'ready' },
    { courseId: nodeCourse._id, sectionId: nodeSection2, title: 'JWT Authentication', videoKey: 'videos/raw/node-jwt.mp4', duration: 1140, order: 4, isPreview: false, status: 'ready' },
  ]);

  console.log('✅ Seed complete — 3 courses, 5 lessons each');
  console.log('Admin:   admin@veolms.com   / Admin@123');
  console.log('Student: student@veolms.com / Student@123');
  await disconnectDB();
}

seed().catch(console.error);
