// File: server/src/routes/auth.ts
import { Router } from 'express';
import User from '../models/User';
import jwt from 'jsonwebtoken';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register the first admin user. Disables after one user exists.
 * @access  Public (for setup only)
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // IMPORTANT: This check prevents anyone else from creating an admin account.
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res.status(403).json({ message: 'Admin account already exists. Registration is disabled.' });
    }

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = new User({ email, password });
    await user.save();

    res.status(201).json({ message: 'Admin user created successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error during registration.', error });
  }
});


/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return a JWT
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find the user by their email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Use the 'comparePassword' method we created in the model
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // If credentials are correct, create the JWT
    const payload = { id: user.id };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: '1d' } // Token expires in 1 day
    );

    res.status(200).json({ token });

  } catch (error: any) {
    res.status(500).json({ message: 'Server error during login.', error });
  }
});


export default router;