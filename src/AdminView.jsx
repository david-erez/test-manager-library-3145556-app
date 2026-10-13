import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, BookPlus, Check, Pencil, Plus, Search, ShieldCheck, Trash2, Upload, UserRoundPlus, X } from 'lucide-react'
import { api } from './api'

const EMPTY_BOOK = { title: '', author: '', isbn: '', category_id: '', total_copies: '1' }
const EMPTY_USER = { username: '', password: '' }

export default function AdminView({ token, categories }) {
  const [activeTab, setActiveTab] = useState('books')
  const [books, setBooks] = useState({ items: [], total: 0 })
  const [bookSearch, setBookSearch] = useState('')
  const [bookPage, setBookPage] = useState(1)
  const [bookForm, setBookForm] = useState(EMPTY_BOOK)
  const [userForm, setUserForm] = useState(EMPTY_USER)
  const [editingBook, setEditingBook] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [isBookFormOpen, setIsBookFormOpen] = useState(false)
  const [isUserFormOpen, setIsUserFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api.listBooks({ token, search: bookSearch, categoryId: '', page: bookPage, signal: controller.signal })
      .then(setBooks)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [token, refreshKey, bookSearch, bookPage])

  function openCreateBook() {
    setEditingBook(null)
    setCoverFile(null)
    setBookForm({ ...EMPTY_BOOK, category_id: categories[0]?.id || '' })
    setError('')
    setIsBookFormOpen(true)
  }

  function openEditBook(book) {
    setEditingBook(book)
    setCoverFile(null)
    setBookForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category_id: book.category.id,
      total_copies: String(book.total_copies),
    })
    setError('')
    setIsBookFormOpen(true)
  }

  async function handleSaveBook(event) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        title: bookForm.title.trim(),
        author: bookForm.author.trim(),
        category_id: bookForm.category_id || categories[0]?.id || '',
        total_copies: Number(bookForm.total_copies),
      }
      const book = editingBook
        ? await api.updateBook(token, editingBook.id, payload)
        : await api.createBook(token, { ...payload, isbn: bookForm.isbn.trim() })

      if (coverFile) await api.uploadBookCover(token, book.id, coverFile)
      setIsBookFormOpen(false)
      setNotice(editingBook ? 'Libro actualizado.' : 'Libro creado.')
      setBookSearch('')
      setBookPage(1)
      setRefreshKey((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteBook(book) {
    if (!window.confirm(`¿Dar de baja «${book.title}»?`)) return
    setError('')
    setNotice('')
    try {
      await api.deleteBook(token, book.id)
      setNotice('Libro dado de baja.')
      setRefreshKey((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleDeleteCover() {
    setIsSaving(true)
    setError('')
    try {
      await api.deleteBookCover(token, editingBook.id)
      setNotice('Portada eliminada.')
      setRefreshKey((value) => value + 1)
      setEditingBook({ ...editingBook, cover_key: null })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCreateLibrarian(event) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setNotice('')
    try {
      await api.createLibrarian(token, userForm)
      setUserForm(EMPTY_USER)
      setIsUserFormOpen(false)
      setNotice('Bibliotecario creado.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const bookPages = Math.max(1, Math.ceil(books.total / 20))

  return (
    <section className="feature-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h1>Gestión</h1>
        </div>
      </header>

      <div className="section-tabs" aria-label="Secciones de administración">
        <button aria-pressed={activeTab === 'books'} className={activeTab === 'books' ? 'section-tab section-tab-active' : 'section-tab'} onClick={() => setActiveTab('books')} type="button"><BookPlus aria-hidden="true" size={16} />Libros</button>
        <button aria-pressed={activeTab === 'users'} className={activeTab === 'users' ? 'section-tab section-tab-active' : 'section-tab'} onClick={() => setActiveTab('users')} type="button"><ShieldCheck aria-hidden="true" size={16} />Bibliotecarios</button>
      </div>

      {notice && <p className="form-notice" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {activeTab === 'books' ? (
        <>
          <div className="section-toolbar">
            <p>{books.total} títulos en el catálogo</p>
            <button className="primary-button" onClick={openCreateBook} type="button"><Plus aria-hidden="true" size={17} />Nuevo libro</button>
          </div>

          <label className="search-field admin-book-search" htmlFor="admin-book-search">
            <Search aria-hidden="true" size={18} />
            <input id="admin-book-search" onChange={(event) => { setBookSearch(event.target.value); setBookPage(1) }} placeholder="Buscar por título o autor" type="search" value={bookSearch} />
          </label>

          {isBookFormOpen && (
            <form className="admin-form" onSubmit={handleSaveBook}>
              <div className="admin-form-heading">
                <h2>{editingBook ? 'Editar libro' : 'Nuevo libro'}</h2>
                <button aria-label="Cerrar formulario" className="icon-button" onClick={() => setIsBookFormOpen(false)} type="button"><X aria-hidden="true" size={17} /></button>
              </div>
              <div className="admin-form-grid">
                <label><span>Título</span><input maxLength="250" onChange={(event) => setBookForm({ ...bookForm, title: event.target.value })} required value={bookForm.title} /></label>
                <label><span>Autor</span><input maxLength="200" onChange={(event) => setBookForm({ ...bookForm, author: event.target.value })} required value={bookForm.author} /></label>
                <label><span>ISBN (13 dígitos)</span><input disabled={Boolean(editingBook)} inputMode="numeric" maxLength="13" minLength="13" onChange={(event) => setBookForm({ ...bookForm, isbn: event.target.value.replace(/\D/g, '') })} pattern="\d{13}" required={!editingBook} value={bookForm.isbn} /></label>
                <label><span>Categoría</span><select onChange={(event) => setBookForm({ ...bookForm, category_id: event.target.value })} required value={bookForm.category_id || categories[0]?.id || ''}><option value="">Selecciona una categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label><span>Ejemplares totales</span><input inputMode="numeric" min="1" onChange={(event) => setBookForm({ ...bookForm, total_copies: event.target.value })} required type="number" value={bookForm.total_copies} /></label>
                <label className="cover-picker"><span>Portada JPG o PNG · máximo 2 MB</span><span className="cover-file-control"><Upload aria-hidden="true" size={16} /><input accept="image/jpeg,image/png" onChange={(event) => setCoverFile(event.target.files?.[0] || null)} type="file" /></span></label>
              </div>
              {editingBook && <p className="form-hint">El ISBN se conserva al editar, según el contrato del API.</p>}
              <div className="admin-form-actions">
                {editingBook?.cover_key && <button className="quiet-button" disabled={isSaving} onClick={handleDeleteCover} type="button"><X aria-hidden="true" size={16} />Quitar portada actual</button>}
                <button className="primary-button" disabled={isSaving} type="submit"><Check aria-hidden="true" size={17} />{isSaving ? 'Guardando…' : 'Guardar libro'}</button>
              </div>
            </form>
          )}

          <div className="catalog-table-wrap">
            <table className="catalog-table admin-book-table">
              <thead><tr><th scope="col">Título</th><th scope="col">Autor</th><th scope="col">ISBN</th><th scope="col">Disponibles</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {isLoading && <tr><td className="table-message" colSpan="5">Cargando libros…</td></tr>}
                {!isLoading && books.items.length === 0 && <tr><td className="table-message" colSpan="5">No hay libros para mostrar.</td></tr>}
                {!isLoading && books.items.map((book) => (
                  <tr key={book.id}>
                    <td><span className="book-title">{book.title}</span><small className="table-subtitle">{book.category.name}</small></td>
                    <td>{book.author}</td>
                    <td className="isbn-cell">{book.isbn}</td>
                    <td className="copies-cell"><span className={book.available_copies === 0 ? 'stock stock-empty' : 'stock'}>{book.available_copies} <small>/ {book.total_copies}</small></span></td>
                    <td className="action-cell"><div className="row-actions"><button aria-label={`Editar ${book.title}`} className="icon-button" onClick={() => openEditBook(book)} title="Editar" type="button"><Pencil aria-hidden="true" size={15} /></button><button aria-label={`Dar de baja ${book.title}`} className="icon-button danger-button" onClick={() => handleDeleteBook(book)} title="Dar de baja" type="button"><Trash2 aria-hidden="true" size={15} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="table-footer"><span>{books.total ? `${(bookPage - 1) * 20 + 1}–${Math.min(bookPage * 20, books.total)} de ${books.total}` : '0 resultados'}</span><div className="pagination-controls"><button aria-label="Página anterior" className="icon-button" disabled={bookPage <= 1 || isLoading} onClick={() => setBookPage(bookPage - 1)} title="Página anterior" type="button"><ArrowLeft aria-hidden="true" size={17} /></button><span>Página {bookPage} de {bookPages}</span><button aria-label="Página siguiente" className="icon-button" disabled={bookPage >= bookPages || isLoading} onClick={() => setBookPage(bookPage + 1)} title="Página siguiente" type="button"><ArrowRight aria-hidden="true" size={17} /></button></div></footer>
        </>
      ) : (
        <>
          <div className="section-toolbar">
            <p>Usuarios internos con acceso al sistema</p>
            <button className="primary-button" onClick={() => setIsUserFormOpen((visible) => !visible)} type="button"><UserRoundPlus aria-hidden="true" size={17} />{isUserFormOpen ? 'Cancelar' : 'Nuevo bibliotecario'}</button>
          </div>
          {isUserFormOpen && (
            <form className="inline-form librarian-form" onSubmit={handleCreateLibrarian}>
              <label><span>Nombre de usuario</span><input autoComplete="username" maxLength="120" onChange={(event) => setUserForm({ ...userForm, username: event.target.value })} required value={userForm.username} /></label>
              <label><span>Contraseña</span><input autoComplete="new-password" minLength="8" onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} required type="password" value={userForm.password} /></label>
              <button className="primary-button" disabled={isSaving} type="submit">{isSaving ? 'Creando…' : 'Crear bibliotecario'}</button>
            </form>
          )}
          <div className="admin-note"><ShieldCheck aria-hidden="true" size={18} /><p>El rol de administrador se provisiona desde el entorno y no puede asignarse desde esta pantalla.</p></div>
        </>
      )}
    </section>
  )
}
