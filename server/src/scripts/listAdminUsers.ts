import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User';

const MONGO_URI = process.env.MONGO_URI;
const showEmail = process.argv.includes('--show-email');

const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${'*'.repeat(Math.max(2, name.length - visible.length))}@${domain}`;
};

const run = async () => {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not defined.');
  }

  await mongoose.connect(MONGO_URI);

  const users = await User.find({})
    .select('email createdAt updatedAt')
    .sort({ createdAt: 1 })
    .lean();

  if (!users.length) {
    console.log('No admin user found. Use POST /api/auth/register or npm run admin:reset-password to create the first admin.');
    return;
  }

  console.log(`Admin user count: ${users.length}`);
  users.forEach((user: any, index) => {
    const email = showEmail ? user.email : maskEmail(user.email);
    const createdAt = user.createdAt ? new Date(user.createdAt).toISOString() : 'unknown';
    console.log(`${index + 1}. ${email} | createdAt=${createdAt}`);
  });
};

run()
  .catch((error) => {
    console.error('Admin user inspection failed:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
