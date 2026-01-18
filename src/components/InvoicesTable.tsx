import React, { useState, useEffect } from 'react'
import { Invoice, InvoiceFilters, PaymentReceipt } from '../types/slips-invoices'
import { slipsInvoicesAPI } from '../services/slipsInvoicesMockAPI'
import { getProjectsWithPhases } from '../services/projectsAPI'
import { apiGet } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { listReviewers } from '../services/usersAPI'

interface InvoicesTableProps {
  invoices: Invoice[]
  filters: InvoiceFilters
  onFiltersChange: (filters: InvoiceFilters) => void
  onRefresh: () => void
}

const InvoicesTable: React.FC<InvoicesTableProps> = ({ 
  invoices, 
  filters, 
  onFiltersChange, 
  onRefresh 
}) => {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [sendingInvoice, setSendingInvoice] = useState<Invoice | null>(null)
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false)
  const [selectedComment, setSelectedComment] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receiptMap, setReceiptMap] = useState<Record<string, { submitted: number; verified: number }>>({})

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const r = await slipsInvoicesAPI.getReceipts({})
        if (!r.success) return
        const recs = r.data.data as PaymentReceipt[]
        const map: Record<string, { submitted: number; verified: number }> = {}
        for (const rec of recs) {
          const invId = rec.matchedInvoiceId || (rec as any).invoiceId
          if (!invId) continue
          if (!map[invId]) map[invId] = { submitted: 0, verified: 0 }
          if (rec.status === 'Verified') map[invId].verified++
          else map[invId].submitted++
        }
        if (active) setReceiptMap(map)
      } catch {}
    })()
    return () => { active = false }
  }, [invoices])

  const displayStatusFor = (inv: Invoice) => {
    const rec = receiptMap[inv.id]
    if (rec && rec.submitted > 0 && !['Paid', 'PartiallyPaid'].includes(inv.status)) return 'Received'
    return inv.status
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsDrawerOpen(true)
  }

  const handleMarkPaid = async (invoice: Invoice) => {
    if (invoice.outstanding > 0) {
      const confirmed = window.confirm(
        `Mark invoice ${invoice.invoiceNo} as paid? This will set the outstanding balance to $0.`
      )
      if (!confirmed) return
    }

    try {
      setLoading(true)
      const response = await slipsInvoicesAPI.markInvoicePaid({
        invoiceId: invoice.id,
        reason: 'Marked as paid by director',
        confirm: true
      })

      if (response.success) {
        onRefresh()
        setError(null)
      } else {
        setError(response.message || 'Failed to mark invoice as paid')
      }
    } catch (err) {
      setError('Error marking invoice as paid')
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvoice = (invoice: Invoice) => {
    if (String(invoice.approvalStatus || '').toUpperCase() !== 'APPROVED') {
      setError('Invoice must be approved by executive before sending.')
      return
    }
    setSendingInvoice(invoice)
    setIsSendModalOpen(true)
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setIsEditModalOpen(true)
  }

  const handleDeleteInvoice = async (invoice: Invoice) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete invoice ${invoice.invoiceNo}? This action cannot be undone.`
    )
    
    if (!confirmed) return

    try {
      setLoading(true)
      const response = await slipsInvoicesAPI.deleteInvoice(invoice.id)
      
      if (response.success) {
        onRefresh()
        setError(null)
      } else {
        setError(response.message || 'Failed to delete invoice')
      }
    } catch (err) {
      setError('Error deleting invoice')
    } finally {
      setLoading(false)
    }
  }

  const handleShowComment = (comment: string) => {
    setSelectedComment(comment)
    setIsCommentModalOpen(true)
  }

  const handleStatusChange = async (invoice: Invoice, newStatus: string) => {
    try {
      setLoading(true)
      const updatedInvoice = { ...invoice, status: newStatus as Invoice['status'], updatedAt: new Date().toISOString() }
      const response = await slipsInvoicesAPI.updateInvoice(invoice.id, updatedInvoice)
      
      if (response.success) {
        onRefresh()
        setError(null)
      } else {
        setError(response.message || 'Failed to update status')
      }
    } catch (err) {
      setError('Error updating status')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'Paid':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      case 'PartiallyPaid':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
      case 'Received':
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200`
      case 'Overdue':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
      case 'Sent':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
      case 'Draft':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200`
      case 'Canceled':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200`
    }
  }

  const getApprovalLabel = (status?: string) => {
    switch (String(status || '').toUpperCase()) {
      case 'APPROVED':
        return 'Approved'
      case 'CHANGES_REQUESTED':
        return 'Changes requested'
      case 'REJECTED':
        return 'Rejected'
      case 'PENDING':
      default:
        return 'Pending'
    }
  }

  const getApprovalBadge = (status?: string) => {
    const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    switch (String(status || '').toUpperCase()) {
      case 'APPROVED':
        return `${base} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      case 'CHANGES_REQUESTED':
        return `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
      case 'REJECTED':
        return `${base} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
      default:
        return `${base} bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200`
    }
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && !invoices.find(inv => inv.dueDate === dueDate)?.status.includes('Paid')
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (invoices.length === 0) {
    return (
      <>
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No invoices found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {filters.overdueOnly ? 'No overdue invoices this week.' : 'No invoices issued this week.'}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
          >
            Create Invoice
          </button>
          {filters.overdueOnly && (
            <button
              onClick={() => onFiltersChange({ ...filters, overdueOnly: false })}
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              View all invoices
            </button>
          )}
        </div>
      </div>
      {isCreateModalOpen && (
        <CreateInvoiceModal
          onClose={() => setIsCreateModalOpen(false)}
          onRefresh={onRefresh}
        />
      )}
      </>
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

      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Invoices
        </h3>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
          <select
            value={filters.status?.[0] || 'all'}
            onChange={(e) => {
              const status = e.target.value === 'all' ? undefined : [e.target.value]
              onFiltersChange({ ...filters, status })
            }}
            className="text-sm border border-gray-300 dark:border-white/10 rounded-md px-3 py-1 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="PartiallyPaid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Canceled">Canceled</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.overdueOnly || false}
              onChange={(e) => onFiltersChange({ ...filters, overdueOnly: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Overdue only</span>
          </label>
        </div>

        {(filters.status || filters.overdueOnly) && (
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
        <table className="min-w-full divide-y divide-gray-300 dark:divide-white/10" style={{ minWidth: '1400px' }}>
          <thead className="bg-gray-50 dark:bg-black/60">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                Invoice No
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">
                Project → Phase
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
                Issue Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                Comments
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                Collected
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                Outstanding
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                Approval
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-black/60 divide-y divide-gray-200 dark:divide-white/10">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-black/40">
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleViewInvoice(invoice)}
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    {invoice.invoiceNo}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div>{invoice.projectName}</div>
                  <div className="text-gray-500 dark:text-gray-400">{invoice.phaseName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatDate(invoice.issueDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div className="flex items-center">
                    {formatDate(invoice.dueDate)}
                    {isOverdue(invoice.dueDate) && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Overdue
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div className="flex items-center justify-center">
                    {invoice.notes ? (
                      <div className="relative group">
                        <button
                          onClick={() => handleShowComment(invoice.notes || '')}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title={invoice.notes}
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-black/50 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-xs">
                          <div className="whitespace-pre-wrap break-words">{invoice.notes}</div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">-</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatCurrency(invoice.total, invoice.currency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatCurrency(invoice.collected, invoice.currency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatCurrency(invoice.outstanding, invoice.currency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getApprovalBadge(invoice.approvalStatus)}>
                    {getApprovalLabel(invoice.approvalStatus)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {invoice.status === 'Draft' ? (
                    <select
                      value={invoice.status}
                      onChange={(e) => handleStatusChange(invoice, e.target.value)}
                      disabled={loading}
                      className="border border-gray-300 dark:border-white/10 rounded-md px-2 py-1 bg-white dark:bg-black/50 text-gray-900 dark:text-white text-xs disabled:opacity-50"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  ) : (
                    <span className={getStatusBadge(displayStatusFor(invoice))}>
                      {displayStatusFor(invoice)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    {(() => {
                      const canSend = String(invoice.approvalStatus || '').toUpperCase() === 'APPROVED'
                      return (
                        <>
                    <button
                      onClick={() => handleViewInvoice(invoice)}
                      className="text-primary-600 hover:text-primary-500"
                      title="View Details"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    
                    {invoice.status === 'Draft' && (
                      <>
                        <button
                          onClick={() => handleEditInvoice(invoice)}
                          className="text-yellow-600 hover:text-yellow-500"
                          title="Edit Invoice"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => handleSendInvoice(invoice)}
                          disabled={loading || !canSend}
                          className="text-blue-600 hover:text-blue-500 disabled:opacity-50"
                          title={canSend ? 'Send Invoice' : 'Awaiting executive approval'}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => handleDeleteInvoice(invoice)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-500 disabled:opacity-50"
                          title="Delete Invoice"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                    
                    {invoice.outstanding === 0 && invoice.status !== 'Paid' && invoice.status !== 'Draft' && (
                      <button
                        onClick={() => handleMarkPaid(invoice)}
                        disabled={loading}
                        className="text-green-600 hover:text-green-500 disabled:opacity-50"
                        title="Mark as Paid"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    
                    {invoice.status !== 'Draft' && (
                      <button
                        onClick={() => handleSendInvoice(invoice)}
                        disabled={loading || !canSend}
                        className="text-blue-600 hover:text-blue-500 disabled:opacity-50"
                        title={canSend ? 'Send Invoice' : 'Awaiting executive approval'}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </button>
                    )}
                        </>
                      )
                    })()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invoice Drawer */}
      {isDrawerOpen && selectedInvoice && (
        <InvoiceDrawer
          invoice={selectedInvoice}
          onClose={() => {
            setIsDrawerOpen(false)
            setSelectedInvoice(null)
          }}
          onRefresh={onRefresh}
          onStatusChange={handleStatusChange}
          loading={loading}
        />
      )}

      {/* Create Invoice Modal */}
      {isCreateModalOpen && (
        <CreateInvoiceModal
          onClose={() => setIsCreateModalOpen(false)}
          onRefresh={onRefresh}
        />
      )}

      {/* Send Invoice Modal */}
      {isSendModalOpen && sendingInvoice && (
        <SendInvoiceModal
          invoice={sendingInvoice}
          onClose={() => { setIsSendModalOpen(false); setSendingInvoice(null) }}
          onSent={() => { setIsSendModalOpen(false); setSendingInvoice(null); onRefresh() }}
        />
      )}

      {/* Edit Invoice Modal */}
      {isEditModalOpen && editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingInvoice(null)
          }}
          onRefresh={onRefresh}
        />
      )}

      {/* Comment Modal */}
      {isCommentModalOpen && selectedComment && (
        <CommentModal
          comment={selectedComment}
          onClose={() => {
            setIsCommentModalOpen(false)
            setSelectedComment(null)
          }}
        />
      )}
    </div>
  )
}

// Invoice Drawer Component
const InvoiceDrawer: React.FC<{
  invoice: Invoice
  onClose: () => void
  onRefresh: () => void
  onStatusChange: (invoice: Invoice, newStatus: string) => void
  loading: boolean
}> = ({ invoice, onClose, onRefresh, onStatusChange, loading }) => {
  const { user } = useAuth()
  const isExecutive = String(user?.department || '').trim().toLowerCase() === 'executive department' || String(user?.role || '').trim().toLowerCase() === 'admin'
  const [error, setError] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [executives, setExecutives] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [selectedExecutiveId, setSelectedExecutiveId] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [requestMessage, setRequestMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const list = await listReviewers()
        const users = Array.isArray(list) ? list : (list?.items || [])
        const execs = users
          .filter((u: any) => {
            const dept = String(u.department || '').trim().toLowerCase()
            const role = String(u.role || '').trim().toLowerCase()
            return dept === 'executive department' || role === 'admin'
          })
          .map((u: any) => ({
            id: String(u.id),
            name: String(u.name || u.email || 'Executive'),
            email: String(u.email || ''),
          }))
        if (active) {
          setExecutives(execs)
          setRequestError(null)
          setRequestMessage(null)
          if (execs.length === 0) {
            setSelectedExecutiveId('')
          } else if (!selectedExecutiveId || !execs.find(exec => exec.id === selectedExecutiveId)) {
            setSelectedExecutiveId(execs[0].id)
          }
        }
      } catch {
        if (active) {
          setExecutives([])
        }
      }
    })()
    return () => { active = false }
  }, [invoice.id])

  const handleMarkPaid = async () => {
    if (invoice.outstanding > 0) {
      const confirmed = window.confirm(
        `Mark invoice ${invoice.invoiceNo} as paid? This will set the outstanding balance to $0.`
      )
      if (!confirmed) return
    }

    try {
      const response = await slipsInvoicesAPI.markInvoicePaid({
        invoiceId: invoice.id,
        reason: 'Marked as paid from drawer',
        confirm: true
      })

      if (response.success) {
        onRefresh()
        onClose()
        setError(null)
      } else {
        setError(response.message || 'Failed to mark invoice as paid')
      }
    } catch (err) {
      setError('Error marking invoice as paid')
    }
  }

  const [showSend, setShowSend] = useState(false)
  const approvalStatus = String(invoice.approvalStatus || '').toUpperCase()
  const canSend = approvalStatus === 'APPROVED'
  const isAlreadyApproved = approvalStatus === 'APPROVED'

  const handleOpenSend = () => {
    if (!canSend) {
      setError('Invoice must be approved by executive before sending.')
      return
    }
    setShowSend(true)
  }

  const handleReview = async (action: 'approve' | 'changes' | 'reject') => {
    if (action === 'approve' && isAlreadyApproved) {
      setError('Invoice is already approved.')
      return
    }

    try {
      setReviewLoading(true)
      const res = await slipsInvoicesAPI.reviewInvoice(invoice.id, action, reviewNote)
      if (!res.success) throw new Error(res.message || 'Failed to update approval')
      onRefresh()
      setReviewNote('')
      setError(null)
    } catch (err: any) {
      setError(err?.message || 'Failed to update approval')
    } finally {
      setReviewLoading(false)
    }
  }

  const handleRequestApproval = async () => {
    if (isAlreadyApproved) {
      setRequestError('Invoice is already approved.')
      return
    }
    if (!selectedExecutiveId) {
      setRequestError('Select an executive reviewer.')
      return
    }
    try {
      setRequestLoading(true)
      setRequestError(null)
      setRequestMessage(null)
      const res = await slipsInvoicesAPI.requestInvoiceApproval(invoice.id, selectedExecutiveId)
      if (!res.success) throw new Error(res.message || 'Failed to request approval')
      setRequestMessage('Approval request sent.')
      setError(null)
    } catch (err: any) {
      setRequestError(err?.message || 'Failed to request approval')
    } finally {
      setRequestLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    if (!canSend) {
      setError('Invoice must be approved by executive before downloading.')
      return
    }
    try {
      const res = await slipsInvoicesAPI.getInvoiceTemplate(invoice.id)
      if (!res.success || !res.data?.html) {
        throw new Error(res.message || 'Failed to download invoice template')
      }
      const blob = new Blob([res.data.html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoiceNo || 'invoice'}.html`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err?.message || 'Failed to download invoice template')
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
    
    switch (status) {
      case 'Paid':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      case 'PartiallyPaid':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
      case 'Overdue':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
      case 'Sent':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
      case 'Draft':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200`
      case 'Canceled':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200`
    }
  }

  const getApprovalLabel = (status?: string) => {
    switch (String(status || '').toUpperCase()) {
      case 'APPROVED':
        return 'Approved'
      case 'CHANGES_REQUESTED':
        return 'Changes requested'
      case 'REJECTED':
        return 'Rejected'
      case 'PENDING':
      default:
        return 'Pending'
    }
  }

  const getApprovalBadge = (status?: string) => {
    const base = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
    switch (String(status || '').toUpperCase()) {
      case 'APPROVED':
        return `${base} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      case 'CHANGES_REQUESTED':
        return `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
      case 'REJECTED':
        return `${base} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
      default:
        return `${base} bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200`
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-black/60 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {invoice.invoiceNo}
              </h2>
              <div className="flex items-center space-x-4 mt-2">
                {invoice.status === 'Draft' ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
                    <select
                      value={invoice.status}
                      onChange={(e) => onStatusChange(invoice, e.target.value)}
                      disabled={loading}
                      className="border border-gray-300 dark:border-white/10 rounded-md px-3 py-1 bg-white dark:bg-black/50 text-gray-900 dark:text-white text-sm disabled:opacity-50"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>
                ) : (
                  <span className={getStatusBadge(invoice.status)}>
                    {invoice.status}
                  </span>
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Issued: {formatDate(invoice.issueDate)}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Due: {formatDate(invoice.dueDate)}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {invoice.currency}
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

          {/* Client Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Client Information
            </h3>
            <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Company</div>
                  <div className="font-medium text-gray-900 dark:text-white">{invoice.clientCompanyName || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Client Name</div>
                  <div className="font-medium text-gray-900 dark:text-white">{invoice.clientName || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Designation</div>
                  <div className="font-medium text-gray-900 dark:text-white">{invoice.clientDesignation || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Phone</div>
                  <div className="font-medium text-gray-900 dark:text-white">{invoice.clientPhone || '-'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Address</div>
                  <div className="font-medium text-gray-900 dark:text-white">{invoice.clientAddress || '-'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Project Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Project Information
            </h3>
            <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Project</div>
                  <div className="font-medium text-gray-900 dark:text-white">{invoice.projectName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Phase</div>
                  <div className="font-medium text-gray-900 dark:text-white">{invoice.phaseName}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Financial Summary
            </h3>
            <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Subtotal</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(invoice.subtotal, invoice.currency)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tax</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(invoice.taxAmount, invoice.currency)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Outstanding</div>
                  <div className={`text-lg font-semibold ${
                    invoice.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                  }`}>
                    {formatCurrency(invoice.outstanding, invoice.currency)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Progress</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Math.round((invoice.collected / invoice.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-black/50 rounded-full h-3">
              <div 
                className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (invoice.collected / invoice.total) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Collected: {formatCurrency(invoice.collected, invoice.currency)}</span>
              <span>Total: {formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
          </div>

          {/* Approval */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Executive Approval
            </h3>
            <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span className={getApprovalBadge(invoice.approvalStatus)}>
                  {getApprovalLabel(invoice.approvalStatus)}
                </span>
                {invoice.approvedByName && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    By {invoice.approvedByName}
                  </span>
                )}
              </div>
              {invoice.approvalNote && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400">Note:</span> {invoice.approvalNote}
                </div>
              )}
              {!isExecutive && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Request approval
                  </div>
                  {executives.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      No executive reviewers available.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <select
                        value={selectedExecutiveId}
                        onChange={(e) => setSelectedExecutiveId(e.target.value)}
                        className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                      >
                        <option value="">Select executive</option>
                        {executives.map(exec => (
                          <option key={exec.id} value={exec.id}>
                            {exec.name}{exec.email ? ` - ${exec.email}` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleRequestApproval}
                        disabled={requestLoading || !selectedExecutiveId || isAlreadyApproved}
                        className="btn-primary"
                      >
                        {requestLoading ? 'Sending...' : 'Send for approval'}
                      </button>
                    </div>
                  )}
                  {requestError && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {requestError}
                    </div>
                  )}
                  {requestMessage && (
                    <div className="text-sm text-green-600 dark:text-green-400">
                      {requestMessage}
                    </div>
                  )}
                </div>
              )}
              {isExecutive && (
                <div className="space-y-3">
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                    placeholder="Optional note for approval decision..."
                  />
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleReview('changes')}
                      disabled={reviewLoading}
                      className="btn-secondary"
                    >
                      Request Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview('reject')}
                      disabled={reviewLoading}
                      className="btn-danger"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview('approve')}
                      disabled={reviewLoading || isAlreadyApproved}
                      className="btn-primary"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Notes
              </h3>
              <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
                <p className="text-gray-900 dark:text-white">{invoice.notes}</p>
              </div>
            </div>
          )}
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

            <button
              onClick={handleDownloadTemplate}
              disabled={loading || !canSend}
              className="btn-secondary disabled:opacity-60"
              title={canSend ? 'Download invoice template' : 'Awaiting executive approval'}
            >
              Download Template
            </button>
            
            {invoice.outstanding === 0 && invoice.status !== 'Paid' && (
              <button
                onClick={handleMarkPaid}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Processing...' : 'Mark as Paid'}
              </button>
            )}
            
            <button
              onClick={handleOpenSend}
              disabled={loading || !canSend}
              className="btn-primary"
            >
              {loading ? 'Sending...' : 'Send Invoice'}
            </button>
          </div>
        </div>

        {showSend && (
          <SendInvoiceModal
            invoice={invoice}
            onClose={() => setShowSend(false)}
            onSent={() => { setShowSend(false); onRefresh() }}
          />
        )}
      </div>
    </div>
  )
}

// Create Invoice Modal Component
const CreateInvoiceModal: React.FC<{
  onClose: () => void
  onRefresh: () => void
}> = ({ onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phaseInvoices, setPhaseInvoices] = useState<Record<string, Invoice>>({})
  const [checkingExisting, setCheckingExisting] = useState(false)
  const [formData, setFormData] = useState({
    projectId: '',
    phaseId: '',
    clientCompanyName: '',
    clientAddress: '',
    clientPhone: '',
    clientName: '',
    clientDesignation: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
    currency: 'USD',
    subtotal: 0,
    taxRate: 10,
    taxAmount: 0,
    total: 0,
    notes: ''
  })
  const [executives, setExecutives] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [selectedExecutiveId, setSelectedExecutiveId] = useState('')

  const [projects, setProjects] = React.useState<Array<{ id: string; name: string; phases: Array<{ id: string; name: string; completed?: boolean; allocatedHours?: number }> }>>([])
  React.useEffect(() => {
    ;(async () => {
      try {
        const list = await getProjectsWithPhases()
        const mapped = list.map(p => ({
          id: p.id,
          name: p.name,
          phases: p.phases.map(ph => ({ id: ph.id, name: ph.name, completed: false, allocatedHours: 0 })),
        }))
        setProjects(mapped)
      } catch (e) {
        setProjects([])
      }
    })()
  }, [])

  React.useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const list = await listReviewers()
        const users = Array.isArray(list) ? list : (list?.items || [])
        const execs = users
          .filter((u: any) => {
            const dept = String(u.department || '').trim().toLowerCase()
            const role = String(u.role || '').trim().toLowerCase()
            return dept === 'executive department' || role === 'admin'
          })
          .map((u: any) => ({
            id: String(u.id),
            name: String(u.name || u.email || 'Executive'),
            email: String(u.email || ''),
          }))
        if (active) {
          setExecutives(execs)
          setSelectedExecutiveId((prev) => {
            if (!execs.length) return ''
            if (prev && execs.find(exec => exec.id === prev)) return prev
            return execs[0].id
          })
        }
      } catch {
        if (active) setExecutives([])
      }
    })()
    return () => { active = false }
  }, [])

  const selectedProject = projects.find(p => p.id === formData.projectId)
  const selectedPhase = selectedProject?.phases.find(p => p.id === formData.phaseId)

  React.useEffect(() => {
    let active = true
    if (!formData.projectId) {
      setPhaseInvoices({})
      setCheckingExisting(false)
      return () => { active = false }
    }

    setCheckingExisting(true)
    ;(async () => {
      try {
        const existing = await slipsInvoicesAPI.getInvoices({ projectId: formData.projectId })
        if (!active) return
        const list = existing.success ? (existing.data?.data || []) : []
        const map: Record<string, Invoice> = {}
        list.forEach(inv => {
          if (inv.phaseId) map[inv.phaseId] = inv
        })
        setPhaseInvoices(map)
      } catch {
        if (active) setPhaseInvoices({})
      } finally {
        if (active) setCheckingExisting(false)
      }
    })()

    return () => { active = false }
  }, [formData.projectId])

  React.useEffect(() => {
    if (formData.phaseId && phaseInvoices[formData.phaseId]) {
      setFormData(prev => ({ ...prev, phaseId: '' }))
    }
  }, [formData.phaseId, phaseInvoices])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-calculate tax and total
      if (field === 'subtotal' || field === 'taxRate') {
        const subtotal = field === 'subtotal' ? parseFloat(value) || 0 : updated.subtotal
        const taxRate = field === 'taxRate' ? parseFloat(value) || 0 : updated.taxRate
        const taxAmount = (subtotal * taxRate) / 100
        const total = subtotal + taxAmount
        
        updated.taxAmount = taxAmount
        updated.total = total
      }
      
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.projectId || !formData.phaseId) {
      setError('Please select both project and phase')
      return
    }
    if (executives.length > 0 && !selectedExecutiveId) {
      setError('Select an executive reviewer.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (phaseInvoices[formData.phaseId]) {
        setError('An invoice already exists for this phase.')
        return
      }

      // Generate invoice number
      const invoiceNo = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`

      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNo,
        projectId: formData.projectId,
        phaseId: formData.phaseId,
        projectName: selectedProject?.name || '',
        phaseName: selectedPhase?.name || '',
        clientCompanyName: formData.clientCompanyName || '',
        clientAddress: formData.clientAddress || '',
        clientPhone: formData.clientPhone || '',
        clientName: formData.clientName || '',
        clientDesignation: formData.clientDesignation || '',
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        currency: formData.currency,
        subtotal: formData.subtotal,
        taxAmount: formData.taxAmount,
        total: formData.total,
        collected: 0,
        outstanding: formData.total,
        status: 'Draft',
        approvalStatus: 'PENDING',
        notes: formData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Call the API to create the invoice
      const response = await slipsInvoicesAPI.createInvoice(newInvoice, selectedExecutiveId || undefined)
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to create invoice')
      }
      
      onRefresh()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-black rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create New Invoice
            </h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          )}
          {/* Project and Phase Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project *
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => {
                  handleInputChange('projectId', e.target.value)
                  handleInputChange('phaseId', '') // Reset phase when project changes
                }}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phase *
              </label>
              <select
                value={formData.phaseId}
                onChange={(e) => handleInputChange('phaseId', e.target.value)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                required
                disabled={!formData.projectId}
              >
                <option value="">Select Phase</option>
                {selectedProject?.phases.map(phase => {
                  const existing = phaseInvoices[phase.id]
                  return (
                    <option key={phase.id} value={phase.id} disabled={!!existing}>
                      {phase.name} {phase.completed ? '✓' : '⏳'} ({phase.allocatedHours}h)
                      {existing ? ` • Invoiced (${existing.invoiceNo})` : ''}
                    </option>
                  )
                })}
              </select>
              {selectedPhase && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Phase ID: {selectedPhase.id} | 
                  Status: {selectedPhase.completed ? 'Completed' : 'In Progress'} | 
                  Allocated: {selectedPhase.allocatedHours}h
                </div>
              )}
            </div>
          </div>

          {/* Executive Approval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Executive Reviewer
            </label>
            {executives.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No executive reviewers available.
              </div>
            ) : (
              <div className="space-y-1">
                <select
                  value={selectedExecutiveId}
                  onChange={(e) => setSelectedExecutiveId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select executive</option>
                  {executives.map(exec => (
                    <option key={exec.id} value={exec.id}>
                      {exec.name}{exec.email ? ` - ${exec.email}` : ''}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Approval request will be sent to the selected executive.
                </div>
              </div>
            )}
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client Company
              </label>
              <input
                type="text"
                value={formData.clientCompanyName}
                onChange={(e) => handleInputChange('clientCompanyName', e.target.value)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client Name
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Designation
              </label>
              <input
                type="text"
                value={formData.clientDesignation}
                onChange={(e) => handleInputChange('clientDesignation', e.target.value)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                placeholder="Client designation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.clientPhone}
                onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                placeholder="+94 77 123 4567"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Client Address
            </label>
            <textarea
              value={formData.clientAddress}
              onChange={(e) => handleInputChange('clientAddress', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
              placeholder="Address"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Issue Date *
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => handleInputChange('issueDate', e.target.value)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date *
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Currency and Amounts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="LKR">LKR</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subtotal *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.subtotal}
                onChange={(e) => handleInputChange('subtotal', parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.taxRate}
                onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Calculated Amounts */}
          <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Subtotal</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formData.currency} {formData.subtotal.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Tax Amount</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formData.currency} {formData.taxAmount.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                  {formData.currency} {formData.total.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
              placeholder="Additional notes for this invoice..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || checkingExisting || !!phaseInvoices[formData.phaseId]}
              className="btn-primary"
            >
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Invoice Modal Component
const EditInvoiceModal: React.FC<{
  invoice: Invoice
  onClose: () => void
  onRefresh: () => void
}> = ({ invoice, onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    projectId: invoice.projectId,
    phaseId: invoice.phaseId,
    clientCompanyName: invoice.clientCompanyName || '',
    clientAddress: invoice.clientAddress || '',
    clientPhone: invoice.clientPhone || '',
    clientName: invoice.clientName || '',
    clientDesignation: invoice.clientDesignation || '',
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    taxRate: invoice.taxAmount > 0 ? (invoice.taxAmount / invoice.subtotal) * 100 : 10,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    notes: invoice.notes || ''
  })

  const [projects, setProjects] = useState<Array<{ id: string; name: string; phases: Array<{ id: string; name: string; completed?: boolean; allocatedHours?: number }> }>>([])
  useEffect(() => {
    ;(async () => {
      try {
        const list = await getProjectsWithPhases()
        const mapped = list.map(p => ({
          id: p.id,
          name: p.name,
          phases: p.phases.map(ph => ({ id: ph.id, name: ph.name, completed: false, allocatedHours: 0 })),
        }))
        setProjects(mapped)
      } catch (e) {
        setProjects([])
      }
    })()
  }, [])

  const selectedProject = projects.find(p => p.id === formData.projectId)
  const selectedPhase = selectedProject?.phases.find(p => p.id === formData.phaseId)

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-calculate tax and total
      if (field === 'subtotal' || field === 'taxRate') {
        const subtotal = field === 'subtotal' ? parseFloat(value) || 0 : updated.subtotal
        const taxRate = field === 'taxRate' ? parseFloat(value) || 0 : updated.taxRate
        const taxAmount = (subtotal * taxRate) / 100
        const total = subtotal + taxAmount
        
        updated.taxAmount = taxAmount
        updated.total = total
      }
      
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.projectId || !formData.phaseId) {
      setError('Please select both project and phase')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const updatedInvoice: Invoice = {
        ...invoice,
        projectId: formData.projectId,
        phaseId: formData.phaseId,
        projectName: selectedProject?.name || invoice.projectName,
        phaseName: selectedPhase?.name || invoice.phaseName,
        clientCompanyName: formData.clientCompanyName || '',
        clientAddress: formData.clientAddress || '',
        clientPhone: formData.clientPhone || '',
        clientName: formData.clientName || '',
        clientDesignation: formData.clientDesignation || '',
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        currency: formData.currency,
        subtotal: formData.subtotal,
        taxAmount: formData.taxAmount,
        total: formData.total,
        outstanding: formData.total - invoice.collected, // Recalculate outstanding
        notes: formData.notes,
        updatedAt: new Date().toISOString()
      }

      // Call the API to update the invoice
      const response = await slipsInvoicesAPI.updateInvoice(invoice.id, updatedInvoice)
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to update invoice')
      }
      
      onRefresh()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to update invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-black/60 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit Invoice {invoice.invoiceNo}
            </h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          )}

          {/* Project and Phase Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project *
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => {
                  handleInputChange('projectId', e.target.value)
                  handleInputChange('phaseId', '') // Reset phase when project changes
                }}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phase *
              </label>
              <select
                value={formData.phaseId}
                onChange={(e) => handleInputChange('phaseId', e.target.value)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                required
                disabled={!formData.projectId}
              >
                <option value="">Select Phase</option>
                {selectedProject?.phases.map(phase => (
                  <option key={phase.id} value={phase.id}>
                    {phase.name} {phase.completed ? '✓' : '⏳'} ({phase.allocatedHours}h)
                  </option>
                ))}
              </select>
              {selectedPhase && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Phase ID: {selectedPhase.id} | 
                  Status: {selectedPhase.completed ? 'Completed' : 'In Progress'} | 
                  Allocated: {selectedPhase.allocatedHours}h
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Issue Date *
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => handleInputChange('issueDate', e.target.value)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date *
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Currency and Amounts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="LKR">LKR</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subtotal *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.subtotal}
                onChange={(e) => handleInputChange('subtotal', parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.taxRate}
                onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Calculated Amounts */}
          <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Subtotal</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formData.currency} {formData.subtotal.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Tax Amount</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formData.currency} {formData.taxAmount.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                  {formData.currency} {formData.total.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
              placeholder="Additional notes for this invoice..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Updating...' : 'Update Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Comment Modal Component
const CommentModal: React.FC<{
  comment: string
  onClose: () => void
}> = ({ comment, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-black/60 rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <svg className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Invoice Comment
            </h2>
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

        {/* Comment Content */}
        <div className="p-6">
          <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
              {comment}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={onClose}
            className="btn-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default InvoicesTable

// Send Invoice Modal Component
const SendInvoiceModal: React.FC<{
  invoice: Invoice
  onClose: () => void
  onSent: () => void
}> = ({ invoice, onClose, onSent }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const p = await apiGet(`/projects/${invoice.projectId}`)
        const guess = p?.owner?.email || (Array.isArray(p?.memberships) ? (p.memberships.find((m: any) => m?.user?.email)?.user?.email) : '')
        setEmail(String(guess || ''))
      } catch {
        setEmail('')
      }
    })()
  }, [invoice.projectId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await slipsInvoicesAPI.sendInvoice(invoice.id, email)
      if (!res.success) throw new Error(res.message || 'Failed to send invoice')
      onSent()
    } catch (err: any) {
      setError(err?.message || 'Failed to send invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-black/60 rounded-2xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Send Invoice</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            ✕
          </button>
        </div>
        <form onSubmit={handleSend} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recipient Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              className="w-full border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">We’ll send from your connected Gmail account.</p>
          </div>
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Sending…' : 'Send'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
