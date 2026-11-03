import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'database.sqlite');

// Ensure directory exists if needed
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student'
    );

    CREATE TABLE IF NOT EXISTS labs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workstations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lab_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (lab_id) REFERENCES labs(id)
    );
  `);

  // Seed initial data if empty
  const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = userCountStmt.get().count;

  if (userCount === 0) {
    // Seed student account: student@university.edu / password123
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync('password123', salt, 64).toString('hex');
    const password_hash = `${salt}:${hash}`;

    const insertUser = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');
    insertUser.run('student@university.edu', password_hash, 'student');

    const insertLab = db.prepare('INSERT INTO labs (name) VALUES (?)');
    const labResult = insertLab.run('Lab A');
    const labId = labResult.lastInsertRowid;

    const insertWs = db.prepare('INSERT INTO workstations (lab_id, name) VALUES (?, ?)');
    insertWs.run(labId, 'Workstation 1');
    insertWs.run(labId, 'Workstation 2');
  }
}

export function getDb() {
  return db;
}
