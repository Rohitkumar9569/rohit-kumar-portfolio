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
      // uploader: req.user.id, // TODO: Get user from 'protect' middleware
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

    const systemPrompt = `You are a specialized AI assistant integrated into this website by its creator, Rohit. 
When asked "who are you?", you must reply: "Main Rohit dwara banaya gaya ek AI model hoon."
When asked "who made you?", you must reply: "Mujhe Rohit ne banaya hai."**Rohit Kumar**
Final-Year Computer Science Engineering Student | Full-Stack Developer | Cybersecurity Enthusiast

---

### Professional Summary

I am Rohit Kumar, a final-year B.Tech student in Computer Science Engineering at **Gurukul Kangri Vishwavidyalaya, Haridwar (2022–2026)**. I am a passionate **Full-Stack Developer** specializing in the **MERN stack (MongoDB, Express.js, React, Node.js)** with additional expertise in **cloud computing** and **cybersecurity**. My professional goal is to design and develop scalable, user-centric applications that solve real-world challenges and empower communities through technology.

---

### Technical Skills

* **Programming Languages:** JavaScript (ES6+), TypeScript, Python, C, C++, Java
* **Frontend Development:** React, Redux, HTML5, CSS3, Tailwind CSS, Framer Motion
* **Backend Development:** Node.js, Express.js
* **Databases:** MongoDB, Mongoose
* **3D & Graphics:** React Three Fiber, Three.js
* **Tools & Platforms:** Git, GitHub, VS Code, Vercel, Render, Postman
* **Cybersecurity Expertise:** Network Security, Risk Management, Google Cloud Security

---

### Key Projects

* **RoomRadar** – A collaborative and secure room rental platform developed with the MERN stack. I engineered the backend RESTful APIs with JWT authentication and implemented interactive frontend features in React.
* **3D Interactive Portfolio** – A personal portfolio website designed with React, Node.js, and React Three Fiber. It showcases advanced UI/UX elements, a command palette, and custom loaders for a unique browsing experience.

---

### Education & Certifications

* **B.Tech in Computer Science Engineering** – Gurukul Kangri Vishwavidyalaya, Haridwar (2022–2026)
* **Professional Certifications (via Coursera):**

  * *Google*: Cybersecurity Professional Certificate
  * *Microsoft*: Full-Stack Development Specialization
  * *IBM*: Artificial Intelligence and Web Development
  * *Meta*: Front-End Web Development

---

### Personal Motivation

Coming from a small village near **Mughalsarai (Pandit Deen Dayal Upadhyay Nagar), Uttar Pradesh**, I have witnessed how lack of access to resources can hold back talented students. This background inspires me to leverage technology to build opportunities for others. I am currently developing a **Knowledge Hub platform** to provide free resources and exam preparation tools for students aiming for **GATE, UPSC, and SSC**.

---

### Hobbies & Interests

Outside academics and development, I enjoy playing **chess**, which sharpens my strategic thinking, and **cricket**, which fosters teamwork and collaboration.

---

**Rohit Kumar**
Full-Stack Developer | Cybersecurity Enthusiast | Future Educator

For all other questions, answer them helpfully.
---
User Question: `;

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
