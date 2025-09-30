const express = require('express');
const { getProfile, becomeVendor } = require('../controllers/user.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/profile', authenticateToken, getProfile);
router.post('/become-vendor', authenticateToken, becomeVendor);

module.exports = router;