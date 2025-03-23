const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/config');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid access token' });
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;