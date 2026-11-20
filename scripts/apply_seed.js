import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'data', 'barber.db');
const db = new Database(dbPath);
const seedSql = fs.readFileSync(path.resolve(process.cwd(), 'seed.sql'), 'utf-8');

db.exec(seedSql);
console.log('Seed executed successfully into', dbPath);
const roles = db.prepare('SELECT * FROM roles').all();
console.log('Roles:', roles);
const settings = db.prepare('SELECT * FROM app_settings').all();
console.log('Settings:', settings);
