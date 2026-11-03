import crypto from 'node:crypto';
import { findUserByEmail, findUserById } from '../data/users.js';

export function authenticateUser(email, password) {
  const user = findUserByEmail(email);
  if (!user) {
    return null;
  }

  const [salt, storedHash] = user.password_hash.split(':');
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');

  const match = crypto.timingSafeEqual(
    Buffer.from(storedHash, 'hex'),
    Buffer.from(testHash, 'hex')
  );

  if (!match) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

export function getUserById(id) {
  return findUserById(id);
}
