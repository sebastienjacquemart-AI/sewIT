// tests/categories.test.js - Categories Tests (FIXED)
const request = require('supertest');
const { app } = require('./test-server');

describe('Categories', () => {
  describe('GET /api/categories', () => {
    it('should return all default categories', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(8);

      const categoryIds = response.body.map(cat => cat.id);
      expect(categoryIds).toContain('bike-repair');
      expect(categoryIds).toContain('tutoring');
      expect(categoryIds).toContain('moving');
      expect(categoryIds).toContain('cleaning');

      const bikeCategory = response.body.find(cat => cat.id === 'bike-repair');
      expect(bikeCategory.name).toBe('Bike Repair');
      expect(bikeCategory.icon).toBe('🚲');
    });

    it('should not require authentication', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});