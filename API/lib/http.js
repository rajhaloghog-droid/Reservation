export function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

const MAX_BODY_BYTES = 1_000_000

export function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    let total = 0

    req.on('data', (chunk) => {
      total += chunk.length
      if (total > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'))
        req.destroy()
        return
      }
      body += chunk.toString()
    })

    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(body))
      } catch (err) {
        reject(err)
      }
    })
  })
}
