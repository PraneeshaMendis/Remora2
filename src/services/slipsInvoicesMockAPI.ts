import {
  Invoice,
  PaymentReceipt,
  BankCredit,
  UnmatchedEmail,
  CashSummary,
  PaymentMatch,
  InvoiceFilters,
  ReceiptFilters,
  BankCreditFilters,
  ExceptionFilters,
  ApiResponse,
  PaginatedResponse,
  MarkPaidRequest,
  VerifyReceiptRequest,
  RejectReceiptRequest,
  CreateMatchRequest,
  AssignPaymentIdRequest,
  ArchiveRequest
} from '../types/slips-invoices'
import { API_BASE } from './api'

class SlipsInvoicesMockAPI {
  private invoices: Invoice[] = []
  private paymentReceipts: PaymentReceipt[] = []
  private bankCredits: BankCredit[] = []
  private unmatchedEmails: UnmatchedEmail[] = []
  private paymentMatches: PaymentMatch[] = []

  constructor() {
    this.initializeMockData()
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private authHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken') || ''
    const uid = localStorage.getItem('userId') || ''
    return {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(!token && uid ? { 'x-user-id': uid } : {}),
    }
  }

  private async refreshAuthToken(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      if (data?.token) localStorage.setItem('authToken', data.token)
    } catch {}
  }

  private async fetchWithAuth(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
    const headers = { ...(init.headers || {}), ...this.authHeaders() }
    const res = await fetch(url, { ...init, headers, credentials: 'include' })
    if (res.status === 401 && retry) {
      await this.refreshAuthToken()
      const retryHeaders = { ...(init.headers || {}), ...this.authHeaders() }
      return fetch(url, { ...init, headers: retryHeaders, credentials: 'include' })
    }
    return res
  }

  private initializeMockData() {
    // Initialize with fixtures that simulate the 5 exception cases
    this.invoices = [
      {
        id: 'inv-001',
        invoiceNo: 'INV-2025-001',
        projectId: 'proj-1',
        phaseId: 'phase-1',
        projectName: 'Mobile App Redesign',
        phaseName: 'Design Phase',
        issueDate: '2025-01-15',
        dueDate: '2025-02-15',
        currency: 'USD',
        subtotal: 5000,
        taxAmount: 500,
        vatAmount: 0,
        total: 5500,
        collected: 5500,
        outstanding: 0,
        status: 'Paid',
        pdfKey: 'invoices/inv-001.pdf',
        notes: 'Client requested expedited delivery. All requirements completed ahead of schedule.',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-20T15:30:00Z'
      },
      {
        id: 'inv-002',
        invoiceNo: 'INV-2025-002',
        projectId: 'proj-2',
        phaseId: 'phase-2',
        projectName: 'Backend API Development',
        phaseName: 'Development Phase',
        issueDate: '2025-01-20',
        dueDate: '2025-02-20',
        currency: 'USD',
        subtotal: 8000,
        taxAmount: 800,
        vatAmount: 0,
        total: 8800,
        collected: 4400,
        outstanding: 4400,
        status: 'PartiallyPaid',
        pdfKey: 'invoices/inv-002.pdf',
        notes: 'Payment received for first milestone. Client confirmed satisfaction with progress.',
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-25T14:20:00Z'
      },
      {
        id: 'inv-003',
        invoiceNo: 'INV-2025-003',
        projectId: 'proj-3',
        phaseId: 'phase-3',
        projectName: 'Design System',
        phaseName: 'Implementation Phase',
        issueDate: '2025-01-10',
        dueDate: '2025-01-25',
        currency: 'USD',
        subtotal: 3000,
        taxAmount: 300,
        vatAmount: 0,
        total: 3300,
        collected: 0,
        outstanding: 3300,
        status: 'Overdue',
        pdfKey: 'invoices/inv-003.pdf',
        notes: 'Client experiencing budget constraints. Follow-up call scheduled for next week.',
        createdAt: '2025-01-10T10:00:00Z',
        updatedAt: '2025-01-10T10:00:00Z'
      },
      {
        id: 'inv-004',
        invoiceNo: 'INV-2025-004',
        projectId: 'proj-1',
        phaseId: 'phase-2',
        projectName: 'Mobile App Redesign',
        phaseName: 'Development Phase',
        issueDate: '2025-01-25',
        dueDate: '2025-02-25',
        currency: 'USD',
        subtotal: 12000,
        taxAmount: 1200,
        vatAmount: 0,
        total: 13200,
        collected: 0,
        outstanding: 13200,
        status: 'Sent',
        pdfKey: 'invoices/inv-004.pdf',
        notes: 'Large project with multiple phases. Client approved all design mockups before development started.',
        createdAt: '2025-01-25T10:00:00Z',
        updatedAt: '2025-01-25T10:00:00Z'
      },
      {
        id: 'inv-005',
        invoiceNo: 'INV-2025-005',
        projectId: 'proj-2',
        phaseId: 'phase-3',
        projectName: 'Backend API Development',
        phaseName: 'Testing Phase',
        issueDate: '2025-01-30',
        dueDate: '2025-02-15',
        currency: 'USD',
        subtotal: 4500,
        taxAmount: 450,
        vatAmount: 0,
        total: 4950,
        collected: 0,
        outstanding: 4950,
        status: 'Draft',
        pdfKey: 'invoices/inv-005.pdf',
        notes: 'Final testing phase includes performance optimization and security audit. Estimated completion in 2 weeks.',
        createdAt: '2025-01-30T10:00:00Z',
        updatedAt: '2025-01-30T10:00:00Z'
      },
      {
        id: 'inv-006',
        invoiceNo: 'INV-2025-006',
        projectId: 'proj-3',
        phaseId: 'phase-1',
        projectName: 'Design System',
        phaseName: 'Research Phase',
        issueDate: '2025-02-01',
        dueDate: '2025-02-16',
        currency: 'USD',
        subtotal: 2500,
        taxAmount: 250,
        vatAmount: 0,
        total: 2750,
        collected: 2750,
        outstanding: 0,
        status: 'Paid',
        pdfKey: 'invoices/inv-006.pdf',
        notes: 'Research phase completed successfully. Client provided excellent feedback on user interviews.',
        createdAt: '2025-02-01T10:00:00Z',
        updatedAt: '2025-02-05T16:45:00Z'
      },
      {
        id: 'inv-007',
        invoiceNo: 'INV-2025-007',
        projectId: 'proj-1',
        phaseId: 'phase-3',
        projectName: 'Mobile App Redesign',
        phaseName: 'Testing Phase',
        issueDate: '2025-02-05',
        dueDate: '2025-02-20',
        currency: 'USD',
        subtotal: 6000,
        taxAmount: 600,
        vatAmount: 0,
        total: 6600,
        collected: 0,
        outstanding: 6600,
        status: 'Draft',
        pdfKey: 'invoices/inv-007.pdf',
        notes: '',
        createdAt: '2025-02-05T10:00:00Z',
        updatedAt: '2025-02-05T10:00:00Z'
      },
      {
        id: 'inv-008',
        invoiceNo: 'INV-2025-008',
        projectId: 'proj-2',
        phaseId: 'phase-1',
        projectName: 'Backend API Development',
        phaseName: 'Planning Phase',
        issueDate: '2025-02-10',
        dueDate: '2025-02-25',
        currency: 'USD',
        subtotal: 3500,
        taxAmount: 350,
        vatAmount: 0,
        total: 3850,
        collected: 0,
        outstanding: 3850,
        status: 'Sent',
        pdfKey: 'invoices/inv-008.pdf',
        notes: 'Planning phase includes architecture design and database schema. Client approved technical specifications.',
        createdAt: '2025-02-10T10:00:00Z',
        updatedAt: '2025-02-10T10:00:00Z'
      }
    ]

    // Case 1: Reply + slip (client replies to our email with PaymentID and slip)
    this.paymentReceipts = [
      {
        id: 'receipt-001',
        paymentRequestId: 'PR-001',
        invoiceId: 'inv-001',
        projectId: 'proj-1',
        phaseId: 'phase-1',
        projectName: 'Mobile App Redesign',
        phaseName: 'Design Phase',
        source: 'email',
        fileKey: 'https://dummyimage.com/600x800/1f2937/e5e7eb.png&text=Payment+Slip',
        fileName: 'payment_slip_001.png',
        fileType: 'image/png',
        fileSize: 245760,
        amount: 5500,
        paidDate: '2025-01-20',
        transactionRef: 'TXN-001',
        payerName: 'John Smith',
        payerEmail: 'john@client.com',
        status: 'Verified',
        confidence: 0.95,
        matchedInvoiceId: 'inv-001',
        matchedAmount: 5500,
        senderEmail: 'john@client.com',
        messageId: 'msg-001',
        gmailThreadId: 'thread-001',
        receivedAt: '2025-01-20T09:30:00Z',
        reviewedBy: 'finance@company.com',
        reviewedAt: '2025-01-20T10:15:00Z'
      },
      // Case 2: New email + slip (client composes new email with slip, no PaymentID)
      {
        id: 'receipt-002',
        projectId: 'proj-2',
        phaseId: 'phase-2',
        projectName: 'Backend API Development',
        phaseName: 'Development Phase',
        source: 'email',
        fileKey: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileName: 'payment_confirmation.pdf',
        fileType: 'application/pdf',
        fileSize: 189440,
        amount: 4400,
        paidDate: '2025-01-25',
        transactionRef: 'TXN-002',
        payerName: 'Jane Doe',
        payerEmail: 'jane@client.com',
        status: 'Submitted',
        confidence: 0.75,
        flags: ['awaiting_bank'],
        senderEmail: 'jane@client.com',
        messageId: 'msg-002',
        receivedAt: '2025-01-25T14:20:00Z'
      },
      // Case 5: No pay + uploaded something (client uploads file but payment not found)
      {
        id: 'receipt-003',
        projectId: 'proj-4',
        phaseId: 'phase-4',
        projectName: 'Database Migration',
        phaseName: 'Migration Phase',
        source: 'email',
        fileKey: 'https://dummyimage.com/600x800/f3f4f6/111827.png&text=Payment+Slip',
        fileName: 'payment_slip_003.png',
        fileType: 'image/png',
        fileSize: 156800,
        amount: 2000,
        paidDate: '2025-01-28',
        transactionRef: 'TXN-003',
        payerName: 'Bob Wilson',
        payerEmail: 'bob@client.com',
        status: 'Submitted',
        confidence: 0.60,
        flags: ['awaiting_bank', 'no_slip'],
        senderEmail: 'bob@client.com',
        messageId: 'msg-003',
        receivedAt: '2025-01-28T11:45:00Z'
      }
    ]

    // Case 3: Paid but no slip (bank reports credit, no client slip)
    this.bankCredits = [
      {
        id: 'bank-001',
        amount: 3300,
        currency: 'USD',
        valueDate: '2025-01-26',
        payerName: 'Design System Client',
        bankRef: 'REF-001',
        memo: 'Payment for design system project',
        sourceMailbox: 'bank@company.com',
        messageId: 'bank-msg-001',
        receivedAt: '2025-01-26T08:00:00Z',
        matchedInvoiceId: 'inv-003',
        matchedAmount: 3300,
        confidence: 0.90,
        status: 'Matched',
        suggestions: [
          {
            invoiceId: 'inv-003',
            reason: 'Amount matches exactly',
            confidence: 0.90
          }
        ]
      },
      {
        id: 'bank-002',
        amount: 1500,
        currency: 'USD',
        valueDate: '2025-01-27',
        payerName: 'Unknown Payer',
        bankRef: 'REF-002',
        memo: 'Payment received',
        sourceMailbox: 'bank@company.com',
        messageId: 'bank-msg-002',
        receivedAt: '2025-01-27T10:30:00Z',
        confidence: 0.45,
        status: 'Unmatched',
        suggestions: [
          {
            invoiceId: 'inv-002',
            reason: 'Similar amount to partial payment',
            confidence: 0.45
          }
        ]
      }
    ]

    // Unmatched emails for various cases
    this.unmatchedEmails = [
      {
        id: 'email-001',
        senderEmail: 'client@example.com',
        subject: 'Payment confirmation',
        snippet: 'Please find attached payment slip for invoice INV-2025-004',
        receivedAt: '2025-01-29T16:20:00Z',
        reason: 'paymentId_unknown',
        messageId: 'email-msg-001',
        archived: false
      },
      {
        id: 'email-002',
        senderEmail: 'another@client.com',
        subject: 'Invoice payment',
        snippet: 'I have made payment for the recent invoice',
        receivedAt: '2025-01-30T09:15:00Z',
        reason: 'no_valid_attachment',
        messageId: 'email-msg-002',
        archived: false
      },
      {
        id: 'email-003',
        senderEmail: 'largefile@client.com',
        subject: 'Payment slip attached',
        snippet: 'Please find the payment slip attached',
        receivedAt: '2025-01-30T11:30:00Z',
        reason: 'oversize',
        messageId: 'email-msg-003',
        archived: false
      }
    ]

    // Payment matches
    this.paymentMatches = [
      {
        id: 'match-001',
        invoiceId: 'inv-001',
        receiptId: 'receipt-001',
        amount: 5500,
        matchedAt: '2025-01-20T10:15:00Z',
        matchedBy: 'finance@company.com',
        type: 'receipt'
      },
      {
        id: 'match-002',
        invoiceId: 'inv-003',
        bankCreditId: 'bank-001',
        amount: 3300,
        matchedAt: '2025-01-26T09:00:00Z',
        matchedBy: 'system@company.com',
        type: 'bank_credit'
      }
    ]

    // Activity logs would be initialized here in a real implementation
  }

  // Cash Summary API
  async getCashSummary(_week: string): Promise<ApiResponse<CashSummary>> {
    // Real data: load from backend endpoints
    try {
      const invRes = await this.fetchWithAuth(`${API_BASE}/invoices`, { headers: { 'content-type': 'application/json' } })
      const invoices: Invoice[] = invRes.ok ? await invRes.json() : []
      // Use DB-backed endpoints only to avoid slow Gmail scans on page load
      const rcRes = await fetch(`${API_BASE}/api/receipts`, { headers: { 'x-user-id': localStorage.getItem('userId') || '' } })
      const rcRaw: any[] = rcRes.ok ? await rcRes.json() : []
      const bcRes = await fetch(`${API_BASE}/api/bank-credits`, { headers: { 'x-user-id': localStorage.getItem('userId') || '' } })
      const bankRaw: any[] = bcRes.ok ? await bcRes.json() : []

      const receipts: PaymentReceipt[] = rcRaw.map((it: any) => ({
        id: String(it.id || it.messageId || `rcpt-${Math.random()}`),
        paymentRequestId: it.paymentRequestId,
        invoiceId: it.invoiceId,
        projectId: it.projectId || 'unknown',
        phaseId: it.phaseId || 'unknown',
        projectName: it.projectName || '',
        phaseName: it.phaseName || '',
        source: 'email',
        fileKey: it.fileKey,
        fileName: it.fileName,
        fileType: it.fileType,
        fileSize: it.fileSize,
        amount: typeof it.amount === 'number' ? it.amount : undefined,
        paidDate: it.paidDate,
        transactionRef: it.transactionRef,
        payerName: it.payerName,
        payerEmail: it.payerEmail || it.senderEmail,
        status: it.status || 'Submitted',
        confidence: it.confidence,
        matchedInvoiceId: it.matchedInvoiceId,
        matchedAmount: it.matchedAmount,
        flags: it.flags || [],
        senderEmail: it.senderEmail,
        messageId: it.messageId,
        gmailThreadId: it.gmailThreadId,
        receivedAt: it.receivedAt || new Date().toISOString(),
      }))

      const bankCredits: BankCredit[] = bankRaw.map((b: any) => ({
        id: String(b.id || b.messageId || `bc-${Math.random()}`),
        amount: Number(b.amount) || 0,
        currency: b.currency || 'USD',
        valueDate: b.valueDate || b.receivedAt || new Date().toISOString(),
        payerName: b.payerName,
        bankRef: b.bankRef,
        memo: b.memo,
        sourceMailbox: b.sourceMailbox || 'gmail',
        messageId: b.messageId || '',
        receivedAt: b.receivedAt || new Date().toISOString(),
        matchedInvoiceId: b.matchedInvoiceId,
        matchedAmount: b.matchedAmount,
        confidence: b.confidence || 0.5,
        status: b.status || 'Unmatched',
        suggestions: b.suggestions || [],
      }))

      // Summary computations (basic; not week-filtered here)
      const invoicesIssued = { count: invoices.length, total: invoices.reduce((s, inv) => s + inv.total, 0) }
      const receiptsReceived = { count: receipts.length, total: receipts.reduce((s, r) => s + (r.amount || 0), 0), verified: receipts.filter(r => r.status === 'Verified').length }
      const collectedVsInvoiced = { collected: receipts.reduce((s, r) => s + (r.amount || 0), 0), invoiced: invoices.reduce((s, inv) => s + inv.total, 0), percentage: 0 }
      collectedVsInvoiced.percentage = collectedVsInvoiced.invoiced > 0 ? Math.round((collectedVsInvoiced.collected / collectedVsInvoiced.invoiced) * 100) : 0
      const overdueInvoices = { count: invoices.filter(i => i.status === 'Overdue').length, total: invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.outstanding, 0) }
      const unmatchedItems = { count: receipts.filter(r => !r.matchedInvoiceId).length + bankCredits.filter(bc => bc.status === 'Unmatched').length, receipts: receipts.filter(r => !r.matchedInvoiceId).length, bankCredits: bankCredits.filter(bc => bc.status === 'Unmatched').length, emails: 0 }

      return { success: true, data: { invoicesIssued, receiptsReceived, collectedVsInvoiced, overdueInvoices, unmatchedItems } }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to load summary', data: {
        invoicesIssued: { count: 0, total: 0 },
        receiptsReceived: { count: 0, total: 0, verified: 0 },
        collectedVsInvoiced: { collected: 0, invoiced: 0, percentage: 0 },
        overdueInvoices: { count: 0, total: 0 },
        unmatchedItems: { count: 0, receipts: 0, bankCredits: 0, emails: 0 },
      } as any }
    }
  }

  // Invoices API
  async getInvoices(filters: InvoiceFilters = {}): Promise<ApiResponse<PaginatedResponse<Invoice>>> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/invoices`, { headers: { 'content-type': 'application/json' } })
      if (!res.ok) throw new Error(await res.text())
      const list: any[] = await res.json()
      let data = list as Invoice[]
      if (filters.status && filters.status.length > 0) data = data.filter(inv => filters.status!.includes(inv.status))
      if (filters.projectId) data = data.filter(inv => inv.projectId === filters.projectId)
      if (filters.phaseId) data = data.filter(inv => inv.phaseId === filters.phaseId)
      if (filters.overdueOnly) data = data.filter(inv => inv.status === 'Overdue')
      if (filters.dateRange) {
        data = data.filter(inv => {
          const d = new Date(inv.issueDate)
          return d >= new Date(filters.dateRange!.start) && d <= new Date(filters.dateRange!.end)
        })
      }
      return { success: true, data: { data, total: data.length, page: 1, limit: 100, hasMore: false } }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to load invoices', data: { data: [], total: 0, page: 1, limit: 50, hasMore: false } }
    }
  }

  async getOverdueInvoices(): Promise<ApiResponse<Invoice[]>> {
    const overdueInvoices = this.invoices.filter(inv => inv.status === 'Overdue')
    return {
      data: overdueInvoices,
      success: true
    }
  }

  async markInvoicePaid(request: MarkPaidRequest): Promise<ApiResponse<Invoice>> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/invoices/${request.invoiceId}/mark-paid`, { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      return { success: true, data: await res.json() }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to mark invoice as paid', data: {} as any }
    }
  }

  async sendInvoice(invoiceId: string, toEmail?: string): Promise<ApiResponse<{ success: boolean }>> {
    // Ensure invoice exists even if created directly in backend
    let inv = this.invoices.find(i => i.id === invoiceId)
    if (!inv) {
      try {
        const res = await this.fetchWithAuth(`${API_BASE}/invoices`, { headers: { 'content-type': 'application/json' } })
        if (res.ok) {
          const list: any[] = await res.json()
          inv = list.find((i: any) => i.id === invoiceId)
        }
      } catch {}
    }
    if (!inv) return { success: false, message: 'Invoice not found', data: { success: false } }
    if (String(inv.approvalStatus || '').toUpperCase() !== 'APPROVED') {
      return { success: false, message: 'Invoice must be approved by executive before sending.', data: { success: false } }
    }
    // Attempt to send via backend Gmail integration and surface errors
    try {
      // Recipient resolution: use provided email or infer from project
      let to = (toEmail || '').trim()
      if (!to) {
        to = 'client@example.com'
        try {
          const pres = await fetch(`${API_BASE}/projects/${inv.projectId}`, { headers: { 'content-type': 'application/json' } })
          if (pres.ok) {
            const p = await pres.json()
            to = Array.isArray(p?.memberships)
              ? (p.memberships.find((m: any) => m?.user?.email)?.user?.email || to)
              : to
          }
        } catch {}
      }
      const subject = `Invoice ${inv.invoiceNo} – ${inv.projectName} / ${inv.phaseName}`
      const text = `Dear Client,\n\nPlease find your invoice ${inv.invoiceNo} for the phase "${inv.phaseName}" under project "${inv.projectName}".\nTotal due: ${inv.currency} ${inv.total}.\n\nPaymentID: ${inv.invoiceNo}\n\nPlease reply to this email with the payment slip once paid.\n\nThank you.\n`
      const r = await fetch(`${API_BASE}/api/gmail/send`, { method: 'POST', headers: { 'content-type': 'application/json', ...this.authHeaders() }, body: JSON.stringify({ to, subject, text, template: 'invoice', invoice: { invoiceNo: inv.invoiceNo, projectName: inv.projectName, phaseName: inv.phaseName, clientName: inv.clientName || '', clientCompanyName: inv.clientCompanyName || '', clientAddress: inv.clientAddress || '', clientPhone: inv.clientPhone || '', clientDesignation: inv.clientDesignation || '', issueDate: inv.issueDate, dueDate: inv.dueDate, currency: inv.currency, subtotal: inv.subtotal, taxAmount: inv.taxAmount, vatAmount: inv.vatAmount || 0, total: inv.total, description: 'Project work' } }) })
      if (!r.ok) {
        let msg = ''
        try { msg = await r.text() } catch {}
        if (r.status === 409 && !msg) msg = 'Gmail scopes not granted. Reconnect and allow send permission.'
        return { success: false, message: msg || `Failed to send (HTTP ${r.status})`, data: { success: false } }
      }
    } catch { /* ignore */ }
    return { data: { success: true }, success: true }
  }

  async requestInvoiceApproval(invoiceId: string, reviewerId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/invoices/${invoiceId}/request-approval`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reviewerId }),
      })
      if (!res.ok) throw new Error(await res.text())
      return { success: true, data: await res.json() }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to request approval', data: { success: false } }
    }
  }

  async reviewInvoice(invoiceId: string, action: 'approve' | 'changes' | 'reject', note?: string): Promise<ApiResponse<Invoice>> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/invoices/${invoiceId}/review`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, note }),
      })
      if (!res.ok) throw new Error(await res.text())
      return { success: true, data: await res.json() }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to review invoice', data: {} as any }
    }
  }

  async getInvoiceTemplate(invoiceId: string): Promise<ApiResponse<{ html: string }>> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/invoices/${invoiceId}/template`)
      if (!res.ok) throw new Error(await res.text())
      const html = await res.text()
      return { success: true, data: { html } }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to download invoice template', data: { html: '' } }
    }
  }

  async getInvoiceTemplatePdf(invoiceId: string): Promise<ApiResponse<Blob>> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/invoices/${invoiceId}/template?format=pdf`)
      if (!res.ok) throw new Error(await res.text())
      const buffer = await res.arrayBuffer()
      if (!buffer || buffer.byteLength < 500) {
        throw new Error('Generated PDF is empty. Please try again.')
      }
      const header = new TextDecoder().decode(buffer.slice(0, 8))
      if (!header.startsWith('%PDF')) {
        const preview = new TextDecoder().decode(buffer.slice(0, 200)).replace(/\s+/g, ' ').slice(0, 160)
        throw new Error(preview || 'Invalid PDF generated. Please restart the server and try again.')
      }
      const blob = new Blob([buffer], { type: 'application/pdf' })
      return { success: true, data: blob }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to download invoice template', data: new Blob() }
    }
  }

  async ingestBankEmailsFromGmail(): Promise<ApiResponse<{ count: number }>> {
    try {
      const r = await fetch(`${API_BASE}/api/gmail/bank-credits`, { headers: { 'x-user-id': localStorage.getItem('userId') || '' } })
      if (!r.ok) throw new Error(await r.text())
      const list = await r.json()
      let added = 0
      for (const it of list) {
        if (!this.bankCredits.find(b => b.messageId === it.messageId)) {
          const credit: BankCredit = {
            id: String(it.id || `bc-${Date.now()}-${Math.random()}`),
            amount: Number(it.amount) || 0,
            currency: it.currency || 'USD',
            valueDate: it.valueDate || it.receivedAt || new Date().toISOString(),
            payerName: it.payerName || 'Unknown',
            bankRef: it.bankRef || '',
            memo: it.memo || '',
            sourceMailbox: it.sourceMailbox || 'gmail',
            messageId: it.messageId || '',
            receivedAt: it.receivedAt || new Date().toISOString(),
            status: 'Unmatched',
            confidence: 0.5,
            matchedInvoiceId: undefined,
            matchedAmount: undefined,
            suggestions: [],
          }
          // Heuristic suggestions: by amount close to outstanding
          const candidates = this.invoices.filter(inv => inv.status !== 'Paid')
          const sugg = candidates.map(inv => ({
            invoiceId: inv.id,
            reason: Math.abs(inv.outstanding - credit.amount) < 1 ? 'Exact amount match' : 'Amount proximity',
            confidence: Math.abs(inv.outstanding - credit.amount) < 1 ? 0.9 : 0.6,
          })).filter(s => s.confidence >= 0.6).slice(0,3)
          credit.suggestions = sugg
          this.bankCredits.unshift(credit)
          added++
        }
      }
      return { success: true, data: { count: added } }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to ingest Gmail bank credits', data: { count: 0 } }
    }
  }

  async ingestReceiptsFromGmail(): Promise<ApiResponse<{ count: number }>> {
    try {
      // Trigger Gmail ingestion endpoint; it also returns current parsed attachments
      const r = await fetch(`${API_BASE}/api/gmail/receipts`, { headers: { 'x-user-id': localStorage.getItem('userId') || '' } })
      if (!r.ok) throw new Error(await r.text())
      const list = await r.json()
      let added = 0

      // Ensure invoices list is populated (in case backend is the source of truth)
      try {
        if (this.invoices.length === 0) {
          const invRes = await this.fetchWithAuth(`${API_BASE}/invoices`, { headers: { 'content-type': 'application/json' } })
          if (invRes.ok) {
            const data = await invRes.json()
            if (Array.isArray(data)) this.invoices = data as any
          }
        }
      } catch {}

      for (const it of list) {
        // Skip if we already have this message-attachment combo
        if (this.paymentReceipts.find(r => r.messageId === it.messageId && r.fileKey === it.fileKey)) continue

        const receipt: PaymentReceipt = {
          id: String(it.id || `rcpt-${Date.now()}-${Math.random()}`),
          paymentRequestId: it.paymentRequestId || undefined,
          invoiceId: it.invoiceId || undefined,
          projectId: it.projectId || 'unknown',
          phaseId: it.phaseId || 'unknown',
          projectName: it.projectName || 'Unknown Project',
          phaseName: it.phaseName || 'Unknown Phase',
          source: 'email',
          fileKey: it.fileKey || undefined,
          fileName: it.fileName || undefined,
          fileType: it.fileType || undefined,
          fileSize: it.fileSize || undefined,
          amount: typeof it.amount === 'number' ? it.amount : undefined,
          paidDate: it.paidDate || undefined,
          transactionRef: it.transactionRef || undefined,
          payerName: it.payerName || undefined,
          payerEmail: it.payerEmail || undefined,
          status: 'Submitted',
          confidence: it.confidence || (it.invoiceId ? 0.9 : 0.6),
          matchedInvoiceId: it.invoiceId || undefined,
          matchedAmount: it.invoiceId && typeof it.amount === 'number' ? it.amount : undefined,
          flags: Array.isArray(it.flags) ? it.flags : [],
          senderEmail: it.senderEmail || undefined,
          messageId: it.messageId || undefined,
          gmailThreadId: it.gmailThreadId || undefined,
          receivedAt: it.receivedAt || new Date().toISOString(),
        }

        // If invoice was not provided, try to infer by invoiceNo in filename
        if (!receipt.matchedInvoiceId && receipt.fileName) {
          const m = receipt.fileName.match(/INV[-_ ]?\d{4}[-_ ]?\d{3,}/i)
          const invNo = m ? m[0].replace(/[_ ]/g, '-').toUpperCase() : null
          if (invNo) {
            const inv = this.invoices.find(i => i.invoiceNo === invNo)
            if (inv) {
              receipt.matchedInvoiceId = inv.id
              receipt.invoiceId = inv.id
              receipt.projectId = inv.projectId
              receipt.phaseId = inv.phaseId
              receipt.projectName = inv.projectName
              receipt.phaseName = inv.phaseName
              receipt.confidence = Math.max(receipt.confidence || 0.6, 0.85)
            }
          }
        }

        this.paymentReceipts.unshift(receipt)
        added++
      }

      return { success: true, data: { count: added } }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to ingest Gmail receipts', data: { count: 0 } }
    }
  }

  // Payment Receipts API
  async getReceipts(filters: ReceiptFilters = {}): Promise<ApiResponse<PaginatedResponse<PaymentReceipt>>> {
    try {
      // Try DB-backed receipts first
      let list: any[] | null = null
      let dbOk = false
      try {
        const r1 = await fetch(`${API_BASE}/api/receipts`, { headers: { 'x-user-id': localStorage.getItem('userId') || '' } })
        if (r1.ok) {
          list = await r1.json()
          dbOk = true
        }
      } catch {}

      // Fallback to live Gmail extraction if DB not available or list empty
      if (!dbOk || !Array.isArray(list) || list.length === 0) {
        const r2 = await fetch(`${API_BASE}/api/gmail/receipts`, { headers: { 'x-user-id': localStorage.getItem('userId') || '' } })
        if (!r2.ok) throw new Error(await r2.text())
        list = await r2.json()
      }

      let data: PaymentReceipt[] = (list || []).map((it: any) => ({
        id: String(it.id || it.messageId || `rcpt-${Math.random()}`),
        paymentRequestId: it.paymentRequestId,
        invoiceId: it.invoiceId,
        matchedInvoiceNo: it.matchedInvoiceNo || it.invoiceNo,
        receiptCode: it.receiptCode,
        projectId: it.projectId || 'unknown',
        phaseId: it.phaseId || 'unknown',
        projectName: it.projectName || '',
        phaseName: it.phaseName || '',
        source: 'email',
        fileKey: it.fileKey,
        fileName: it.fileName,
        fileType: it.fileType,
        fileSize: it.fileSize,
        amount: typeof it.amount === 'number' ? it.amount : undefined,
        paidDate: it.paidDate,
        transactionRef: it.transactionRef,
        payerName: it.payerName,
        payerEmail: it.payerEmail || it.senderEmail,
        status: it.status || 'Submitted',
        confidence: it.confidence,
        matchedInvoiceId: it.matchedInvoiceId,
        matchedAmount: it.matchedAmount,
        flags: it.flags || [],
        senderEmail: it.senderEmail,
        messageId: it.messageId,
        gmailThreadId: it.gmailThreadId,
        receivedAt: it.receivedAt || new Date().toISOString(),
      }))

      if (filters.status && filters.status.length > 0) data = data.filter(rec => filters.status!.includes(rec.status))
      if (filters.unmatchedOnly) data = data.filter(rec => !rec.matchedInvoiceId)
      if (filters.hasAmount) data = data.filter(rec => (rec.amount || 0) > 0)
      if (filters.projectId) data = data.filter(rec => rec.projectId === filters.projectId)
      if (filters.phaseId) data = data.filter(rec => rec.phaseId === filters.phaseId)
      if (filters.flags && filters.flags.length > 0) data = data.filter(rec => rec.flags && filters.flags!.some(flag => rec.flags!.includes(flag)))
      if (typeof filters.confidenceThreshold === 'number') data = data.filter(rec => (rec.confidence || 0) >= filters.confidenceThreshold!)

      return { success: true, data: { data, total: data.length, page: 1, limit: 100, hasMore: false } }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to load receipts', data: { data: [], total: 0, page: 1, limit: 50, hasMore: false } }
    }
  }

  async verifyReceipt(request: VerifyReceiptRequest): Promise<ApiResponse<PaymentReceipt>> {
    try {
      const res = await fetch(`${API_BASE}/api/receipts/${request.receiptId}/verify`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-user-id': localStorage.getItem('userId') || '' }, body: JSON.stringify({ reviewNote: request.reviewNote || '' }) })
      if (!res.ok) throw new Error(await res.text())
      return { success: true, data: await res.json() }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to verify receipt', data: {} as any }
    }
  }

  async rejectReceipt(request: RejectReceiptRequest): Promise<ApiResponse<PaymentReceipt>> {
    try {
      const res = await fetch(`${API_BASE}/api/receipts/${request.receiptId}/reject`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-user-id': localStorage.getItem('userId') || '' }, body: JSON.stringify({ reason: request.reason, reviewNote: request.reviewNote }) })
      if (!res.ok) throw new Error(await res.text())
      return { success: true, data: await res.json() }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to reject receipt', data: {} as any }
    }
  }

  async createMatch(request: CreateMatchRequest): Promise<ApiResponse<PaymentMatch>> {
    // Validate amount doesn't exceed remaining
    const invoice = this.invoices.find(inv => inv.id === request.invoiceId)
    if (!invoice) {
      return {
        data: {} as PaymentMatch,
        success: false,
        message: 'Invoice not found'
      }
    }

    if (request.amount > invoice.outstanding) {
      return {
        data: {} as PaymentMatch,
        success: false,
        message: 'Match amount exceeds invoice outstanding balance'
      }
    }

    // Create match
    const match: PaymentMatch = {
      id: `match-${Date.now()}`,
      invoiceId: request.invoiceId,
      receiptId: request.receiptId,
      bankCreditId: request.bankCreditId,
      amount: request.amount,
      matchedAt: new Date().toISOString(),
      matchedBy: 'current-user@company.com',
      type: request.receiptId ? 'receipt' : 'bank_credit'
    }

    this.paymentMatches.push(match)

    // Update invoice
    invoice.collected += request.amount
    invoice.outstanding -= request.amount
    if (invoice.outstanding === 0) {
      invoice.status = 'Paid'
    } else if (invoice.collected > 0) {
      invoice.status = 'PartiallyPaid'
    }
    invoice.updatedAt = new Date().toISOString()

    // Update receipt or bank credit
    if (request.receiptId) {
      const receipt = this.paymentReceipts.find(rec => rec.id === request.receiptId)
      if (receipt) {
        receipt.matchedInvoiceId = request.invoiceId
        receipt.matchedAmount = request.amount
      }
    }

    if (request.bankCreditId) {
      const bankCredit = this.bankCredits.find(bc => bc.id === request.bankCreditId)
      if (bankCredit) {
        bankCredit.matchedInvoiceId = request.invoiceId
        bankCredit.matchedAmount = request.amount
        bankCredit.status = 'Matched'
      }
    }

    return {
      data: match,
      success: true
    }
  }

  async getReceiptFile(receiptId: string): Promise<ApiResponse<{ url: string }>> {
    const receipt = this.paymentReceipts.find(rec => rec.id === receiptId)
    if (!receipt || !receipt.fileKey) {
      return {
        data: { url: '' },
        success: false,
        message: 'File not found'
      }
    }

    // Mock signed URL
    return {
      data: { url: `https://storage.example.com/${receipt.fileKey}` },
      success: true
    }
  }

  // Bank Credits API (real data from Gmail endpoint)
  async getBankCredits(filters: BankCreditFilters = {}): Promise<ApiResponse<PaginatedResponse<BankCredit>>> {
    try {
      let list: any[] | null = null
      let dbOk = false
      try {
        const r1 = await fetch(`${API_BASE}/api/bank-credits`, { headers: { 'x-user-id': localStorage.getItem('userId') || '' } })
        if (r1.ok) {
          list = await r1.json()
          dbOk = true
        }
      } catch {}

      if (!dbOk || !Array.isArray(list) || list.length === 0) {
        const r2 = await fetch(`${API_BASE}/api/gmail/bank-credits`, { headers: { 'x-user-id': localStorage.getItem('userId') || '' } })
        if (!r2.ok) throw new Error(await r2.text())
        list = await r2.json()
      }

      let data: BankCredit[] = (list || []).map((b: any) => ({
        id: String(b.id || b.messageId || `bc-${Math.random()}`),
        amount: Number(b.amount) || 0,
        currency: b.currency || 'USD',
        valueDate: b.valueDate || b.receivedAt || new Date().toISOString(),
        payerName: b.payerName,
        bankRef: b.bankRef,
        memo: b.memo,
        sourceMailbox: b.sourceMailbox || 'gmail',
        messageId: b.messageId || '',
        receivedAt: b.receivedAt || new Date().toISOString(),
        matchedInvoiceId: b.matchedInvoiceId,
        matchedAmount: b.matchedAmount,
        confidence: b.confidence || 0.5,
        status: b.status || 'Unmatched',
        suggestions: b.suggestions || [],
      }))

      if (filters.status && filters.status.length > 0) data = data.filter(bc => filters.status!.includes(bc.status))
      if (filters.unmatchedOnly) data = data.filter(bc => bc.status === 'Unmatched')
      if (filters.confidence) {
        const threshold = filters.confidence === 'high' ? 0.8 : filters.confidence === 'medium' ? 0.5 : 0
        data = data.filter(bc => (bc.confidence || 0) >= threshold)
      }
      if (filters.dateRange) {
        const start = new Date(filters.dateRange.start)
        const end = new Date(filters.dateRange.end)
        data = data.filter(bc => {
          const d = new Date(bc.valueDate)
          return d >= start && d <= end
        })
      }

      return { success: true, data: { data, total: data.length, page: 1, limit: 100, hasMore: false } }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to load bank credits', data: { data: [], total: 0, page: 1, limit: 50, hasMore: false } }
    }
  }

  async markBankCreditNotOurs(request: ArchiveRequest): Promise<ApiResponse<BankCredit>> {
    try {
      const res = await fetch(`${API_BASE}/api/bank-credits/${request.id}/not-ours`, { method: 'POST', headers: { 'x-user-id': localStorage.getItem('userId') || '' } })
      if (!res.ok) throw new Error(await res.text())
      return { success: true, data: await res.json() }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to mark bank credit', data: {} as any }
    }
  }

  async getInvoiceSuggestionsForBankCredit(creditId: string): Promise<ApiResponse<Invoice[]>> {
    await this.delay(200)
    
    const credit = this.bankCredits.find(c => c.id === creditId)
    if (!credit) {
      return { success: false, message: 'Bank credit not found', data: [] }
    }

    // Mock suggestions based on amount and payer
    const suggestions = this.invoices.filter(inv => 
      Math.abs(inv.total - credit.amount) < 100 && // Amount within $100
      inv.status !== 'Paid' && // Not already paid
      inv.status !== 'Canceled' // Not canceled
    ).slice(0, 3) // Limit to 3 suggestions

    return { success: true, data: suggestions }
  }

  async matchBankCreditToInvoice(request: { creditId: string; invoiceId: string; confirm: boolean }): Promise<ApiResponse<BankCredit>> {
    try {
      const res = await fetch(`${API_BASE}/api/bank-credits/${request.creditId}/match`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-user-id': localStorage.getItem('userId') || '' }, body: JSON.stringify({ invoiceId: request.invoiceId, confirm: request.confirm }) })
      if (!res.ok) throw new Error(await res.text())
      return { success: true, data: await res.json() }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to match bank credit', data: {} as any }
    }
  }

  async unmatchBankCredit(creditId: string): Promise<ApiResponse<BankCredit>> {
    await this.delay(200)
    
    const credit = this.bankCredits.find(c => c.id === creditId)
    if (!credit) {
      return { success: false, message: 'Bank credit not found', data: {} as BankCredit }
    }

    // Update credit
    const matchedInvoiceId = credit.matchedInvoiceId
    credit.matchedInvoiceId = undefined
    credit.matchedAmount = undefined
    credit.status = 'Unmatched'
    credit.confidence = undefined

    // Update invoice if it was matched
    if (matchedInvoiceId) {
      const invoice = this.invoices.find(i => i.id === matchedInvoiceId)
      if (invoice) {
        invoice.collected = Math.max(0, invoice.collected - credit.amount)
        invoice.outstanding = invoice.total - invoice.collected
        if (invoice.collected === 0) {
          invoice.status = 'Sent'
        } else if (invoice.collected > 0) {
          invoice.status = 'PartiallyPaid'
        }
      }
    }

    return { success: true, data: credit }
  }

  async markBankCreditForReview(creditId: string): Promise<ApiResponse<BankCredit>> {
    await this.delay(200)
    
    const credit = this.bankCredits.find(c => c.id === creditId)
    if (!credit) {
      return { success: false, message: 'Bank credit not found', data: {} as BankCredit }
    }

    credit.status = 'NeedsReview'
    
    return { success: true, data: credit }
  }

  async archiveUnmatchedEmail(request: ArchiveRequest): Promise<ApiResponse<UnmatchedEmail>> {
    await this.delay(200)
    
    const email = this.unmatchedEmails.find(e => e.id === request.id)
    if (!email) {
      return { success: false, message: 'Email not found', data: {} as UnmatchedEmail }
    }

    email.archived = true
    
    return { success: true, data: email }
  }

  async retryProcessingEmail(emailId: string): Promise<ApiResponse<UnmatchedEmail>> {
    await this.delay(200)
    
    const email = this.unmatchedEmails.find(e => e.id === emailId)
    if (!email) {
      return { success: false, message: 'Email not found', data: {} as UnmatchedEmail }
    }

    // In a real implementation, this would trigger reprocessing
    // For now, we'll just return success
    return { success: true, data: email }
  }

  async pullPaymentSlipFromEmail(receiptId: string): Promise<ApiResponse<PaymentReceipt>> {
    await this.delay(200)
    
    const receipt = this.paymentReceipts.find(r => r.id === receiptId)
    if (!receipt) {
      return { success: false, message: 'Receipt not found', data: {} as PaymentReceipt }
    }
    
    // Simulate pulling payment slip from email
    // In a real app, this would:
    // 1. Connect to email service (Gmail, Outlook, etc.)
    // 2. Search for emails from the sender
    // 3. Look for attachments matching payment slip patterns
    // 4. Download and process the attachment
    // 5. Update the receipt with the new attachment
    
    receipt.fileKey = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    receipt.fileName = `payment-slip-${receiptId}.pdf`
    receipt.fileType = 'application/pdf'
    receipt.fileSize = Math.floor(Math.random() * 500000) + 100000 // Random file size
    
    return { success: true, data: receipt }
  }

  // Missing methods that ReceiptsTable expects
  async getInvoiceSuggestions(receiptId: string): Promise<ApiResponse<Invoice[]>> {
    try {
      const res = await fetch(`${API_BASE}/api/receipts/${receiptId}/suggestions`, { headers: { 'x-user-id': localStorage.getItem('userId') || '' } })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      return { success: true, data }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to load suggestions', data: [] }
    }
  }

  async matchReceiptToInvoice(request: { receiptId: string; invoiceId: string; amount: number }): Promise<ApiResponse<PaymentMatch>> {
    try {
      const res = await fetch(`${API_BASE}/api/receipts/${request.receiptId}/match`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-user-id': localStorage.getItem('userId') || '' }, body: JSON.stringify({ invoiceId: request.invoiceId, amount: request.amount }) })
      if (!res.ok) throw new Error(await res.text())
      const match: PaymentMatch = { id: `match-${Date.now()}`, invoiceId: request.invoiceId, receiptId: request.receiptId, amount: request.amount, matchedAt: new Date().toISOString(), matchedBy: 'current-user@company.com', type: 'receipt' }
      return { success: true, data: match }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to match receipt', data: {} as any }
    }
  }

  async unmatchReceipt(receiptId: string): Promise<ApiResponse<PaymentReceipt>> {
    try {
      const res = await fetch(`${API_BASE}/api/receipts/${receiptId}/unmatch`, { method: 'POST', headers: { 'x-user-id': localStorage.getItem('userId') || '' } })
      if (!res.ok) throw new Error(await res.text())
      return { success: true, data: await res.json() }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to unmatch receipt', data: {} as any }
    }
  }

  async reextractReceiptAmount(receiptId: string): Promise<ApiResponse<PaymentReceipt>> {
    try {
      const res = await fetch(`${API_BASE}/api/receipts/${receiptId}/reextract`, { method: 'POST', headers: { 'x-user-id': localStorage.getItem('userId') || '' } })
      if (!res.ok) throw new Error(await res.text())
      return { success: true, data: await res.json() }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to re-extract amount', data: {} as any }
    }
  }

  // Unmatched Emails API
  async getUnmatchedEmails(filters: ExceptionFilters = {}): Promise<ApiResponse<PaginatedResponse<UnmatchedEmail>>> {
    let filteredEmails = this.unmatchedEmails.filter(email => !email.archived)

    if (filters.type && filters.type.length > 0) {
      filteredEmails = filteredEmails.filter(email => filters.type!.includes(email.reason))
    }

    if (filters.dateRange) {
      filteredEmails = filteredEmails.filter(email => {
        const receivedAt = new Date(email.receivedAt)
        return receivedAt >= new Date(filters.dateRange!.start) && 
               receivedAt <= new Date(filters.dateRange!.end)
      })
    }

    return {
      data: {
        data: filteredEmails,
        total: filteredEmails.length,
        page: 1,
        limit: 50,
        hasMore: false
      },
      success: true
    }
  }

  async assignPaymentId(request: AssignPaymentIdRequest): Promise<ApiResponse<PaymentReceipt>> {
    const email = this.unmatchedEmails.find(e => e.id === request.emailId)
    if (!email) {
      return {
        data: {} as PaymentReceipt,
        success: false,
        message: 'Email not found'
      }
    }

    // Convert to PaymentReceipt
    const receipt: PaymentReceipt = {
      id: `receipt-${Date.now()}`,
      paymentRequestId: request.paymentId,
      projectId: request.projectId || 'unknown',
      phaseId: request.phaseId || 'unknown',
      projectName: 'Unknown Project',
      phaseName: 'Unknown Phase',
      source: 'email',
      senderEmail: email.senderEmail,
      messageId: email.messageId,
      receivedAt: email.receivedAt,
      status: 'Submitted',
      confidence: 0.50
    }

    this.paymentReceipts.push(receipt)
    email.archived = true

    return {
      data: receipt,
      success: true
    }
  }


  async createInvoice(invoice: Invoice, reviewerId?: string): Promise<ApiResponse<Invoice>> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/invoices`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        invoiceNo: invoice.invoiceNo,
        projectId: invoice.projectId,
        phaseId: invoice.phaseId,
        reviewerId: reviewerId || undefined,
        clientCompanyName: invoice.clientCompanyName || '',
        clientAddress: invoice.clientAddress || '',
        clientPhone: invoice.clientPhone || '',
        clientName: invoice.clientName || '',
        clientDesignation: invoice.clientDesignation || '',
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        vatAmount: invoice.vatAmount,
        total: invoice.total,
        notes: invoice.notes || '',
      }) })
      if (!res.ok) {
        const raw = await res.text()
        try {
          const parsed = JSON.parse(raw)
          throw new Error(parsed?.error || raw)
        } catch {
          throw new Error(raw)
        }
      }
      return { success: true, data: await res.json() }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to create invoice', data: {} as any }
    }
  }

  async updateInvoice(invoiceId: string, updatedInvoice: Invoice): Promise<ApiResponse<Invoice>> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/invoices/${invoiceId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        projectId: updatedInvoice.projectId,
        phaseId: updatedInvoice.phaseId,
        clientCompanyName: updatedInvoice.clientCompanyName || '',
        clientAddress: updatedInvoice.clientAddress || '',
        clientPhone: updatedInvoice.clientPhone || '',
        clientName: updatedInvoice.clientName || '',
        clientDesignation: updatedInvoice.clientDesignation || '',
        issueDate: updatedInvoice.issueDate,
        dueDate: updatedInvoice.dueDate,
        currency: updatedInvoice.currency,
        subtotal: updatedInvoice.subtotal,
        taxAmount: updatedInvoice.taxAmount,
        vatAmount: updatedInvoice.vatAmount,
        total: updatedInvoice.total,
        notes: updatedInvoice.notes || '',
      }) })
      if (!res.ok) {
        const raw = await res.text()
        try {
          const parsed = JSON.parse(raw)
          throw new Error(parsed?.error || raw)
        } catch {
          throw new Error(raw)
        }
      }
      return { success: true, data: await res.json() }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to update invoice', data: {} as any }
    }
  }

  async deleteInvoice(invoiceId: string): Promise<ApiResponse<void>> {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/invoices/${invoiceId}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error(await res.text())
      return { success: true, data: undefined }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to delete invoice', data: undefined }
    }
  }

  // Export API
  async exportCashIn(week: string): Promise<ApiResponse<{ url: string }>> {
    // Mock export URL
    return {
      data: { url: `https://exports.example.com/cashin-${week}.csv` },
      success: true
    }
  }
}

// Singleton instance
export const slipsInvoicesAPI = new SlipsInvoicesMockAPI()
