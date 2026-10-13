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

  listBooks({ token, search, categoryId, page = 1, size = 20, signal }) {
    const params = new URLSearchParams({ page: String(page), size: String(Math.min(size, 50)) })
    if (search.trim()) params.set('q', search.trim())
    if (categoryId) params.set('category_id', categoryId)
    return request(`/books?${params}`, { token, signal })
  },

  createBook(token, data) {
    return request('/books', { token, method: 'POST', body: JSON.stringify(data) })
  },

  updateBook(token, id, data) {
    return request(`/books/${id}`, { token, method: 'PUT', body: JSON.stringify(data) })
  },

  deleteBook(token, id) {
    return request(`/books/${id}`, { token, method: 'DELETE' })
  },

  uploadBookCover(token, id, file) {
    const body = new FormData()
    body.append('file', file)
    return request(`/books/${id}/cover`, { token, method: 'PUT', body })
  },

  deleteBookCover(token, id) {
    return request(`/books/${id}/cover`, { token, method: 'DELETE' })
  },

  listMembers({ token, search = '', page = 1, size = 20, signal }) {
    const params = new URLSearchParams({ page: String(page), size: String(Math.min(size, 50)) })
    if (search.trim()) params.set('q', search.trim())
    return request(`/members?${params}`, { token, signal })
  },

  getMember(token, id, signal) {
    return request(`/members/${id}`, { token, signal })
  },

  createMember(token, data) {
    return request('/members', { token, method: 'POST', body: JSON.stringify(data) })
  },

  createLibrarian(token, data) {
    return request('/users', { token, method: 'POST', body: JSON.stringify({ ...data, role: 'librarian' }) })
  },

  createLoan(token, data) {
    return request('/loans', { token, method: 'POST', body: JSON.stringify(data) })
  },

  listLoans({ token, filters = {}, page = 1, signal }) {
    const params = new URLSearchParams({ page: String(page), size: '20' })
    for (const key of ['from', 'to', 'status', 'member_id']) {
      if (filters[key]) params.set(key, filters[key])
    }
    return request(`/loans?${params}`, { token, signal })
  },

  getLoan(token, id, signal) {
    return request(`/loans/${id}`, { token, signal })
  },

  returnLoanItem(token, loanId, itemId) {
    return request(`/loans/${loanId}/items/${itemId}/return`, { token, method: 'POST' })
  },

  listOverdue(token, signal) {
    return request('/loans/overdue', { token, signal })
  },

  mostBorrowed(token, from, to, signal) {
    const params = new URLSearchParams({ from, to })
    return request(`/reports/most-borrowed?${params}`, { token, signal })
  },
}