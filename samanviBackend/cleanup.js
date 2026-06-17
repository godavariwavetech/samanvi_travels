const mysql = require('./node_modules/mysql2/promise')
async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root', password: '', database: 'latest_samanvi_db'
  })
  const [g1] = await conn.query(
    "DELETE FROM mainmastersgroup WHERE mandal_name IS NULL OR mandal_name IN ('','__TEST_RAW__','__TEST_UPDATED__','__TEST_ENC__')"
  )
  console.log('Cleaned mainmastersgroup garbage:', g1.affectedRows, 'rows')

  const [g2] = await conn.query(
    "DELETE FROM mainmasterssubchildtwo WHERE temple_name IS NULL"
  )
  console.log('Cleaned null ledgers:', g2.affectedRows, 'rows')

  await conn.end()
}
main().catch(console.error)
