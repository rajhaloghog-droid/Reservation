import { parseBody, sendJson } from '../lib/http.js'

export async function handleResourceRoutes(req, res, pathname, query, authUser, context) {
  const { pool, requireDb, requireRole } = context

  if (pathname === '/api/employees' && req.method === 'GET') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin', 'user'])) return true
    const [rows] = await pool.query(
      'SELECT id, position, name, department_branch, created_at FROM employees ORDER BY id DESC'
    )
    sendJson(res, 200, { success: true, data: rows })
    return true
  }

  if (pathname === '/api/employees' && req.method === 'POST') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const data = await parseBody(req)
    const position = String(data?.position || '').trim()
    const name = String(data?.name || '').trim()
    const departmentBranch = String(data?.department_branch || '').trim()
    if (!position || !name || !departmentBranch) {
      sendJson(res, 400, { success: false, message: 'Position, name, and Dept./Branch are required' })
      return true
    }

    const [result] = await pool.query(
      'INSERT INTO employees (position, name, department_branch) VALUES (?, ?, ?)',
      [position, name, departmentBranch]
    )
    sendJson(res, 201, {
      success: true,
      data: {
        id: result.insertId,
        position,
        name,
        department_branch: departmentBranch,
        created_at: new Date().toISOString(),
      },
    })
    return true
  }

  if (/^\/api\/employees\/\d+$/.test(pathname) && req.method === 'PUT') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const employeeId = Number(pathname.split('/')[3])
    const data = await parseBody(req)
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [employeeId])
    const existing = rows[0]
    if (!existing) {
      sendJson(res, 404, { success: false, message: 'Employee not found' })
      return true
    }

    const position = String(data?.position ?? existing.position).trim()
    const name = String(data?.name ?? existing.name).trim()
    const departmentBranch = String(data?.department_branch ?? existing.department_branch).trim()

    if (!position || !name || !departmentBranch) {
      sendJson(res, 400, { success: false, message: 'Position, name, and Dept./Branch are required' })
      return true
    }

    await pool.query(
      'UPDATE employees SET position = ?, name = ?, department_branch = ? WHERE id = ?',
      [position, name, departmentBranch, employeeId]
    )
    sendJson(res, 200, {
      success: true,
      data: { id: employeeId, position, name, department_branch: departmentBranch },
    })
    return true
  }

  if (/^\/api\/employees\/\d+$/.test(pathname) && req.method === 'DELETE') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const employeeId = Number(pathname.split('/')[3])
    const [result] = await pool.query('DELETE FROM employees WHERE id = ?', [employeeId])
    if (result.affectedRows === 0) {
      sendJson(res, 404, { success: false, message: 'Employee not found' })
      return true
    }
    sendJson(res, 200, { success: true, message: 'Employee deleted successfully' })
    return true
  }

  if (pathname === '/api/vehicles' && req.method === 'GET') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin', 'user'])) return true
    const [rows] = await pool.query(
      'SELECT id, vehicle_type, quantity, car_model, photo, created_at FROM vehicles ORDER BY id DESC'
    )
    sendJson(res, 200, { success: true, data: rows })
    return true
  }

  if (pathname === '/api/vehicles' && req.method === 'POST') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const data = await parseBody(req)
    const vehicleType = String(data?.vehicle_type || 'Unknown').trim() || 'Unknown'
    const quantity = Number.isFinite(Number(data?.quantity)) ? Number(data.quantity) : 0
    const carModel = String(data?.car_model || '').trim()
    const photo = data?.photo == null ? null : String(data.photo).trim()
    const [result] = await pool.query(
      'INSERT INTO vehicles (vehicle_type, quantity, car_model, photo) VALUES (?, ?, ?, ?)',
      [vehicleType, quantity, carModel, photo || null]
    )
    sendJson(res, 201, {
      success: true,
      data: {
        id: result.insertId,
        vehicle_type: vehicleType,
        quantity,
        car_model: carModel,
        photo: photo || null,
        created_at: new Date().toISOString(),
      },
    })
    return true
  }

  if (/^\/api\/vehicles\/\d+$/.test(pathname) && req.method === 'PUT') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const vehicleId = Number(pathname.split('/')[3])
    const data = await parseBody(req)
    const [rows] = await pool.query('SELECT * FROM vehicles WHERE id = ?', [vehicleId])
    const existing = rows[0]
    if (!existing) {
      sendJson(res, 404, { error: 'Vehicle not found' })
      return true
    }
    const vehicleType = String(data?.vehicle_type ?? existing.vehicle_type).trim()
    const quantity = Number.isFinite(Number(data?.quantity)) ? Number(data.quantity) : Number(existing.quantity || 0)
    const carModel = String(data?.car_model ?? existing.car_model ?? '').trim()
    const hasPhoto = Object.prototype.hasOwnProperty.call(data || {}, 'photo')
    const photo = hasPhoto ? (data?.photo == null ? null : String(data.photo).trim() || null) : (existing.photo || null)
    await pool.query('UPDATE vehicles SET vehicle_type = ?, quantity = ?, car_model = ?, photo = ? WHERE id = ?', [
      vehicleType,
      quantity,
      carModel,
      photo,
      vehicleId,
    ])
    sendJson(res, 200, {
      success: true,
      data: { ...existing, vehicle_type: vehicleType, quantity, car_model: carModel, photo },
    })
    return true
  }

  if (/^\/api\/vehicles\/\d+$/.test(pathname) && req.method === 'DELETE') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const vehicleId = Number(pathname.split('/')[3])
    const [result] = await pool.query('DELETE FROM vehicles WHERE id = ?', [vehicleId])
    if (result.affectedRows === 0) {
      sendJson(res, 404, { error: 'Vehicle not found' })
      return true
    }
    sendJson(res, 200, { success: true })
    return true
  }

  if (/^\/api\/vehicles\/\d+$/.test(pathname) && req.method === 'GET') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin', 'user'])) return true
    const vehicleId = Number(pathname.split('/')[3])
    const [rows] = await pool.query(
      'SELECT id, vehicle_type, quantity, car_model, photo, created_at FROM vehicles WHERE id = ?',
      [vehicleId]
    )
    if (rows.length === 0) {
      sendJson(res, 404, { error: 'Vehicle not found' })
      return true
    }
    sendJson(res, 200, { success: true, data: rows[0] })
    return true
  }

  if (/^\/api\/vehicles\/\d+\/availability/.test(pathname) && req.method === 'GET') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin', 'user'])) return true
    const vehicleId = Number(pathname.split('/')[3])
    const date = query.date || new Date().toISOString().split('T')[0]
    const [rows] = await pool.query(
      'SELECT slot, state, availability_date FROM vehicle_availability WHERE vehicle_id = ? AND availability_date = ? ORDER BY slot',
      [vehicleId, date]
    )
    const data = rows.map((row) => ({
      slot: row.slot,
      state: row.state,
      date: String(row.availability_date).slice(0, 10),
    }))
    sendJson(res, 200, { success: true, data })
    return true
  }

  if (/^\/api\/vehicles\/\d+\/availability/.test(pathname) && req.method === 'POST') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const vehicleId = Number(pathname.split('/')[3])
    const data = await parseBody(req)
    const slot = String(data?.slot || '').trim()
    const state = String(data?.state || 'available').trim()
    const date = String(data?.availability_date || new Date().toISOString().split('T')[0]).slice(0, 10)

    await pool.query(
      `
        INSERT INTO vehicle_availability (vehicle_id, availability_date, slot, state)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE state = VALUES(state)
      `,
      [vehicleId, date, slot, state]
    )

    sendJson(res, 200, { success: true, data: { slot, state, date } })
    return true
  }

  return false
}
