import React, { useState } from 'react'
import { UnmatchedEmail, ExceptionFilters } from '../types/slips-invoices'
import { slipsInvoicesAPI } from '../services/slipsInvoicesMockAPI'

interface ExceptionsTableProps {
  emails: UnmatchedEmail[]
  filters: ExceptionFilters
  onFiltersChange: (filters: ExceptionFilters) => void
  onRefresh: () => void
}

const ExceptionsTable: React.FC<ExceptionsTableProps> = ({ 
  emails, 
  filters, 
  onFiltersChange, 
  onRefresh 
}) => {
  const [selectedEmail, setSelectedEmail] = useState<UnmatchedEmail | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'paymentId_missing' | 'paymentId_unknown' | 'no_valid_attachment' | 'oversize' | 'disallowed_type' | 'av_failed'>('all')

  const handleViewEmail = (email: UnmatchedEmail) => {
    setSelectedEmail(email)
    setIsDrawerOpen(true)
  }

  const handleArchiveEmail = async (emailId: string) => {
    try {
      setLoading(true)
      const response = await slipsInvoicesAPI.archiveUnmatchedEmail({
        id: emailId,
        reason: 'Archived by user'
      })

      if (response.success) {
        onRefresh()
        setError(null)
        setIsDrawerOpen(false)
        setSelectedEmail(null)
      } else {
        setError(response.message || 'Failed to archive email')
      }
    } catch (err) {
      setError('Error archiving email')
    } finally {
      setLoading(false)
    }
  }

  const handleRetryProcessing = async (emailId: string) => {
    try {
      setLoading(true)
      const response = await slipsInvoicesAPI.retryProcessingEmail(emailId)

      if (response.success) {
        onRefresh()
        setError(null)
        setIsDrawerOpen(false)
        setSelectedEmail(null)
      } else {
        setError(response.message || 'Failed to retry processing')
      }
    } catch (err) {
      setError('Error retrying processing')
    } finally {
      setLoading(false)
    }
  }

  const getReasonBadge = (reason: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    switch (reason) {
      case 'paymentId_missing':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
      case 'paymentId_unknown':
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200`
      case 'no_valid_attachment':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
      case 'oversize':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`
      case 'disallowed_type':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
      case 'av_failed':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200`
    }
  }

  const getReasonDescription = (reason: string) => {
    switch (reason) {
      case 'paymentId_missing':
        return 'Payment ID missing from email'
      case 'paymentId_unknown':
        return 'Payment ID not recognized'
      case 'no_valid_attachment':
        return 'No valid attachment found'
      case 'oversize':
        return 'Attachment too large'
      case 'disallowed_type':
        return 'File type not allowed'
      case 'av_failed':
        return 'Antivirus scan failed'
      default:
        return 'Unknown error'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'paymentId_missing':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'paymentId_unknown':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'no_valid_attachment':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        )
      case 'oversize':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 8h6m-6 4h6m-6 4h4" />
          </svg>
        )
      case 'disallowed_type':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'av_failed':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      default:
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  // Filter emails based on active sub-tab
  const filteredEmails = activeSubTab === 'all' 
    ? emails 
    : emails.filter(email => email.reason === activeSubTab)

  // Group emails by reason for sub-tabs
  const reasonCounts = emails.reduce((acc, email) => {
    acc[email.reason] = (acc[email.reason] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (emails.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No exceptions found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          All emails have been processed successfully.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tabs for exception types */}
      <div className="border-b border-gray-200 dark:border-white/10">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeSubTab === 'all'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            All Exceptions
            <span className="ml-2 bg-gray-100 dark:bg-black/50 text-gray-600 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
              {emails.length}
            </span>
          </button>
          
          {Object.entries(reasonCounts).map(([reason, count]) => (
            <button
              key={reason}
              onClick={() => setActiveSubTab(reason as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeSubTab === reason
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {getReasonDescription(reason)}
              <span className="ml-2 bg-gray-100 dark:bg-black/50 text-gray-600 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                {count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason:</label>
          <select
            value={filters.type?.[0] || 'all'}
            onChange={(e) => {
              const type = e.target.value === 'all' ? undefined : [e.target.value]
              onFiltersChange({ ...filters, type })
            }}
            className="text-sm border border-gray-300 dark:border-white/10 rounded-md px-3 py-1 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
          >
            <option value="all">All Reasons</option>
            <option value="paymentId_missing">Payment ID Missing</option>
            <option value="paymentId_unknown">Payment ID Unknown</option>
            <option value="no_valid_attachment">No Valid Attachment</option>
            <option value="oversize">Oversize</option>
            <option value="disallowed_type">Disallowed Type</option>
            <option value="av_failed">AV Failed</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.archivedOnly || false}
              onChange={(e) => onFiltersChange({ ...filters, archivedOnly: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Archived only</span>
          </label>
        </div>

        {(filters.type || filters.archivedOnly) && (
          <button
            onClick={() => onFiltersChange({})}
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-white/10" style={{ minWidth: '1200px' }}>
          <thead className="bg-gray-50 dark:bg-black/60">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                Sender
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-64">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                Received
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-black/60 divide-y divide-gray-200 dark:divide-white/10">
            {filteredEmails.map((email) => (
              <tr key={email.id} className="hover:bg-gray-50 dark:hover:bg-black/40">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {email.senderEmail}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {email.subject}
                  </div>
                  {email.snippet && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {email.snippet}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {getReasonIcon(email.reason)}
                    <span className={getReasonBadge(email.reason)}>
                      {getReasonDescription(email.reason)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatDate(email.receivedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    email.archived 
                      ? 'bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {email.archived ? 'Archived' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleViewEmail(email)}
                      className="text-primary-600 hover:text-primary-500"
                      title="View Details"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    
                    {!email.archived && (
                      <>
                        <button
                          onClick={() => handleRetryProcessing(email.id)}
                          disabled={loading}
                          className="text-green-600 hover:text-green-500 disabled:opacity-50"
                          title="Retry Processing"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => handleArchiveEmail(email.id)}
                          disabled={loading}
                          className="text-gray-600 hover:text-gray-500 disabled:opacity-50"
                          title="Archive Email"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Email Drawer */}
      {isDrawerOpen && selectedEmail && (
        <EmailDrawer
          email={selectedEmail}
          onClose={() => {
            setIsDrawerOpen(false)
            setSelectedEmail(null)
          }}
          onArchive={handleArchiveEmail}
          onRetry={handleRetryProcessing}
          onRefresh={onRefresh}
        />
      )}
    </div>
  )
}

// Email Drawer Component
const EmailDrawer: React.FC<{
  email: UnmatchedEmail
  onClose: () => void
  onArchive: (emailId: string) => void
  onRetry: (emailId: string) => void
  onRefresh: () => void
}> = ({ email, onClose, onArchive, onRetry }) => {
  const [error] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getReasonBadge = (reason: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
    
    switch (reason) {
      case 'paymentId_missing':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
      case 'paymentId_unknown':
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200`
      case 'no_valid_attachment':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
      case 'oversize':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`
      case 'disallowed_type':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
      case 'av_failed':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200`
    }
  }

  const getReasonDescription = (reason: string) => {
    switch (reason) {
      case 'paymentId_missing':
        return 'Payment ID missing from email'
      case 'paymentId_unknown':
        return 'Payment ID not recognized'
      case 'no_valid_attachment':
        return 'No valid attachment found'
      case 'oversize':
        return 'Attachment too large'
      case 'disallowed_type':
        return 'File type not allowed'
      case 'av_failed':
        return 'Antivirus scan failed'
      default:
        return 'Unknown error'
    }
  }

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'paymentId_missing':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'paymentId_unknown':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'no_valid_attachment':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        )
      case 'oversize':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 8h6m-6 4h6m-6 4h4" />
          </svg>
        )
      case 'disallowed_type':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'av_failed':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-black/60 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Email Exception Details
              </h2>
              <div className="flex items-center space-x-4 mt-2">
                <span className={getReasonBadge(email.reason)}>
                  {getReasonDescription(email.reason)}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Received: {formatDate(email.receivedAt)}
                </span>
                <span className={`text-sm ${
                  email.archived 
                    ? 'text-gray-500 dark:text-gray-400' 
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {email.archived ? 'Archived' : 'Active'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Email Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Email Information
              </h3>
              <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Sender Email</div>
                  <div className="font-medium text-gray-900 dark:text-white">{email.senderEmail}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Subject</div>
                  <div className="font-medium text-gray-900 dark:text-white">{email.subject}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Message ID</div>
                  <div className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
                    {email.messageId}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Received At</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatDate(email.receivedAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Exception Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Exception Details
              </h3>
              <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Exception Type</div>
                  <div className="flex items-center space-x-2 mt-1">
                    {getReasonIcon(email.reason)}
                    <span className={getReasonBadge(email.reason)}>
                      {getReasonDescription(email.reason)}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    email.archived 
                      ? 'bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {email.archived ? 'Archived' : 'Active'}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Exception ID</div>
                  <div className="font-mono text-xs text-gray-600 dark:text-gray-400">
                    {email.id}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Email Content */}
          {email.snippet && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Email Content Preview
              </h3>
              <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {email.snippet}
                </p>
              </div>
            </div>
          )}

          {/* Troubleshooting Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Troubleshooting Tips
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                {email.reason === 'paymentId_missing' && (
                  <p>This email is missing a payment ID. Check if the client included the correct payment reference in their email subject or body.</p>
                )}
                {email.reason === 'paymentId_unknown' && (
                  <p>This email contains a payment ID that we don't recognize. Verify the payment reference with the client or check if it's a new project.</p>
                )}
                {email.reason === 'no_valid_attachment' && (
                  <p>This email doesn't contain any valid payment attachments. Ask the client to resend with a proper payment receipt or invoice.</p>
                )}
                {email.reason === 'oversize' && (
                  <p>This email's attachment is too large. Ask the client to compress the file or send it via a file sharing service.</p>
                )}
                {email.reason === 'disallowed_type' && (
                  <p>This email contains a file type that's not allowed. Ask the client to send the document in PDF, JPG, or PNG format.</p>
                )}
                {email.reason === 'av_failed' && (
                  <p>This email failed antivirus scanning. The attachment may be corrupted or contain suspicious content. Ask the client to resend.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
            
            {!email.archived && (
              <>
                <button
                  onClick={() => onRetry(email.id)}
                  className="btn-primary"
                >
                  Retry Processing
                </button>
                
                <button
                  onClick={() => onArchive(email.id)}
                  className="btn-secondary"
                >
                  Archive Email
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExceptionsTable
