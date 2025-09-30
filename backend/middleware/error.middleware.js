const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(400).json({ error: 'Resource already exists' });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Related resource not found' });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error'
  });
};

module.exports = { errorHandler };