const { Pool } = require('pg');

// Test database configuration
const testPool = new Pool({
  user: 'student_app',
  host: 'localhost',
  database: 'student_services_test',
  password: 'secure_password_123',
  port: 5432,
});

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '5003'; // Different port for tests
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.DB_NAME = 'student_services_test';

// Global test setup
beforeAll(async () => {
  try {
    await testPool.query('SELECT 1');
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Test database connection failed:', error.message);
    process.exit(1);
  }
});

afterAll(async () => {
  await testPool.end();
});

// Clean database before each test
beforeEach(async () => {
  try {
    await testPool.query('DELETE FROM reviews');
    await testPool.query('DELETE FROM bookings');  
    await testPool.query('DELETE FROM services');
    await testPool.query('DELETE FROM users');
    
    // Reset auto-increment counters
    await testPool.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    await testPool.query('ALTER SEQUENCE services_id_seq RESTART WITH 1');
    await testPool.query('ALTER SEQUENCE bookings_id_seq RESTART WITH 1');
    await testPool.query('ALTER SEQUENCE reviews_id_seq RESTART WITH 1');
  } catch (error) {
    console.error('Database cleanup error:', error.message);
  }
});

module.exports = { testPool };
