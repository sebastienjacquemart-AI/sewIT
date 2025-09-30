const { pool } = require('../config/database');

const createBooking = async (req, res, next) => {
  try {
    const { serviceId, preferredDate, preferredTime, message } = req.body;

    // Get vendor ID from service
    const serviceResult = await pool.query(
      'SELECT vendor_id FROM services WHERE id = $1',
      [serviceId]
    );

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const vendorId = serviceResult.rows[0].vendor_id;

    // Create booking
    const result = await pool.query(
      `INSERT INTO bookings (service_id, buyer_id, vendor_id, preferred_date, preferred_time, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [serviceId, req.user.userId, vendorId, preferredDate, preferredTime, message]
    );

    const booking = result.rows[0];
    res.status(201).json({
      message: 'Booking request sent successfully',
      booking: {
        id: booking.id,
        serviceId: booking.service_id,
        preferredDate: booking.preferred_date,
        preferredTime: booking.preferred_time,
        message: booking.message,
        status: booking.status
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking };