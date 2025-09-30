// tests/db-setup.js - Database Initialization for Tests
const { Pool } = require('pg');
require('dotenv').config();

const setupTestDatabase = async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'student_services_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    console.log('🔧 Setting up test database...');

    // Create tables
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(10) NOT NULL,
        description TEXT
      )
    `);

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

    console.log('✅ Test database setup complete');
    await pool.end();
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    await pool.end();
    throw error;
  }
};

// Run setup if called directly
if (require.main === module) {
  setupTestDatabase().catch(console.error);
}

module.exports = { setupTestDatabase };