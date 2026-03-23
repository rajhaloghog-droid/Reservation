import fs from 'fs'
import http from 'http'
import mysql from 'mysql2/promise'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { dbConfig } from '../API/config/db-config.js'
import { requireAuth, requireRole } from './lib/auth.js'
import { sendJson } from './lib/http.js'
import { handleAuthRoutes } from './routes/authRoutes.js'
import { handleAccountRoutes } from './routes/accountRoutes.js'
import { handleResourceRoutes } from './routes/resourceRoutes.js'
import { handleSchedulingRoutes } from './routes/schedulingRoutes.js'

// Resolve env file locations before reading env-dependent constants.
const currentFile = fileURLToPath(import.meta.url)
const apiDir = path.dirname(currentFile)
const projectRoot = path.resolve(apiDir, '..')
const envFromRoot = path.resolve(projectRoot, '.env')
const envFromApi = path.resolve(apiDir, '.env')

if (fs.existsSync(envFromRoot)) {
  dotenv.config({ path: envFromRoot })
} else if (fs.existsSync(envFromApi)) {
  dotenv.config({ path: envFromApi })
} else {
  dotenv.config()
}

const PORT = Number(process.env.PORT || 4000)
const HOST = String(process.env.HOST || '0.0.0.0').trim() || '0.0.0.0'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me'
const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10)
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '')
const LOCAL_NETWORK_ONLY = String(process.env.LOCAL_NETWORK_ONLY || 'true').trim().toLowerCase() !== 'false'

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set; using insecure default.')
}
const reactRoot = path.join(projectRoot, 'React')
const frontendDistRoot = path.join(projectRoot, 'front-end', 'dist')

let pool = null

async function initializeDatabase() {
  pool = mysql.createPool({
    ...dbConfig,
    dateStrings: true
  })
  const conn = await pool.getConnection()
  conn.release()
  await ensureSchema()
  await ensureDefaultAdmin()
  await ensureAdminUser()
  console.log('Database connected')
}

async function ensureSchema() {
  if (!pool) throw new Error('Database pool not initialized')
  async function addForeignKeyIfMissing(table, constraintName, sql) {
    const [existing] = await pool.query(
      `SELECT CONSTRAINT_NAME
         FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND CONSTRAINT_NAME = ?
        LIMIT 1`,
      [table, constraintName]
    )
    if (existing.length > 0) return false
    await pool.query(sql)
    return true
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(50) NOT NULL,
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
      company_id INT NULL,
      profile_image LONGTEXT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      position VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      department_branch VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vehicle_type VARCHAR(255) NOT NULL,
      quantity INT NOT NULL DEFAULT 0,
      car_model VARCHAR(255) DEFAULT '',
      photo LONGTEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicle_availability (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vehicle_id INT NOT NULL,
      availability_date DATE NOT NULL,
      slot VARCHAR(10) NOT NULL,
      state VARCHAR(30) NOT NULL DEFAULT 'available',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_vehicle_date_slot (vehicle_id, availability_date, slot)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      address TEXT,
      vehicle_id INT NULL,
      vehicle_type VARCHAR(255) DEFAULT '',
      quantity_available INT DEFAULT 0,
      date DATE NULL,
      start_time TIME NULL,
      end_time TIME NULL,
      note TEXT NULL,
      status ENUM('pending', 'approved', 'rejected', 'cancelled', 'admin-created') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  // Keep existing databases in sync with the expected reservation statuses.
  await pool.query(`
    ALTER TABLE reservations
      MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'cancelled', 'admin-created')
      DEFAULT 'pending'
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      address TEXT,
      employee_name VARCHAR(255) DEFAULT '',
      employee_position VARCHAR(255) DEFAULT '',
      employee_department_branch VARCHAR(255) DEFAULT '',
      vehicle_id INT NOT NULL,
      date DATE NOT NULL,
      booking_time TIME NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      note TEXT NULL,
      status ENUM('pending', 'approved', 'rejected', 'booked') DEFAULT 'pending',
      created_by_user_id INT NULL,
      created_by_user_email VARCHAR(255) DEFAULT '',
      decision_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  // Keep existing databases in sync with employee fields used by ATT forms.
  await pool.query(`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255) DEFAULT ''
  `)
  await pool.query(`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS employee_position VARCHAR(255) DEFAULT ''
  `)
  await pool.query(`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS employee_department_branch VARCHAR(255) DEFAULT ''
  `)
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS profile_image LONGTEXT NULL
  `)
  await pool.query(`
    ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS photo LONGTEXT NULL
  `)

  // Prevent double bookings at the database level.
  try {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_unique_slot
        ON bookings (vehicle_id, date, start_time, end_time)
    `)
  } catch (err) {
    console.warn('Skipping unique index on bookings:', err.message)
  }

  // Optional referential integrity; will be skipped if data is incompatible.
  try {
    await addForeignKeyIfMissing(
      'users',
      'fk_users_company',
      `
        ALTER TABLE users
          ADD CONSTRAINT fk_users_company
          FOREIGN KEY (company_id) REFERENCES companies(id)
          ON DELETE SET NULL
      `
    )
  } catch (err) {
    console.warn('Skipping FK users->companies:', err.message)
  }
  try {
    await addForeignKeyIfMissing(
      'bookings',
      'fk_bookings_vehicle',
      `
        ALTER TABLE bookings
          ADD CONSTRAINT fk_bookings_vehicle
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
          ON DELETE CASCADE
      `
    )
  } catch (err) {
    console.warn('Skipping FK bookings->vehicles:', err.message)
  }
  try {
    await addForeignKeyIfMissing(
      'reservations',
      'fk_reservations_vehicle',
      `
        ALTER TABLE reservations
          ADD CONSTRAINT fk_reservations_vehicle
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
          ON DELETE SET NULL
      `
    )
  } catch (err) {
    console.warn('Skipping FK reservations->vehicles:', err.message)
  }
}

async function ensureDefaultAdmin() {
  if (!pool) throw new Error('Database pool not initialized')
  const [[row]] = await pool.query('SELECT COUNT(*) AS count FROM users')
  if (Number(row.count) > 0) return

  const email = ADMIN_EMAIL || 'admin@example.com'
  const password = ADMIN_PASSWORD || 'ChangeMe123!'
  const hashed = await hashPassword(password)

  await pool.query(
    'INSERT INTO users (name, email, password, role, company_id, is_active) VALUES (?, ?, ?, ?, NULL, 1)',
    ['Administrator', email, hashed, 'admin']
  )
  console.log(`Default admin created -> email: ${email}, password: ${password}`)
}

// Ensure a known admin account exists (or update its password) so login works.
async function ensureAdminUser() {
  if (!pool) throw new Error('Database pool not initialized')
  const email = ADMIN_EMAIL || 'admin@example.com'
  const password = ADMIN_PASSWORD || ''
  if (!password) {
    console.warn('ADMIN_PASSWORD is empty; skipping admin upsert.')
    return
  }
  const hashed = await hashPassword(password)

  // Try to find by target email first.
  const [byEmail] = await pool.query(
    'SELECT id, password, is_active, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
    [email]
  )
  if (byEmail.length > 0) {
    const user = byEmail[0]
    const samePassword = await bcrypt.compare(password, user.password).catch(() => false)
    if (!samePassword || user.role !== 'admin' || user.is_active === 0) {
      await pool.query(
        'UPDATE users SET password = ?, role = ?, is_active = 1 WHERE id = ?',
        [hashed, 'admin', user.id]
      )
      console.log(`Admin upsert -> updated email: ${email}`)
    } else {
      console.log(`Admin upsert -> existing admin OK: ${email}`)
    }
    return
  }

  // If another admin exists, update it to the desired email/password.
  const [anyAdmin] = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1"
  )
  if (anyAdmin.length > 0) {
    await pool.query(
      'UPDATE users SET email = ?, password = ?, role = ?, is_active = 1 WHERE id = ?',
      [email, hashed, 'admin', anyAdmin[0].id]
    )
    console.log(`Admin upsert -> reassigned existing admin to ${email}`)
    return
  }

  // Otherwise create a new admin.
  await pool.query(
    'INSERT INTO users (name, email, password, role, company_id, is_active) VALUES (?, ?, ?, ?, NULL, 1)',
    ['Administrator', email, hashed, 'admin']
  )
  console.log(`Admin upsert -> created email: ${email}`)
}

const bcryptPrefix = /^\$2[aby]\$/

function isHashed(password) {
  return bcryptPrefix.test(String(password || ''))
}

async function hashPassword(password) {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS)
}

async function verifyPassword(input, stored, userId) {
  if (isHashed(stored)) {
    return bcrypt.compare(input, stored)
  }
  if (String(input) === String(stored)) {
    // auto-migrate legacy plain-text password to bcrypt
    try {
      const hashed = await hashPassword(input)
      await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId])
    } catch (err) {
      console.warn('Failed to migrate legacy password for user', userId, err.message)
    }
    return true
  }
  return false
}

function timeToSlot(timeStr) {
  if (!timeStr) return -1
  const [hours, minutes] = String(timeStr).split(':').map(Number)
  return Math.floor(((hours * 60 + minutes) - (8 * 60)) / 30)
}

function normalizeMysqlRowTimes(row) {
  return {
    ...row,
    date: row.date ? String(row.date).slice(0, 10) : row.date,
    booking_time: row.booking_time ? String(row.booking_time).slice(0, 5) : row.booking_time,
    start_time: row.start_time ? String(row.start_time).slice(0, 5) : row.start_time,
    end_time: row.end_time ? String(row.end_time).slice(0, 5) : row.end_time
  }
}

function normalizeRemoteAddress(remoteAddress) {
  const value = String(remoteAddress || '').trim().toLowerCase()
  if (!value) return ''
  if (value === '::1') return '127.0.0.1'
  if (value.startsWith('::ffff:')) return value.slice(7)
  return value
}

function isPrivateIpv4(address) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(address)) return false
  const parts = address.split('.').map(Number)
  if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false

  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 169 && parts[1] === 254)
  )
}

function isAllowedClientAddress(remoteAddress) {
  const normalizedAddress = normalizeRemoteAddress(remoteAddress)
  if (!normalizedAddress) return false
  if (isPrivateIpv4(normalizedAddress)) return true

  return (
    normalizedAddress === 'localhost' ||
    normalizedAddress === '::' ||
    normalizedAddress.startsWith('fc') ||
    normalizedAddress.startsWith('fd') ||
    normalizedAddress.startsWith('fe80:')
  )
}

async function requireDb(res) {
  if (pool) return true
  sendJson(res, 500, {
    success: false,
    message: 'Database is not connected. Check DB credentials in back-end/db-config.js or env vars.'
  })
  return false
}

const server = http.createServer(async (req, res) => {
  if (LOCAL_NETWORK_ONLY && !isAllowedClientAddress(req.socket.remoteAddress)) {
    sendJson(res, 403, {
      success: false,
      message: 'This server only accepts requests from the local network.'
    })
    return
  }

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname  = parsedUrl.pathname
  const query = Object.fromEntries(parsedUrl.searchParams.entries())
  let authUser = null

  const noAuthNeeded = pathname === '/api/health' && req.method === 'GET'

  if (pathname.startsWith('/api') && pathname !== '/api/login' && !noAuthNeeded) {
    if (!(await requireDb(res))) return
    authUser = await requireAuth(req, res, JWT_SECRET)
    if (!authUser) return
  }

  if (req.method === 'GET' && !pathname.startsWith('/api')) {
    const staticRoot = fs.existsSync(frontendDistRoot) ? frontendDistRoot : reactRoot
    const relativePath = pathname === '/' ? '/index.html' : decodeURIComponent(pathname)
    const resolvedPath = path.resolve(path.join(staticRoot, `.${relativePath}`))
    const withinRoot = !path.relative(staticRoot, resolvedPath).startsWith('..')
    if (!withinRoot) {
      sendJson(res, 403, { success: false, message: 'Forbidden' })
      return
    }

    const fallbackPath = path.join(staticRoot, 'index.html')
    const requestedFilePath = path.extname(resolvedPath) ? resolvedPath : fallbackPath

    fs.readFile(requestedFilePath, (err, data) => {
      if (err) {
        if (requestedFilePath !== fallbackPath) {
          fs.readFile(fallbackPath, (fallbackErr, fallbackData) => {
            if (fallbackErr) {
              res.writeHead(404, { 'Content-Type': 'text/html' })
              res.end('Not Found')
              return
            }
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(fallbackData)
          })
          return
        }
        res.writeHead(404, { 'Content-Type': 'text/html' })
        res.end('Not Found')
        return
      }
      let contentType = 'text/html'
      if (requestedFilePath.endsWith('.css')) contentType = 'text/css'
      else if (requestedFilePath.endsWith('.js')) contentType = 'application/javascript'
      else if (requestedFilePath.endsWith('.png')) contentType = 'image/png'
      else if (requestedFilePath.endsWith('.jpg') || requestedFilePath.endsWith('.jpeg')) contentType = 'image/jpeg'
      else if (requestedFilePath.endsWith('.svg')) contentType = 'image/svg+xml'
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(data)
    })
    return
  }

  try {
    if (await handleAuthRoutes(req, res, pathname, { pool, JWT_SECRET, requireDb, verifyPassword })) return

    if (pathname === '/api/health' && req.method === 'GET') {
      sendJson(res, 200, {
        success: true,
        status: 'ok',
        port: PORT,
        db: pool ? 'connected' : 'not_connected'
      })
      return
    }

    if (await handleAccountRoutes(req, res, pathname, authUser, { pool, requireDb, requireRole, hashPassword })) return

    if (await handleResourceRoutes(req, res, pathname, query, authUser, { pool, requireDb, requireRole })) return

    if (
      await handleSchedulingRoutes(req, res, pathname, query, authUser, {
        pool,
        requireDb,
        requireRole,
        normalizeMysqlRowTimes,
        timeToSlot,
      })
    ) return

    sendJson(res, 404, { error: 'Not found' })
  } catch (err) {
    console.error('API error:', err)
    if (err instanceof Error && err.message === 'Payload too large') {
      sendJson(res, 413, { success: false, message: 'Payload too large' })
    } else {
      sendJson(res, 500, {
        success: false,
        message: err instanceof Error ? err.message : 'Internal server error'
      })
    }
  }
})

initializeDatabase()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`)
      if (LOCAL_NETWORK_ONLY) {
        console.log('Local network only mode is enabled.')
      }
    })
    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please stop the other process using this port.`)
        process.exit(1)
      }
    })
  })
  .catch((err) => {
    console.error('Failed to initialize database. Server not started.', err.message)
    process.exit(1)
  })
