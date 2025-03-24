const express = require('express');
const router = express.Router();
const { processIntegrationData } = require('../services/integrationService');

/**
 * @swagger
 * /api/integrations/webhook:
 *   post:
 *     summary: Receive data from a third-party integration
 *     description: Endpoint to receive webhook data from external services.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               event: "new_event"
 *               data: { "key": "value" }
 *     responses:
 *       200:
 *         description: Integration data processed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "Processed"
 */
router.post('/webhook', (req, res) => {
  const result = processIntegrationData(req.body);
  res.status(200).json(result);
});

module.exports = router;
