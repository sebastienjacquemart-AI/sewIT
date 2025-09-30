const express = require('express');
const { getDashboard } = require('../controllers/vendor.controller');
const { authenticateToken, requireVendor } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/dashboard', authenticateToken, requireVendor, getDashboard);

module.exports = router;