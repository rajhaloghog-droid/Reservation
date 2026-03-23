import { parseBody, sendJson } from '../lib/http.js'

export async function handleSchedulingRoutes(req, res, pathname, query, authUser, context) {
  const { pool, requireDb, requireRole, normalizeMysqlRowTimes, timeToSlot } = context

  if (pathname === '/api/reservations' && req.method === 'GET') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin', 'user'])) return true
    const isAdmin = authUser?.role === 'admin'
    const [rows] = await pool.query(
      isAdmin
        ? `SELECT id, company, phone, address, vehicle_id, vehicle_type, quantity_available,
                  date, start_time, end_time, note, status, created_at
             FROM reservations
            ORDER BY id DESC`
        : `SELECT id, vehicle_id, vehicle_type, quantity_available,
                  date, start_time, end_time, status, created_at
             FROM reservations
            ORDER BY id DESC`
    )
    const data = rows.map((row) => normalizeMysqlRowTimes(row))
    sendJson(res, 200, { success: true, data })
    return true
  }

  if (pathname === '/api/reservations' && req.method === 'POST') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const data = await parseBody(req)
    const requestedStatus = String(data?.status || 'pending').trim().toLowerCase()
    const allowedReservationStatuses = new Set(['pending', 'approved', 'rejected', 'cancelled', 'admin-created'])
    const status = allowedReservationStatuses.has(requestedStatus) ? requestedStatus : 'pending'
    const reservation = {
      company: String(data?.company || '').trim(),
      phone: String(data?.phone || '').trim(),
      address: String(data?.address || '').trim(),
      vehicle_id: data?.vehicle_id ? Number(data.vehicle_id) : null,
      vehicle_type: String(data?.vehicle_type || '').trim(),
      quantity_available: data?.quantity_available ? Number(data.quantity_available) : 0,
      date: data?.date ? String(data.date).slice(0, 10) : null,
      start_time: data?.start_time ? String(data.start_time).slice(0, 5) : null,
      end_time: data?.end_time ? String(data.end_time).slice(0, 5) : null,
      note: String(data?.note || '').trim(),
      status,
    }

    const [result] = await pool.query(
      `INSERT INTO reservations
        (company, phone, address, vehicle_id, vehicle_type, quantity_available, date, start_time, end_time, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reservation.company,
        reservation.phone,
        reservation.address,
        reservation.vehicle_id,
        reservation.vehicle_type,
        reservation.quantity_available,
        reservation.date,
        reservation.start_time,
        reservation.end_time,
        reservation.note,
        reservation.status,
      ]
    )
    sendJson(res, 201, { success: true, data: { id: result.insertId, ...reservation } })
    return true
  }

  if (/^\/api\/reservations\/\d+$/.test(pathname) && req.method === 'DELETE') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const reservationId = Number(pathname.split('/')[3])
    const [result] = await pool.query('DELETE FROM reservations WHERE id = ?', [reservationId])
    if (result.affectedRows === 0) {
      sendJson(res, 404, { error: 'Reservation not found' })
      return true
    }
    sendJson(res, 200, { success: true, message: 'Reservation deleted successfully' })
    return true
  }

  if (pathname === '/api/bookings' && req.method === 'GET') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin', 'user'])) return true
    const requestedCreatorId = query.created_by_user_id ? Number(query.created_by_user_id) : null
    const requestedCreatorEmail = query.created_by_user_email ? String(query.created_by_user_email).trim().toLowerCase() : ''
    const isAdmin = authUser?.role === 'admin'

    let sql = ''
    const params = []

    if (isAdmin) {
      sql =
        `SELECT id, company, phone, address, employee_name, employee_position, employee_department_branch,
                vehicle_id, date, booking_time, start_time, end_time, note, status,
                created_by_user_id, created_by_user_email, decision_at, created_at
           FROM bookings`
      if (Number.isFinite(requestedCreatorId) && requestedCreatorId !== null && requestedCreatorEmail) {
        sql += ' WHERE created_by_user_id = ? AND LOWER(created_by_user_email) = ?'
        params.push(requestedCreatorId, requestedCreatorEmail)
      } else if (Number.isFinite(requestedCreatorId) && requestedCreatorId !== null) {
        sql += ' WHERE created_by_user_id = ?'
        params.push(requestedCreatorId)
      } else if (requestedCreatorEmail) {
        sql += ' WHERE LOWER(created_by_user_email) = ?'
        params.push(requestedCreatorEmail)
      }
    } else if (
      (Number.isFinite(requestedCreatorId) && requestedCreatorId === Number(authUser.id)) ||
      requestedCreatorEmail === String(authUser.email || '').trim().toLowerCase()
    ) {
      sql =
        `SELECT id, company, phone, address, employee_name, employee_position, employee_department_branch,
                vehicle_id, date, booking_time, start_time, end_time, note, status,
                created_by_user_id, created_by_user_email, decision_at, created_at
           FROM bookings
          WHERE created_by_user_id = ? AND LOWER(created_by_user_email) = ?`
      params.push(Number(authUser.id), String(authUser.email || '').trim().toLowerCase())
    } else {
      sql =
        `SELECT id, vehicle_id, date, booking_time, start_time, end_time, status
           FROM bookings
          WHERE status IN ('approved', 'booked')`
    }

    sql += ' ORDER BY id DESC'

    const [rows] = await pool.query(sql, params)
    const data = rows.map((row) => normalizeMysqlRowTimes(row))
    sendJson(res, 200, { success: true, data })
    return true
  }

  if (pathname === '/api/bookings' && req.method === 'POST') {
    if (!(await requireDb(res))) return true
    const data = await parseBody(req)
    const startTime = String(data?.start_time || data?.booking_time || '')
    const endTime = String(data?.end_time || '')
    const vehicleId = Number(data?.vehicle_id)
    const date = String(data?.date || '').slice(0, 10)
    const startSlot = timeToSlot(startTime)
    const endSlot = timeToSlot(endTime)

    if (!vehicleId || !date || !startTime || !endTime) {
      sendJson(res, 400, {
        success: false,
        error: 'Vehicle, date, start time, and end time are required',
      })
      return true
    }
    if (startSlot < 0 || endSlot <= startSlot) {
      sendJson(res, 400, { success: false, error: 'Invalid time range' })
      return true
    }

    const [entryRows] = await pool.query(
      `SELECT id
         FROM reservations
        WHERE vehicle_id = ?
          AND date = ?
          AND (
            LOWER(COALESCE(status, '')) = 'admin-created'
            OR LOWER(COALESCE(company, '')) = 'admin'
          )
        LIMIT 1`,
      [vehicleId, date]
    )
    if (entryRows.length === 0) {
      sendJson(res, 200, {
        success: false,
        error: 'No entry available for the selected vehicle and date. Please ask admin to add entry first.',
      })
      return true
    }

    const [existingRows] = await pool.query(
      `SELECT id, start_time, end_time, booking_time, status
         FROM bookings
        WHERE vehicle_id = ? AND date = ? AND status <> 'rejected'`,
      [vehicleId, date]
    )

    const hasOverlap = existingRows.some((booking) => {
      const bookingStart = timeToSlot(booking.start_time || booking.booking_time)
      const bookingEnd = booking.end_time ? timeToSlot(booking.end_time) : bookingStart + 1
      if (bookingStart < 0 || bookingEnd <= bookingStart) return false
      return startSlot < bookingEnd && bookingStart < endSlot
    })

    if (hasOverlap) {
      sendJson(res, 200, {
        success: false,
        code: 'DOUBLE_RESERVATION',
        error: 'Double reservation: this time range is already booked.',
      })
      return true
    }

    const payload = {
      company: String(data?.company || '').trim(),
      phone: String(data?.phone || '').trim(),
      address: String(data?.address || '').trim(),
      employee_name: String(data?.employee_name || '').trim(),
      employee_position: String(data?.employee_position || '').trim(),
      employee_department_branch: String(data?.employee_department_branch || '').trim(),
      vehicle_id: vehicleId,
      date,
      booking_time: startTime.slice(0, 5),
      start_time: startTime.slice(0, 5),
      end_time: endTime.slice(0, 5),
      note: String(data?.note || '').trim(),
      status: 'pending',
      created_by_user_id: data?.created_by_user_id ? Number(data.created_by_user_id) : null,
      created_by_user_email: String(data?.created_by_user_email || '').trim().toLowerCase(),
    }

    if (!payload.employee_name || !payload.employee_position || !payload.employee_department_branch) {
      sendJson(res, 400, {
        success: false,
        error: 'Employee name, position, and department/branch are required',
      })
      return true
    }

    try {
      const [result] = await pool.query(
        `INSERT INTO bookings
          (company, phone, address, employee_name, employee_position, employee_department_branch,
           vehicle_id, date, booking_time, start_time, end_time, note, status, created_by_user_id, created_by_user_email)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.company,
          payload.phone,
          payload.address,
          payload.employee_name,
          payload.employee_position,
          payload.employee_department_branch,
          payload.vehicle_id,
          payload.date,
          payload.booking_time,
          payload.start_time,
          payload.end_time,
          payload.note,
          payload.status,
          payload.created_by_user_id,
          payload.created_by_user_email,
        ]
      )
      sendJson(res, 201, { success: true, data: { id: result.insertId, ...payload } })
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        sendJson(res, 409, { success: false, code: 'DOUBLE_RESERVATION', error: 'Double reservation' })
      } else {
        throw err
      }
    }
    return true
  }

  if (/^\/api\/bookings\/\d+\/approve$/.test(pathname) && req.method === 'POST') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const bookingId = Number(pathname.split('/')[3])
    const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId])
    const booking = rows[0]
    if (!booking) {
      sendJson(res, 404, { success: false, message: 'Booking not found' })
      return true
    }

    const targetStart = timeToSlot(booking.start_time || booking.booking_time)
    const targetEnd = booking.end_time ? timeToSlot(booking.end_time) : targetStart + 1
    const [conflictRows] = await pool.query(
      `SELECT id, start_time, end_time, booking_time
         FROM bookings
        WHERE id <> ?
          AND vehicle_id = ?
          AND date = ?
          AND status IN ('approved', 'booked')`,
      [bookingId, booking.vehicle_id, String(booking.date).slice(0, 10)]
    )

    const hasOverlap = conflictRows.some((existingBooking) => {
      const existingStart = timeToSlot(existingBooking.start_time || existingBooking.booking_time)
      const existingEnd = existingBooking.end_time ? timeToSlot(existingBooking.end_time) : existingStart + 1
      if (existingStart < 0 || existingEnd <= existingStart) return false
      if (targetStart < 0 || targetEnd <= targetStart) return false
      return targetStart < existingEnd && existingStart < targetEnd
    })

    if (hasOverlap) {
      sendJson(res, 409, { success: false, code: 'DOUBLE_RESERVATION', message: 'Double reservation' })
      return true
    }

    await pool.query('UPDATE bookings SET status = ?, decision_at = NOW() WHERE id = ?', ['approved', bookingId])
    const [updatedRows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId])
    sendJson(res, 200, { success: true, data: normalizeMysqlRowTimes(updatedRows[0]) })
    return true
  }

  if (/^\/api\/bookings\/\d+\/reject$/.test(pathname) && req.method === 'POST') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const bookingId = Number(pathname.split('/')[3])
    const [rows] = await pool.query('SELECT id FROM bookings WHERE id = ?', [bookingId])
    if (rows.length === 0) {
      sendJson(res, 404, { success: false, message: 'Booking not found' })
      return true
    }
    await pool.query('UPDATE bookings SET status = ?, decision_at = NOW() WHERE id = ?', ['rejected', bookingId])
    const [updatedRows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId])
    sendJson(res, 200, { success: true, data: normalizeMysqlRowTimes(updatedRows[0]) })
    return true
  }

  if (/^\/api\/bookings\/\d+$/.test(pathname) && req.method === 'DELETE') {
    if (!(await requireDb(res))) return true
    if (!requireRole(res, authUser, ['admin'])) return true
    const bookingId = Number(pathname.split('/')[3])
    const [result] = await pool.query('DELETE FROM bookings WHERE id = ?', [bookingId])
    if (result.affectedRows === 0) {
      sendJson(res, 404, { success: false, message: 'Booking not found' })
      return true
    }
    sendJson(res, 200, { success: true, message: 'Booking deleted successfully' })
    return true
  }

  return false
}
