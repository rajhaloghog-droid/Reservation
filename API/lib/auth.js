import jwt from 'jsonwebtoken'
import { sendJson } from './http.js'

export function requireRole(res, user, roles) {
  if (!user || !roles.includes(user.role)) {
    sendJson(res, 403, { success: false, message: 'Forbidden' })
    return false
  }
  return true
}

export async function requireAuth(req, res, jwtSecret) {
  const header = req.headers['authorization'] || req.headers['Authorization'] || ''
  if (!header.startsWith('Bearer ')) {
    sendJson(res, 401, { success: false, message: 'Missing or invalid Authorization header' })
    return null
  }

  const token = header.slice(7).trim()
  try {
    return jwt.verify(token, jwtSecret)
  } catch {
    sendJson(res, 401, { success: false, message: 'Invalid or expired token' })
    return null
  }
}
