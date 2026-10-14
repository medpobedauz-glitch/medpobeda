// MedPobeda — SQLite database connection.
// better-sqlite3: synchronous, fast, real relational persistence.
import Database from 'better-sqlite3';
import LibsqlDatabase from 'libsql';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

if (!config.tursoUrl) fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

export const db = config.databaseDriver === 'libsql'
  ? new LibsqlDatabase(config.tursoUrl || config.databasePath, { authToken: config.tursoToken, timeout: 15 })
  : new Database(config.databasePath);

if (!config.tursoUrl) db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
if (!config.tursoUrl) db.pragma('busy_timeout = 5000');

// libsql's native transaction helper lacks better-sqlite3's nested savepoints.
// Q Bank import calls transactional question writes inside an outer transaction.
if (config.databaseDriver === 'libsql') {
  // Timing metadata is not application data: including it in content hashes
  // would make unchanged questions appear edited on every read.
  const cleanRow = (row) => {
    if (row && !Array.isArray(row) && typeof row === 'object' && '_metadata' in row) {
      const { _metadata, ...data } = row;
      return data;
    }
    return row;
  };
  const prepare = db.prepare.bind(db);
  // libsql mistakes a single null argument for a named-parameter object.
  const bindings = (args) => args.length === 1 && args[0] === null ? [[null]] : args;
  db.prepare = (sql) => {
    const statement = prepare(sql);
    return new Proxy(statement, {
      get(target, property, receiver) {
        if (property === 'get') return (...args) => cleanRow(target.get(...bindings(args)));
        if (property === 'all') return (...args) => target.all(...bindings(args)).map(cleanRow);
        if (property === 'iterate') return function* (...args) { for (const row of target.iterate(...bindings(args))) yield cleanRow(row); };
        if (property === 'run') return (...args) => target.run(...bindings(args));
        const value = Reflect.get(target, property, target);
        if (typeof value !== 'function') return value;
        return (...args) => { const result = value.apply(target, args); return result === target ? receiver : result; };
      },
    });
  };
  let depth = 0;
  let sequence = 0;
  db.transaction = (fn) => {
    if (typeof fn !== 'function') throw new TypeError('Expected a transaction function.');
    const wrap = (mode) => function (...args) {
      const nested = depth > 0;
      const savepoint = `medpobeda_${++sequence}`;
      db.exec(nested ? `SAVEPOINT ${savepoint}` : `BEGIN ${mode}`);
      depth++;
      try {
        const result = fn.apply(this, args);
        if (result && typeof result.then === 'function') throw new TypeError('Transaction callbacks must be synchronous.');
        db.exec(nested ? `RELEASE SAVEPOINT ${savepoint}` : 'COMMIT');
        return result;
      } catch (error) {
        try {
          db.exec(nested ? `ROLLBACK TO SAVEPOINT ${savepoint}` : 'ROLLBACK');
          if (nested) db.exec(`RELEASE SAVEPOINT ${savepoint}`);
        } catch { /* Preserve the original error. */ }
        throw error;
      } finally { depth--; }
    };
    const transaction = wrap('');
    transaction.deferred = wrap('DEFERRED');
    transaction.immediate = wrap('IMMEDIATE');
    transaction.exclusive = wrap('EXCLUSIVE');
    return transaction;
  };
}

export default db;
