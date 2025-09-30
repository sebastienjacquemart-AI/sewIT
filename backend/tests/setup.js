// tests/setup.js - FIXED Setup File
const { Pool } = require('pg');
const { setupTestDatabase } = require('./db-setup');
require('dotenv').config();

let pool;

// Global setup - run once before all tests
beforeAll(async () => {
  await setupTestDatabase();
  
  // Create a fresh connection for cleanup
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'student_services_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });
  
  console.log('✅ Test database connected');
}, 30000);

// Clean database before each test
beforeEach(async () => {
  try {
    await pool.query('TRUNCATE TABLE reviews, bookings, services, users RESTART IDENTITY CASCADE');
    
    // Re-insert default categories
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
  } catch (error) {
    console.error('❌ Database cleanup error:', error);
  }
});

// Close database connection after all tests
afterAll(async () => {
  if (pool) {
    await pool.end();
  }
});

module.exports = { pool };