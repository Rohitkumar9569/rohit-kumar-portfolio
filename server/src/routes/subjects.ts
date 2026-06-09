import { Router } from 'express';
import Subject from '../models/Subject';
import Exam from '../models/Exam';
import { protect, requireAdmin, ensureAdminExamAccess } from '../middleware/auth';
import PyqDocument from '../models/PyqDocument';
import cloudinary from '../config/cloudinary';
import { cleanString, isValidObjectId } from '../utils/validation';

const router = Router();

const deleteCloudinaryResources = async (publicIds: string[]) => {
  await Promise.all(
    publicIds.map(publicId =>
      cloudinary.uploader.destroy(publicId).catch(error => {
        console.warn(`Cloudinary cleanup failed for ${publicId}:`, error);
      })
    )
  );
};

/**
 * @route   POST /api/subjects
 * @desc    Create a new subject linked to an exam
 * @access  Private (Admin) - PROTECTED
 */
router.post('/', protect, requireAdmin, async (req, res) => {
  try {
    const name = cleanString(req.body.name, 120);
    const examId = req.body.examId;

    if (!name || !examId) {
      return res.status(400).json({ message: 'Subject name and examId are required.' });
    }
    if (!isValidObjectId(examId)) {
      return res.status(400).json({ message: 'Invalid exam ID.' });
    }

    const parentExam = await Exam.findById(examId);
    if (!parentExam) {
      return res.status(404).json({ message: 'Cannot create subject. Exam not found.' });
    }

    if (!(await ensureAdminExamAccess(req, res, parentExam.slug))) return;

    const newSubject = new Subject({ name, examId });
    await newSubject.save();
    res.status(201).json(newSubject);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This subject already exists for the selected exam.' });
    }
    res.status(500).json({ message: 'Server error while creating subject.' });
  }
});

/**
 * @route   GET /api/subjects/by-exam/:examId
 * @desc    Get all subjects for a specific exam
 * @access  Public
 */
router.get('/by-exam/:examId', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.examId)) {
      return res.status(400).json({ message: 'Invalid exam ID.' });
    }

    const subjects = await Subject.find({ examId: req.params.examId }).sort({ name: 1 });
    res.status(200).json(subjects);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error while fetching subjects.' });
  }
});

/**
 * @route   PUT /api/subjects/:id
 * @desc    Update a subject's name by its ID
 * @access  Private (Admin) - PROTECTED
 */
router.put('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const name = cleanString(req.body.name, 120);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid subject ID.' });
    }
    if (!name) {
      return res.status(400).json({ message: 'Subject name is required.' });
    }

    const subject = await Subject.findById(id).select('examId').lean();
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    const parentExam = await Exam.findById(subject.examId).select('slug').lean();
    if (!parentExam) {
      return res.status(404).json({ message: 'Parent exam not found.' });
    }

    if (!(await ensureAdminExamAccess(req, res, parentExam.slug))) return;

    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedSubject);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This subject already exists for the selected exam.' });
    }
    res.status(500).json({ message: 'Server error while updating subject.' });
  }
});

/**
 * @route   DELETE /api/subjects/:id
 * @desc    Delete a subject by its ID
 * @access  Private (Admin) - PROTECTED
 */
router.delete('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid subject ID.' });
    }

    const subject = await Subject.findById(id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    const parentExam = await Exam.findById(subject.examId).select('slug').lean();
    if (!parentExam) {
      return res.status(404).json({ message: 'Parent exam not found.' });
    }

    if (!(await ensureAdminExamAccess(req, res, parentExam.slug))) return;

    const pyqs = await PyqDocument.find({ subjectId: id }).select('cloudinaryPublicId');
    await deleteCloudinaryResources(pyqs.map(pyq => pyq.cloudinaryPublicId).filter(Boolean));
    await PyqDocument.deleteMany({ subjectId: id });
    await subject.deleteOne();

    res.status(200).json({ message: 'Subject and related PYQs deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error while deleting subject.' });
  }
});

export default router;
