const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // wichtig für Railway!
  }
});

async function insertAbmeldung(data) {
  const query = `
    INSERT INTO abmeldungen (dienstgrad, name, von, bis, uhrzeit, message_id)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  const values = [
    data.dienstgrad,
    data.name,
    data.von,
    data.bis,
    data.uhrzeit,
    data.message_id
  ];

  await pool.query(query, values);
}

async function removeExpiredAbmeldungen() {
  const result = await pool.query(
    `SELECT id, message_id FROM abmeldungen WHERE bis < CURRENT_DATE`
  );

  for (const row of result.rows) {
    try {
      const channel = await client.channels.fetch(process.env.CHANNEL_ID);
      const message = await channel.messages.fetch(row.message_id);
      await message.delete();
    } catch (err) {
      console.warn(`⚠️ Nachricht ${row.message_id} konnte nicht gelöscht werden.`);
    }

    await pool.query(`DELETE FROM abmeldungen WHERE id = $1`, [row.id]);
  }
}

module.exports = {
  insertAbmeldung,
  removeExpiredAbmeldungen
};
