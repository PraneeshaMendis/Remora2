import React from 'react'
import { COUNTRIES, findCountryByCode } from '../constants/countries'

type Props = {
  value: string
  onChange: (code: string) => void
  placeholder?: string
}

const CountrySelect: React.FC<Props> = ({ value, onChange, placeholder = 'Select country' }) => {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  const selected = findCountryByCode(value)
  const list = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COUNTRIES
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
  }, [query])

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div ref={containerRef} className="relative w-56">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
      >
        <span>
          {selected ? `${selected.name} (${selected.code})` : (value ? value.toUpperCase() : placeholder)}
        </span>
        <svg className="w-4 h-4 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="w-full px-2 py-1.5 text-sm rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
            />
          </div>
          <ul className="max-h-56 overflow-auto">
            {list.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matches</li>
            )}
            {list.map(c => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => { onChange(c.code); setOpen(false); setQuery('') }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${value.toUpperCase() === c.code ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}
                >
                  {c.name} <span className="opacity-60">({c.code})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default CountrySelect

