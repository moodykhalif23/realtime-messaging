const amqp = require('amqplib');
const { url, queue } = require('./src/config/rabbitmq');

async function publishMessage(message) {
  try {
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();
    await channel.assertQueue(queue, { durable: false });
    channel.sendToQueue(queue, Buffer.from(message));
    console.log(`Sent message: ${message}`);
    setTimeout(() => {
      connection.close();
      process.exit(0);
    }, 500);
  } catch (error) {
    console.error('Error publishing message:', error);
  }
}

publishMessage('Working Test!');
