const { rabbitmq } = require('./config');

module.exports = {
  url: rabbitmq.url,
  queue: rabbitmq.queue
};