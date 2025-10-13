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
        fileKey: 'receipts/receipt-001.pdf',
        fileName: 'payment_slip_001.pdf',
        fileType: 'pdf',
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
        fileKey: 'receipts/receipt-002.pdf',
        fileName: 'payment_confirmation.pdf',
        fileType: 'pdf',
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
        fileKey: 'receipts/receipt-003.pdf',
        fileName: 'payment_slip_003.pdf',
        fileType: 'pdf',
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
    // Mock implementation - in real app, this would filter by week
    const invoicesThisWeek = this.invoices.filter(inv => 
      new Date(inv.issueDate) >= new Date('2025-01-15') && 
      new Date(inv.issueDate) <= new Date('2025-01-21')
    )
    
    const receiptsThisWeek = this.paymentReceipts.filter(rec =>
      new Date(rec.receivedAt) >= new Date('2025-01-15') &&
      new Date(rec.receivedAt) <= new Date('2025-01-21')
    )

    const summary: CashSummary = {
      invoicesIssued: {
        count: invoicesThisWeek.length,
        total: invoicesThisWeek.reduce((sum, inv) => sum + inv.total, 0)
      },
      receiptsReceived: {
        count: receiptsThisWeek.length,
        total: receiptsThisWeek.reduce((sum, rec) => sum + (rec.amount || 0), 0),
        verified: receiptsThisWeek.filter(rec => rec.status === 'Verified').length
      },
      collectedVsInvoiced: {
        percentage: 0, // Will be calculated
        collected: receiptsThisWeek.reduce((sum, rec) => sum + (rec.amount || 0), 0),
        invoiced: invoicesThisWeek.reduce((sum, inv) => sum + inv.total, 0)
      },
      overdueInvoices: {
        count: this.invoices.filter(inv => inv.status === 'Overdue').length,
        total: this.invoices.filter(inv => inv.status === 'Overdue').reduce((sum, inv) => sum + inv.outstanding, 0)
      },
      unmatchedItems: {
        count: this.paymentReceipts.filter(rec => !rec.matchedInvoiceId).length + 
               this.bankCredits.filter(bc => bc.status === 'Unmatched').length +
               this.unmatchedEmails.filter(email => !email.archived).length,
        receipts: this.paymentReceipts.filter(rec => !rec.matchedInvoiceId).length,
        bankCredits: this.bankCredits.filter(bc => bc.status === 'Unmatched').length,
        emails: this.unmatchedEmails.filter(email => !email.archived).length
      }
    }

    // Calculate percentage
    if (summary.collectedVsInvoiced.invoiced > 0) {
      summary.collectedVsInvoiced.percentage = Math.round(
        (summary.collectedVsInvoiced.collected / summary.collectedVsInvoiced.invoiced) * 100
      )
    }

    return {
      data: summary,
      success: true
    }
  }

  // Invoices API
  async getInvoices(filters: InvoiceFilters = {}): Promise<ApiResponse<PaginatedResponse<Invoice>>> {
    let filteredInvoices = [...this.invoices]

    if (filters.status && filters.status.length > 0) {
      filteredInvoices = filteredInvoices.filter(inv => filters.status!.includes(inv.status))
    }

    if (filters.projectId) {
      filteredInvoices = filteredInvoices.filter(inv => inv.projectId === filters.projectId)
    }

    if (filters.phaseId) {
      filteredInvoices = filteredInvoices.filter(inv => inv.phaseId === filters.phaseId)
    }

    if (filters.overdueOnly) {
      filteredInvoices = filteredInvoices.filter(inv => inv.status === 'Overdue')
    }

    if (filters.dateRange) {
      filteredInvoices = filteredInvoices.filter(inv => {
        const issueDate = new Date(inv.issueDate)
        return issueDate >= new Date(filters.dateRange!.start) && 
               issueDate <= new Date(filters.dateRange!.end)
      })
    }

    return {
      data: {
        data: filteredInvoices,
        total: filteredInvoices.length,
        page: 1,
        limit: 50,
        hasMore: false
      },
      success: true
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
    const invoice = this.invoices.find(inv => inv.id === request.invoiceId)
    if (!invoice) {
      return {
        data: {} as Invoice,
        success: false,
        message: 'Invoice not found'
      }
    }

    if (invoice.outstanding > 0 && !request.confirm) {
      return {
        data: {} as Invoice,
        success: false,
        message: 'Confirmation required for invoices with outstanding balance'
      }
    }

    invoice.status = 'Paid'
    invoice.collected = invoice.total
    invoice.outstanding = 0
    invoice.updatedAt = new Date().toISOString()

    return {
      data: invoice,
      success: true
    }
  }

  async sendInvoice(invoiceId: string): Promise<ApiResponse<{ success: boolean }>> {
    // Mock implementation
    console.log(`Sending invoice ${invoiceId}`)
    return {
      data: { success: true },
      success: true
    }
  }

  // Payment Receipts API
  async getReceipts(filters: ReceiptFilters = {}): Promise<ApiResponse<PaginatedResponse<PaymentReceipt>>> {
    let filteredReceipts = [...this.paymentReceipts]

    if (filters.status && filters.status.length > 0) {
      filteredReceipts = filteredReceipts.filter(rec => filters.status!.includes(rec.status))
    }

    if (filters.unmatchedOnly) {
      filteredReceipts = filteredReceipts.filter(rec => !rec.matchedInvoiceId)
    }

    if (filters.hasAmount) {
      filteredReceipts = filteredReceipts.filter(rec => rec.amount && rec.amount > 0)
    }

    if (filters.projectId) {
      filteredReceipts = filteredReceipts.filter(rec => rec.projectId === filters.projectId)
    }

    if (filters.phaseId) {
      filteredReceipts = filteredReceipts.filter(rec => rec.phaseId === filters.phaseId)
    }

    if (filters.flags && filters.flags.length > 0) {
      filteredReceipts = filteredReceipts.filter(rec => 
        rec.flags && filters.flags!.some(flag => rec.flags!.includes(flag))
      )
    }

    return {
      data: {
        data: filteredReceipts,
        total: filteredReceipts.length,
        page: 1,
        limit: 50,
        hasMore: false
      },
      success: true
    }
  }

  async verifyReceipt(request: VerifyReceiptRequest): Promise<ApiResponse<PaymentReceipt>> {
    const receipt = this.paymentReceipts.find(rec => rec.id === request.receiptId)
    if (!receipt) {
      return {
        data: {} as PaymentReceipt,
        success: false,
        message: 'Receipt not found'
      }
    }

    receipt.status = 'Verified'
    receipt.reviewedBy = 'current-user@company.com'
    receipt.reviewedAt = new Date().toISOString()
    if (request.reviewNote) {
      receipt.reviewNote = request.reviewNote
    }

    return {
      data: receipt,
      success: true
    }
  }

  async rejectReceipt(request: RejectReceiptRequest): Promise<ApiResponse<PaymentReceipt>> {
    const receipt = this.paymentReceipts.find(rec => rec.id === request.receiptId)
    if (!receipt) {
      return {
        data: {} as PaymentReceipt,
        success: false,
        message: 'Receipt not found'
      }
    }

    receipt.status = 'Rejected'
    receipt.reviewedBy = 'current-user@company.com'
    receipt.reviewedAt = new Date().toISOString()
    receipt.reviewNote = request.reviewNote || request.reason

    return {
      data: receipt,
      success: true
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

  // Bank Credits API
  async getBankCredits(filters: BankCreditFilters = {}): Promise<ApiResponse<PaginatedResponse<BankCredit>>> {
    let filteredCredits = [...this.bankCredits]

    if (filters.status && filters.status.length > 0) {
      filteredCredits = filteredCredits.filter(bc => filters.status!.includes(bc.status))
    }

    if (filters.unmatchedOnly) {
      filteredCredits = filteredCredits.filter(bc => bc.status === 'Unmatched')
    }

    if (filters.confidence) {
      const threshold = filters.confidence === 'high' ? 0.8 : filters.confidence === 'medium' ? 0.5 : 0
      filteredCredits = filteredCredits.filter(bc => (bc.confidence || 0) >= threshold)
    }

    if (filters.dateRange) {
      filteredCredits = filteredCredits.filter(bc => {
        const valueDate = new Date(bc.valueDate)
        return valueDate >= new Date(filters.dateRange!.start) && 
               valueDate <= new Date(filters.dateRange!.end)
      })
    }

    return {
      data: {
        data: filteredCredits,
        total: filteredCredits.length,
        page: 1,
        limit: 50,
        hasMore: false
      },
      success: true
    }
  }

  async markBankCreditNotOurs(request: ArchiveRequest): Promise<ApiResponse<BankCredit>> {
    const bankCredit = this.bankCredits.find(bc => bc.id === request.id)
    if (!bankCredit) {
      return {
        data: {} as BankCredit,
        success: false,
        message: 'Bank credit not found'
      }
    }

    bankCredit.status = 'Matched' // Mark as processed
    // In real implementation, this would archive the item

    return {
      data: bankCredit,
      success: true
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
    await this.delay(200)
    
    const credit = this.bankCredits.find(c => c.id === request.creditId)
    const invoice = this.invoices.find(i => i.id === request.invoiceId)
    
    if (!credit) {
      return { success: false, message: 'Bank credit not found', data: {} as BankCredit }
    }
    
    if (!invoice) {
      return { success: false, message: 'Invoice not found', data: {} as BankCredit }
    }

    // Update credit with match
    credit.matchedInvoiceId = request.invoiceId
    credit.matchedAmount = credit.amount
    credit.status = 'Matched'
    credit.confidence = 0.95

    // Update invoice with payment
    invoice.collected += credit.amount
    invoice.outstanding = Math.max(0, invoice.total - invoice.collected)
    if (invoice.outstanding === 0) {
      invoice.status = 'Paid'
    } else if (invoice.collected > 0) {
      invoice.status = 'PartiallyPaid'
    }

    return { success: true, data: credit }
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
    
    receipt.fileKey = `receipts/payment-slip-${receiptId}-${Date.now()}.pdf`
    receipt.fileName = `payment-slip-${receiptId}.pdf`
    receipt.fileType = 'application/pdf'
    receipt.fileSize = Math.floor(Math.random() * 500000) + 100000 // Random file size
    
    return { success: true, data: receipt }
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


  async createInvoice(invoice: Invoice): Promise<ApiResponse<Invoice>> {
    await this.delay(200)
    
    // Add the new invoice to the list
    this.invoices.push(invoice)
    
    return { success: true, data: invoice }
  }

  async updateInvoice(invoiceId: string, updatedInvoice: Invoice): Promise<ApiResponse<Invoice>> {
    await this.delay(200)
    
    const index = this.invoices.findIndex(inv => inv.id === invoiceId)
    if (index === -1) {
      return { success: false, message: 'Invoice not found', data: {} as Invoice }
    }
    
    // Update the invoice
    this.invoices[index] = updatedInvoice
    
    return { success: true, data: updatedInvoice }
  }

  async deleteInvoice(invoiceId: string): Promise<ApiResponse<void>> {
    await this.delay(200)
    
    const index = this.invoices.findIndex(inv => inv.id === invoiceId)
    if (index === -1) {
      return { success: false, message: 'Invoice not found', data: undefined }
    }
    
    // Remove the invoice
    this.invoices.splice(index, 1)
    
    return { success: true, data: undefined }
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
