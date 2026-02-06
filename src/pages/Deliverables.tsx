import React, { useEffect, useMemo, useState } from 'react'
import { HiCheckCircle, HiDocument, HiLink, HiStar, HiTrendingUp } from 'react-icons/hi'
import { Document } from '../types/index.ts'
import { listAllDocuments } from '../services/documentsAPI'
import { getProjectsWithPhases } from '../services/projectsAPI'
import { API_BASE } from '../services/api'

interface ProjectRef {
  id: string
  name: string
}

const Deliverables: React.FC = () => {
  const [deliverables, setDeliverables] = useState<Document[]>([])
  const [projects, setProjects] = useState<ProjectRef[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [sentMeta, setSentMeta] = useState<Record<string, { date?: string }>>({})
  const [sentMetaKey] = useState(() => {
    try {
      const uid = localStorage.getItem('userId') || 'guest'
      return `deliverables.sentMeta.${uid}`
    } catch {
      return 'deliverables.sentMeta.guest'
    }
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(sentMetaKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        setSentMeta(parsed)
      }
    } catch {}
  }, [sentMetaKey])

  useEffect(() => {
    try {
      localStorage.setItem(sentMetaKey, JSON.stringify(sentMeta))
    } catch {}
  }, [sentMeta, sentMetaKey])

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setLoadError('')
    ;(async () => {
      const results = await Promise.allSettled([
        getProjectsWithPhases(),
        listAllDocuments('approved'),
      ])

      if (!isMounted) return

      if (results[0].status === 'fulfilled') {
        const list = results[0].value || []
        setProjects(list.map((p: any) => ({ id: String(p.id), name: String(p.name || 'Untitled') })))
      } else {
        setProjects([])
      }

      if (results[1].status === 'fulfilled') {
        const mapped = (results[1].value || []).map(mapApiDocToUi)
        setDeliverables(mapped)
      } else {
        setDeliverables([])
        setLoadError('Unable to load deliverables right now. Please try again.')
      }

      setLoading(false)
    })()

    return () => {
      isMounted = false
    }
  }, [])

  function mapApiDocToUi(d: any): Document {
    const resolveStatus = (): Document['status'] => {
      const pick = (value: any) => {
        if (!value) return ''
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
        if (typeof value === 'object') {
          return String(
            value?.status ??
            value?.name ??
            value?.label ??
            value?.value ??
            '',
          )
        }
        return ''
      }

      const raw =
        d?.status ??
        d?.reviewStatus ??
        d?.review_state ??
        d?.reviewState ??
        d?.approvalStatus ??
        d?.approval_state ??
        d?.review?.status ??
        d?.review?.state ??
        d?.review?.result

      const normalized = pick(raw).trim().toLowerCase()
      if (normalized === 'approved' || normalized === 'approve') return 'approved'
      if (normalized === 'rejected' || normalized === 'reject') return 'rejected'
      if (['needs-changes', 'needs_changes', 'changes-requested', 'changes_requested'].includes(normalized)) return 'needs-changes'
      if (['in-review', 'in_review', 'review', 'pending-review', 'pending_review'].includes(normalized)) return 'in-review'
      if (normalized === 'pending') return 'pending'
      if (normalized === 'draft') return 'draft'
      if (d?.approved === true || d?.isApproved === true || d?.is_approved === true) return 'approved'
      if (d?.approved === false || d?.isApproved === false || d?.is_approved === false) return 'pending'
      return 'draft'
    }

    const filePath: string = String(d.fileUrl || d.filePath || '')
    const hasFile = Boolean(filePath)
    const fileName = hasFile ? (filePath.split('/').pop() || 'document') : String(d.name || 'document')
    const ext = hasFile ? (fileName.split('.').pop() || '').toLowerCase() : 'link'
    const reviewerRole = String(d?.reviewerRole || d?.reviewer?.role?.name || '').toLowerCase()
    const uploaderRole = String(d?.createdByRole || d?.createdBy?.role?.name || '').toLowerCase()
    return {
      id: String(d.id),
      name: String(d.name || fileName),
      projectId: String(d.projectId || ''),
      phaseId: String(d.phaseId || ''),
      taskId: String(d.taskId || ''),
      reviewerId: String(d.reviewer?.id || ''),
      reviewerRole: reviewerRole || undefined,
      uploadedBy: String(d.createdBy?.name || 'Unknown'),
      uploadedByRole: uploaderRole || undefined,
      sentTo: d.reviewer ? [String(d.reviewer?.name || '')] : [],
      dateSubmitted: String(d.createdAt || new Date().toISOString()),
      status: resolveStatus(),
      fileName,
      fileSize: 0,
      fileType: ext || 'file',
      version: Number(d.version || 1),
      uploadedAt: String(d.createdAt || new Date().toISOString()),
      reviewedAt: d.reviewedAt ? String(d.reviewedAt) : undefined,
      reviewNote: d.reviewComment ? String(d.reviewComment) : undefined,
      reviewScore: typeof d.reviewScore === 'number' ? Number(d.reviewScore) : undefined,
      externalLink: d.externalLink ? String(d.externalLink) : undefined,
      reviewLink: d.reviewLink ? String(d.reviewLink) : undefined,
    }
  }

  function getDocumentUrl(doc: Document): string {
    if (doc.fileType === 'link') return ''
    const fname = encodeURIComponent(doc.fileName)
    const ts = Date.now()
    return `${API_BASE}/uploads/documents/${fname}?_ts=${ts}`
  }

  function displayFileName(raw: string): string {
    const base = raw.split('/').pop() || raw
    const m = base.match(/^\d{10,14}-[a-z0-9]{4,12}-(.+)$/i)
    return m ? m[1] : base
  }

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    return project?.name || 'Unknown Project'
  }

  const parseReviewNote = (note?: string) => {
    const raw = String(note || '').trim()
    if (!raw) return { rating: 0, notes: '' }
    let rating = 0
    const lines = raw.split(/\r?\n/)
    const kept: string[] = []
    for (const line of lines) {
      const match = line.match(/rating:\s*(\d)\s*\/\s*5/i)
      if (match && !rating) {
        rating = Number(match[1]) || 0
        continue
      }
      kept.push(line)
    }
    return { rating, notes: kept.join('\n').trim() }
  }

  const getRating = (doc: Document) => {
    if (typeof doc.reviewScore === 'number') return doc.reviewScore
    return parseReviewNote(doc.reviewNote).rating
  }

  const updateSentDate = (docId: string, value: string) => {
    setSentMeta(prev => {
      const next = { ...prev }
      if (!value) {
        delete next[docId]
        return next
      }
      next[docId] = { date: value }
      return next
    })
  }

  const getSentDate = (docId: string) => sentMeta[docId]?.date || ''

  const approvedDeliverables = useMemo(
    () => deliverables.filter(doc => String(doc.status || '').toLowerCase() === 'approved'),
    [deliverables],
  )

  const sortedDeliverables = useMemo(() => {
    return [...approvedDeliverables].sort((a, b) => {
      const aManual = sentMeta[a.id]?.date || ''
      const bManual = sentMeta[b.id]?.date || ''
      const aTs = Date.parse(aManual || a.uploadedAt || '')
      const bTs = Date.parse(bManual || b.uploadedAt || '')
      return (Number.isNaN(bTs) ? 0 : bTs) - (Number.isNaN(aTs) ? 0 : aTs)
    })
  }, [approvedDeliverables, sentMeta])

  const statCards = useMemo(() => {
    if (loading) {
      return [
        { label: 'Total Deliverables', value: '—', icon: HiDocument, accent: 'bg-emerald-500/15 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400' },
        { label: 'Reviewed', value: '—', icon: HiCheckCircle, accent: 'bg-sky-500/15 text-sky-500 dark:bg-sky-500/20 dark:text-sky-400' },
        { label: 'Avg Review Score', value: '—', icon: HiStar, accent: 'bg-amber-500/15 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400' },
        { label: 'Projects Covered', value: '—', icon: HiTrendingUp, accent: 'bg-indigo-500/15 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400' },
      ]
    }
    const total = approvedDeliverables.length
    const reviewed = approvedDeliverables.length
    const ratings = approvedDeliverables.map(getRating).filter(r => r > 0)
    const avgRating = ratings.length ? (ratings.reduce((acc, r) => acc + r, 0) / ratings.length).toFixed(1) : '—'
    const projectCount = new Set(approvedDeliverables.map(doc => doc.projectId).filter(Boolean)).size
    return [
      { label: 'Total Deliverables', value: String(total), icon: HiDocument, accent: 'bg-emerald-500/15 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400' },
      { label: 'Reviewed', value: String(reviewed), icon: HiCheckCircle, accent: 'bg-sky-500/15 text-sky-500 dark:bg-sky-500/20 dark:text-sky-400' },
      { label: 'Avg Review Score', value: avgRating === '—' ? '—' : `${avgRating}/5`, icon: HiStar, accent: 'bg-amber-500/15 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400' },
      { label: 'Projects Covered', value: String(projectCount), icon: HiTrendingUp, accent: 'bg-indigo-500/15 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400' },
    ]
  }, [approvedDeliverables, loading])

  const cardBase = 'rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-black/60 shadow-soft'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Deliverables</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Track client-ready documents, review outcomes, and delivery history.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className={`${cardBase} p-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {card.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                    {card.value}
                  </div>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${card.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card dark:bg-black/60 dark:border-white/10 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Deliverables
          </h3>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {loading ? 'Loading…' : `${sortedDeliverables.length} items`}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-black/40 text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Project</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Link to the File</th>
                <th className="px-5 py-3">Date Sent to Client</th>
                <th className="px-5 py-3">Prepared by</th>
                <th className="px-5 py-3">Reviewer</th>
                <th className="px-5 py-3">Reviewer Rating</th>
                <th className="px-5 py-3">Reviewer Comments</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-black/60 divide-y divide-slate-200/70 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Loading deliverables…
                  </td>
                </tr>
              ) : sortedDeliverables.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    No approved deliverables yet.
                  </td>
                </tr>
              ) : (
                sortedDeliverables.map((doc) => {
                  const fileLink = doc.externalLink || (doc.fileType !== 'link' ? getDocumentUrl(doc) : '')
                  const fileLabel = doc.externalLink ? 'Open link' : displayFileName(doc.fileName)
                  const rating = Math.max(0, Math.min(5, getRating(doc)))
                  const notes = parseReviewNote(doc.reviewNote).notes
                  const sentDate = getSentDate(doc.id)
                  const isSent = Boolean(sentDate)
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-black/40">
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {getProjectName(doc.projectId)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{doc.name}</div>
                      </td>
                      <td className="px-5 py-4">
                        {fileLink ? (
                          <a
                            href={fileLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200"
                          >
                            {doc.externalLink ? (
                              <HiLink className="h-4 w-4" />
                            ) : (
                              <HiDocument className="h-4 w-4" />
                            )}
                            <span className="max-w-[160px] truncate">{fileLabel}</span>
                          </a>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex flex-col gap-2">
                          <div className="inline-flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                isSent
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                                  : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                              }`}
                            >
                              {isSent ? 'Sent' : 'Unsent'}
                            </span>
                            {isSent ? (
                              <button
                                type="button"
                                className="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                onClick={() => updateSentDate(doc.id, '')}
                              >
                                Clear
                              </button>
                            ) : null}
                          </div>
                          <input
                            type="date"
                            value={sentDate}
                            onChange={(event) => updateSentDate(doc.id, event.target.value)}
                            className="w-[150px] rounded-lg border border-slate-200/80 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200/60 dark:border-white/10 dark:bg-black/40 dark:text-slate-200 dark:focus:border-primary-300 dark:focus:ring-primary-500/30"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                        {doc.uploadedBy}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                        {doc.sentTo[0] || 'Reviewer'}
                      </td>
                      <td className="px-5 py-4">
                        {rating > 0 ? (
                          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-xs font-semibold dark:bg-amber-500/15 dark:text-amber-200">
                            <HiStar className="h-4 w-4" />
                            {rating}/5
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {notes ? (
                          <span className="block max-w-xs truncate" title={notes}>
                            {notes}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Deliverables
