import Database from "better-sqlite3";

const db = new Database("scores.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player TEXT NOT NULL,
    time INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

export function addScore(player, timeMs) {
    return db
        .prepare("INSERT INTO scores (player, time, created_at) VALUES (?,?,?)")
    .run(player, timeMs, Date.now()).lastInsertRowid;
}

export function getTopScores(limit = 10) {
    return db
        .prepare("SELECT * FROM scores ORDER BY time DESC LIMIT ?")  
        .all(limit);
}

export function getRank(timeMs) {
    const { rank } = db
        .prepare("SELECT COUNT(*) AS rank FROM scores WHERE time > ?")
        .get(timeMs);
    return rank + 1;
}

export function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3,"0")}`

}