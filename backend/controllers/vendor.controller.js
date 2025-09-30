const { pool } = require('../config/database');

const getDashboard = async (req, res, next) => {
  try {
    const [servicesResult, pendingResult, earningsResult] = await Promise.all([
      pool.query(
        'SELECT COUNT(*) as count FROM services WHERE vendor_id = $1',
        [req.user.userId]
      ),
      pool.query(
        'SELECT COUNT(*) as count FROM bookings WHERE vendor_id = $1 AND status = $2',
        [req.user.userId, 'pending']
      ),
      pool.query(
        'SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE vendor_id = $1 AND status = $2',
        [req.user.userId, 'completed']
      )
    ]);

    res.json({
      stats: {
        serviceCount: parseInt(servicesResult.rows[0].count),
        pendingBookings: parseInt(pendingResult.rows[0].count),
        totalEarnings: parseFloat(earningsResult.rows[0].total)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard };