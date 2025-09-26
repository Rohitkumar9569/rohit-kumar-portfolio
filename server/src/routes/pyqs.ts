import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import PyqDocument from '../models/PyqDocument';
import Subject from '../models/Subject';
import cloudinary from '../config/cloudinary';
import upload from '../middleware/multer';
import { protect } from '../middleware/auth';

// --- AI MODEL INITIALIZATION ---
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in the environment variables.');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ FIX 1: Corrected model names
const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
const generativeModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const router = express.Router();

// --- ADMIN ROUTES (No changes needed here) ---
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    const { title, year, subjectId } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }
    const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'auto', folder: 'pyqs' });
    const newPyq = new PyqDocument({
      title,
      year,
      subjectId,
      examId: subject.examId,
      fileUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      uploader: '60d0fe4f5311236168a109ca', // FIXME
      chunks: [],
    });
    await newPyq.save();
    res.status(201).json(newPyq);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error during upload.' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const { title, year } = req.body;
    if (!title || !year) {
      return res.status(400).json({ message: 'Title and year are required.' });
    }
    const updatedPyq = await PyqDocument.findByIdAndUpdate(
      req.params.id,
      { title, year },
      { new: true, runValidators: true }
    ).select('-chunks');
    if (!updatedPyq) {
      return res.status(404).json({ message: 'PYQ document not found.' });
    }
    res.status(200).json(updatedPyq);
  } catch (error) {
    res.status(500).json({ message: 'Server error during update.' });
  }
});

router.delete('/:id', protect, async (req, res) => {
    try {
    const pyq = await PyqDocument.findById(req.params.id);
    if (!pyq) {
      return res.status(404).json({ message: 'PYQ document not found.' });
    }
    await cloudinary.uploader.destroy(pyq.cloudinaryPublicId);
    await pyq.deleteOne();
    res.status(200).json({ message: 'PYQ deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during deletion.' });
  }
});

// --- PUBLIC ROUTES (No changes needed here) ---
router.get('/', async (req, res) => {
    try {
        const { subjectId } = req.query;
        const query = subjectId ? { subjectId: subjectId as string } : {};
        const pyqs = await PyqDocument.find(query).select('-chunks').sort({ year: -1 });
        res.json(pyqs);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

router.get('/:id', async (req, res) => {
    try {
        const pyq = await PyqDocument.findById(req.params.id).select('-chunks');
        if (!pyq) {
            return res.status(404).json({ msg: 'PYQ document not found' });
        }
        res.json(pyq);
    } catch (error){
        res.status(500).send('Server Error');
    }
});


// ✅ FIX 2: Replaced the old chat route with a new streaming route
router.post('/chat/:id/stream', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ msg: 'Question is required.' });
    }

    // System instructions for the AI's identity
    const systemPrompt = `You are a specialized AI assistant integrated into this website by its creator, Rohit. 
When asked "who are you?", you must reply: "Main Rohit dwara banaya gaya ek AI model hoon."
When asked "who made you?", you must reply: "Mujhe Rohit ne banaya hai."
For all other questions, answer them helpfully.
---
User Question: `;

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Use generateContentStream for streaming responses
    const result = await generativeModel.generateContentStream(systemPrompt + question);

    for await (const chunk of result.stream) {
      // Format the chunk as a Server-Sent Event and write to the response
      res.write(`data: ${JSON.stringify({ chunk: chunk.text() })}\n\n`);
    }
    
    // End the response stream once all chunks are sent
    res.end();

  } catch (error) {
    console.error('Error in chat stream route:', error);
    res.end(); // End the connection in case of an error
  }
});

export default router;