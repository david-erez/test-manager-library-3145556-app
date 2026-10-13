const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

async function request(path, { token, signal, ...options } = {}) {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal })
  const payload = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(payload?.message || 'No fue posible completar la solicitud.')
    error.status = response.status
    error.code = payload?.code
    throw error
  }

  return payload
}

export const api = {
  login(credentials) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  listCategories(token, signal) {
    return request('/categories', { token, signal })
  },

  listBooks({ token, search, categoryId, page, signal }) {
    const params = new URLSearchParams({ page: String(page), size: '20' })
    if (search.trim()) params.set('q', search.trim())
    if (categoryId) params.set('category_id', categoryId)
    return request(`/books?${params}`, { token, signal })
  },
}