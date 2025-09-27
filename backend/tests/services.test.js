// tests/services.test.js - Service Management Tests
const request = require('supertest');
const { app } = require('./test-server');

describe('Service Management', () => {
  let vendorToken;
  let buyerToken;
  let serviceId;

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

    it('should return services with vendor information', async () => {
      // Create a service first
      await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Test Bike Repair',
          description: 'Professional bike repair service',
          pricePerHour: 25,
          categoryId: 'bike-repair'
        });

      const response = await request(app)
        .get('/api/services')
        .expect(200);

      expect(response.body.length).toBe(1);
      const service = response.body[0];
      expect(service.title).toBe('Test Bike Repair');
      expect(service.price).toBe(25);
      expect(service.vendorName).toBe('Test Vendor');
      expect(service.categoryIcon).toBe('🚲');
    });

    it('should filter services by category', async () => {
      // Create bike repair service
      await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Bike Repair',
          description: 'Bike service',
          pricePerHour: 25,
          categoryId: 'bike-repair'
        });

      // Create tutoring service
      await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Math Tutoring',
          description: 'Math help',
          pricePerHour: 20,
          categoryId: 'tutoring'
        });

      // Filter by bike-repair category
      const response = await request(app)
        .get('/api/services?category=bike-repair')
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].category).toBe('bike-repair');
    });

    it('should search services by title and description', async () => {
      await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Professional Bike Repair',
          description: 'Expert bicycle maintenance',
          pricePerHour: 25,
          categoryId: 'bike-repair'
        });

      const response = await request(app)
        .get('/api/services?search=bike')
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toContain('Bike');
    });

    it('should filter by price range', async () => {
      // Create expensive service
      await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Expensive Service',
          description: 'Premium service',
          pricePerHour: 50,
          categoryId: 'tutoring'
        });

      // Create cheap service
      await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Affordable Service',
          description: 'Budget service',
          pricePerHour: 15,
          categoryId: 'tutoring'
        });

      // Filter for services under 30
      const response = await request(app)
        .get('/api/services?maxPrice=30')
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].price).toBe(15);
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
      serviceId = response.body.service.id;
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

    it('should require authentication', async () => {
      const serviceData = {
        title: 'Test Service',
        description: 'Test description',
        pricePerHour: 20,
        categoryId: 'tutoring'
      };

      await request(app)
        .post('/api/services')
        .send(serviceData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Test Service'
          // Missing required fields
        })
        .expect(500);
    });
  });
});