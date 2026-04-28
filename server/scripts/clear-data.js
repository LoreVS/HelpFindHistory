'use strict';

const db = require('../db');

// Delete in dependency order to satisfy foreign key constraints
// (attempts and fragments reference projects via CASCADE, but explicit order is safer)

const deleteAttempts  = db.prepare('DELETE FROM attempts');
const deleteFragments = db.prepare('DELETE FROM fragments');
const deleteProjects  = db.prepare('DELETE FROM projects');

const r1 = deleteAttempts.run();
console.log(`Deleted ${r1.changes} attempt(s).`);

const r2 = deleteFragments.run();
console.log(`Deleted ${r2.changes} fragment(s).`);

const r3 = deleteProjects.run();
console.log(`Deleted ${r3.changes} project(s).`);

console.log('Done.');
process.exit(0);
