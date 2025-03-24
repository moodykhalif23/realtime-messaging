const express = require('express');
const router = express.Router();
const amqp = require('amqplib');
const { url, queue } = require('../config/rabbitmq');

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Publish a message to RabbitMQ
 *     description: Publish a message to the messaging queue. This endpoint is secured by JWT.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Hello from REST API!"
 *     responses:
 *       200:
 *         description: Message published successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "Message published successfully"
 *       400:
 *         description: Message is required
 *       401:
 *         description: Unauthorized access
 *       403:
 *         description: Invalid access token
 *       500:
 *         description: Failed to publish message
 */
router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();
    await channel.assertQueue(queue, { durable: false });
    channel.sendToQueue(queue, Buffer.from(message));
    console.log(`Published message: ${message}`);
    await channel.close();
    await connection.close();
    res.status(200).json({ status: 'Message published successfully' });
  } catch (error) {
    console.error('Error publishing message:', error);
    res.status(500).json({ error: 'Failed to publish message' });
  }
});

module.exports = router;
