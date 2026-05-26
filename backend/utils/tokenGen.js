const crypto = require('crypto');

function generateSharingToken() {
  return crypto.randomUUID();
}

function generateShortCode(length = 12) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

module.exports = { generateSharingToken, generateShortCode };
