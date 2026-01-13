import React, { useState, useEffect } from 'react'
import { 
  CashSummary, 
  Invoice, 
  PaymentReceipt, 
  BankCredit, 
  UnmatchedEmail,
  InvoiceFilters,
  ReceiptFilters,
  BankCreditFilters,
  ExceptionFilters
} from '../types/slips-invoices'
import { slipsInvoicesAPI } from '../services/slipsInvoicesMockAPI'
import InvoicesTable from '../components/InvoicesTable'
import { gmailStatus, startGmailSession } from '../services/gmailAPI'
import ReceiptsTable from '../components/ReceiptsTable'
import BankCreditsTable from '../components/BankCreditsTable'
import ExceptionsTable from '../components/ExceptionsTable'

const SlipsInvoicesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts' | 'bank-credits' | 'exceptions'>('invoices')
  const [summary, setSummary] = useState<CashSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([])
  const [bankCredits, setBankCredits] = useState<BankCredit[]>([])
  const [unmatchedEmails, setUnmatchedEmails] = useState<UnmatchedEmail[]>([])

  // Filter states
  const [invoiceFilters, setInvoiceFilters] = useState<InvoiceFilters>({})
  const [receiptFilters, setReceiptFilters] = useState<ReceiptFilters>({})
  const [bankCreditFilters, setBankCreditFilters] = useState<BankCreditFilters>({})
  const [exceptionFilters, setExceptionFilters] = useState<ExceptionFilters>({})

  // Week state
  const [currentWeek, setCurrentWeek] = useState('2024-W04')
  const [gmailConnected, setGmailConnected] = useState<boolean>(false)
  const [gmailEmail, setGmailEmail] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    loadData()
    // Check Gmail connection
    ;(async () => {
      try {
        const st = await gmailStatus()
        const scope = String(st?.scope || '')
        const hasGmail = /gmail\.(readonly|send)/.test(scope)
        setGmailConnected(!!st?.connected && hasGmail)
        setGmailEmail(st?.email || null)
      } catch {}
    })()
  }, [currentWeek])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load summary
      const summaryResponse = await slipsInvoicesAPI.getCashSummary(currentWeek)
      if (summaryResponse.success) {
        setSummary(summaryResponse.data)
      }

      // Load initial tab data
      await loadTabData(activeTab)
    } catch (err) {
      setError('Failed to load data')
      console.error('Error loading slips & invoices data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTabData = async (tab: string, filters?: any) => {
    try {
      switch (tab) {
        case 'invoices':
          const invoicesResponse = await slipsInvoicesAPI.getInvoices(filters || invoiceFilters)
          if (invoicesResponse.success) {
            setInvoices(invoicesResponse.data.data)
          }
          break
        case 'receipts':
          const receiptsResponse = await slipsInvoicesAPI.getReceipts(filters || receiptFilters)
          if (receiptsResponse.success) {
            setReceipts(receiptsResponse.data.data)
          }
          break
        case 'bank-credits':
          const bankCreditsResponse = await slipsInvoicesAPI.getBankCredits(filters || bankCreditFilters)
          if (bankCreditsResponse.success) {
            setBankCredits(bankCreditsResponse.data.data)
          }
          break
        case 'exceptions':
          const emailsResponse = await slipsInvoicesAPI.getUnmatchedEmails(filters || exceptionFilters)
          if (emailsResponse.success) {
            setUnmatchedEmails(emailsResponse.data.data)
          }
          break
      }
    } catch (err) {
      console.error(`Error loading ${tab} data:`, err)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as any)
    loadTabData(tab)
  }

  const handleKPIClick = (filterType: string) => {
    switch (filterType) {
      case 'invoices':
        setActiveTab('invoices')
        loadTabData('invoices')
        break
      case 'receipts':
        setActiveTab('receipts')
        loadTabData('receipts')
        break
      case 'bank-credits':
        setActiveTab('bank-credits')
        loadTabData('bank-credits')
        break
      case 'exceptions':
        setActiveTab('exceptions')
        loadTabData('exceptions')
        break
      case 'overdue':
        setInvoiceFilters({ ...invoiceFilters, overdueOnly: true })
        setActiveTab('invoices')
        loadTabData('invoices')
        break
    }
  }

  const handleWeekChange = (week: string) => {
    setCurrentWeek(week)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Data</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Slips & Invoices
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Financial tracking and payment management
          </p>
        </div>
        
        {/* Week Selector */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Week:
        </label>
        <select
          value={currentWeek}
          onChange={(e) => handleWeekChange(e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="2024-W01">2024-W01</option>
          <option value="2024-W02">2024-W02</option>
          <option value="2024-W03">2024-W03</option>
          <option value="2024-W04">2024-W04</option>
          <option value="2024-W05">2024-W05</option>
        </select>

        {/* Gmail connect/status (compact, does not change layout) */}
        <button
          onClick={async () => {
            try {
              const url = await startGmailSession()
              window.location.href = url
            } catch (e) {
              alert('Failed to start Google session')
            }
          }}
          className={`text-sm px-3 py-2 rounded-md border ${gmailConnected ? 'border-green-300 text-green-700 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 text-gray-700 bg-gray-50 dark:bg-gray-800'}`}
          title={gmailConnected ? `Connected: ${gmailEmail || 'Gmail'}` : 'Connect Gmail to send and ingest emails'}
        >
          {gmailConnected ? (gmailEmail || 'Gmail Connected') : 'Connect Gmail'}
        </button>
      </div>
      </div>

      {/* KPI Strip */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div 
            className="card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleKPIClick('invoices')}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {summary.invoicesIssued.count}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Invoices Issued</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                ${summary.invoicesIssued.total.toLocaleString()}
              </div>
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleKPIClick('receipts')}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summary.receiptsReceived.count}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Receipts Received</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                ${summary.receiptsReceived.total.toLocaleString()}
              </div>
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleKPIClick('bank-credits')}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {summary.collectedVsInvoiced.percentage}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Collected vs Invoiced</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                ${summary.collectedVsInvoiced.collected.toLocaleString()} / ${summary.collectedVsInvoiced.invoiced.toLocaleString()}
              </div>
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleKPIClick('overdue')}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {summary.overdueInvoices.count}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Overdue Invoices</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                ${summary.overdueInvoices.total.toLocaleString()}
              </div>
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleKPIClick('exceptions')}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {summary.unmatchedItems.count}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Unmatched Items</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {summary.unmatchedItems.receipts}R, {summary.unmatchedItems.bankCredits}BC, {summary.unmatchedItems.emails}E
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'invoices', label: 'Invoices (This Week)', count: invoices.length },
              { id: 'receipts', label: 'Client Slips (Email)', count: receipts.length },
              { id: 'bank-credits', label: 'Bank Credits (Email)', count: bankCredits.length },
              { id: 'exceptions', label: 'Exceptions Queue', count: unmatchedEmails.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'invoices' && (
            <InvoicesTable 
              invoices={invoices}
              filters={invoiceFilters}
              onFiltersChange={(filters) => {
                setInvoiceFilters(filters)
                loadTabData('invoices', filters)
              }}
              onRefresh={() => loadTabData('invoices')}
            />
          )}
          
          {activeTab === 'receipts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Pull client reply emails with attachments (payment slips) from Gmail.
                </div>
                <button
                  onClick={async () => {
                    try {
                      const r = await slipsInvoicesAPI.ingestReceiptsFromGmail?.()
                      if (r?.success) {
                        loadTabData('receipts')
                      } else {
                        alert(r?.message || 'Failed to sync from Gmail')
                      }
                    } catch {
                      alert('Failed to sync from Gmail')
                    }
                  }}
                  className="text-sm px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50"
                >
                  Sync Client Slips
                </button>
              </div>
              <ReceiptsTable 
                receipts={receipts}
                filters={receiptFilters}
                onFiltersChange={(filters) => {
                  setReceiptFilters(filters)
                  loadTabData('receipts', filters)
                }}
                onRefresh={() => loadTabData('receipts')}
              />
            </div>
          )}
          
          {activeTab === 'bank-credits' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Pull recent bank emails from Gmail and predict matches.
                </div>
                <button
                  onClick={async () => {
                    try {
                      const r = await slipsInvoicesAPI.ingestBankEmailsFromGmail?.()
                      if (r?.success) {
                        loadTabData('bank-credits')
                      } else {
                        alert(r?.message || 'Failed to sync from Gmail')
                      }
                    } catch {
                      alert('Failed to sync from Gmail')
                    }
                  }}
                  className="text-sm px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50"
                >
                  Sync Bank Emails
                </button>
              </div>
              <BankCreditsTable 
                bankCredits={bankCredits}
                filters={bankCreditFilters}
                onFiltersChange={(filters) => {
                  setBankCreditFilters(filters)
                  loadTabData('bank-credits', filters)
                }}
                onRefresh={() => loadTabData('bank-credits')}
              />
            </div>
          )}
          
          {activeTab === 'exceptions' && (
            <ExceptionsTable 
              emails={unmatchedEmails}
              filters={exceptionFilters}
              onFiltersChange={(filters) => {
                setExceptionFilters(filters)
                loadTabData('exceptions', filters)
              }}
              onRefresh={() => loadTabData('exceptions')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// All table components are now implemented

export default SlipsInvoicesPage
