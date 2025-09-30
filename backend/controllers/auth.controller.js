const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const formatUserResponse = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone,
  isVendor: user.is_vendor,
  profilePhoto: user.profile_photo,
  bio: user.bio
});

const register = async (req, res, next) => {
  try {
    const { email, password, name, phone } = req.body;

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, phone) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, name, phone, is_vendor, profile_photo, bio`,
      [email, passwordHash, name, phone]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.email);

    res.status(201).json({
      message: 'User created successfully',
      user: formatUserResponse(user),
      token
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      `SELECT id, email, password_hash, name, phone, is_vendor, profile_photo, bio 
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    res.json({
      message: 'Login successful',
      user: formatUserResponse(user),
      token
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login };