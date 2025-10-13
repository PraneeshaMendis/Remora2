import React, { useState } from 'react'
import { Document } from '../types/index.ts'

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
  HiArchive
} from 'react-icons/hi'

const Documents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
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
    reviewer: '',
    files: null as FileList | null
  })
  const [reviewData, setReviewData] = useState({
    action: 'approve' as 'approve' | 'request-changes' | 'reject',
    notes: '',
    file: null as File | null
  })
  const [validationError, setValidationError] = useState('')
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    files: null as FileList | null
  })

  // Mock data
  const projects = [
    { id: '1', name: 'Mobile App Redesign' },
    { id: '2', name: 'Backend API Development' },
    { id: '3', name: 'Design System' }
  ]

  const phases = [
    { id: '1', name: 'Planning' },
    { id: '2', name: 'Development' },
    { id: '3', name: 'Testing' },
    { id: '4', name: 'Deployment' },
    { id: '5', name: 'Maintenance' }
  ]

  const reviewers = [
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' },
    { id: '3', name: 'Mike Johnson' },
    { id: '4', name: 'Sarah Wilson' },
    { id: '5', name: 'David Brown' }
  ]

  const documents: Document[] = [
    {
      id: '1',
      name: 'Requirements Specification',
      projectId: '1',
      phaseId: 'phase-1',
      taskId: 'task-1',
      uploadedBy: 'John Doe',
      sentTo: ['Mohan'],
      dateSubmitted: '2025-01-15T16:00:00Z',
      status: 'approved',
      fileName: 'requirements_v2.3.pdf',
      fileSize: 2048576,
      fileType: 'pdf',
      version: 1,
      uploadedAt: '2025-01-15T16:00:00Z'
    },
    {
      id: '2',
      name: 'UI/UX Design Mockups',
      projectId: '2',
      phaseId: 'phase-2',
      taskId: 'task-2',
      uploadedBy: 'Emma Williams',
      sentTo: ['Gayan'],
      dateSubmitted: '2025-01-14T19:50:00Z',
      status: 'rejected',
      fileName: 'ui_mockups.sketch',
      fileSize: 5242880,
      fileType: 'sketch',
      version: 1,
      uploadedAt: '2025-01-14T19:50:00Z'
    },
    {
      id: '3',
      name: 'Test Plan Document',
      projectId: '1',
      phaseId: 'phase-3',
      taskId: 'task-3',
      uploadedBy: 'Gayan',
      sentTo: ['Nadeesha'],
      dateSubmitted: '2025-01-12T16:30:00Z',
      status: 'needs-changes',
      fileName: 'test_plan.docx',
      fileSize: 1536000,
      fileType: 'docx',
      version: 1,
      uploadedAt: '2025-01-12T16:30:00Z'
    },
    {
      id: '2',
      name: 'Wireframe Mockups',
      projectId: '1',
      phaseId: 'phase-2',
      taskId: 'task-2',
      uploadedBy: 'Alex Rodriguez',
      sentTo: ['Sarah Johnson'],
      dateSubmitted: '2024-01-18T14:20:00Z',
      status: 'in-review',
      fileName: 'wireframes-v2.fig',
      fileSize: 5242880,
      fileType: 'fig',
      version: 2,
      uploadedAt: '2024-01-18T14:20:00Z'
    },
    {
      id: '3',
      name: 'API Documentation',
      projectId: '2',
      phaseId: 'phase-1',
      taskId: 'task-3',
      uploadedBy: 'Mike Chen',
      sentTo: ['David Kim'],
      dateSubmitted: '2024-01-20T09:15:00Z',
      status: 'needs-changes',
      fileName: 'api-docs-v1.md',
      fileSize: 1024000,
      fileType: 'md',
      version: 1,
      uploadedAt: '2024-01-20T09:15:00Z'
    },
    {
      id: '4',
      name: 'Component Library',
      projectId: '3',
      phaseId: 'phase-2',
      taskId: 'task-4',
      uploadedBy: 'Alex Rodriguez',
      sentTo: ['Sarah Johnson', 'Mike Chen'],
      dateSubmitted: '2024-01-19T16:45:00Z',
      status: 'draft',
      fileName: 'component-library.zip',
      fileSize: 8388608,
      fileType: 'zip',
      version: 3,
      uploadedAt: '2024-01-19T16:45:00Z'
    }
  ]

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = projectFilter === 'all' || doc.projectId === projectFilter
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    
    return matchesSearch && matchesProject && matchesStatus
  })

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    return project?.name || 'Unknown Project'
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
    if (!uploadData.name || !uploadData.project || !uploadData.files) return

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('Uploading document:', uploadData)
      
      // Reset form and close modal
      setUploadData({
        name: '',
        project: '',
        phase: '',
        task: '',
        description: '',
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('Submitting review:', { document: selectedDocument, review: reviewData })

      // Update document status based on review action
      if (reviewData.action === 'approve') {
        // In a real app, this would update the document status in the database
        console.log('Document approved - timeline will show additional steps')
        // Update the document status to approved for demo purposes
        if (selectedDocument) {
          selectedDocument.status = 'approved'
        }
      } else if (reviewData.action === 'request-changes') {
        console.log('Document changes requested with comments:', reviewData.notes)
        // Update the document status to needs-changes for demo purposes
        if (selectedDocument) {
          selectedDocument.status = 'needs-changes'
        }
      } else if (reviewData.action === 'reject') {
        console.log('Document rejected with comments:', reviewData.notes)
        // Update the document status to rejected for demo purposes
        if (selectedDocument) {
          selectedDocument.status = 'rejected'
        }
      }

      // Reset form and close modal
      setReviewData({
        action: 'approve',
        notes: '',
        file: null
      })
      setValidationError('')
      setSelectedDocument(null)
      setIsReviewModalOpen(false)
    } catch (error) {
      console.error('Failed to submit review:', error)
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
    const baseTimeline: TimelineStep[] = [
      {
        id: 'upload',
        title: 'Upload',
        description: 'Uploaded document',
        user: doc.uploadedBy,
        role: 'Project Manager',
        timestamp: new Date(doc.dateSubmitted).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        icon: 'upload',
        color: 'blue'
      },
      {
        id: 'review',
        title: 'Sent for Review',
        description: `Assigned to ${doc.sentTo[0]}`,
        user: doc.uploadedBy,
        role: 'Project Manager',
        timestamp: new Date(new Date(doc.dateSubmitted).getTime() + 2 * 60000).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        icon: 'review',
        color: 'orange'
      }
    ]

        // Add Approved and Finalized steps if document is approved
        if (doc.status === 'approved') {
          const approvedTime = new Date(new Date(doc.dateSubmitted).getTime() + 24 * 60 * 60 * 1000) // 1 day later
          const finalizedTime = new Date(approvedTime.getTime() + 5 * 60000) // 5 minutes after approval

          baseTimeline.push(
            {
              id: 'approved',
              title: 'Approved',
              description: 'Approved document',
              user: 'John Doe',
              role: 'Reviewer',
              timestamp: approvedTime.toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              icon: 'approved',
              color: 'green'
            },
            {
              id: 'finalized',
              title: 'Finalized',
              description: 'Document finalized and archived',
              user: 'System',
              role: 'Automated',
              timestamp: finalizedTime.toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              icon: 'finalized',
              color: 'green'
            }
          )
        }

        // Add Changes Requested step if document needs changes
        if (doc.status === 'needs-changes') {
          const changesRequestedTime = new Date(new Date(doc.dateSubmitted).getTime() + 4 * 60 * 60 * 1000) // 4 hours later

          baseTimeline.push({
            id: 'changes-requested',
            title: 'Changes Requested',
            description: 'Requested changes',
            user: 'Nadeesha',
            role: 'Designer',
            timestamp: changesRequestedTime.toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            icon: 'changes-requested',
            color: 'yellow',
            comment: reviewData.notes || 'Please add more detail on UI testing scenarios and include accessibility testing requirements.' // Use review notes or fallback to mock comment
          })
        }

        // Add Rejected step if document is rejected
        if (doc.status === 'rejected') {
          const rejectedTime = new Date(new Date(doc.dateSubmitted).getTime() + 2 * 24 * 60 * 60 * 1000) // 2 days later

          baseTimeline.push({
            id: 'rejected',
            title: 'Rejected',
            description: 'Rejected document',
            user: 'John Doe',
            role: 'Reviewer',
            timestamp: rejectedTime.toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            icon: 'rejected',
            color: 'red',
            comment: reviewData.notes || 'not good' // Use review notes or fallback to mock comment
          })
        }

    return baseTimeline
  }

  return (
    <div>
      {/* Header */}
      <div className="py-12 px-6 mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">My Documents & Reviews</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Manage your documents and track their journey through the review process
          </p>
        </div>
      </div>

      {/* Main Content Area - The big "divide box" */}
      <div className="card p-6 space-y-6">
        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <HiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by document name, project,"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="input-field text-sm py-2 px-3"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <select className="input-field text-sm py-2 px-3">
              <option value="all">All Phases</option>
              <option value="planning">Planning</option>
              <option value="development">Development</option>
              <option value="testing">Testing</option>
            </select>
            <select className="input-field text-sm py-2 px-3">
              <option value="all">All Tasks</option>
              <option value="requirements">Requirements</option>
              <option value="design">Design</option>
              <option value="implementation">Implementation</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-sm py-2 px-3"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="in-review">In Review</option>
              <option value="approved">Approved</option>
              <option value="needs-changes">Needs Changes</option>
            </select>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-primary text-sm px-4 py-2"
            >
              <HiPlus className="h-4 w-4 mr-2" />
              Upload Document
            </button>
          </div>
        </div>

        {/* Divide Line */}
        <div className="border-t border-gray-200 dark:border-gray-700"></div>

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-12 text-center">
            <HiDocument className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No documents found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                {/* Document Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center">
                      <HiDocument className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{doc.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getProjectName(doc.projectId)} → Planning → Requirements Gathering
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${getStatusColor(doc.status)}`}>
                    {doc.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center space-x-6 mb-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <HiUser className="h-4 w-4" />
                    <span>Uploaded by</span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">{doc.uploadedBy}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <HiPaperAirplane className="h-4 w-4" />
                    <span>Sent to</span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">{doc.sentTo[0]}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <HiCalendar className="h-4 w-4" />
                    <span>Submitted</span>
                    <span className="font-medium">{new Date(doc.dateSubmitted).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>

                {/* File Names and View Button */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <HiDocument className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{doc.fileName}</span>
                  </div>
                  <button className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    <HiEye className="h-4 w-4" />
                    <span>View Document</span>
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <button 
                      onClick={() => handleEditDocument(doc)}
                      className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      <HiPencil className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                    <button className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                      <HiTrash className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                  <div className="flex items-center">
                    <button 
                      onClick={() => handleReviewDocument(doc)}
                      className="btn-primary text-sm px-4 py-2"
                    >
                      <HiDocument className="h-4 w-4 mr-2" />
                      Review Document
                    </button>
                  </div>
                </div>

                {/* Timeline Toggle */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                              <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600 mt-2"></div>
                            )}
                          </div>
                          
                          {/* Timeline Event Box */}
                          <div className="flex-1 min-w-0">
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-600">
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
                                <div className="mt-3 bg-gray-100 dark:bg-gray-600 rounded-lg p-3 border border-gray-200 dark:border-gray-500">
                                  <p className="text-sm text-gray-800 dark:text-gray-200">{step.comment}</p>
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upload Document</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Upload a new document and assign it for review</p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200"
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
                  {phases.map((phase) => (
                    <option key={phase.id} value={phase.id}>{phase.name}</option>
                  ))}
                </select>
              </div>

              {/* Task */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Task <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadData.task}
                  onChange={(e) => setUploadData(prev => ({ ...prev, task: e.target.value }))}
                  className="input-field"
                  placeholder="e.g., UI Design Review"
                  required
                />
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
                  {reviewers.map((reviewer) => (
                    <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>
                  ))}
                </select>
              </div>

              {/* Upload Files */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Files <span className="text-red-500">*</span> <span className="text-gray-500 text-sm">(Multiple files supported)</span>
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="upload-file-input"
                    multiple
                    required
                  />
                  <label
                    htmlFor="upload-file-input"
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
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
                  className="flex-1 btn-secondary"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Review Document</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedDocument.name}</p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200"
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
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
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
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-colors duration-200 ${
                      reviewData.action === 'request-changes' 
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    onClick={() => {
                      setReviewData(prev => ({ ...prev, action: 'request-changes' }))
                      setValidationError('')
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                        <HiPencil className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Request Changes</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Document needs modifications</p>
                      </div>
                    </div>
                  </div>

                  {/* Reject Option */}
                  <div 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-colors duration-200 ${
                      reviewData.action === 'reject' 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
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
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
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
                  className="flex-1 btn-secondary"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Document</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Update document details and re-upload files if needed</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200"
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
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
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
                  className="flex-1 btn-secondary"
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
    </div>
  )
}

export default Documents
