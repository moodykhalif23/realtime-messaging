const amqp = require('amqplib');
const { url, queue } = require('../config/rabbitmq');

async function startRabbitMQConsumer(io) {
  try {
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();
    await channel.assertQueue(queue, { durable: false });
    console.log(`Waiting for messages in queue: ${queue}`);

    channel.consume(queue, (msg) => {
      if (msg !== null) {
        const messageContent = msg.content.toString();
        console.log(`Received message: ${messageContent}`);
        io.emit('new_message', messageContent);
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error('Error in RabbitMQ consumer:', error);
  }
}

module.exports = { startRabbitMQConsumer };
