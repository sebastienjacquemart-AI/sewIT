const { pool } = require('../config/database');

const getCategories = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

module.exports = { getCategories };