import { Router } from 'express';
import Exam from '../models/Exam';
import { protect, requireAdmin, requireFullAdminAccess, ensureAdminExamAccess } from '../middleware/auth';
import Subject from '../models/Subject';
import PyqDocument from '../models/PyqDocument';
import cloudinary from '../config/cloudinary';
import { cleanString, isValidObjectId, isValidSlug } from '../utils/validation';

const router = Router();

const normalizeExamPayload = (body: any) => {
  const name = cleanString(body.name, 120);
  const shortName = cleanString(body.shortName, 30).toUpperCase();
  const slug = cleanString(body.slug, 80).toLowerCase();
  return { name, shortName, slug };
};

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
 * @route   GET /api/exams
 * @desc    Get all exams
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const exams = await Exam.find().sort({ name: 1 });
    res.status(200).json(exams);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error while fetching exams.' });
  }
});

/**
 * @route   POST /api/exams
 * @desc    Create a new exam
 * @access  Private (Admin) - PROTECTED
 */
router.post('/', protect, requireFullAdminAccess, async (req, res) => {
  try {
    const { name, shortName, slug } = normalizeExamPayload(req.body);

    if (!name || !shortName || !slug) {
      return res.status(400).json({ message: 'Name, shortName, and slug are required.' });
    }
    if (!isValidSlug(slug)) {
      return res.status(400).json({ message: 'Slug can only contain lowercase letters, numbers, and hyphens.' });
    }

    const newExam = new Exam({ name, shortName, slug });
    await newExam.save();
    res.status(201).json(newExam);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An exam with this shortName or slug already exists.' });
    }
    res.status(500).json({ message: 'Server error while creating exam.' });
  }
});

/**
 * @route   PUT /api/exams/:id
 * @desc    Update an existing exam by its ID
 * @access  Private (Admin) - PROTECTED
 */
router.put('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { name, shortName, slug } = normalizeExamPayload(req.body);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid exam ID.' });
    }
    if (!name || !shortName || !slug) {
      return res.status(400).json({ message: 'Name, shortName, and slug are required.' });
    }
    if (!isValidSlug(slug)) {
      return res.status(400).json({ message: 'Slug can only contain lowercase letters, numbers, and hyphens.' });
    }

    const existingExam = await Exam.findById(id).select('slug').lean();
    if (!existingExam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    if (!(await ensureAdminExamAccess(req, res, existingExam.slug))) return;

    const updatedExam = await Exam.findByIdAndUpdate(
      id,
      { name, shortName, slug },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedExam);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An exam with this shortName or slug already exists.' });
    }
    res.status(500).json({ message: 'Server error while updating exam.' });
  }
});

/**
 * @route   DELETE /api/exams/:id
 * @desc    Delete an exam by ID
 * @access  Private (Admin) - PROTECTED
 */
router.delete('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid exam ID.' });
    }

    const exam = await Exam.findById(id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    if (!(await ensureAdminExamAccess(req, res, exam.slug))) return;

    const pyqs = await PyqDocument.find({ examId: id }).select('cloudinaryPublicId');
    await deleteCloudinaryResources(pyqs.map(pyq => pyq.cloudinaryPublicId).filter(Boolean));
    await PyqDocument.deleteMany({ examId: id });
    await Subject.deleteMany({ examId: id });
    await exam.deleteOne();

    res.status(200).json({ message: 'Exam and related data deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error while deleting exam.' });
  }
});

export default router;
