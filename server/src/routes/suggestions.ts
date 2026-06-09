// File: server/src/routes/suggestions.ts

import express from 'express';

const router = express.Router();

const disabledJourneyResponse = {
  isExhausted: true,
  message: 'Sarathi is ready for Study Hub, portfolio, exam, software, and general learning guidance.',
  journey: [],
};

/**
 * @route   GET /api/suggestions/today
 * @desc    Compatibility endpoint for the premium assistant experience.
 * @access  Public
 */
router.get('/today', (_req, res) => {
  res.status(200).json(disabledJourneyResponse);
});

/**
 * @route   GET /api/suggestions/by-date
 * @desc    Compatibility endpoint for the premium assistant experience.
 * @access  Public
 */
router.get('/by-date', (_req, res) => {
  res.status(200).json([]);
});

export default router;
