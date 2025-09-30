const { pool } = require('../config/database');

const buildServiceQuery = (filters) => {
  const { category, search, minPrice, maxPrice, minRating } = filters;
  
  let query = `
    SELECT 
      s.*,
      u.name as vendor_name,
      u.profile_photo as vendor_photo,
      u.bio as vendor_bio,
      c.name as category_name,
      c.icon as category_icon,
      COALESCE(AVG(r.rating), 0) as average_rating,
      COUNT(r.id) as review_count
    FROM services s
    JOIN users u ON s.vendor_id = u.id
    JOIN categories c ON s.category_id = c.id
    LEFT JOIN reviews r ON s.id = r.service_id
    WHERE s.is_active = TRUE
  `;

  const queryParams = [];
  let paramCount = 0;

  if (category && category !== 'all') {
    paramCount++;
    query += ` AND s.category_id = $${paramCount}`;
    queryParams.push(category);
  }

  if (search) {
    paramCount++;
    query += ` AND (s.title ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`;
    queryParams.push(`%${search}%`);
  }

  if (minPrice) {
    paramCount++;
    query += ` AND s.price_per_hour >= $${paramCount}`;
    queryParams.push(minPrice);
  }

  if (maxPrice) {
    paramCount++;
    query += ` AND s.price_per_hour <= $${paramCount}`;
    queryParams.push(maxPrice);
  }

  query += ` GROUP BY s.id, u.id, c.id`;

  if (minRating) {
    query += ` HAVING COALESCE(AVG(r.rating), 0) >= ${minRating}`;
  }

  return { query, queryParams, paramCount };
};

const formatServiceResponse = (service) => ({
  id: service.id,
  title: service.title,
  description: service.description,
  price: parseFloat(service.price_per_hour),
  category: service.category_id,
  categoryName: service.category_name,
  categoryIcon: service.category_icon,
  vendorId: service.vendor_id,
  vendorName: service.vendor_name,
  vendorPhoto: service.vendor_photo,
  vendorBio: service.vendor_bio,
  photos: service.photos || ['📋'],
  rating: parseFloat(service.average_rating),
  reviewCount: parseInt(service.review_count),
  location: service.location,
  createdAt: service.created_at
});

const getServices = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, ...filters } = req.query;

    const { query, queryParams, paramCount } = buildServiceQuery(filters);
    
    const finalQuery = `${query} ORDER BY s.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(finalQuery, queryParams);
    const services = result.rows.map(formatServiceResponse);

    res.json(services);
  } catch (error) {
    next(error);
  }
};

const createService = async (req, res, next) => {
  try {
    const { title, description, pricePerHour, categoryId } = req.body;

    const result = await pool.query(
      `INSERT INTO services (vendor_id, category_id, title, description, price_per_hour, photos)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.userId, categoryId, title, description, pricePerHour, ['📋']]
    );

    const service = result.rows[0];
    res.status(201).json({
      message: 'Service created successfully',
      service: {
        id: service.id,
        title: service.title,
        description: service.description,
        price: parseFloat(service.price_per_hour),
        category: service.category_id,
        photos: service.photos,
        vendorId: service.vendor_id
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getServices, createService };