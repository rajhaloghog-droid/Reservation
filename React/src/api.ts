// API Configuration
const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim()

// Use the current origin by default so Vite can proxy `/api` in development
// and the backend can serve the same relative paths in production.
export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, '')

export const apiCall = async (endpoint: string, options?: RequestInit) => {
  const url = `${API_BASE_URL}${endpoint}`
  return fetch(url, options)
}
