import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
const DISCORD_WEBHOOK_URL = 'YOUR_DISCORD_WEBHOOK_URL_HERE';

async function sendDiscordAlert(content) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE') return;
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
  } catch(e) { console.error('[Discord] Failed to send webhook:', e.message); }
}

async function runWorker() {
  console.log('[Worker] Booting up Market Monitor loop...');
  
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.resolve(dataDir, 'data.db');
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

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

    -- Apply migrations for existing dbs
    ALTER TABLE monitors ADD COLUMN target_buy_price INTEGER DEFAULT 0;
    ALTER TABLE monitors ADD COLUMN outbid_alert_sent INTEGER DEFAULT 0;
  `).catch(e => {
    // Ignore duplicate column errors from migrations
  });

  await db.exec(`

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_uuid TEXT NOT NULL,
      buy_price INTEGER NOT NULL,
      sell_price INTEGER NOT NULL,
      profit INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(player_uuid) REFERENCES monitors(player_uuid) ON DELETE CASCADE
    );
  `);

  async function loop() {
    try {
      const monitors = await db.all('SELECT * FROM monitors');
      const now = new Date();

      for (const m of monitors) {
        let shouldCheck = false;
        if (!m.last_checked_at) {
          shouldCheck = true;
        } else {
           // Basic interval check
          const lastCheck = new Date(m.last_checked_at);
          const diffMs = now.getTime() - lastCheck.getTime();
          const diffMins = diffMs / 1000 / 60;
          if (diffMins >= m.interval_minutes) {
            shouldCheck = true;
          }
        }

        if (shouldCheck) {
          console.log(`[Worker] Syncing price log for ${m.player_name}...`);
          try {
            const queryName = encodeURIComponent(m.player_name);
            const res = await fetch(`https://mlb26.theshow.com/apis/listings.json?name=${queryName}`);
            if (!res.ok) throw new Error('API Sync Error');
            const data = await res.json();
            
            if (data.listings && data.listings.length > 0) {
              const listing = data.listings.find(x => x.item.uuid === m.player_uuid || x.listing_name === m.player_name) || data.listings[0];
              const best_buy_price = Number(listing.best_buy_price) || 0;
              const best_sell_price = Number(listing.best_sell_price) || 0;
              
              let profit = 0;
              if (best_buy_price > 0 && best_sell_price > 0) {
                 profit = best_sell_price - Math.floor(best_sell_price * 0.10) - best_buy_price; 
              }

              // Anomaly Drop Logic (Compare to 48HR Average)
              if (m.drop_threshold_pct > 0) {
                const twoDaysAgo = new Date();
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                const hist = await db.get("SELECT AVG(buy_price) as avg_buy FROM price_history WHERE player_uuid = ? AND timestamp >= ?", [m.player_uuid, twoDaysAgo.toISOString()]);
                
                if (hist && hist.avg_buy > 0) {
                  const dropPct = ((hist.avg_buy - best_buy_price) / hist.avg_buy) * 100;
                  if (dropPct >= m.drop_threshold_pct) {
                     console.log(`\n📉 ANOMALY ALERT: ${m.player_name} dropped by ${dropPct.toFixed(1)}%!`);
                     await sendDiscordAlert(`📉 **MARKET CRASH ALERT** 📉\n**${m.player_name}**\nCurrent Buy: ${best_buy_price.toLocaleString()}\n48HR Average: ${Math.floor(hist.avg_buy).toLocaleString()}\nDrop: **${dropPct.toFixed(1)}%**!`);
                  }
                }
              }

              // Buy Order Tracker Logic
              if (m.target_buy_price > 0) {
                if (best_buy_price > m.target_buy_price) {
                  if (!m.outbid_alert_sent) {
                    console.log(`\n⚠️ OUTBID ALERT: ${m.player_name} top order is now ${best_buy_price.toLocaleString()}!`);
                    await sendDiscordAlert(`⚠️ **OUTBID ALERT** ⚠️\n**${m.player_name}**\nYou have been outbid!\nCurrent Best Buy: **${best_buy_price.toLocaleString()}** stubs\nYour Order: ${m.target_buy_price.toLocaleString()} stubs`);
                    await db.run('UPDATE monitors SET outbid_alert_sent = 1 WHERE player_uuid = ?', [m.player_uuid]);
                    m.outbid_alert_sent = 1;
                  }
                } else if (best_buy_price <= m.target_buy_price && m.outbid_alert_sent) {
                  // User replaced their order to be at the top again, or the price dropped below
                  await db.run('UPDATE monitors SET outbid_alert_sent = 0 WHERE player_uuid = ?', [m.player_uuid]);
                  m.outbid_alert_sent = 0;
                }
              }

              // Fire into historical tracker
              await db.run(
                'INSERT INTO price_history (player_uuid, buy_price, sell_price, profit) VALUES (?, ?, ?, ?)',
                [m.player_uuid, best_buy_price, best_sell_price, profit]
              );

              // Update timer
              await db.run('UPDATE monitors SET last_checked_at = ? WHERE player_uuid = ?', [now.toISOString(), m.player_uuid]);
              
              // Console Alert Hook (+ Discord)
              if (m.profit_threshold > 0 && profit >= m.profit_threshold) {
                console.log(`\n🚨 ALERT: ${m.player_name} Profit threshold met! Profit: ${profit.toLocaleString()} (Target: ${m.profit_threshold.toLocaleString()})`);
                await sendDiscordAlert(`🚨 **PROFIT TARGET ACQUIRED** 🚨\n**${m.player_name}**\nBuy: ${best_buy_price.toLocaleString()}\nSell: ${best_sell_price.toLocaleString()}\nProfit: **${profit.toLocaleString()}** (Target: ${m.profit_threshold.toLocaleString()})`);
              }
            }
          } catch (e) {
            console.error(`[Worker] Failed checking ${m.player_name}:`, e.message);
          }
        }
      }
    } catch (e) {
      console.error('[Worker] Loop Execution failed:', e);
    }

    // Run interval checker every 30 seconds
    setTimeout(loop, 30000);
  }

  loop();
}

runWorker();
