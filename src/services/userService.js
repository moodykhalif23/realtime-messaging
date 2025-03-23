const users = [];

async function registerUser({ username, password }) {
  if (users.find(u => u.username === username)) {
    throw new Error("Username already exists");
  }
  const newUser = { id: Date.now(), username, password };
  users.push(newUser);
  return newUser;
}

async function loginUser({ username, password }) {
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) throw new Error("Invalid credentials");

  const jwt = require('jsonwebtoken');
  const { jwtSecret } = require('../config/config');
  const token = jwt.sign({ id: user.id, username: user.username }, jwtSecret, { expiresIn: '1h' });
  return token;
}

async function getUserProfile(user) {
  const foundUser = users.find(u => u.id === user.id);
  if (!foundUser) throw new Error("User not found");
  return foundUser;
}

module.exports = { registerUser, loginUser, getUserProfile };
