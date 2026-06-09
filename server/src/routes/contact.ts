// server/src/routes/contact.ts

import { Router, Request, Response } from 'express';
import Message from '../models/message';
import { contactLimiter } from '../middleware/security';
import { cleanString, isValidEmail } from '../utils/validation';
import { getContactEmailErrorDetail, sendContactNotificationEmail } from '../utils/contactEmail';

const router = Router();

router.post('/', contactLimiter, async (req: Request, res: Response) => {
  try {
    const name = cleanString(req.body.name, 80);
    const email = cleanString(req.body.email, 254).toLowerCase();
    const message = cleanString(req.body.message, 2000);

    if (!name || !email || !message || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid name, email, and message.' });
    }

    const newMessage = new Message({ name, email, message });
    await newMessage.save();

    try {
      const emailResult = await sendContactNotificationEmail({
        name,
        email,
        message,
        messageId: String(newMessage._id),
        receivedAt: newMessage.createdAt || new Date(),
      });

      if (!emailResult.configured) {
        console.warn('Contact email notification is not configured. Message was saved only.');
        return res.status(201).json({
          success: true,
          emailDelivered: false,
          message: 'Message received. Email notification is not configured yet.',
        });
      }

      return res.status(201).json({
        success: true,
        emailDelivered: emailResult.sent,
        message: 'Message sent successfully!',
      });
    } catch (emailError) {
      const emailErrorDetail = getContactEmailErrorDetail(emailError);
      console.error('Contact email notification failed:', emailErrorDetail);
      return res.status(201).json({
        success: true,
        emailDelivered: false,
        emailError:
          process.env.NODE_ENV === 'production'
            ? undefined
            : `${emailErrorDetail.code ? `${emailErrorDetail.code}: ` : ''}${emailErrorDetail.message}`,
        message: 'Message received, but email notification could not be sent.',
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error, please try again.' });
  }
});

export default router;
