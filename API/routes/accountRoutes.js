import { parseBody, sendJson } from '../lib/http.js'

function slugifyCompanyName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'company'
}

function buildGeneratedCompanyEmail(name, suffix) {
  return `${slugifyCompanyName(name)}-${suffix}@company.local`
}

export async function handleAccountRoutes(req, res, pathname, authUser, context) {
  const { pool, requireDb, requireRole, hashPassword } = context

  if (pathname === '/api/company' && req.method === 'GET') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin', 'user'])) return true
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, address, created_at FROM companies ORDER BY id DESC'
    )
    sendJson(res, 200, { success: true, data: rows })
    return true
  }

  if (pathname === '/api/me' && req.method === 'GET') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin', 'user'])) return true
    const [rows] = await pool.query(
      'SELECT id, name, email, role, company_id, profile_image, created_at FROM users WHERE id = ? LIMIT 1',
      [authUser.id]
    )
    const user = rows[0]
    if (!user) {
      sendJson(res, 404, { success: false, message: 'User not found' })
      return true
    }
    sendJson(res, 200, { success: true, data: user })
    return true
  }

  if (pathname === '/api/companies' && req.method === 'GET') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin', 'user'])) return true
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, address, created_at FROM companies ORDER BY id DESC'
    )
    sendJson(res, 200, { success: true, data: rows })
    return true
  }

  if (pathname === '/api/companies' && req.method === 'POST') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const data = await parseBody(req)
    const name = String(data?.name || '').trim()
    const providedEmail = String(data?.email || '').trim().toLowerCase()
    const email = providedEmail || buildGeneratedCompanyEmail(name, Date.now())
    const phone = String(data?.phone || '').trim()
    const address = String(data?.address || '').trim()
    if (!name) {
      sendJson(res, 400, { success: false, message: 'Company name is required' })
      return true
    }
    const [exists] = await pool.query('SELECT id FROM companies WHERE email = ?', [email])
    if (exists.length > 0) {
      sendJson(res, 409, { success: false, message: 'Company with this email already exists' })
      return true
    }
    const [result] = await pool.query(
      'INSERT INTO companies (name, email, phone, address) VALUES (?, ?, ?, ?)',
      [name, email, phone, address]
    )
    sendJson(res, 201, {
      success: true,
      data: { id: result.insertId, name, email, phone, address, created_at: new Date().toISOString() },
    })
    return true
  }

  if (/^\/api\/companies\/\d+$/.test(pathname) && req.method === 'PUT') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const companyId = Number(pathname.split('/')[3])
    const data = await parseBody(req)
    const [existingRows] = await pool.query('SELECT * FROM companies WHERE id = ?', [companyId])
    const existing = existingRows[0]
    if (!existing) {
      sendJson(res, 404, { success: false, message: 'Company not found' })
      return true
    }
    const name = String(data?.name ?? existing.name).trim()
    const email = String(data?.email ?? existing.email).trim().toLowerCase() || existing.email
    const phone = String(data?.phone ?? existing.phone).trim()
    const address = String(data?.address ?? existing.address ?? '').trim()
    if (!name) {
      sendJson(res, 400, { success: false, message: 'Company name is required' })
      return true
    }
    const [dupeRows] = await pool.query('SELECT id FROM companies WHERE email = ? AND id <> ?', [email, companyId])
    if (dupeRows.length > 0) {
      sendJson(res, 409, { success: false, message: 'Company with this email already exists' })
      return true
    }
    await pool.query('UPDATE companies SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?', [
      name,
      email,
      phone,
      address,
      companyId,
    ])
    sendJson(res, 200, { success: true, data: { ...existing, name, email, phone, address } })
    return true
  }

  if (/^\/api\/companies\/\d+$/.test(pathname) && req.method === 'DELETE') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const companyId = Number(pathname.split('/')[3])
    const [result] = await pool.query('DELETE FROM companies WHERE id = ?', [companyId])
    if (result.affectedRows === 0) {
      sendJson(res, 404, { success: false, message: 'Company not found' })
      return true
    }
    await pool.query('UPDATE users SET company_id = NULL WHERE company_id = ?', [companyId])
    sendJson(res, 200, { success: true, message: 'Company deleted successfully' })
    return true
  }

  if (pathname === '/api/users' && req.method === 'GET') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const [rows] = await pool.query(
      'SELECT id, name, email, role, company_id, profile_image, created_at FROM users ORDER BY id DESC'
    )
    sendJson(res, 200, { success: true, data: rows })
    return true
  }

  if (pathname === '/api/me/profile-image' && req.method === 'PUT') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin', 'user'])) return true
    const data = await parseBody(req)
    const profileImage = data?.profile_image == null ? null : String(data.profile_image).trim()

    await pool.query('UPDATE users SET profile_image = ? WHERE id = ?', [profileImage || null, authUser.id])
    sendJson(res, 200, { success: true, data: { profile_image: profileImage || null } })
    return true
  }

  if (pathname === '/api/me/profile-image' && req.method === 'DELETE') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin', 'user'])) return true
    await pool.query('UPDATE users SET profile_image = NULL WHERE id = ?', [authUser.id])
    sendJson(res, 200, { success: true, data: { profile_image: null } })
    return true
  }

  if (pathname === '/api/users' && req.method === 'POST') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const data = await parseBody(req)
    const name = String(data?.name || '').trim()
    const email = String(data?.email || '').trim().toLowerCase()
    const password = String(data?.password || '')
    const role = data?.role === 'admin' ? 'admin' : 'user'
    const companyId = data?.company_id ? Number(data.company_id) : null

    if (!name || !email || !password) {
      sendJson(res, 400, { success: false, message: 'Name, email, and password are required' })
      return true
    }
    if (password.length < 6) {
      sendJson(res, 400, { success: false, message: 'Password must be at least 6 characters' })
      return true
    }
    const hashedPassword = await hashPassword(password)
    const [existsRows] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
    if (existsRows.length > 0) {
      sendJson(res, 409, { success: false, message: 'User email already exists' })
      return true
    }
    if (companyId !== null) {
      const [companyRows] = await pool.query('SELECT id FROM companies WHERE id = ?', [companyId])
      if (companyRows.length === 0) {
        sendJson(res, 400, { success: false, message: 'Selected company does not exist' })
        return true
      }
    }

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role, company_id, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [name, email, hashedPassword, role, companyId]
    )
    sendJson(res, 201, {
      success: true,
      data: { id: result.insertId, name, email, role, company_id: companyId, profile_image: null },
    })
    return true
  }

  if (/^\/api\/users\/\d+$/.test(pathname) && req.method === 'PUT') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const userId = Number(pathname.split('/')[3])
    const data = await parseBody(req)
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId])
    const existing = rows[0]
    if (!existing) {
      sendJson(res, 404, { success: false, message: 'User not found' })
      return true
    }

    const name = String(data?.name ?? existing.name).trim()
    const email = String(data?.email ?? existing.email).trim().toLowerCase()
    const role = data?.role === 'admin' ? 'admin' : 'user'
    const hasCompany = Object.prototype.hasOwnProperty.call(data || {}, 'company_id')
    const companyId = hasCompany ? (data.company_id ? Number(data.company_id) : null) : existing.company_id
    const password = typeof data?.password === 'string' ? data.password : ''

    if (!name || !email) {
      sendJson(res, 400, { success: false, message: 'Name and email are required' })
      return true
    }
    const [dupeRows] = await pool.query('SELECT id FROM users WHERE email = ? AND id <> ?', [email, userId])
    if (dupeRows.length > 0) {
      sendJson(res, 409, { success: false, message: 'User email already exists' })
      return true
    }
    if (companyId !== null) {
      const [companyRows] = await pool.query('SELECT id FROM companies WHERE id = ?', [companyId])
      if (companyRows.length === 0) {
        sendJson(res, 400, { success: false, message: 'Selected company does not exist' })
        return true
      }
    }
    if (password && password.length < 6) {
      sendJson(res, 400, { success: false, message: 'Password must be at least 6 characters' })
      return true
    }

    const hashedPassword = password ? await hashPassword(password) : ''
    await pool.query(
      'UPDATE users SET name = ?, email = ?, role = ?, company_id = ?, password = IF(? = "", password, ?) WHERE id = ?',
      [name, email, role, companyId, hashedPassword, hashedPassword, userId]
    )
    sendJson(res, 200, {
      success: true,
      data: {
        id: userId,
        name,
        email,
        role,
        company_id: companyId,
        profile_image: existing.profile_image || null,
      },
    })
    return true
  }

  if (/^\/api\/users\/\d+$/.test(pathname) && req.method === 'DELETE') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const userId = Number(pathname.split('/')[3])
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId])
    if (result.affectedRows === 0) {
      sendJson(res, 404, { success: false, message: 'User not found' })
      return true
    }
    sendJson(res, 200, { success: true, message: 'User deleted successfully' })
    return true
  }

  return false
}
