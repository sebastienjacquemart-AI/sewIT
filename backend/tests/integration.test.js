// tests/integration.test.js - Complete Flow Integration Tests (FIXED)
const request = require('supertest');
const { app } = require('./test-server');

describe('Complete Marketplace Flow', () => {
  it('should complete full marketplace flow', async () => {
    // 1. Register vendor
    const vendorResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'flow-vendor@test.com',
        password: 'password123',
        name: 'Flow Vendor'
      })
      .expect(201);
    const vendorToken = vendorResponse.body.token;

    // 2. Become vendor
    await request(app)
      .post('/api/users/become-vendor')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        bio: 'Expert marketplace tester',
        profilePhoto: '🔧'
      })
      .expect(200);

    // 3. Create service
    const serviceResponse = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        title: 'Integration Test Service',
        description: 'End-to-end test service',
        pricePerHour: 35,
        categoryId: 'bike-repair'
      })
      .expect(201);
    const serviceId = serviceResponse.body.service.id;

    // 4. Register buyer
    const buyerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'flow-buyer@test.com',
        password: 'password123',
        name: 'Flow Buyer'
      })
      .expect(201);
    const buyerToken = buyerResponse.body.token;

    // 5. Browse services
    const servicesResponse = await request(app)
      .get('/api/services')
      .expect(200);
    expect(servicesResponse.body.length).toBe(1);
    expect(servicesResponse.body[0].title).toBe('Integration Test Service');

    // 6. Book service
    const bookingResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        serviceId: serviceId,
        preferredDate: '2025-10-01',
        preferredTime: '15:00',
        message: 'Integration test booking'
      })
      .expect(201);
    const bookingId = bookingResponse.body.booking.id;

    // 7. Vendor checks dashboard
    const dashboardResponse = await request(app)
      .get('/api/vendor/dashboard')
      .set('Authorization', `Bearer ${vendorToken}`)
      .expect(200);
    expect(dashboardResponse.body.stats.serviceCount).toBe(1);
    expect(dashboardResponse.body.stats.pendingBookings).toBe(1);

    // 8. Vendor views bookings
    const vendorBookingsResponse = await request(app)
      .get('/api/bookings?type=vendor')
      .set('Authorization', `Bearer ${vendorToken}`)
      .expect(200);
    expect(vendorBookingsResponse.body.length).toBe(1);
    expect(vendorBookingsResponse.body[0].buyer_name).toBe('Flow Buyer');

    // 9. Vendor confirms booking
    await request(app)
      .put(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        status: 'confirmed',
        totalHours: 2,
        totalAmount: 70
      })
      .expect(200);

    // 10. Buyer checks their bookings
    const buyerBookingsResponse = await request(app)
      .get('/api/bookings?type=buyer')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(buyerBookingsResponse.body.length).toBe(1);
    expect(buyerBookingsResponse.body[0].status).toBe('confirmed');

    console.log('✅ Complete marketplace flow test passed!');
  });
});