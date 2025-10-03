// File: server/src/routes/suggestions.ts

import express from 'express';
import DailyJourney from '../models/DailyJourney';

const router = express.Router();

/**
 * @route   GET /api/suggestions/today
 * @desc    Fetch the ordered journey of question pairs for the day.
 * @access  Public
 */
router.get('/today', async (req, res) => {
  try {
    const todayQueryString = new Date().toISOString().split('T')[0];
    const journey = await DailyJourney.findOne({ journeyDate: todayQueryString });

    // If no journey is found for today in the database.
    if (!journey || journey.questions.length === 0) {
      return res.status(200).json({
        isExhausted: true,
        message: "Today's learning journey is being prepared. Please check back in a bit!",
        journey: [],
      });
    }

    // Send the structured pairs to the frontend.
    res.status(200).json({
      isExhausted: false,
      journey: journey.questions,
    });

  } catch (error) {
    console.error('Error fetching daily journey:', error);
    res.status(500).json({ message: "Server error while fetching journey." });
  }
});

export default router;