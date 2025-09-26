import { Router } from 'express';
import Subject from '../models/Subject';
import Exam from '../models/Exam';
import { protect } from '../middleware/auth'; // 1. Import the protect middleware

const router = Router();

/**
 * @route   POST /api/subjects
 * @desc    Create a new subject linked to an exam
 * @access  Private (Admin) - PROTECTED
 */
router.post('/', protect, async (req, res) => { // 2. Add 'protect' middleware
  try {
    const { name, examId } = req.body;

    if (!name || !examId) {
      return res.status(400).json({ message: 'Subject name and examId are required.' });
    }

    const parentExam = await Exam.findById(examId);
    if (!parentExam) {
      return res.status(404).json({ message: 'Cannot create subject. Exam not found.' });
    }

    const newSubject = new Subject({ name, examId });
    await newSubject.save();
    res.status(201).json(newSubject);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error while creating subject.', error });
  }
});

/**
 * @route   GET /api/subjects/by-exam/:examId
 * @desc    Get all subjects for a specific exam
 * @access  Public
 */
router.get('/by-exam/:examId', async (req, res) => {
  try {
    const subjects = await Subject.find({ examId: req.params.examId }).sort({ name: 1 });
    res.status(200).json(subjects);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error while fetching subjects.', error });
  }
});

/**
 * @route   PUT /api/subjects/:id
 * @desc    Update a subject's name by its ID
 * @access  Private (Admin) - PROTECTED
 */
router.put('/:id', protect, async (req, res) => { // 3. Add 'protect' middleware
  try {
    const { name } = req.body;
    const { id } = req.params;

    if (!name) {
      return res.status(400).json({ message: 'Subject name is required.' });
    }

    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!updatedSubject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    res.status(200).json(updatedSubject);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error while updating subject.', error });
  }
});

/**
 * @route   DELETE /api/subjects/:id
 * @desc    Delete a subject by its ID
 * @access  Private (Admin) - PROTECTED
 */
router.delete('/:id', protect, async (req, res) => { // 4. Add 'protect' middleware
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }
    
    // TODO: Add logic here to delete all associated PyqDocuments.

    res.status(200).json({ message: 'Subject deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error while deleting subject.', error });
  }
});

export default router;