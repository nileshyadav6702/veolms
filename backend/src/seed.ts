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

  const sectionId = new Types.ObjectId();

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
