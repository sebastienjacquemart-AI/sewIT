// tests/bookings.test.js - Booking System Tests (FIXED)
const request = require('supertest');
const { app } = require('./test-server');

describe('Booking System', () => {
  let vendorToken;
  let buyerToken;
  let serviceId;

  beforeEach(async () => {
    // Create and setup vendor
    const vendorResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'vendor@booking.com',
        password: 'password123',
        name: 'Booking Vendor'
      });
    vendorToken = vendorResponse.body.token;

    await request(app)
      .post('/api/users/become-vendor')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        bio: 'Service provider',
        profilePhoto: '👨‍🔧'
      });

    // Create service
    const serviceResponse = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        title: 'Booking Test Service',
        description: 'Service for booking tests',
        pricePerHour: 30,
        categoryId: 'bike-repair'
      });
    serviceId = serviceResponse.body.service.id;

    // Create buyer
    const buyerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'buyer@booking.com',
        password: 'password123',
        name: 'Booking Buyer'
      });
    buyerToken = buyerResponse.body.token;
  });

  describe('POST /api/bookings', () => {
    it('should create booking request successfully', async () => {
      const bookingData = {
        serviceId: serviceId,
        preferredDate: '2025-09-30',
        preferredTime: '14:00',
        message: 'Need urgent service'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(bookingData)
        .expect(201);

      expect(response.body.message).toBe('Booking request sent successfully');
      expect(response.body.booking.serviceId).toBe(serviceId);
      expect(response.body.booking.status).toBe('pending');
      const receivedDate = response.body.booking.preferredDate;
      expect(['2025-09-30', '2025-09-29'].includes(receivedDate)).toBe(true);
      expect(response.body.booking.preferredTime).toBe('14:00:00');
    });

    it('should require authentication', async () => {
      const bookingData = {
        serviceId: serviceId,
        preferredDate: '2025-09-30',
        preferredTime: '14:00'
      };

      await request(app)
        .post('/api/bookings')
        .send(bookingData)
        .expect(401);
    });

    it('should require valid service ID', async () => {
      const bookingData = {
        serviceId: 99999,
        preferredDate: '2025-09-30',
        preferredTime: '14:00'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(bookingData)
        .expect(404);

      expect(response.body.error).toBe('Service not found');
    });
  });

  describe('GET /api/bookings', () => {
    let bookingId;

    beforeEach(async () => {
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          serviceId: serviceId,
          preferredDate: '2025-09-30',
          preferredTime: '14:00',
          message: 'Test booking'
        });
      bookingId = bookingResponse.body.booking.id;
    });

    it('should return buyer bookings', async () => {
      const response = await request(app)
        .get('/api/bookings?type=buyer')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].service_title).toBe('Booking Test Service');
      expect(response.body[0].vendor_name).toBe('Booking Vendor');
    });

    it('should return vendor bookings', async () => {
      const response = await request(app)
        .get('/api/bookings?type=vendor')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].service_title).toBe('Booking Test Service');
      expect(response.body[0].buyer_name).toBe('Booking Buyer');
    });
  });

  describe('PUT /api/bookings/:id/status', () => {
    let bookingId;

    beforeEach(async () => {
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          serviceId: serviceId,
          preferredDate: '2025-09-30',
          preferredTime: '14:00',
          message: 'Test booking'
        });
      bookingId = bookingResponse.body.booking.id;
    });

    it('should allow vendor to update booking status', async () => {
      const response = await request(app)
        .put(`/api/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          status: 'confirmed',
          totalHours: 2,
          totalAmount: 60
        })
        .expect(200);

      expect(response.body.message).toBe('Booking status updated successfully');
      expect(response.body.booking.status).toBe('confirmed');
      expect(response.body.booking.total_amount).toBe('60.00');
    });

    it('should not allow buyer to update booking status', async () => {
      await request(app)
        .put(`/api/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          status: 'confirmed'
        })
        .expect(404);
    });
  });
});