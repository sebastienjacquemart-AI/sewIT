const express = require('express');
const { getServices, createService } = require('../controllers/service.controller');
const { authenticateToken, requireVendor } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', getServices);
router.post('/', authenticateToken, requireVendor, createService);

module.exports = router;