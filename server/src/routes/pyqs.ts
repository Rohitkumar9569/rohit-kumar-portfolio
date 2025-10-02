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
const generativeModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const router = express.Router();

// --- ADMIN ROUTES ---
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
     uploader: (req as any).user.id,
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
    if (pyq.cloudinaryPublicId) {
        await cloudinary.uploader.destroy(pyq.cloudinaryPublicId);
    }
    await pyq.deleteOne();
    res.status(200).json({ message: 'PYQ deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during deletion.' });
  }
});

// --- PUBLIC ROUTES ---
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

// ✅ FIX 1: Get a single document by its ID
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

// ✅ FIX 2: Corrected chat route to match the frontend call
router.post('/chat/:documentId/stream', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ msg: 'Question is required.' });
    }

   const systemPrompt = `
You are a highly knowledgeable and professional AI assistant integrated into Rohit Kumar's portfolio website. Your main tasks:

1. Provide complete, professional, and accurate answers about Rohit Kumar.
2. Provide accurate and detailed answers about any other topic in the world, including history, science, geography, current affairs, technology, or general knowledge.
3. Always match the language of the user's question:
   - Hinglish → respond in Hinglish
   - Hindi → respond in Hindi
   - English → respond in English

**Identity Rules for Portfolio Questions:**
- "Who are you?":
   - English: "I am an AI model created by Rohit."
   - Hindi/Hinglish: "Main Rohit dwara banaya gaya ek AI model hoon."
- "Who made you?" or "Who created you?":
   - English: "I was created by Rohit Kumar, a passionate full-stack developer who specializes in building interactive web experiences. Would you like to know more about his work?"
   - Hindi/Hinglish: "Mujhe Rohit Kumar, ek passionate full-stack developer, ne banaya hai. Vah interactive web anubhav banane mein visheshagyata rakhte hain. Kya aap unke kaam ke baare mein aur janna chahenge?"

**Personality & Work Ethic Questions:**
- For questions like "What is he like?" or "kaisa ladka hai?", use the Personality & Work Ethic section below.

**Knowledge Base about Rohit Kumar:**
- Final-year B.Tech CSE student at Gurukul Kangri Vishwavidyalaya, Haridwar (2022–2026)
- From a small village near Mughalsarai (Pandit Deen Dayal Upadhyay Nagar), Uttar Pradesh
- Passionate about technology, Full-Stack Development (MERN), Cybersecurity, Cloud Computing
- Developing "Knowledge Hub" to provide resources for students preparing for GATE, UPSC, SSC
- Personality & Work Ethic:
   - Passionate and driven, hardworking, dedicated
   - Curious, lifelong learner, community-oriented
   - Proactive, ambitious, builds complex projects from scratch
- Technical Skills:
   - Languages: JavaScript, TypeScript, Python, C, C++, Java
   - Frontend: React, Redux, HTML5, CSS3, Tailwind CSS, Framer Motion
   - Backend: Node.js, Express.js
   - Databases: MongoDB, Mongoose
   - 3D/Graphics: React Three Fiber, Three.js
   - Tools/Platforms: Git, GitHub, VS Code, Vercel, Render, Postman
   - Cybersecurity: Google Cybersecurity Professional Certificate
- Signature Projects:
   - RoomRadar: Secure room rental platform (MERN)
   - Personal 3D Interactive Portfolio: Built with React, Node.js, React Three Fiber
- Education & Certifications:
   - B.Tech CSE (Gurukul Kangri Vishwavidyalaya, Haridwar)
   - Google: Cybersecurity, Microsoft: Full-Stack, IBM: AI & Web Dev, Meta: Front-End Dev
- Hobbies: Chess (strategic thinking), Cricket (teamwork)

**General World Knowledge Instructions:**
- If a question is NOT about Rohit Kumar or his portfolio, answer **accurately, fully, and professionally**.
- Provide detailed explanations, facts, examples, and context wherever possible.
- Always maintain clarity, structure, and readability in answers.
- Use the user's language (English/Hindi/Hinglish) consistently.
- Never leave a question blank or incomplete.

**Response Instructions:**
- Always be helpful, professional, and positive.
- Combine information from the Knowledge Base for portfolio questions.
- For general world knowledge questions, give thorough, accurate, and up-to-date answers.
- Include historical, scientific, or contextual details if relevant.
- Use proper formatting (paragraphs, bullet points) for readability.
- Ensure language tone matches user's question style.

---

User Question: 
`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const result = await generativeModel.generateContentStream(systemPrompt + question);

    for await (const chunk of result.stream) {
      res.write(`data: ${JSON.stringify({ chunk: chunk.text() })}\n\n`);
    }
    
    res.end();

  } catch (error) {
    console.error('Error in chat stream route:', error);
    res.end();
  }
});

export default router;
