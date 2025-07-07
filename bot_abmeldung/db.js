import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function insertAbmeldung(data, messageId) {
  const query = `
    INSERT INTO abmeldungen (dienstgrad, vorname, nachname, von, bis, uhrzeit, message_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  const values = [data.dienstgrad, data.vorname, data.nachname, data.von, data.bis, data.uhrzeit, messageId];
  await pool.query(query, values);
}

export async function getAbgelaufeneAbmeldungen() {
  const res = await pool.query(`SELECT * FROM abmeldungen WHERE bis < CURRENT_DATE`);
  return res.rows;
}

export async function deleteAbmeldung(id) {
  await pool.query(`DELETE FROM abmeldungen WHERE id = $1`, [id]);
}

export async function getClient() {
  return pool;
}
