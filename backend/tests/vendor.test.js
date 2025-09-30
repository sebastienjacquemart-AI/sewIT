// tests/vendor.test.js - Vendor Management Tests (FIXED)
const request = require('supertest');
const { app } = require('./test-server');

describe('Vendor Management', () => {
  let userToken;

  beforeEach(async () => {
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testuser@example.com',
        password: 'password123',
        name: 'Test User'
      });
    userToken = userResponse.body.token;
  });

  describe('POST /api/users/become-vendor', () => {
    it('should successfully make user a vendor', async () => {
      const vendorData = {
        bio: 'Experienced bike mechanic and student helper',
        profilePhoto: '👨‍🔧'
      };

      const response = await request(app)
        .post('/api/users/become-vendor')
        .set('Authorization', `Bearer ${userToken}`)
        .send(vendorData)
        .expect(200);

      expect(response.body.message).toBe('Successfully became a vendor');
      expect(response.body.user.isVendor).toBe(true);
      expect(response.body.user.bio).toBe(vendorData.bio);
      expect(response.body.user.profilePhoto).toBe(vendorData.profilePhoto);
    });

    it('should require authentication', async () => {
      const vendorData = {
        bio: 'Test bio',
        profilePhoto: '👤'
      };

      await request(app)
        .post('/api/users/become-vendor')
        .send(vendorData)
        .expect(401);
    });

    it('should work with minimal data', async () => {
      const response = await request(app)
        .post('/api/users/become-vendor')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(200);

      expect(response.body.user.isVendor).toBe(true);
    });
  });

  describe('GET /api/vendor/dashboard', () => {
    beforeEach(async () => {
      // Make user a vendor first
      await request(app)
        .post('/api/users/become-vendor')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bio: 'Test vendor',
          profilePhoto: '👨‍🔧'
        });
    });

    it('should return vendor dashboard stats', async () => {
      const response = await request(app)
        .get('/api/vendor/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.serviceCount).toBe(0);
      expect(response.body.stats.pendingBookings).toBe(0);
      expect(response.body.stats.totalEarnings).toBe(0);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/vendor/dashboard')
        .expect(401);
    });

    it('should reflect created services in stats', async () => {
      // Create a service
      await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Service',
          description: 'Test description',
          pricePerHour: 25,
          categoryId: 'bike-repair'
        });

      const response = await request(app)
        .get('/api/vendor/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.stats.serviceCount).toBe(1);
    });
  });
});