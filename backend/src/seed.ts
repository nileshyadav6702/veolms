import { connectDB, disconnectDB } from './config/db';
import { User } from './models/User';
import bcrypt from 'bcryptjs';

async function seed() {
  await connectDB();

  await User.deleteMany({});

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

  console.log('✅ Seed complete — Users seeded');
  console.log('Admin:   admin@veolms.com   / Admin@123');
  console.log('Student: student@veolms.com / Student@123');
  await disconnectDB();
}

seed().catch(console.error);
