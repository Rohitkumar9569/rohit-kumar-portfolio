import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User';
import { cleanString, isValidEmail } from '../utils/validation';

const MONGO_URI = process.env.MONGO_URI;

const getArg = (name: string) => {
  const prefix = `--${name}=`;
  const inlineArg = process.argv.find((arg) => arg.startsWith(prefix));
  if (inlineArg) return inlineArg.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];

  return undefined;
};

const emailInput = getArg('email') || process.env.ADMIN_EMAIL || '';
const passwordInput = getArg('password') || process.env.ADMIN_PASSWORD || '';

const run = async () => {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not defined.');
  }

  const password = typeof passwordInput === 'string' ? passwordInput : '';
  if (!password || password.length < 8) {
    throw new Error('Provide ADMIN_PASSWORD or --password with at least 8 characters.');
  }

  await mongoose.connect(MONGO_URI);

  const normalizedEmail = emailInput
    ? cleanString(emailInput, 254).toLowerCase()
    : '';

  if (normalizedEmail && !isValidEmail(normalizedEmail)) {
    throw new Error('Provide a valid ADMIN_EMAIL or --email value.');
  }

  const users = await User.find({}).sort({ createdAt: 1 });
  let user = normalizedEmail
    ? await User.findOne({ email: normalizedEmail })
    : users.length === 1
      ? users[0]
      : null;

  if (!user && users.length === 0) {
    if (!normalizedEmail) {
      throw new Error('No admin exists yet. Provide ADMIN_EMAIL or --email to create the first admin.');
    }

    user = new User({ email: normalizedEmail, password, role: 'admin' });
    await user.save();
    console.log(`Created first admin user: ${user.email}`);
    return;
  }

  if (!user) {
    throw new Error('Admin email was not found. Run npm run admin:list -- --show-email to check the saved login email.');
  }

  user.password = password;
  user.role = 'admin';
  await user.save();

  console.log(`Admin password reset successfully for: ${user.email}`);
};

run()
  .catch((error) => {
    console.error('Admin password reset failed:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
