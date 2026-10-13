import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, CircleAlert, Clock3, RotateCcw } from 'lucide-react'
import { api } from './api'

const PAGE_SIZE = 20
const TODAY = new Date().toISOString().slice(0, 10)
const MONTH_START = `${TODAY.slice(0, 8)}01`
const LOAN_FILTERS = { from: '', to: '', status: '', member_id: '' }

const STATUS_LABELS = { open: 'Abierto', overdue: 'Vencido', closed: 'Cerrado' }

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value))
}

export default function CirculationView({ token, role }) {
  const [activeTab, setActiveTab] = useState('loans')
  const [members, setMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [memberFilterId, setMemberFilterId] = useState('')
  const [bookSearch, setBookSearch] = useState('')
  const [bookOptions, setBookOptions] = useState([])
  const [selectedBooks, setSelectedBooks] = useState([])
  const [isCreatingLoan, setIsCreatingLoan] = useState(false)
  const [loanNotice, setLoanNotice] = useState('')
  const [loanError, setLoanError] = useState('')
  const [loans, setLoans] = useState({ items: [], total: 0 })
  const [loanFilters, setLoanFilters] = useState(LOAN_FILTERS)
  const [loanPage, setLoanPage] = useState(1)
  const [loanRefresh, setLoanRefresh] = useState(0)
  const [isLoadingLoans, setIsLoadingLoans] = useState(true)
  const [pendingReturn, setPendingReturn] = useState('')
  const [overdueItems, setOverdueItems] = useState([])
  const [isLoadingOverdue, setIsLoadingOverdue] = useState(false)
  const [reportDates, setReportDates] = useState({ from: MONTH_START, to: TODAY })
  const [report, setReport] = useState(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [reportError, setReportError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      api.listMembers({ token, search: memberSearch, page: 1, size: 50, signal: controller.signal })
        .then((result) => setMembers(result.items))
        .catch((error) => {
          if (error.name !== 'AbortError') setLoanError(error.message)
        })
    }, 160)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [token, memberSearch])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      api.listBooks({ token, search: bookSearch, categoryId: '', page: 1, size: 50, signal: controller.signal })
        .then((result) => setBookOptions(result.items))
        .catch((error) => {
          if (error.name !== 'AbortError') setLoanError(error.message)
        })
    }, 160)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [token, bookSearch])

  useEffect(() => {
    if (activeTab !== 'loans') return undefined
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setIsLoadingLoans(true)
      api.listLoans({ token, filters: { ...loanFilters, member_id: memberFilterId }, page: loanPage, signal: controller.signal })
        .then(setLoans)
        .catch((error) => {
          if (error.name !== 'AbortError') setLoanError(error.message)
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoadingLoans(false)
        })
    }, 120)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [activeTab, token, loanFilters, memberFilterId, loanPage, loanRefresh])

  useEffect(() => {
    if (activeTab !== 'overdue') return undefined
    const controller = new AbortController()
    api.listOverdue(token, controller.signal)
      .then((result) => setOverdueItems(result.items))
      .catch((error) => {
        if (error.name !== 'AbortError') setLoanError(error.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingOverdue(false)
      })
    return () => controller.abort()
  }, [activeTab, token, loanRefresh])

  function addBook(book) {
    if (book.available_copies < 1 || selectedBooks.some((selected) => selected.id === book.id) || selectedBooks.length >= 3) return
    setSelectedBooks((current) => [...current, book])
    setLoanError('')
  }

  function removeBook(bookId) {
    setSelectedBooks((current) => current.filter((book) => book.id !== bookId))
  }

  async function submitLoan(event) {
    event.preventDefault()
    if (!selectedMemberId || !selectedBooks.length) return
    setIsCreatingLoan(true)
    setLoanError('')
    setLoanNotice('')
    try {
      await api.createLoan(token, {
        member_id: selectedMemberId,
        items: selectedBooks.map((book) => ({ book_id: book.id })),
      })
      setSelectedBooks([])
      setBookSearch('')
      setLoanNotice('Préstamo registrado.')
      setLoanRefresh((value) => value + 1)
      setActiveTab('loans')
      setLoanPage(1)
    } catch (error) {
      setLoanError(error.message)
    } finally {
      setIsCreatingLoan(false)
    }
  }

  async function returnItem(loanId, itemId) {
    setPendingReturn(itemId)
    setLoanError('')
    setLoanNotice('')
    try {
      const returnedItem = await api.returnLoanItem(token, loanId, itemId)
      setLoans((current) => ({
        ...current,
        items: current.items.map((loan) => loan.id === loanId
          ? { ...loan, items: loan.items.map((item) => item.id === itemId ? returnedItem : item) }
          : loan),
      }))
      setLoanNotice('Devolución registrada.')
      setLoanRefresh((value) => value + 1)
    } catch (error) {
      setLoanError(error.message)
    } finally {
      setPendingReturn('')
    }
  }

  async function loadReport(event) {
    event.preventDefault()
    setIsLoadingReport(true)
    setReportError('')
    try {
      setReport(await api.mostBorrowed(token, reportDates.from, reportDates.to))
    } catch (error) {
      setReportError(error.message)
      setReport(null)
    } finally {
      setIsLoadingReport(false)
    }
  }

  const loanPages = Math.max(1, Math.ceil(loans.total / PAGE_SIZE))

  return (
    <section className="feature-page">
      <header className="page-header">
        <div><p className="eyebrow">CIRCULACIÓN</p><h1>Préstamos</h1></div>
      </header>

      <div className="section-tabs" aria-label="Secciones de circulación">
        <button aria-pressed={activeTab === 'loans'} className={activeTab === 'loans' ? 'section-tab section-tab-active' : 'section-tab'} onClick={() => setActiveTab('loans')} type="button"><RotateCcw aria-hidden="true" size={16} />Préstamos</button>
        <button aria-pressed={activeTab === 'overdue'} className={activeTab === 'overdue' ? 'section-tab section-tab-active' : 'section-tab'} onClick={() => { setIsLoadingOverdue(true); setActiveTab('overdue') }} type="button"><Clock3 aria-hidden="true" size={16} />Vencidos</button>
        {role === 'admin' && <button aria-pressed={activeTab === 'report'} className={activeTab === 'report' ? 'section-tab section-tab-active' : 'section-tab'} onClick={() => setActiveTab('report')} type="button"><CalendarDays aria-hidden="true" size={16} />Informe</button>}
      </div>

      {loanNotice && activeTab !== 'report' && <p className="form-notice" role="status">{loanNotice}</p>}
      {loanError && activeTab !== 'report' && <p className="form-error" role="alert">{loanError}</p>}

      {activeTab === 'loans' && (
        <>
          <form className="loan-form" onSubmit={submitLoan}>
            <div className="loan-form-heading"><div><p className="eyebrow">NUEVO MOVIMIENTO</p><h2>Registrar préstamo</h2></div><span className="loan-limit">1–3 libros</span></div>
            <div className="loan-form-grid">
              <label className="loan-member-field"><span>Socio</span>
                <input onChange={(event) => { setMemberSearch(event.target.value); setSelectedMemberId('') }} placeholder="Filtra socios por nombre o documento" value={memberSearch} />
                <select aria-label="Seleccionar socio" onChange={(event) => setSelectedMemberId(event.target.value)} required value={selectedMemberId}>
                  <option value="">Selecciona un socio</option>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.full_name} · {member.document_number}</option>)}
                </select>
              </label>
              <label className="loan-book-field"><span>Agregar libro</span>
                <input onChange={(event) => setBookSearch(event.target.value)} placeholder="Buscar título o autor" value={bookSearch} />
                <select aria-label="Seleccionar libro" onChange={(event) => { const selected = bookOptions.find((book) => book.id === event.target.value); if (selected) addBook(selected); event.target.value = '' }} value="">
                  <option value="">Selecciona un libro disponible</option>
                  {bookOptions.filter((book) => book.available_copies > 0 && !selectedBooks.some((selected) => selected.id === book.id)).map((book) => <option key={book.id} value={book.id}>{book.title} · {book.available_copies} disponibles</option>)}
                </select>
              </label>
            </div>
            {selectedBooks.length > 0 && (
              <ul className="selected-books">
                {selectedBooks.map((book) => <li key={book.id}><span>{book.title}<small>{book.category.name} · ISBN {book.isbn}</small></span><button aria-label={`Quitar ${book.title}`} className="quiet-button remove-book" onClick={() => removeBook(book.id)} type="button">Quitar</button></li>)}
              </ul>
            )}
            <div className="loan-form-footer"><span>{selectedBooks.length} de 3 libros seleccionados</span><button className="primary-button" disabled={isCreatingLoan || !selectedMemberId || !selectedBooks.length} type="submit">{isCreatingLoan ? 'Registrando…' : 'Registrar préstamo'}<ArrowRight aria-hidden="true" size={17} /></button></div>
          </form>

          <div className="section-toolbar loan-list-toolbar">
            <div><p className="eyebrow">HISTORIAL</p><h2>Préstamos recientes</h2></div>
            <div className="loan-filters">
              <label><span>Desde</span><input onChange={(event) => { setLoanFilters({ ...loanFilters, from: event.target.value }); setLoanPage(1) }} type="date" value={loanFilters.from} /></label>
              <label><span>Hasta</span><input onChange={(event) => { setLoanFilters({ ...loanFilters, to: event.target.value }); setLoanPage(1) }} type="date" value={loanFilters.to} /></label>
              <label><span>Estado</span><select onChange={(event) => { setLoanFilters({ ...loanFilters, status: event.target.value }); setLoanPage(1) }} value={loanFilters.status}><option value="">Todos</option><option value="open">Abierto</option><option value="overdue">Vencido</option><option value="closed">Cerrado</option></select></label>
              <label><span>Socio</span><select onChange={(event) => { setMemberFilterId(event.target.value); setLoanPage(1) }} value={memberFilterId}><option value="">Todos</option>{members.map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}</select></label>
            </div>
          </div>
          <div className="catalog-table-wrap">
            <table className="catalog-table loan-table">
              <thead><tr><th scope="col">Fecha</th><th scope="col">Socio</th><th scope="col">Libros</th><th scope="col">Estado</th></tr></thead>
              <tbody>
                {isLoadingLoans && <tr><td className="table-message" colSpan="4">Cargando préstamos…</td></tr>}
                {!isLoadingLoans && loans.items.length === 0 && <tr><td className="table-message" colSpan="4">No hay préstamos para mostrar.</td></tr>}
                {!isLoadingLoans && loans.items.map((loan) => (
                  <tr key={loan.id}>
                    <td>{formatDate(loan.loaned_at)}</td>
                    <td className="id-cell" title={loan.member_id}>{loan.member_id.slice(0, 8)}</td>
                    <td><details className="loan-lines"><summary>{loan.items.length} {loan.items.length === 1 ? 'libro' : 'libros'}</summary><ul>{loan.items.map((item) => <li key={item.id}><span>{item.book_title}<small>Vence {formatDate(item.due_at)}</small></span>{item.returned_at ? <span className="returned-label">Devuelto</span> : <button className="quiet-button return-button" disabled={pendingReturn === item.id} onClick={() => returnItem(loan.id, item.id)} type="button">{pendingReturn === item.id ? 'Guardando…' : 'Devolver'}</button>}</li>)}</ul></details></td>
                    <td><span className={`status-tag status-${loan.status}`}>{STATUS_LABELS[loan.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="table-footer"><span>{loans.total} préstamos</span><div className="pagination-controls"><button aria-label="Página anterior" className="icon-button" disabled={loanPage <= 1 || isLoadingLoans} onClick={() => setLoanPage(loanPage - 1)} title="Página anterior" type="button"><ArrowLeft aria-hidden="true" size={17} /></button><span>Página {loanPage} de {loanPages}</span><button aria-label="Página siguiente" className="icon-button" disabled={loanPage >= loanPages || isLoadingLoans} onClick={() => setLoanPage(loanPage + 1)} title="Página siguiente" type="button"><ArrowRight aria-hidden="true" size={17} /></button></div></footer>
        </>
      )}

      {activeTab === 'overdue' && (
        <section>
          <div className="section-toolbar"><div><p className="eyebrow">SEGUIMIENTO</p><h2>Libros vencidos</h2></div><span className="overdue-count"><CircleAlert aria-hidden="true" size={16} />{overdueItems.length} líneas</span></div>
          <div className="catalog-table-wrap">
            <table className="catalog-table overdue-table">
              <thead><tr><th scope="col">Libro</th><th scope="col">Socio</th><th scope="col">Vencimiento</th><th scope="col">Días de retraso</th></tr></thead>
              <tbody>
                {isLoadingOverdue && <tr><td className="table-message" colSpan="4">Cargando vencidos…</td></tr>}
                {!isLoadingOverdue && overdueItems.length === 0 && <tr><td className="table-message" colSpan="4">No hay libros vencidos.</td></tr>}
                {!isLoadingOverdue && overdueItems.map((item) => <tr key={item.item_id}><td><span className="book-title">{item.book_title}</span></td><td>{item.member_name}</td><td>{formatDate(item.due_at)}</td><td><span className="late-days">{item.days_late} días</span></td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'report' && role === 'admin' && (
        <section>
          <div className="section-toolbar"><div><p className="eyebrow">ANÁLISIS</p><h2>Libros más prestados</h2></div></div>
          <form className="report-filters" onSubmit={loadReport}>
            <label><span>Desde</span><input onChange={(event) => setReportDates({ ...reportDates, from: event.target.value })} required type="date" value={reportDates.from} /></label>
            <label><span>Hasta</span><input onChange={(event) => setReportDates({ ...reportDates, to: event.target.value })} required type="date" value={reportDates.to} /></label>
            <button className="primary-button" disabled={isLoadingReport} type="submit">{isLoadingReport ? 'Consultando…' : 'Generar informe'}</button>
          </form>
          {reportError && <p className="form-error" role="alert">{reportError}</p>}
          {report && <><p className="report-period">Periodo {formatDate(`${report.from}T00:00:00Z`)} — {formatDate(`${report.to}T00:00:00Z`)}</p><div className="catalog-table-wrap"><table className="catalog-table"><thead><tr><th scope="col">Título</th><th scope="col">Categoría al prestar</th><th scope="col">Préstamos</th></tr></thead><tbody>{report.rows.length === 0 ? <tr><td className="table-message" colSpan="3">No hay préstamos en este periodo.</td></tr> : report.rows.map((row) => <tr key={`${row.book_id}-${row.category_name}`}><td><span className="book-title">{row.book_title}</span></td><td>{row.category_name}</td><td><span className="report-total">{row.times_borrowed}</span></td></tr>)}</tbody></table></div></>}
        </section>
      )}
    </section>
  )
}
