import { Router } from 'express';
import Exam from '../models/Exam';
import { protect } from '../middleware/auth'; // 1. Import the 'protect' middleware

const router = Router();

/**
 * @route   GET /api/exams
 * @desc    Get all exams
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const exams = await Exam.find().sort({ name: 1 });
    res.status(200).json(exams);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error while fetching exams.', error });
  }
});

/**
 * @route   POST /api/exams
 * @desc    Create a new exam
 * @access  Private (Admin) - PROTECTED
 */
router.post('/', protect, async (req, res) => { // 2. Add 'protect' middleware
  try {
    const { name, shortName, slug } = req.body;

    if (!name || !shortName || !slug) {
      return res.status(400).json({ message: 'Name, shortName, and slug are required.' });
    }

    const newExam = new Exam({ name, shortName, slug });
    await newExam.save();
    res.status(201).json(newExam);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An exam with this shortName or slug already exists.' });
    }
    res.status(500).json({ message: 'Server error while creating exam.', error });
  }
});

/**
 * @route   PUT /api/exams/:id
 * @desc    Update an existing exam by its ID
 * @access  Private (Admin) - PROTECTED
 */
router.put('/:id', protect, async (req, res) => { // 3. Add 'protect' middleware
  try {
    const { name, shortName, slug } = req.body;
    const { id } = req.params;

    const updatedExam = await Exam.findByIdAndUpdate(
      id,
      { name, shortName, slug },
      { new: true, runValidators: true }
    );

    if (!updatedExam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    res.status(200).json(updatedExam);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error while updating exam.', error });
  }
});

/**
 * @route   DELETE /api/exams/:id
 * @desc    Delete an exam by ID
 * @access  Private (Admin) - PROTECTED
 */
router.delete('/:id', protect, async (req, res) => { // 4. Add 'protect' middleware
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }
    
    res.status(200).json({ message: 'Exam deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error while deleting exam.', error });
  }
});

export default router;