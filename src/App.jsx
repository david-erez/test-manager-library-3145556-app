import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, LibraryBig, LogOut, Search, SlidersHorizontal } from 'lucide-react'
import { api } from './api'
import './App.css'

const SESSION_KEY = 'manager-library-session'
const PAGE_SIZE = 20

function restoreSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
    if (!saved || saved.expires_at <= Date.now()) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return saved
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

function App() {
  const [session, setSession] = useState(restoreSession)
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [sessionNotice, setSessionNotice] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [books, setBooks] = useState({ items: [], page: 1, size: PAGE_SIZE, total: 0 })
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const token = session?.access_token

  useEffect(() => {
    if (!token) return undefined

    const controller = new AbortController()
    api.listCategories(token, controller.signal)
      .then(setCategories)
      .catch((error) => {
        if (error.name === 'AbortError') return
        if (error.status === 401) {
          sessionStorage.removeItem(SESSION_KEY)
          setSession(null)
          setSessionNotice('La sesión venció. Inicia sesión de nuevo.')
        }
      })

    return () => controller.abort()
  }, [token])

  useEffect(() => {
    if (!token) return undefined

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setIsLoading(true)
      setCatalogError('')
      api.listBooks({ token, search, categoryId, page, signal: controller.signal })
        .then(setBooks)
        .catch((error) => {
          if (error.name === 'AbortError') return
          if (error.status === 401) {
            sessionStorage.removeItem(SESSION_KEY)
            setSession(null)
            setSessionNotice('La sesión venció. Inicia sesión de nuevo.')
            return
          }
          setCatalogError(error.message || 'No fue posible cargar el catálogo.')
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false)
        })
    }, 180)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [token, search, categoryId, page])

  async function handleLogin(event) {
    event.preventDefault()
    setIsLoggingIn(true)
    setLoginError('')

    try {
      const result = await api.login(credentials)
      const nextSession = {
        ...result,
        expires_at: Date.now() + result.expires_in * 1000,
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
      setSession(nextSession)
      setSessionNotice('')
    } catch (error) {
      setLoginError(error.message || 'No fue posible iniciar sesión.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
    setBooks({ items: [], page: 1, size: PAGE_SIZE, total: 0 })
    setCategories([])
    setSearch('')
    setCategoryId('')
    setPage(1)
    setSessionNotice('')
  }

  if (!session) {
    return (
      <main className="login-layout">
        <section className="login-brand-panel" aria-label="Manager Library">
          <div className="brand-lockup">
            <span className="brand-mark"><LibraryBig aria-hidden="true" /></span>
            <span>Manager Library</span>
          </div>
          <div className="brand-copy">
            <p className="eyebrow">SISTEMA DE BIBLIOTECA</p>
            <h1>Un espacio<br />para cada <em>historia.</em></h1>
            <div className="brand-rule" />
            <p className="brand-caption">Gestión de colección y circulación</p>
          </div>
          <div className="brand-footer"><span>ADSO · 3145556</span><span>01 / 06</span></div>
        </section>

        <section className="login-form-panel">
          <div className="mobile-brand brand-lockup">
            <span className="brand-mark"><LibraryBig aria-hidden="true" /></span>
            <span>Manager Library</span>
          </div>
          <form className="login-form" onSubmit={handleLogin}>
            <p className="eyebrow">ACCESO AL SISTEMA</p>
            <h2>Iniciar sesión</h2>
            <p className="form-intro">Ingresa con tu cuenta de biblioteca.</p>
            {sessionNotice && <p className="form-notice" role="status">{sessionNotice}</p>}
            {loginError && <p className="form-error" role="alert">{loginError}</p>}
            <label htmlFor="username">Usuario</label>
            <input
              autoComplete="username"
              id="username"
              name="username"
              onChange={(event) => setCredentials({ ...credentials, username: event.target.value })}
              placeholder="Tu nombre de usuario"
              required
              value={credentials.username}
            />
            <label htmlFor="password">Contraseña</label>
            <input
              autoComplete="current-password"
              id="password"
              name="password"
              onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
              placeholder="Tu contraseña"
              required
              type="password"
              value={credentials.password}
            />
            <button className="primary-button login-button" disabled={isLoggingIn} type="submit">
              {isLoggingIn ? 'Verificando…' : 'Entrar'}
              {!isLoggingIn && <ArrowRight aria-hidden="true" size={18} />}
            </button>
          </form>
          <p className="login-footnote">Acceso exclusivo para el equipo de biblioteca</p>
        </section>
      </main>
    )
  }

  const totalPages = Math.max(1, Math.ceil(books.total / PAGE_SIZE))

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="brand-lockup sidebar-brand">
          <span className="brand-mark"><LibraryBig aria-hidden="true" /></span>
          <span>Manager Library</span>
        </div>
        <div className="sidebar-section-label">BIBLIOTECA</div>
        <nav aria-label="Navegación principal">
          <a className="nav-link nav-link-active" href="#catalog" aria-current="page">
            <BookOpen aria-hidden="true" size={18} />
            <span>Catálogo</span>
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-chip">
            <span className="user-avatar">{session.role === 'admin' ? 'A' : 'B'}</span>
            <span className="user-meta"><strong>{session.role === 'admin' ? 'Administrador' : 'Bibliotecario'}</strong><small>{session.role}</small></span>
          </div>
          <button className="quiet-button logout-button" onClick={handleLogout} type="button">
            <LogOut aria-hidden="true" size={17} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="catalog-main" id="catalog">
        <header className="page-header">
          <div>
            <p className="eyebrow">COLECCIÓN</p>
            <h1>Catálogo</h1>
          </div>
          <div className="header-count"><span className="count-dot" />{books.total} títulos</div>
        </header>

        <section className="catalog-toolbar" aria-label="Filtros del catálogo">
          <label className="search-field" htmlFor="catalog-search">
            <Search aria-hidden="true" size={18} />
            <input
              id="catalog-search"
              onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              placeholder="Buscar título o autor"
              type="search"
              value={search}
            />
          </label>
          <label className="category-filter" htmlFor="category-filter">
            <SlidersHorizontal aria-hidden="true" size={17} />
            <select id="category-filter" onChange={(event) => { setCategoryId(event.target.value); setPage(1) }} value={categoryId}>
              <option value="">Todas las categorías</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
        </section>

        {catalogError && <p className="catalog-error" role="alert">{catalogError}</p>}

        <section className="catalog-table-wrap" aria-label="Libros">
          <table className="catalog-table">
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Autor</th>
                <th scope="col">Categoría</th>
                <th scope="col">ISBN</th>
                <th className="copies-column" scope="col">Disponibles</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td className="table-message" colSpan="5">Cargando catálogo…</td></tr>
              )}
              {!isLoading && !catalogError && books.items.length === 0 && (
                <tr><td className="table-message" colSpan="5">No hay libros para mostrar.</td></tr>
              )}
              {!isLoading && books.items.map((book) => (
                <tr key={book.id}>
                  <td><span className="book-title">{book.title}</span></td>
                  <td>{book.author}</td>
                  <td><span className="category-tag">{book.category?.name}</span></td>
                  <td className="isbn-cell">{book.isbn}</td>
                  <td className="copies-cell"><span className={book.available_copies === 0 ? 'stock stock-empty' : 'stock'}>{book.available_copies} <small>/ {book.total_copies}</small></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="table-footer">
          <span>{books.total ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, books.total)} de ${books.total}` : '0 resultados'}</span>
          <div className="pagination-controls">
            <button aria-label="Página anterior" className="icon-button" disabled={page <= 1 || isLoading} onClick={() => setPage(page - 1)} title="Página anterior" type="button"><ArrowLeft aria-hidden="true" size={17} /></button>
            <span>Página {page} de {totalPages}</span>
            <button aria-label="Página siguiente" className="icon-button" disabled={page >= totalPages || isLoading} onClick={() => setPage(page + 1)} title="Página siguiente" type="button"><ArrowRight aria-hidden="true" size={17} /></button>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
