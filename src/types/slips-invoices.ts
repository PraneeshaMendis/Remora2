// Data models for Slips & Invoices functionality

export interface Invoice {
  id: string
  invoiceNo: string
  projectId: string
  phaseId: string
  projectName: string
  phaseName: string
  issueDate: string
  dueDate: string
  currency: string
  subtotal: number
  taxAmount: number
  total: number
  collected: number
  outstanding: number
  status: 'Draft' | 'Sent' | 'PartiallyPaid' | 'Paid' | 'Overdue' | 'Canceled'
  pdfKey?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface PaymentReceipt {
  id: string
  paymentRequestId?: string
  invoiceId?: string
  projectId: string
  phaseId: string
  projectName: string
  phaseName: string
  source: 'email' | 'bank_email' | 'attestation'
  fileKey?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  amount?: number
  paidDate?: string
  transactionRef?: string
  payerName?: string
  payerEmail?: string
  status: 'Submitted' | 'Verified' | 'Rejected'
  confidence?: number
  matchedInvoiceId?: string
  matchedAmount?: number
  flags?: string[]
  senderEmail?: string
  messageId?: string
  gmailThreadId?: string
  receivedAt: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
}

export interface BankCredit {
  id: string
  amount: number
  currency: string
  valueDate: string
  payerName?: string
  bankRef?: string
  memo?: string
  sourceMailbox: string
  messageId: string
  receivedAt: string
  matchedInvoiceId?: string
  matchedAmount?: number
  confidence?: number
  status: 'Unmatched' | 'Matched' | 'NeedsReview'
  suggestions?: Array<{
    invoiceId: string
    reason: string
    confidence: number
  }>
}

export interface UnmatchedEmail {
  id: string
  senderEmail: string
  subject: string
  snippet?: string
  receivedAt: string
  reason: 'paymentId_missing' | 'paymentId_unknown' | 'no_valid_attachment' | 'oversize' | 'disallowed_type' | 'av_failed'
  messageId: string
  archived: boolean
}

export interface CashSummary {
  invoicesIssued: {
    count: number
    total: number
  }
  receiptsReceived: {
    count: number
    total: number
    verified: number
  }
  collectedVsInvoiced: {
    percentage: number
    collected: number
    invoiced: number
  }
  overdueInvoices: {
    count: number
    total: number
  }
  unmatchedItems: {
    count: number
    receipts: number
    bankCredits: number
    emails: number
  }
}

export interface PaymentMatch {
  id: string
  invoiceId: string
  receiptId?: string
  bankCreditId?: string
  amount: number
  matchedAt: string
  matchedBy: string
  type: 'receipt' | 'bank_credit'
}

export interface InvoiceLine {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface ActivityLog {
  id: string
  type: 'created' | 'sent' | 'paid' | 'matched' | 'verified' | 'rejected' | 'overdue'
  description: string
  timestamp: string
  user: string
  metadata?: Record<string, any>
}

// Filter and sort interfaces
export interface InvoiceFilters {
  status?: string[]
  projectId?: string
  phaseId?: string
  overdueOnly?: boolean
  dateRange?: {
    start: string
    end: string
  }
}

export interface ReceiptFilters {
  status?: string[]
  unmatchedOnly?: boolean
  hasAmount?: boolean
  projectId?: string
  phaseId?: string
  flags?: string[]
}

export interface BankCreditFilters {
  status?: string[]
  sourceMailbox?: string[]
  confidence?: string
  confidenceThreshold?: number
  dateRange?: {
    start: string
    end: string
  }
  projectId?: string
  phaseId?: string
  unmatchedOnly?: boolean
}

export interface ExceptionFilters {
  type?: string[]
  projectId?: string
  phaseId?: string
  dateRange?: {
    start: string
    end: string
  }
}

// API Response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Action request types
export interface MarkPaidRequest {
  invoiceId: string
  reason?: string
  confirm?: boolean
}

export interface VerifyReceiptRequest {
  receiptId: string
  reviewNote?: string
}

export interface RejectReceiptRequest {
  receiptId: string
  reason: string
  reviewNote?: string
}

export interface CreateMatchRequest {
  invoiceId: string
  receiptId?: string
  bankCreditId?: string
  amount: number
}

export interface AssignPaymentIdRequest {
  emailId: string
  paymentId?: string
  projectId?: string
  phaseId?: string
}

export interface ArchiveRequest {
  id: string
  reason: string
}
