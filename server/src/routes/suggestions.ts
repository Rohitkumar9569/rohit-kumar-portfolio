// File: server/src/routes/suggestions.ts (UPDATED & CORRECTED)

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
    const now = new Date();
    // This correctly creates the DD-MM-YYYY format for today's date.
    const year = now.toLocaleString('en-US', { year: 'numeric', timeZone: 'Asia/Kolkata' });
    const month = now.toLocaleString('en-US', { month: '2-digit', timeZone: 'Asia/Kolkata' });
    const day = now.toLocaleString('en-US', { day: '2-digit', timeZone: 'Asia/Kolkata' });
    const todayQueryString = `${day}-${month}-${year}`; 

    const journey = await DailyJourney.findOne({ journeyDate: todayQueryString });

    if (!journey || journey.questions.length === 0) {
      return res.status(200).json({
        isExhausted: true,
        message: "Today's learning journey is being prepared. Please check back later.",
        journey: [],
      });
    }

    res.status(200).json({
      isExhausted: false,
      journey: journey.questions,
    });

  } catch (error) {
    console.error('Error fetching daily journey:', error);
    res.status(500).json({ message: "Server error while fetching journey." });
  }
});


/**
 * @route   GET /api/suggestions/by-date
 * @desc    Fetch the learning journey for a specific date.
 * @access  Public
 */
router.get('/by-date', async (req, res) => {
  try {
    const { date } = req.query; // Receives date in 'DD MMM YYYY' format

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ message: 'A date query parameter in DD MMM YYYY format is required.' });
    }

    // --- FIX APPLIED HERE ---
    // Convert the incoming date string ('DD MMM YYYY') to the format stored in the DB ('DD-MM-YYYY').
    const dateObj = new Date(date);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed, so add 1
    const year = dateObj.getFullYear();
    const formattedDateForDB = `${day}-${month}-${year}`; // e.g., "05-10-2025"

    // Use the correctly formatted date for the database query.
    const journey = await DailyJourney.findOne({ journeyDate: formattedDateForDB });

    if (!journey || journey.questions.length === 0) {
      return res.status(404).json({ message: `No learning journey found for the date: ${date}` });
    }

    // Flatten the pairs into the Suggestion[] format the frontend expects.
    const suggestions = journey.questions.flatMap((pair, pairIndex) => ([
        { _id: pair.ca_question, questionText: pair.ca_question, originalIndex: pairIndex * 2 + 1, isPYQ: false },
        { _id: pair.related_pyq, questionText: pair.related_pyq, originalIndex: pairIndex * 2 + 2, isPYQ: true }
    ]));

    res.status(200).json(suggestions);

  } catch (error) {
    console.error(`Error fetching journey for date ${req.query.date}:`, error);
    res.status(500).json({ message: "Server error while fetching historical journey." });
  }
});


export default router;