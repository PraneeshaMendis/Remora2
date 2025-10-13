import React, { useState } from 'react'
import { PaymentReceipt, ReceiptFilters, Invoice } from '../types/slips-invoices'
import { slipsInvoicesAPI } from '../services/slipsInvoicesMockAPI'

interface ReceiptsTableProps {
  receipts: PaymentReceipt[]
  filters: ReceiptFilters
  onFiltersChange: (filters: ReceiptFilters) => void
  onRefresh: () => void
}

const ReceiptsTable: React.FC<ReceiptsTableProps> = ({ 
  receipts, 
  filters, 
  onFiltersChange, 
  onRefresh 
}) => {
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestedInvoices, setSuggestedInvoices] = useState<Invoice[]>([])

  const handleViewReceipt = async (receipt: PaymentReceipt) => {
    setSelectedReceipt(receipt)
    setIsDrawerOpen(true)
    
    // Load suggested invoices for matching
    if (!receipt.matchedInvoiceId) {
      try {
        const suggestionsResponse = await slipsInvoicesAPI.getInvoiceSuggestions(receipt.id)
        if (suggestionsResponse.success) {
          setSuggestedInvoices(suggestionsResponse.data)
        }
      } catch (err) {
        console.error('Error loading invoice suggestions:', err)
      }
    }
  }

  const handleMatchInvoice = async (receiptId: string, invoiceId: string) => {
    try {
      setLoading(true)
      const response = await slipsInvoicesAPI.matchReceiptToInvoice({
        receiptId,
        invoiceId,
        confirm: true
      })

      if (response.success) {
        onRefresh()
        setError(null)
        // Close drawer and refresh suggestions
        setIsDrawerOpen(false)
        setSelectedReceipt(null)
      } else {
        setError(response.message || 'Failed to match receipt to invoice')
      }
    } catch (err) {
      setError('Error matching receipt to invoice')
    } finally {
      setLoading(false)
    }
  }

  const handleUnmatchReceipt = async (receiptId: string) => {
    try {
      setLoading(true)
      const response = await slipsInvoicesAPI.unmatchReceipt(receiptId)

      if (response.success) {
        onRefresh()
        setError(null)
        // Refresh suggestions
        if (selectedReceipt) {
          const suggestionsResponse = await slipsInvoicesAPI.getInvoiceSuggestions(selectedReceipt.id)
          if (suggestionsResponse.success) {
            setSuggestedInvoices(suggestionsResponse.data)
          }
        }
      } else {
        setError(response.message || 'Failed to unmatch receipt')
      }
    } catch (err) {
      setError('Error unmatching receipt')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyReceipt = async (receiptId: string) => {
    try {
      setLoading(true)
      const response = await slipsInvoicesAPI.verifyReceipt(receiptId)

      if (response.success) {
        onRefresh()
        setError(null)
      } else {
        setError(response.message || 'Failed to verify receipt')
      }
    } catch (err) {
      setError('Error verifying receipt')
    } finally {
      setLoading(false)
    }
  }

  const handlePullFromEmail = async (receipt: PaymentReceipt) => {
    try {
      setLoading(true)
      setError(null)
      
      // Simulate pulling payment slip from email
      const response = await slipsInvoicesAPI.pullPaymentSlipFromEmail(receipt.id)
      
      if (response.success) {
        // Show success message
        alert(`Payment slip successfully pulled from email for receipt ${receipt.id}`)
        onRefresh()
      } else {
        setError(response.message || 'Failed to pull payment slip from email')
      }
    } catch (err) {
      setError('Error pulling payment slip from email')
    } finally {
      setLoading(false)
    }
  }

  const handleRejectReceipt = async (receiptId: string) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return

    try {
      setLoading(true)
      const response = await slipsInvoicesAPI.rejectReceipt({
        receiptId,
        reason
      })

      if (response.success) {
        onRefresh()
        setError(null)
      } else {
        setError(response.message || 'Failed to reject receipt')
      }
    } catch (err) {
      setError('Error rejecting receipt')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'Verified':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      case 'Submitted':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
      case 'Rejected':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`
    }
  }

  const getSourceBadge = (source: string) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded text-xs font-medium"
    
    switch (source) {
      case 'email':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
      case 'bank_email':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`
      case 'attestation':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No receipts found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {filters.unmatchedOnly ? 'No unmatched receipts.' : 'No payment receipts received.'}
        </p>
        {filters.unmatchedOnly && (
          <button
            onClick={() => onFiltersChange({ ...filters, unmatchedOnly: false })}
            className="mt-3 text-sm text-primary-600 hover:text-primary-500"
          >
            View all receipts
          </button>
        )}
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
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="Submitted">Submitted</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Source:</label>
          <select
            value={filters.source?.[0] || 'all'}
            onChange={(e) => {
              const source = e.target.value === 'all' ? undefined : [e.target.value]
              onFiltersChange({ ...filters, source })
            }}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Sources</option>
            <option value="email">Email</option>
            <option value="bank_email">Bank Email</option>
            <option value="attestation">Attestation</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.unmatchedOnly || false}
              onChange={(e) => onFiltersChange({ ...filters, unmatchedOnly: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Unmatched only</span>
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confidence:</label>
          <select
            value={filters.confidenceThreshold || 'all'}
            onChange={(e) => {
              const threshold = e.target.value === 'all' ? undefined : parseFloat(e.target.value)
              onFiltersChange({ ...filters, confidenceThreshold: threshold })
            }}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Confidence</option>
            <option value="0.9">High (90%+)</option>
            <option value="0.7">Medium (70%+)</option>
            <option value="0.5">Low (50%+)</option>
          </select>
        </div>

        {(filters.status || filters.source || filters.unmatchedOnly || filters.confidenceThreshold) && (
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
        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700" style={{ minWidth: '1450px' }}>
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Receipt ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Payer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Received
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Matched Invoice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Confidence
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {receipts.map((receipt) => (
              <tr key={receipt.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleViewReceipt(receipt)}
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    {receipt.id}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getSourceBadge(receipt.source)}>
                    {receipt.source.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => handlePullFromEmail(receipt)}
                      className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Pull payment slip from email"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {receipt.amount ? formatCurrency(receipt.amount) : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div>{receipt.payerName || 'Unknown'}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs">
                    {receipt.payerEmail || receipt.senderEmail}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatDate(receipt.receivedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getStatusBadge(receipt.status)}>
                    {receipt.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {receipt.matchedInvoiceId ? (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {receipt.matchedInvoiceId}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">Not matched</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {receipt.confidence ? (
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${
                            (receipt.confidence || 0) >= 0.8 ? 'bg-green-500' :
                            (receipt.confidence || 0) >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, (receipt.confidence || 0) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs">
                        {Math.round((receipt.confidence || 0) * 100)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleViewReceipt(receipt)}
                      className="text-primary-600 hover:text-primary-500"
                      title="View Details"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    
                    {receipt.status === 'Submitted' && (
                      <>
                        <button
                          onClick={() => handleVerifyReceipt(receipt.id)}
                          disabled={loading}
                          className="text-green-600 hover:text-green-500 disabled:opacity-50"
                          title="Verify Receipt"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => handleRejectReceipt(receipt.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-500 disabled:opacity-50"
                          title="Reject Receipt"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

      {/* Receipt Drawer */}
      {isDrawerOpen && selectedReceipt && (
        <ReceiptDrawer
          receipt={selectedReceipt}
          suggestedInvoices={suggestedInvoices}
          onClose={() => {
            setIsDrawerOpen(false)
            setSelectedReceipt(null)
            setSuggestedInvoices([])
          }}
          onMatchInvoice={handleMatchInvoice}
          onUnmatchReceipt={handleUnmatchReceipt}
          onRefresh={onRefresh}
        />
      )}
    </div>
  )
}

// Receipt Drawer Component
const ReceiptDrawer: React.FC<{
  receipt: PaymentReceipt
  suggestedInvoices: Invoice[]
  onClose: () => void
  onMatchInvoice: (receiptId: string, invoiceId: string) => void
  onUnmatchReceipt: (receiptId: string) => void
  onRefresh: () => void
}> = ({ receipt, suggestedInvoices, onClose, onMatchInvoice, onUnmatchReceipt, onRefresh }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
    
    switch (status) {
      case 'Verified':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      case 'Submitted':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
      case 'Rejected':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`
    }
  }

  const getSourceBadge = (source: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded text-sm font-medium"
    
    switch (source) {
      case 'email':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
      case 'bank_email':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`
      case 'attestation':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Payment Receipt Details
              </h2>
              <div className="flex items-center space-x-4 mt-2">
                <span className={getStatusBadge(receipt.status)}>
                  {receipt.status}
                </span>
                <span className={getSourceBadge(receipt.source)}>
                  {receipt.source.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Received: {formatDate(receipt.receivedAt)}
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
            {/* Receipt Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Receipt Information
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Receipt ID</div>
                    <div className="font-medium text-gray-900 dark:text-white">{receipt.id}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Amount</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {receipt.amount ? formatCurrency(receipt.amount) : 'N/A'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Payer Name</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {receipt.payerName || 'Unknown'}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Payer Email</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {receipt.payerEmail || receipt.senderEmail || 'N/A'}
                  </div>
                </div>

                {receipt.transactionRef && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Transaction Reference</div>
                    <div className="font-medium text-gray-900 dark:text-white">{receipt.transactionRef}</div>
                  </div>
                )}

                {receipt.paidDate && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Paid Date</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatDate(receipt.paidDate)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* File Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                File Information
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                {receipt.fileName ? (
                  <>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">File Name</div>
                      <div className="font-medium text-gray-900 dark:text-white">{receipt.fileName}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">File Type</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {receipt.fileType || 'Unknown'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">File Size</div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {receipt.fileSize ? formatFileSize(receipt.fileSize) : 'Unknown'}
                        </div>
                      </div>
                    </div>

                    {receipt.fileKey && (
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">File Key</div>
                        <div className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
                          {receipt.fileKey}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No file attached
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Matching Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Invoice Matching
            </h3>
            
            {receipt.matchedInvoiceId ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-green-800 dark:text-green-200 font-medium">
                      Matched to Invoice
                    </div>
                    <div className="text-lg font-bold text-green-900 dark:text-green-100">
                      {receipt.matchedInvoiceId}
                    </div>
                    {receipt.matchedAmount && (
                      <div className="text-sm text-green-700 dark:text-green-300">
                        Amount: {formatCurrency(receipt.matchedAmount)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onUnmatchReceipt(receipt.id)}
                    className="text-red-600 hover:text-red-500 text-sm"
                  >
                    Unmatch
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-3">
                  Not matched to any invoice
                </div>
                
                {suggestedInvoices.length > 0 && (
                  <div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                      Suggested matches:
                    </div>
                    <div className="space-y-2">
                      {suggestedInvoices.map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-3">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {invoice.invoiceNo}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {invoice.projectName} - {formatCurrency(invoice.total)}
                            </div>
                          </div>
                          <button
                            onClick={() => onMatchInvoice(receipt.id, invoice.id)}
                            className="text-primary-600 hover:text-primary-500 text-sm font-medium"
                          >
                            Match
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Flags and Notes */}
          {(receipt.flags && receipt.flags.length > 0) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Flags
              </h3>
              <div className="flex flex-wrap gap-2">
                {receipt.flags.map((flag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {receipt.reviewNote && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Review Notes
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-gray-900 dark:text-white">{receipt.reviewNote}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceiptsTable
