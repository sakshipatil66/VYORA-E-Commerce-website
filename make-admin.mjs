import { DatabaseSync } from 'node:sqlite';
const email = process.argv[2];
const db = new DatabaseSync('data/vyora.sqlite');
const r = db.prepare("UPDATE users SET role = 'admin' WHERE lower(email) = lower(?)").run(email);
console.log(r.changes === 1 ? 'Done, admin enabled' : 'Email not found');
