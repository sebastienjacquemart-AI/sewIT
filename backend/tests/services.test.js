// Fixed tests/services.test.js - COMPLETE SERVICE VALIDATION
const request = require('supertest');
const { app } = require('./test-server');

describe('Service Management', () => {
  let vendorToken;
  let buyerToken;

  beforeEach(async () => {
    // Create vendor user
    const vendorResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'vendor@test.com',
        password: 'password123',
        name: 'Test Vendor'
      });
    vendorToken = vendorResponse.body.token;

    // Make user a vendor
    await request(app)
      .post('/api/users/become-vendor')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        bio: 'Expert service provider',
        profilePhoto: '👨‍🔧'
      });

    // Create buyer user
    const buyerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'buyer@test.com',
        password: 'password123',
        name: 'Test Buyer'
      });
    buyerToken = buyerResponse.body.token;
  });

  describe('GET /api/services', () => {
    it('should return empty array when no services exist', async () => {
      const response = await request(app)
        .get('/api/services')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('POST /api/services', () => {
    it('should create service as vendor', async () => {
      const serviceData = {
        title: 'Professional Bike Repair',
        description: 'Complete bike maintenance and repair service',
        pricePerHour: 25,
        categoryId: 'bike-repair'
      };

      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(serviceData)
        .expect(201);

      expect(response.body.message).toBe('Service created successfully');
      expect(response.body.service.title).toBe(serviceData.title);
      expect(response.body.service.price).toBe(serviceData.pricePerHour);
      expect(response.body.service.category).toBe(serviceData.categoryId);
    });

    it('should not allow non-vendors to create services', async () => {
      const serviceData = {
        title: 'Test Service',
        description: 'Test description',
        pricePerHour: 20,
        categoryId: 'tutoring'
      };

      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(serviceData)
        .expect(403);

      expect(response.body.error).toBe('Only vendors can create services');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Test Service'
          // Missing required fields
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });
  });
});