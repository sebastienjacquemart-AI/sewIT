const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

const requireVendor = async (req, res, next) => {
  try {
    const { pool } = require('../config/database');
    const result = await pool.query(
      'SELECT is_vendor FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!result.rows[0].is_vendor) {
      return res.status(403).json({ error: 'Only vendors can perform this action' });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticateToken, requireVendor };