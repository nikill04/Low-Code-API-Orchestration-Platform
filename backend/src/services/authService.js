const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const crypto = require('crypto');
const db = require('../db/db');
const env = require('../config/env');

function bootstrapDefaultAdmin() {
  const hasUsers = db.get('users').size().value() > 0;
  if (hasUsers) return;

  const passwordHash = bcrypt.hashSync(env.defaultAdminPassword, 10);
  db.get('users')
    .push({
      id: uuid(),
      email: env.defaultAdminEmail,
      passwordHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    })
    .write();
}

function login(email, password) {
  const user = db.get('users').find({ email }).value();
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const matches = bcrypt.compareSync(password, user.passwordHash);
  if (!matches) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

function generateApiKey(ownerId, label) {
  const key = `ok_${crypto.randomBytes(24).toString('hex')}`;
  const record = { id: uuid(), key, label, ownerId, active: true, createdAt: new Date().toISOString() };
  db.get('apiKeys').push(record).write();
  return record;
}

function revokeApiKey(id) {
  db.get('apiKeys').find({ id }).assign({ active: false }).write();
}

function listApiKeys(ownerId) {
  return db
    .get('apiKeys')
    .filter({ ownerId })
    .value()
    .map((k) => ({ ...k, key: `${k.key.slice(0, 10)}${'*'.repeat(20)}` })); // never echo full key back
}

module.exports = { bootstrapDefaultAdmin, login, generateApiKey, revokeApiKey, listApiKeys };
