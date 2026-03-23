
const databasePort = Number(
  process.env.DB_PORT ||
  process.env.MYSQLPORT ||
  3306
)

export const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'reservation_system',
  port: Number.isFinite(databasePort) ? databasePort : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
}

export const jwtSecret = process.env.JWT_SECRET || 'your_secret_key_change_in_production'
