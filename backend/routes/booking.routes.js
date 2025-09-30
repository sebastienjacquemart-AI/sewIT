const express = require('express');
const { createBooking } = require('../controllers/booking.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', authenticateToken, createBooking);

module.exports = router;