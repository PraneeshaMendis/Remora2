import React, { useState } from 'react'
import { BankCredit, BankCreditFilters, Invoice } from '../types/slips-invoices'
import { slipsInvoicesAPI } from '../services/slipsInvoicesMockAPI'

interface BankCreditsTableProps {
  bankCredits: BankCredit[]
  filters: BankCreditFilters
  onFiltersChange: (filters: BankCreditFilters) => void
  onRefresh: () => void
}

const BankCreditsTable: React.FC<BankCreditsTableProps> = ({ 
  bankCredits, 
  filters, 
  onFiltersChange, 
  onRefresh 
}) => {
  const [selectedCredit, setSelectedCredit] = useState<BankCredit | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestedInvoices, setSuggestedInvoices] = useState<Invoice[]>([])

  const handleViewCredit = async (credit: BankCredit) => {
    setSelectedCredit(credit)
    setIsDrawerOpen(true)
    
    // Load suggested invoices for matching
    if (credit.status === 'Unmatched') {
      try {
        const suggestionsResponse = await slipsInvoicesAPI.getInvoiceSuggestionsForBankCredit(credit.id)
        if (suggestionsResponse.success) {
          setSuggestedInvoices(suggestionsResponse.data)
        }
      } catch (err) {
        console.error('Error loading invoice suggestions:', err)
      }
    }
  }

  const handleMatchInvoice = async (creditId: string, invoiceId: string) => {
    try {
      setLoading(true)
      const response = await slipsInvoicesAPI.matchBankCreditToInvoice({
        creditId,
        invoiceId,
        confirm: true
      })

      if (response.success) {
        onRefresh()
        setError(null)
        // Close drawer and refresh suggestions
        setIsDrawerOpen(false)
        setSelectedCredit(null)
      } else {
        setError(response.message || 'Failed to match bank credit to invoice')
      }
    } catch (err) {
      setError('Error matching bank credit to invoice')
    } finally {
      setLoading(false)
    }
  }

  const handleUnmatchCredit = async (creditId: string) => {
    try {
      setLoading(true)
      const response = await slipsInvoicesAPI.unmatchBankCredit(creditId)

      if (response.success) {
        onRefresh()
        setError(null)
        // Refresh suggestions
        if (selectedCredit) {
          const suggestionsResponse = await slipsInvoicesAPI.getInvoiceSuggestionsForBankCredit(selectedCredit.id)
          if (suggestionsResponse.success) {
            setSuggestedInvoices(suggestionsResponse.data)
          }
        }
      } else {
        setError(response.message || 'Failed to unmatch bank credit')
      }
    } catch (err) {
      setError('Error unmatching bank credit')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkForReview = async (creditId: string) => {
    try {
      setLoading(true)
      const response = await slipsInvoicesAPI.markBankCreditForReview(creditId)

      if (response.success) {
        onRefresh()
        setError(null)
      } else {
        setError(response.message || 'Failed to mark for review')
      }
    } catch (err) {
      setError('Error marking for review')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'Matched':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      case 'Unmatched':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
      case 'NeedsReview':
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200`
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400'
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getConfidenceBarColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (bankCredits.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No bank credits found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {filters.unmatchedOnly ? 'No unmatched bank credits.' : 'No bank credits received.'}
        </p>
        {filters.unmatchedOnly && (
          <button
            onClick={() => onFiltersChange({ ...filters, unmatchedOnly: false })}
            className="mt-3 text-sm text-primary-600 hover:text-primary-500"
          >
            View all bank credits
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
            <option value="Unmatched">Unmatched</option>
            <option value="Matched">Matched</option>
            <option value="NeedsReview">Needs Review</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Source Mailbox:</label>
          <select
            value={filters.sourceMailbox?.[0] || 'all'}
            onChange={(e) => {
              const sourceMailbox = e.target.value === 'all' ? undefined : [e.target.value]
              onFiltersChange({ ...filters, sourceMailbox })
            }}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Mailboxes</option>
            <option value="bank@company.com">Bank Email</option>
            <option value="payments@company.com">Payments Email</option>
            <option value="finance@company.com">Finance Email</option>
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

        {(filters.status || filters.sourceMailbox || filters.unmatchedOnly || filters.confidenceThreshold) && (
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
        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700" style={{ minWidth: '1500px' }}>
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Credit ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Payer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Value Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Bank Ref
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Source
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
            {bankCredits.map((credit) => (
              <tr key={credit.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleViewCredit(credit)}
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    {credit.id}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatCurrency(credit.amount, credit.currency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div>{credit.payerName || 'Unknown'}</div>
                  {credit.bankRef && (
                    <div className="text-gray-500 dark:text-gray-400 text-xs">
                      Ref: {credit.bankRef}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatDate(credit.valueDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {credit.bankRef || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {credit.sourceMailbox}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getStatusBadge(credit.status)}>
                    {credit.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {credit.matchedInvoiceId ? (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {credit.matchedInvoiceId}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">Not matched</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {credit.confidence ? (
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${getConfidenceBarColor(credit.confidence || 0)}`}
                          style={{ width: `${Math.min(100, (credit.confidence || 0) * 100)}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs ${getConfidenceColor(credit.confidence || 0)}`}>
                        {Math.round((credit.confidence || 0) * 100)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleViewCredit(credit)}
                      className="text-primary-600 hover:text-primary-500"
                      title="View Details"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    
                    {credit.status === 'Unmatched' && (
                      <button
                        onClick={() => handleMarkForReview(credit.id)}
                        disabled={loading}
                        className="text-orange-600 hover:text-orange-500 disabled:opacity-50"
                        title="Mark for Review"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bank Credit Drawer */}
      {isDrawerOpen && selectedCredit && (
        <BankCreditDrawer
          credit={selectedCredit}
          suggestedInvoices={suggestedInvoices}
          onClose={() => {
            setIsDrawerOpen(false)
            setSelectedCredit(null)
            setSuggestedInvoices([])
          }}
          onMatchInvoice={handleMatchInvoice}
          onUnmatchCredit={handleUnmatchCredit}
          onRefresh={onRefresh}
        />
      )}
    </div>
  )
}

// Bank Credit Drawer Component
const BankCreditDrawer: React.FC<{
  credit: BankCredit
  suggestedInvoices: Invoice[]
  onClose: () => void
  onMatchInvoice: (creditId: string, invoiceId: string) => void
  onUnmatchCredit: (creditId: string) => void
  onRefresh: () => void
}> = ({ credit, suggestedInvoices, onClose, onMatchInvoice, onUnmatchCredit }) => {

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

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
    
    switch (status) {
      case 'Matched':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      case 'Unmatched':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
      case 'NeedsReview':
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400'
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getConfidenceBarColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Bank Credit Details
              </h2>
              <div className="flex items-center space-x-4 mt-2">
                <span className={getStatusBadge(credit.status)}>
                  {credit.status}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Value Date: {formatDate(credit.valueDate)}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {credit.currency}
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
          {/* Error Message - removed since error state is not used in drawer */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Credit Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Credit Information
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Credit ID</div>
                    <div className="font-medium text-gray-900 dark:text-white">{credit.id}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Amount</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(credit.amount, credit.currency)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Payer Name</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {credit.payerName || 'Unknown'}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Bank Reference</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {credit.bankRef || 'N/A'}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Value Date</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatDate(credit.valueDate)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Source Mailbox</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {credit.sourceMailbox}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Message ID</div>
                  <div className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
                    {credit.messageId}
                  </div>
                </div>

                {credit.memo && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Memo</div>
                    <div className="font-medium text-gray-900 dark:text-white">{credit.memo}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Matching Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Invoice Matching
              </h3>
              
              {credit.matchedInvoiceId ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-green-800 dark:text-green-200 font-medium">
                        Matched to Invoice
                      </div>
                      <div className="text-lg font-bold text-green-900 dark:text-green-100">
                        {credit.matchedInvoiceId}
                      </div>
                      {credit.matchedAmount && (
                        <div className="text-sm text-green-700 dark:text-green-300">
                          Amount: {formatCurrency(credit.matchedAmount, credit.currency)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onUnmatchCredit(credit.id)}
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
                              onClick={() => onMatchInvoice(credit.id, invoice.id)}
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

              {/* Confidence Score */}
              {credit.confidence && (
                <div className="mt-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Confidence Score
                  </div>
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mr-3">
                      <div 
                        className={`h-3 rounded-full ${getConfidenceBarColor(credit.confidence)}`}
                        style={{ width: `${credit.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-medium ${getConfidenceColor(credit.confidence)}`}>
                      {Math.round(credit.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Suggestions Details */}
          {suggestedInvoices.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Matching Suggestions
              </h3>
              <div className="space-y-3">
                {suggestedInvoices.map((invoice, index) => (
                  <div key={invoice.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {invoice.invoiceNo} - {invoice.projectName}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Amount: {formatCurrency(invoice.total)} | 
                          Due: {formatDate(invoice.dueDate)} | 
                          Status: {invoice.status}
                        </div>
                        {invoice.notes && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {invoice.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Suggestion #{index + 1}
                        </span>
                        <button
                          onClick={() => onMatchInvoice(credit.id, invoice.id)}
                          className="text-primary-600 hover:text-primary-500 text-sm font-medium px-3 py-1 border border-primary-600 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20"
                        >
                          Match Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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

export default BankCreditsTable
