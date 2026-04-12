import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function test() {
  const dbPath = path.resolve(process.cwd(), 'data/data.db');
  console.log("Opening DB:", dbPath);
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  // Seed Aaron Judge with target buy price
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS monitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_uuid TEXT NOT NULL,
        player_name TEXT NOT NULL,
        target_buy_price INTEGER DEFAULT 0,
        outbid_alert_sent INTEGER DEFAULT 0,
        interval_minutes INTEGER DEFAULT 5,
        profit_threshold INTEGER DEFAULT 0,
        drop_threshold_pct INTEGER DEFAULT 0,
        last_checked_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(player_uuid)
      );
    `);
    console.log("Inserting test monitor...");
    await db.run(
       'INSERT OR IGNORE INTO monitors (player_uuid, player_name, target_buy_price, outbid_alert_sent) VALUES (?, ?, ?, ?)',
       ['3b561bcca8749f3fd17c99d863a95c2e', 'Aaron Judge', 100000, 0] // 100k stubs target, current best buy is 430k+, so it will trigger outbid immediately
    );
    console.log("Done");
  } catch (e) {
    console.error(e);
  }
}
test();
