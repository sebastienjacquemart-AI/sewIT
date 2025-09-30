const { pool } = require('../config/database');

const getProfile = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, phone, bio, profile_photo, is_vendor, location 
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      bio: user.bio,
      profilePhoto: user.profile_photo,
      isVendor: user.is_vendor,
      location: user.location
    });
  } catch (error) {
    next(error);
  }
};

const becomeVendor = async (req, res, next) => {
  try {
    const { bio, profilePhoto } = req.body;

    const result = await pool.query(
      `UPDATE users SET 
        is_vendor = TRUE,
        bio = COALESCE($1, bio),
        profile_photo = COALESCE($2, profile_photo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, name, bio, profile_photo, is_vendor`,
      [bio, profilePhoto, req.user.userId]
    );

    const user = result.rows[0];
    res.json({
      message: 'Successfully became a vendor',
      user: {
        id: user.id,
        name: user.name,
        bio: user.bio,
        profilePhoto: user.profile_photo,
        isVendor: user.is_vendor
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, becomeVendor };