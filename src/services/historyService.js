const messageHistory = [];

function addMessageToHistory(message) {
  // Append a timestamp with each message
  messageHistory.push({ message, timestamp: new Date() });
}

function getMessageHistory() {
  return messageHistory;
}

module.exports = { addMessageToHistory, getMessageHistory };
