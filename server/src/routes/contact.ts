// server/src/routes/contact.ts

import { Router, Request, Response } from 'express';
import Message from '../models/message';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;
    const newMessage = new Message({ name, email, message });
    await newMessage.save();
    res.status(201).json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error, please try again.' });
  }
});

export default router;