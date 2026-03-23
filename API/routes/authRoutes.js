import jwt from 'jsonwebtoken'
import { parseBody, sendJson } from '../lib/http.js'

export async function handleAuthRoutes(req, res, pathname, context) {
  if (pathname !== '/api/login' || req.method !== 'POST') {
    return false
  }

  const { pool, JWT_SECRET, requireDb, verifyPassword } = context
  const body = await parseBody(req)
  const username = String(body?.username || body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '').trim()

  if (!username || !password) {
    sendJson(res, 400, { success: false, message: 'Username/email and password are required' })
    return true
  }

  if (!(await requireDb(res))) return true
  const [rows] = await pool.query(
    `
      SELECT id, name, email, password, role, profile_image, is_active
        FROM users
       WHERE LOWER(email) = ? OR LOWER(name) = ?
       LIMIT 1
    `,
    [username, username]
  )

  const user = rows[0]
  if (!user) {
    sendJson(res, 401, { success: false, message: 'Invalid credentials' })
    return true
  }

  const ok = await verifyPassword(password, user.password, user.id)
  if (!ok) {
    sendJson(res, 401, { success: false, message: 'Invalid credentials' })
    return true
  }

  if (user.is_active === 0) {
    sendJson(res, 403, { success: false, message: 'Account is inactive' })
    return true
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role === 'admin' ? 'admin' : 'user' },
    JWT_SECRET,
    { expiresIn: '8h' }
  )

  sendJson(res, 200, {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role === 'admin' ? 'admin' : 'user',
      profile_image: user.profile_image || null,
    },
  })
  return true
}
