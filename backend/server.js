const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// JWT middleware
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

// Database initialization
const initializeDatabase = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        bio TEXT,
        profile_photo VARCHAR(255),
        is_vendor BOOLEAN DEFAULT FALSE,
        location VARCHAR(255) DEFAULT 'Leuven',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(10) NOT NULL,
        description TEXT
      )
    `);

    // Services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category_id VARCHAR(50) REFERENCES categories(id),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price_per_hour DECIMAL(10,2) NOT NULL,
        location VARCHAR(255) DEFAULT 'Leuven',
        photos TEXT[],
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
        buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        preferred_date DATE NOT NULL,
        preferred_time TIME NOT NULL,
        message TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        total_hours DECIMAL(5,2),
        total_amount DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        vendor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default categories
    const categories = [
      { id: 'bike-repair', name: 'Bike Repair', icon: '🚲' },
      { id: 'moving', name: 'Moving Help', icon: '📦' },
      { id: 'cleaning', name: 'Cleaning', icon: '🧽' },
      { id: 'gardening', name: 'Gardening', icon: '🌱' },
      { id: 'pet-care', name: 'Pet Care', icon: '🐕' },
      { id: 'tutoring', name: 'Tutoring', icon: '📚' },
      { id: 'music', name: 'Music Lessons', icon: '🎵' },
      { id: 'photography', name: 'Photography', icon: '📸' }
    ];

    for (const category of categories) {
      await pool.query(
        'INSERT INTO categories (id, name, icon) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        [category.id, category.name, category.icon]
      );
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, name, phone, is_vendor, profile_photo, bio',
      [email, passwordHash, name, phone]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        isVendor: user.is_vendor,
        profilePhoto: user.profile_photo,
        bio: user.bio
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT id, email, password_hash, name, phone, is_vendor, profile_photo, bio FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        isVendor: user.is_vendor,
        profilePhoto: user.profile_photo,
        bio: user.bio
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Routes
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, phone, bio, profile_photo, is_vendor, location FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      bio: user.bio,
      profilePhoto: user.profile_photo,
      isVendor: user.is_vendor,
      location: user.location
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/become-vendor', authenticateToken, async (req, res) => {
  try {
    const { bio, profilePhoto } = req.body;

    const result = await pool.query(
      `UPDATE users SET 
        is_vendor = TRUE,
        bio = COALESCE($1, bio),
        profile_photo = COALESCE($2, profile_photo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, name, bio, profile_photo, is_vendor`,
      [bio, profilePhoto, req.user.userId]
    );

    const user = result.rows[0];
    res.json({
      message: 'Successfully became a vendor',
      user: {
        id: user.id,
        name: user.name,
        bio: user.bio,
        profilePhoto: user.profile_photo,
        isVendor: user.is_vendor
      }
    });
  } catch (error) {
    console.error('Become vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Category Routes
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Service Routes
app.get('/api/services', async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, minRating, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT 
        s.*,
        u.name as vendor_name,
        u.profile_photo as vendor_photo,
        u.bio as vendor_bio,
        c.name as category_name,
        c.icon as category_icon,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM services s
      JOIN users u ON s.vendor_id = u.id
      JOIN categories c ON s.category_id = c.id
      LEFT JOIN reviews r ON s.id = r.service_id
      WHERE s.is_active = TRUE
    `;

    const queryParams = [];
    let paramCount = 0;

    if (category && category !== 'all') {
      paramCount++;
      query += ` AND s.category_id = $${paramCount}`;
      queryParams.push(category);
    }

    if (search) {
      paramCount++;
      query += ` AND (s.title ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (minPrice) {
      paramCount++;
      query += ` AND s.price_per_hour >= $${paramCount}`;
      queryParams.push(minPrice);
    }

    if (maxPrice) {
      paramCount++;
      query += ` AND s.price_per_hour <= $${paramCount}`;
      queryParams.push(maxPrice);
    }

    query += ` GROUP BY s.id, u.id, c.id`;

    if (minRating) {
      query += ` HAVING COALESCE(AVG(r.rating), 0) >= ${minRating}`;
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    const services = result.rows.map(service => ({
      id: service.id,
      title: service.title,
      description: service.description,
      price: parseFloat(service.price_per_hour),
      category: service.category_id,
      categoryName: service.category_name,
      categoryIcon: service.category_icon,
      vendorId: service.vendor_id,
      vendorName: service.vendor_name,
      vendorPhoto: service.vendor_photo,
      vendorBio: service.vendor_bio,
      photos: service.photos || ['📋'],
      rating: parseFloat(service.average_rating),
      reviewCount: parseInt(service.review_count),
      location: service.location,
      createdAt: service.created_at
    }));

    res.json(services);
  } catch (error) {
    console.error('Services fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/services', authenticateToken, async (req, res) => {
  try {
    const { title, description, pricePerHour, categoryId } = req.body;

    const userResult = await pool.query('SELECT is_vendor FROM users WHERE id = $1', [req.user.userId]);
    if (!userResult.rows[0].is_vendor) {
      return res.status(403).json({ error: 'Only vendors can create services' });
    }

    const result = await pool.query(
      `INSERT INTO services (vendor_id, category_id, title, description, price_per_hour, photos)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.userId, categoryId, title, description, pricePerHour, ['📋']]
    );

    res.status(201).json({
      message: 'Service created successfully',
      service: {
        id: result.rows[0].id,
        title: result.rows[0].title,
        description: result.rows[0].description,
        price: parseFloat(result.rows[0].price_per_hour),
        category: result.rows[0].category_id,
        photos: result.rows[0].photos,
        vendorId: result.rows[0].vendor_id
      }
    });
  } catch (error) {
    console.error('Service creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Booking Routes
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { serviceId, preferredDate, preferredTime, message } = req.body;

    const serviceResult = await pool.query('SELECT vendor_id FROM services WHERE id = $1', [serviceId]);
    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const vendorId = serviceResult.rows[0].vendor_id;

    const result = await pool.query(
      `INSERT INTO bookings (service_id, buyer_id, vendor_id, preferred_date, preferred_time, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [serviceId, req.user.userId, vendorId, preferredDate, preferredTime, message]
    );

    res.status(201).json({
      message: 'Booking request sent successfully',
      booking: {
        id: result.rows[0].id,
        serviceId: result.rows[0].service_id,
        preferredDate: result.rows[0].preferred_date,
        preferredTime: result.rows[0].preferred_time,
        message: result.rows[0].message,
        status: result.rows[0].status
      }
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vendor Dashboard
app.get('/api/vendor/dashboard', authenticateToken, async (req, res) => {
  try {
    const servicesResult = await pool.query('SELECT COUNT(*) as count FROM services WHERE vendor_id = $1', [req.user.userId]);
    const pendingResult = await pool.query('SELECT COUNT(*) as count FROM bookings WHERE vendor_id = $1 AND status = $2', [req.user.userId, 'pending']);
    const earningsResult = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE vendor_id = $1 AND status = $2', [req.user.userId, 'completed']);

    res.json({
      stats: {
        serviceCount: parseInt(servicesResult.rows[0].count),
        pendingBookings: parseInt(pendingResult.rows[0].count),
        totalEarnings: parseFloat(earningsResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();// Export app for testing
module.exports = app;
