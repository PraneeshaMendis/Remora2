-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BankCreditStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "paymentRequestId" TEXT,
    "invoiceId" TEXT,
    "projectId" TEXT,
    "phaseId" TEXT,
    "source" TEXT NOT NULL,
    "fileKey" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "amount" DOUBLE PRECISION,
    "paidDate" TIMESTAMP(3),
    "transactionRef" TEXT,
    "payerName" TEXT,
    "payerEmail" TEXT,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'SUBMITTED',
    "confidence" DOUBLE PRECISION,
    "flags" TEXT[],
    "senderEmail" TEXT,
    "messageId" TEXT,
    "gmailThreadId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankCredit" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "valueDate" TIMESTAMP(3) NOT NULL,
    "payerName" TEXT,
    "bankRef" TEXT,
    "memo" TEXT,
    "sourceMailbox" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "matchedInvoiceId" TEXT,
    "matchedAmount" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "status" "BankCreditStatus" NOT NULL DEFAULT 'UNMATCHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMatch" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "receiptId" TEXT,
    "bankCreditId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedBy" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "PaymentMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentReceipt_invoiceId_idx" ON "PaymentReceipt"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_projectId_idx" ON "PaymentReceipt"("projectId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_phaseId_idx" ON "PaymentReceipt"("phaseId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_receivedAt_idx" ON "PaymentReceipt"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_messageId_fileName_key" ON "PaymentReceipt"("messageId", "fileName");

-- CreateIndex
CREATE UNIQUE INDEX "BankCredit_messageId_key" ON "BankCredit"("messageId");

-- CreateIndex
CREATE INDEX "BankCredit_matchedInvoiceId_idx" ON "BankCredit"("matchedInvoiceId");

-- CreateIndex
CREATE INDEX "BankCredit_receivedAt_idx" ON "BankCredit"("receivedAt");

-- CreateIndex
CREATE INDEX "PaymentMatch_invoiceId_idx" ON "PaymentMatch"("invoiceId");

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankCredit" ADD CONSTRAINT "BankCredit_matchedInvoiceId_fkey" FOREIGN KEY ("matchedInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMatch" ADD CONSTRAINT "PaymentMatch_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMatch" ADD CONSTRAINT "PaymentMatch_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PaymentReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMatch" ADD CONSTRAINT "PaymentMatch_bankCreditId_fkey" FOREIGN KEY ("bankCreditId") REFERENCES "BankCredit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
