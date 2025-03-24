const express = require('express');
const router = express.Router();
const { getMessageHistory } = require('../services/historyService');
const authenticateToken = require('../middleware/auth');

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Retrieve message history.
 *     description: Retrieve all past messages with their timestamps.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of past messages with timestamps.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 */
router.get('/', authenticateToken, (req, res) => {
  const history = getMessageHistory();
  res.status(200).json(history);
});

module.exports = router;
