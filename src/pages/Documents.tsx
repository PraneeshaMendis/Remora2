import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Document } from '../types/index.ts'
import { uploadDocuments, listInbox, listSent, reviewDocument } from '../services/documentsAPI'
import { getProjectsWithPhases } from '../services/projectsAPI'
import { apiGet, API_BASE } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { listReviewers } from '../services/usersAPI'


interface TimelineStep {
  id: string
  title: string
  description: string
  user: string
  role: string
  timestamp: string
  icon: string
  color: string
  comment?: string
  link?: string
}
import {
  HiDocument,
  HiUser,
  HiCalendar,
  HiEye,
  HiPencil,
  HiTrash,
  HiUpload,
  HiChevronDown,
  HiChevronUp,
  HiPlus,
  HiSearch,
  HiPaperAirplane,
  HiX,
  HiCheckCircle,
  HiArchive,
  HiLink
} from 'react-icons/hi'

const Documents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [expandedTimelines, setExpandedTimelines] = useState<Set<string>>(new Set())
  const [uploadData, setUploadData] = useState({
    name: '',
    project: '',
    phase: '',
    task: '',
    description: '',
    externalLink: '',
    reviewer: '',
    files: null as FileList | null
  })
  const [reviewData, setReviewData] = useState({
    action: 'approve' as 'approve' | 'request-changes' | 'reject',
    notes: '',
    reviewLink: '',
    file: null as File | null
  })
  const [validationError, setValidationError] = useState('')
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    files: null as FileList | null
  })
  // Annotator removed

  const [projects, setProjects] = useState<Array<{ id: string; name: string; phases: Array<{ id: string; name: string }> }>>([])
  const availablePhases = useMemo(() => {
    const p = projects.find(p => p.id === uploadData.project)
    return p?.phases || []
  }, [projects, uploadData.project])
  const [reviewers, setReviewers] = useState<Array<{ id: string; name: string }>>([])
  const [inboxDocs, setInboxDocs] = useState<Document[]>([])
  const [sentDocs, setSentDocs] = useState<Document[]>([])
  const [activeView, setActiveView] = useState<'inbox' | 'sent'>('inbox')
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const [projectDetail, setProjectDetail] = useState<any | null>(null)
  const availableTasks = useMemo(() => {
    if (!projectDetail || !uploadData.phase) return [] as Array<{ id: string; title: string }>
    const ph = (projectDetail.phases || []).find((p: any) => p.id === uploadData.phase)
    const tasks = Array.isArray(ph?.tasks) ? ph.tasks : []
    return tasks.map((t: any) => ({ id: String(t.id), title: String(t.title || 'Untitled Task') }))
  }, [projectDetail, uploadData.phase])
  const filterPhases = useMemo(() => {
    if (projectFilter !== 'all') {
      const project = projects.find(p => p.id === projectFilter)
      return project?.phases || []
    }
    const seen = new Map<string, { id: string; name: string }>()
    projects.forEach(project => {
      project.phases.forEach(phase => {
        if (!seen.has(phase.id)) {
          seen.set(phase.id, { id: phase.id, name: phase.name })
        }
      })
    })
    return Array.from(seen.values())
  }, [projects, projectFilter])

  const { user } = useAuth()

  useEffect(() => {
    ;(async () => {
      const results = await Promise.allSettled([
        getProjectsWithPhases(),
        listReviewers(),
        listInbox(),
        listSent(),
      ])

      // Projects
      if (results[0].status === 'fulfilled') {
        setProjects(results[0].value || [])
      } else {
        console.warn('Projects load failed:', results[0].reason)
        setProjects([])
      }

      // Users (reviewers) — this may be restricted for non-admins; ignore failure
      if (results[1].status === 'fulfilled') {
        const users = results[1].value
        const list = Array.isArray(users) ? users : (users?.items || [])
        const people = list.map((u: any) => ({ id: String(u.id), name: String(u.name || u.email || 'User') }))
        setReviewers(people)
      } else {
        console.warn('Users list failed (likely not admin); continuing:', results[1].reason)
        setReviewers([])
      }

      // Inbox
      if (results[2].status === 'fulfilled') {
        const mappedInbox = (results[2].value || []).map(mapApiDocToUi)
        setInboxDocs(mappedInbox)
      } else {
        console.error('Inbox load failed:', results[2].reason)
        setInboxDocs([])
      }

      // Sent
      if (results[3].status === 'fulfilled') {
        const mappedSent = (results[3].value || []).map(mapApiDocToUi)
        setSentDocs(mappedSent)
      } else {
        console.error('Sent load failed:', results[3].reason)
        setSentDocs([])
      }
    })()
  }, [])

  // Load full project with tasks when project selection changes
  useEffect(() => {
    ;(async () => {
      const pid = uploadData.project
      if (!pid) { setProjectDetail(null); return }
      try {
        const detail = await apiGet(`/projects/${pid}`)
        setProjectDetail(detail || null)
        // Reset dependent selections when project changes
        setUploadData(prev => ({ ...prev, phase: '', task: '' }))
      } catch {
        setProjectDetail(null)
      }
    })()
  }, [uploadData.project])

  // Clear task when phase changes
  useEffect(() => {
    setUploadData(prev => ({ ...prev, task: '' }))
  }, [uploadData.phase])

  useEffect(() => {
    setPhaseFilter('all')
  }, [projectFilter])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'sent' || tab === 'inbox') {
      setActiveView(tab)
    }
  }, [searchParams.toString()])

  function mapApiDocToUi(d: any): Document {
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
      status: String(d.status || 'draft') as any,
      fileName,
      fileSize: 0,
      fileType: ext || 'file',
      version: Number(d.version || 1),
      uploadedAt: String(d.createdAt || new Date().toISOString()),
      reviewedAt: d.reviewedAt ? String(d.reviewedAt) : undefined,
      reviewNote: d.reviewComment ? String(d.reviewComment) : undefined,
      externalLink: d.externalLink ? String(d.externalLink) : undefined,
      reviewLink: d.reviewLink ? String(d.reviewLink) : undefined,
    }
  }

  function getDocumentUrl(doc: Document): string {
    if (doc.fileType === 'link') return ''
    // Files are served at /uploads/documents/<generated-filename>
    const fname = encodeURIComponent(doc.fileName)
    const ts = Date.now()
    return `${API_BASE}/uploads/documents/${fname}?_ts=${ts}`
  }

  // Clean display: strip generated prefix like "<timestamp>-<rand>-" from stored filenames
  function displayFileName(raw: string): string {
    const base = raw.split('/').pop() || raw
    const m = base.match(/^\d{10,14}-[a-z0-9]{4,12}-(.+)$/i)
    return m ? m[1] : base
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || '')
      .join('')
  }

  const documents = useMemo(() => (activeView === 'inbox' ? inboxDocs : sentDocs), [activeView, inboxDocs, sentDocs])
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = projectFilter === 'all' || doc.projectId === projectFilter
    const matchesPhase = phaseFilter === 'all' || doc.phaseId === phaseFilter
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    
    return matchesSearch && matchesProject && matchesPhase && matchesStatus
  })

  useEffect(() => {
    const docId = searchParams.get('docId')
    if (!docId) return
    setHighlightedDocId(docId)
    const el = document.getElementById(`doc-${docId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    const timer = window.setTimeout(() => setHighlightedDocId(null), 4000)
    return () => window.clearTimeout(timer)
  }, [searchParams.toString(), filteredDocuments.length])

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    return project?.name || 'Unknown Project'
  }

  const getPhaseName = (phaseId: string) => {
    if (!phaseId) return 'Phase'
    for (const project of projects) {
      const phase = project.phases.find(p => p.id === phaseId)
      if (phase) return phase.name
    }
    return 'Phase'
  }

  const formatRole = (role?: string) => {
    if (!role) return ''
    return role[0].toUpperCase() + role.slice(1)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'badge-success'
      case 'in-review': return 'badge-warning'
      case 'needs-changes': return 'badge-danger'
      case 'draft': return 'badge-info'
      default: return 'badge-info'
    }
  }


  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadData.project || !uploadData.phase || !uploadData.reviewer) return
    const hasFiles = !!(uploadData.files && uploadData.files.length > 0)
    const hasLink = !!uploadData.externalLink.trim()
    if (!hasFiles && !hasLink) {
      alert('Upload at least one file or provide a document link.')
      return
    }

    try {
      const files = uploadData.files ? Array.from(uploadData.files) : []
      const created = await uploadDocuments({
        projectId: uploadData.project,
        phaseId: uploadData.phase,
        reviewerId: uploadData.reviewer,
        taskId: uploadData.task || undefined,
        status: 'in-review',
        name: uploadData.name || undefined,
        externalLink: uploadData.externalLink.trim() || undefined,
      }, files)
      const mapped: Document[] = (created || []).map(mapApiDocToUi)
      setSentDocs(prev => [...mapped, ...prev])
      
      // Reset form and close modal
      setUploadData({
        name: '',
        project: '',
        phase: '',
        task: '',
        description: '',
        externalLink: '',
        reviewer: '',
        files: null
      })
      setIsUploadModalOpen(false)
    } catch (error) {
      console.error('Failed to upload document:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setUploadData(prev => ({ ...prev, files }))
    }
  }

  const handleReviewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReviewData(prev => ({ ...prev, file }))
    }
  }

  const handleReviewDocument = (doc: Document) => {
    setSelectedDocument(doc)
    setReviewData({
      action: 'approve',
      notes: doc.reviewNote || '',
      reviewLink: doc.reviewLink || '',
      file: null
    })
    setValidationError('')
    setIsReviewModalOpen(true)
  }



  const handleEditDocument = (doc: Document) => {
    setSelectedDocument(doc)
    setEditData({
      name: doc.name,
      description: '', // In a real app, this would come from the document data
      files: null
    })
    setIsEditModalOpen(true)
  }

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setEditData(prev => ({ ...prev, files }))
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDocument) return

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('Updating document:', { document: selectedDocument, edit: editData })

      // Reset form and close modal
      setEditData({
        name: '',
        description: '',
        files: null
      })
      setSelectedDocument(null)
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Failed to update document:', error)
    }
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDocument) return

    // Clear previous validation error
    setValidationError('')

    // Validate that comments are required for Request Changes and Reject
    if ((reviewData.action === 'request-changes' || reviewData.action === 'reject') && !reviewData.notes.trim()) {
      setValidationError('Please provide comments when requesting changes or rejecting a document.')
      return
    }

    try {
      const status = reviewData.action === 'approve' ? 'approved' : reviewData.action === 'reject' ? 'rejected' : 'needs-changes'
      const link = reviewData.reviewLink.trim()
      const updated = await reviewDocument(selectedDocument.id, status as any, reviewData.notes || undefined, link || undefined)
      const mapped = mapApiDocToUi(updated)
      setInboxDocs(prev => prev.map(d => d.id === mapped.id ? mapped : d))
      setSentDocs(prev => prev.map(d => d.id === mapped.id ? mapped : d))

      // Reset form and close modal
      setReviewData({
        action: 'approve',
        notes: '',
        reviewLink: '',
        file: null
      })
      setValidationError('')
      setSelectedDocument(null)
      setIsReviewModalOpen(false)
    } catch (error: any) {
      console.error('Failed to submit review:', error)
      const msg = String(error?.message || '')
      if (/Only assigned reviewer|403/.test(msg)) {
        setValidationError('Only the assigned reviewer can update status for this document.')
      }
    }
  }

  const toggleTimeline = (docId: string) => {
    setExpandedTimelines(prev => {
      const newSet = new Set(prev)
      if (newSet.has(docId)) {
        newSet.delete(docId)
      } else {
        newSet.add(docId)
      }
      return newSet
    })
  }



  const getDocumentTimeline = (doc: Document): TimelineStep[] => {
    const timeline: TimelineStep[] = []
    const fmt = (dt: string) => new Date(dt).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })

    // Uploaded
    timeline.push({
      id: 'upload',
      title: 'Upload',
      description: 'Uploaded document',
      user: doc.uploadedBy,
      role: doc.uploadedByRole ? (doc.uploadedByRole[0].toUpperCase() + doc.uploadedByRole.slice(1)) : 'Member',
      timestamp: fmt(doc.dateSubmitted || doc.uploadedAt),
      icon: 'upload',
      color: 'blue'
    })

    // Sent for review
    timeline.push({
      id: 'review',
      title: 'Sent for Review',
      description: `Assigned to ${doc.sentTo[0] || 'Reviewer'}`,
      user: doc.uploadedBy,
      role: doc.uploadedByRole ? (doc.uploadedByRole[0].toUpperCase() + doc.uploadedByRole.slice(1)) : 'Member',
      timestamp: fmt(doc.dateSubmitted || doc.uploadedAt),
      icon: 'review',
      color: 'orange'
    })

    // Reviewer decision based on real data
    const reviewerRoleTitle = doc.reviewerRole ? (doc.reviewerRole[0].toUpperCase() + doc.reviewerRole.slice(1)) : 'Member'
    if (doc.status === 'approved' && doc.reviewedAt) {
      timeline.push({
        id: 'approved',
        title: 'Approved',
        description: 'Approved document',
        user: doc.sentTo[0] || 'Reviewer',
        role: reviewerRoleTitle,
        timestamp: fmt(doc.reviewedAt),
        icon: 'approved',
        color: 'green',
        link: doc.reviewLink
      })
    } else if (doc.status === 'needs-changes' && doc.reviewedAt) {
      timeline.push({
        id: 'changes-requested',
        title: 'Changes Requested',
        description: 'Requested changes',
        user: doc.sentTo[0] || 'Reviewer',
        role: reviewerRoleTitle,
        timestamp: fmt(doc.reviewedAt),
        icon: 'changes-requested',
        color: 'yellow',
        comment: doc.reviewNote || undefined,
        link: doc.reviewLink
      })
    } else if (doc.status === 'rejected' && doc.reviewedAt) {
      timeline.push({
        id: 'rejected',
        title: 'Rejected',
        description: 'Rejected document',
        user: doc.sentTo[0] || 'Reviewer',
        role: reviewerRoleTitle,
        timestamp: fmt(doc.reviewedAt),
        icon: 'rejected',
        color: 'red',
        comment: doc.reviewNote || undefined,
        link: doc.reviewLink
      })
    }

    return timeline
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">My Documents & Reviews</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Manage your documents and track their journey through the review process
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/50 p-1">
            <button
              type="button"
              onClick={() => setActiveView('inbox')}
              className={`px-5 py-2 text-sm rounded-full transition-colors ${
                activeView === 'inbox' ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              Inbox
            </button>
            <button
              type="button"
              onClick={() => setActiveView('sent')}
              className={`px-5 py-2 text-sm rounded-full transition-colors ${
                activeView === 'sent' ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              Sent
            </button>
          </div>
          <div className="hidden h-6 w-px bg-gray-200 dark:bg-white/10 lg:block"></div>
          <button
            type="button"
            className="relative h-11 w-11 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-black/40 transition-colors"
            aria-label="Notifications"
          >
            <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="card dark:bg-black/60 dark:border-white/10 p-6 space-y-6">
        {/* Filter Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-[140px,minmax(240px,1fr),200px,200px] gap-4 items-center">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-sm py-2.5 pr-10 appearance-none"
            >
              <option value="all">View</option>
              <option value="draft">Draft</option>
              <option value="in-review">In Review</option>
              <option value="approved">Approved</option>
              <option value="needs-changes">Needs Changes</option>
            </select>
            <HiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <HiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by document name, project"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="relative">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="input-field text-sm py-2.5 pr-10 appearance-none"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <HiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
          </div>
          <div className="relative">
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="input-field text-sm py-2.5 pr-10 appearance-none"
            >
              <option value="all">All Phases</option>
              {filterPhases.map((phase) => (
                <option key={phase.id} value={phase.id}>{phase.name}</option>
              ))}
            </select>
            <HiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
          </div>
        </div>

        <div className="h-2 rounded-full bg-gray-200/60 dark:bg-white/10 overflow-hidden">
          <div className="h-full w-2/3 rounded-full bg-gray-400/70 dark:bg-white/30"></div>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="btn-primary w-full justify-center text-base"
        >
          <HiPlus className="h-5 w-5 mr-2" />
          Upload Document
        </button>

        <div className="border-t border-gray-200 dark:border-white/10"></div>

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="bg-gray-50 dark:bg-black/50 rounded-xl p-12 text-center">
            <HiDocument className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No documents found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                id={`doc-${doc.id}`}
                className={`rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/60 p-6 shadow-sm ${
                  highlightedDocId === doc.id ? 'ring-2 ring-primary-500/60 shadow-[0_0_18px_rgba(59,130,246,0.25)]' : ''
                }`}
              >
                {/* Document Header */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{doc.name}</h3>
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <HiDocument className="h-4 w-4" />
                      <span>{getProjectName(doc.projectId)} → {getPhaseName(doc.phaseId)}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${getStatusColor(doc.status)}`}>
                    {doc.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Metadata */}
                <div className="mt-6 grid gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">Uploaded by</span>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/50 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-center">
                        {getInitials(doc.uploadedBy)}
                      </div>
                      <span className="text-gray-900 dark:text-white">{doc.uploadedBy}</span>
                      {doc.uploadedByRole && <span className="text-gray-500 dark:text-gray-400">· {formatRole(doc.uploadedByRole)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">Sent to</span>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/50 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-center">
                        {getInitials(doc.sentTo[0] || 'R')}
                      </div>
                      <span className="text-gray-900 dark:text-white">{doc.sentTo[0] || 'Reviewer'}</span>
                      {doc.reviewerRole && <span className="text-gray-500 dark:text-gray-400">· {formatRole(doc.reviewerRole)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">Submitted</span>
                    <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                      <HiCalendar className="h-4 w-4 text-gray-400" />
                      <span>{new Date(doc.dateSubmitted).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                </div>

                {/* File Row */}
                <div className="mt-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <HiDocument className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{displayFileName(doc.fileName)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {doc.fileType === 'link' ? 'Shared link' : `${(doc.fileType || 'file').toUpperCase()} file`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.externalLink && (
                      <a
                        href={doc.externalLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white inline-flex items-center gap-2"
                      >
                        <HiLink className="h-4 w-4" />
                        Open Link
                      </a>
                    )}
                    {doc.reviewLink && (
                      <a
                        href={doc.reviewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-2"
                      >
                        <HiLink className="h-4 w-4" />
                        Review Link
                      </a>
                    )}
                    {doc.fileType !== 'link' && (
                      <a
                        href={getDocumentUrl(doc)}
                        target="_blank"
                        rel="noreferrer"
                        className="h-10 w-10 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-black/40"
                        title="View document"
                      >
                        <HiEye className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-6 text-sm">
                    <button
                      onClick={() => handleEditDocument(doc)}
                      className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      <HiPencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button className="inline-flex items-center gap-2 text-red-500 hover:text-red-600">
                      <HiTrash className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.fileType !== 'link' && (
                      <a
                        href={getDocumentUrl(doc)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline"
                      >
                        <HiEye className="h-4 w-4 mr-2" />
                        View Document
                      </a>
                    )}
                    {(activeView === 'inbox' || doc.reviewerId === (user?.id || '')) && (
                      <button
                        onClick={() => handleReviewDocument(doc)}
                        className="btn-primary"
                      >
                        <HiDocument className="h-4 w-4 mr-2" />
                        Review Document
                      </button>
                    )}
                  </div>
                </div>

                {/* Timeline Toggle */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-center">
                  <button
                    onClick={() => toggleTimeline(doc.id)}
                    className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    {expandedTimelines.has(doc.id) ? (
                      <HiChevronUp className="h-4 w-4 transition-transform duration-200" />
                    ) : (
                      <HiChevronDown className="h-4 w-4 transition-transform duration-200" />
                    )}
                    <span>{expandedTimelines.has(doc.id) ? 'Hide Timeline' : 'View Timeline'}</span>
                  </button>
                </div>

                {/* Document Journey Timeline */}
                {expandedTimelines.has(doc.id) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Document Journey</h4>
                    <div className="space-y-4">
                      {getDocumentTimeline(doc).map((step, index) => (
                        <div key={step.id} className="flex items-start space-x-4">
                          {/* Timeline Line and Icon */}
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              step.color === 'blue' ? 'bg-blue-500' : 
                              step.color === 'orange' ? 'bg-orange-500' : 
                              step.color === 'red' ? 'bg-red-500' :
                              step.color === 'yellow' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}>
                              {step.icon === 'upload' ? (
                                <HiUpload className="h-4 w-4 text-white" />
                              ) : step.icon === 'review' ? (
                                <HiPaperAirplane className="h-4 w-4 text-white" />
                              ) : step.icon === 'approved' ? (
                                <HiCheckCircle className="h-4 w-4 text-white" />
                              ) : step.icon === 'changes-requested' ? (
                                <HiPencil className="h-4 w-4 text-white" />
                              ) : step.icon === 'rejected' ? (
                                <HiX className="h-4 w-4 text-white" />
                              ) : (
                                <HiArchive className="h-4 w-4 text-white" />
                              )}
                            </div>
                            {index < getDocumentTimeline(doc).length - 1 && (
                              <div className="w-0.5 h-8 bg-gray-300 dark:bg-black/40 mt-2"></div>
                            )}
                          </div>
                          
                          {/* Timeline Event Box */}
                          <div className="flex-1 min-w-0">
                            <div className="bg-gray-50 dark:bg-black/50 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-white/10">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-sm font-semibold text-gray-900 dark:text-white">{step.title}</h5>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{step.timestamp}</span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{step.description}</p>
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <HiUser className="h-3 w-3 mr-1" />
                                <span>{step.user}</span>
                                <span className="mx-1">•</span>
                                <span>{step.role}</span>
                              </div>
                              {/* Comment box for rejected documents */}
                              {step.comment && (
                                <div className="mt-3 bg-gray-100 dark:bg-black/40 rounded-lg p-3 border border-gray-200 dark:border-white/10">
                                  <p className="text-sm text-gray-800 dark:text-gray-200">{step.comment}</p>
                                </div>
                              )}
                              {step.link && (
                                <div className="mt-3">
                                  <a
                                    href={step.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                  >
                                    <HiLink className="h-4 w-4" />
                                    <span>Open review link</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-black/60 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upload Document</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Upload a new document and assign it for review</p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-black/40 rounded-xl transition-colors duration-200"
              >
                <HiX className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* Document Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadData.name}
                  onChange={(e) => setUploadData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="e.g., Requirements Specification"
                  required
                />
              </div>

              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={uploadData.project}
                  onChange={(e) => setUploadData(prev => ({ ...prev, project: e.target.value }))}
                  className="input-field"
                  required
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              {/* Phase */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phase <span className="text-red-500">*</span>
                </label>
                <select
                  value={uploadData.phase}
                  onChange={(e) => setUploadData(prev => ({ ...prev, phase: e.target.value }))}
                  className="input-field"
                  required
                >
                  <option value="">Select phase</option>
                  {availablePhases.map((phase: { id: string; name: string }) => (
                    <option key={phase.id} value={phase.id}>{phase.name}</option>
                  ))}
                </select>
              </div>

              {/* Task (optional, from DB for selected phase) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Task
                </label>
                <select
                  value={uploadData.task}
                  onChange={(e) => setUploadData(prev => ({ ...prev, task: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Select task (optional)</option>
                  {availableTasks.map((t: { id: string; title: string }) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field min-h-[80px] resize-none"
                  placeholder="Add notes or context about this document..."
                />
              </div>

              {/* Document Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document Link (required if no files)
                </label>
                <input
                  type="url"
                  value={uploadData.externalLink}
                  onChange={(e) => setUploadData(prev => ({ ...prev, externalLink: e.target.value }))}
                  className="input-field"
                  placeholder="https://example.com/shared-doc"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Optional: add a shared link for the reviewer.
                </p>
              </div>

              {/* Assign Reviewer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assign Reviewer <span className="text-red-500">*</span>
                </label>
                <select
                  value={uploadData.reviewer}
                  onChange={(e) => setUploadData(prev => ({ ...prev, reviewer: e.target.value }))}
                  className="input-field"
                  required
                >
                  <option value="">Select reviewer</option>
                  {reviewers.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Upload Files */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Files <span className="text-gray-500 text-sm">(optional if link is provided)</span>
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="upload-file-input"
                    multiple
                  />
                  <label
                    htmlFor="upload-file-input"
                    className="px-4 py-2 bg-gray-100 dark:bg-black/50 text-gray-700 dark:text-gray-300 rounded-xl cursor-pointer hover:bg-gray-200 dark:hover:bg-black/40 transition-colors duration-200"
                  >
                    Choose files
                  </label>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {uploadData.files ? `${uploadData.files.length} file(s) chosen` : 'No file chosen'}
                  </span>
                  {uploadData.files && (
                    <button
                      type="button"
                      onClick={() => setUploadData(prev => ({ ...prev, files: null }))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <HiX className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Document Modal */}
      {isReviewModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-black/60 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Review Document</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedDocument.name}</p>
                {selectedDocument.externalLink && (
                  <a
                    href={selectedDocument.externalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <HiLink className="h-4 w-4" />
                    <span>Open shared link</span>
                  </a>
                )}
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-black/40 rounded-xl transition-colors duration-200"
              >
                <HiX className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-6">
              {/* Select Action Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Action <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {/* Approve Option */}
                  <div 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-colors duration-200 ${
                      reviewData.action === 'approve' 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    onClick={() => {
                      setReviewData(prev => ({ ...prev, action: 'approve' }))
                      setValidationError('')
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <HiCheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Approve</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Document meets requirements</p>
                      </div>
                    </div>
                  </div>

                  {/* Request Changes Option */}
                  <div 
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 transform ${
                      reviewData.action === 'request-changes' 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md ring-2 ring-amber-400/60' 
                        : 'border border-gray-200 dark:border-white/10 hover:border-amber-400/50 bg-white dark:bg-black/60'
                    } hover:scale-[1.01]`}
                    onClick={() => {
                      setReviewData(prev => ({ ...prev, action: 'request-changes' }))
                      setValidationError('')
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        reviewData.action === 'request-changes' ? 'bg-white/20' : 'bg-amber-500'
                      }`}>
                        <HiPencil className={`h-5 w-5 ${reviewData.action === 'request-changes' ? 'text-white' : 'text-white'}`} />
                      </div>
                      <div>
                        <h4 className={`font-semibold ${reviewData.action === 'request-changes' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Request Changes</h4>
                        <p className={`text-sm ${reviewData.action === 'request-changes' ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>Document needs modifications</p>
                      </div>
                    </div>
                  </div>

                  {/* Reject Option */}
                  <div 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-colors duration-200 ${
                      reviewData.action === 'reject' 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    onClick={() => {
                      setReviewData(prev => ({ ...prev, action: 'reject' }))
                      setValidationError('')
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                        <HiX className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Reject</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Document does not meet requirements</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reviewData.notes}
                  onChange={(e) => {
                    setReviewData(prev => ({ ...prev, notes: e.target.value }))
                    // Clear validation error when user starts typing
                    if (validationError) {
                      setValidationError('')
                    }
                  }}
                  className={`input-field min-h-[100px] resize-none ${
                    validationError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="Add your comments or feedback..."
                />
                {validationError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationError}</p>
                )}
              </div>

              {/* Optional Review Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review Link (Optional)
                </label>
                <input
                  type="url"
                  value={reviewData.reviewLink}
                  onChange={(e) => setReviewData(prev => ({ ...prev, reviewLink: e.target.value }))}
                  className="input-field"
                  placeholder="https://example.com/review-notes"
                />
              </div>

              {/* Upload Document Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Document (Optional)
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Attach corrected or marked-up documents</p>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    onChange={handleReviewFileChange}
                    className="hidden"
                    id="review-file-input"
                  />
                  <label
                    htmlFor="review-file-input"
                    className="px-4 py-2 bg-gray-100 dark:bg-black/50 text-gray-700 dark:text-gray-300 rounded-xl cursor-pointer hover:bg-gray-200 dark:hover:bg-black/40 transition-colors duration-200"
                  >
                    Choose file
                  </label>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {reviewData.file ? reviewData.file.name : 'No file chosen'}
                  </span>
                  {reviewData.file && (
                    <button
                      type="button"
                      onClick={() => setReviewData(prev => ({ ...prev, file: null }))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <HiX className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {isEditModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-black/60 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Document</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Update document details and re-upload files if needed</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-black/40 rounded-xl transition-colors duration-200"
              >
                <HiX className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Document Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="Enter document name"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field min-h-[80px] resize-none"
                  placeholder="Add notes or context about this document..."
                />
              </div>

              {/* Re-upload Files Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Re-upload Files (Optional)
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Upload new files to replace existing ones. Multiple files and images supported.</p>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    onChange={handleEditFileChange}
                    className="hidden"
                    id="edit-file-input"
                    multiple
                  />
                  <label
                    htmlFor="edit-file-input"
                    className="px-4 py-2 bg-gray-100 dark:bg-black/50 text-gray-700 dark:text-gray-300 rounded-xl cursor-pointer hover:bg-gray-200 dark:hover:bg-black/40 transition-colors duration-200"
                  >
                    Choose files
                  </label>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {editData.files ? `${editData.files.length} file(s) chosen` : 'No file chosen'}
                  </span>
                  {editData.files && (
                    <button
                      type="button"
                      onClick={() => setEditData(prev => ({ ...prev, files: null }))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <HiX className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Current Files */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current files (1):
                </label>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                  <li>{selectedDocument.fileName}</li>
                </ul>
              </div>

              {/* Modal Footer */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Update Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Annotator removed */}
    </div>
  )
}

export default Documents
