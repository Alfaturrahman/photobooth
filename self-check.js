const assert = require('node:assert/strict');
const fs = require('node:fs');

const server = fs.readFileSync('server.js', 'utf8');
assert.match(server, /CREATE TABLE IF NOT EXISTS photos/);
assert.match(server, /CREATE TABLE IF NOT EXISTS wishes/);
assert.match(server, /maxPhotoBytes/);
console.log('Database schema checks passed');
