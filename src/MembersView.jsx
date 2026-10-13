import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, Plus, Search, X } from 'lucide-react'
import { api } from './api'

const PAGE_SIZE = 20
const EMPTY_FORM = { full_name: '', document_number: '' }

export default function MembersView({ token }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [members, setMembers] = useState({ items: [], total: 0 })
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setIsLoading(true)
      setError('')
      api.listMembers({ token, search, page, signal: controller.signal })
        .then(setMembers)
        .catch((requestError) => {
          if (requestError.name !== 'AbortError') setError(requestError.message)
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false)
        })
    }, 160)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [token, search, page, refreshKey])

  async function handleCreate(event) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setNotice('')

    try {
      await api.createMember(token, {
        full_name: form.full_name.trim(),
        document_number: form.document_number.trim(),
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      setNotice('Socio creado correctamente.')
      setPage(1)
      setRefreshKey((value) => value + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleView(memberId) {
    setSelectedMember({ loading: true })
    try {
      setSelectedMember(await api.getMember(token, memberId))
    } catch (requestError) {
      setSelectedMember(null)
      setError(requestError.message)
    }
  }

  const totalPages = Math.max(1, Math.ceil(members.total / PAGE_SIZE))

  return (
    <section className="feature-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">PERSONAS</p>
          <h1>Socios</h1>
        </div>
        <button className="primary-button" onClick={() => setShowForm((visible) => !visible)} type="button">
          {showForm ? <X aria-hidden="true" size={17} /> : <Plus aria-hidden="true" size={17} />}
          {showForm ? 'Cancelar' : 'Nuevo socio'}
        </button>
      </header>

      {notice && <p className="form-notice" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {showForm && (
        <form className="inline-form" onSubmit={handleCreate}>
          <label>
            <span>Nombre completo</span>
            <input maxLength="200" onChange={(event) => setForm({ ...form, full_name: event.target.value })} required value={form.full_name} />
          </label>
          <label>
            <span>Número de documento</span>
            <input maxLength="30" onChange={(event) => setForm({ ...form, document_number: event.target.value })} required value={form.document_number} />
          </label>
          <button className="primary-button" disabled={isSaving} type="submit">{isSaving ? 'Guardando…' : 'Guardar socio'}</button>
        </form>
      )}

      <div className="catalog-toolbar">
        <label className="search-field" htmlFor="member-search">
          <Search aria-hidden="true" size={18} />
          <input id="member-search" onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Buscar nombre o documento" type="search" value={search} />
        </label>
        <span className="member-count">{members.total} socios</span>
      </div>

      <div className="catalog-table-wrap">
        <table className="catalog-table member-table">
          <thead>
            <tr><th scope="col">Nombre</th><th scope="col">Documento</th><th scope="col">Préstamos activos</th><th scope="col"><span className="sr-only">Acciones</span></th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="table-message" colSpan="4">Cargando socios…</td></tr>}
            {!isLoading && members.items.length === 0 && <tr><td className="table-message" colSpan="4">No hay socios para mostrar.</td></tr>}
            {!isLoading && members.items.map((member) => (
              <tr key={member.id}>
                <td><span className="book-title">{member.full_name}</span></td>
                <td className="isbn-cell">{member.document_number}</td>
                <td><span className="count-cell">{selectedMember?.id === member.id ? selectedMember.active_loans : '—'}</span></td>
                <td className="action-cell"><button aria-label={`Ver ${member.full_name}`} className="icon-button" onClick={() => handleView(member.id)} title="Ver detalle" type="button"><Eye aria-hidden="true" size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="table-footer">
        <span>{members.total ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, members.total)} de ${members.total}` : '0 resultados'}</span>
        <div className="pagination-controls">
          <button aria-label="Página anterior" className="icon-button" disabled={page <= 1 || isLoading} onClick={() => setPage(page - 1)} title="Página anterior" type="button"><ArrowLeft aria-hidden="true" size={17} /></button>
          <span>Página {page} de {totalPages}</span>
          <button aria-label="Página siguiente" className="icon-button" disabled={page >= totalPages || isLoading} onClick={() => setPage(page + 1)} title="Página siguiente" type="button"><ArrowRight aria-hidden="true" size={17} /></button>
        </div>
      </footer>

      {selectedMember && (
        <div className="drawer-backdrop" onClick={() => setSelectedMember(null)} role="presentation">
          <aside aria-label="Detalle del socio" aria-modal="true" className="detail-drawer" onClick={(event) => event.stopPropagation()} role="dialog">
            <button aria-label="Cerrar detalle" className="icon-button drawer-close" onClick={() => setSelectedMember(null)} type="button"><X aria-hidden="true" size={18} /></button>
            {selectedMember.loading ? <p className="drawer-loading">Cargando detalle…</p> : (
              <>
                <p className="eyebrow">FICHA DE SOCIO</p>
                <h2>{selectedMember.full_name}</h2>
                <dl className="detail-list">
                  <div><dt>Documento</dt><dd>{selectedMember.document_number}</dd></div>
                  <div><dt>Libros sin devolver</dt><dd>{selectedMember.active_loans}</dd></div>
                </dl>
              </>
            )}
          </aside>
        </div>
      )}
    </section>
  )
}
