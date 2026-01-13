// Slip amount extraction utilities
// Uses pdf-parse for PDFs and tesseract.js for images
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdfParse from 'pdf-parse'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Tesseract from 'tesseract.js'

function findAmountFromText(text: string): number | undefined {
  const raw = String(text || '')
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  // Strict: find "Amount" followed by a number (optionally with currency)
  const amountLineRe = /amount\s*[:\-]?\s*(?:\(\s*(?:LKR|Rs\.?|USD|GBP|EUR|AUD|CAD)\s*\)\s*|(?:LKR|Rs\.?|USD|GBP|EUR|AUD|CAD)\s*)?([\d,]+(?:\.\d{1,2})?)/i

  // 1) Exact line match
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    const m = ln.match(amountLineRe)
    if (m && m[1]) {
      const val = Number(m[1].replace(/,/g, ''))
      if (!Number.isNaN(val)) return val
    }
  }

  // 2) Two-line context (currency/number might wrap)
  for (let i = 0; i < lines.length; i++) {
    const ctx = `${lines[i]} ${lines[i + 1] || ''}`
    const m = ctx.match(amountLineRe)
    if (m && m[1]) {
      const val = Number(m[1].replace(/,/g, ''))
      if (!Number.isNaN(val)) return val
    }
  }

  // 3) Global fallback: first "Amount:" occurrence in the whole text
  const g = raw.match(amountLineRe)
  if (g && g[1]) {
    const val = Number(g[1].replace(/,/g, ''))
    if (!Number.isNaN(val)) return val
  }

  return undefined
}

export async function extractAmountFromPdf(buffer: Buffer): Promise<number | undefined> {
  try {
    const parsed = await pdfParse(buffer)
    return findAmountFromText(String(parsed?.text || ''))
  } catch {
    return undefined
  }
}

export async function extractAmountFromImage(buffer: Buffer): Promise<number | undefined> {
  try {
    const { data } = await Tesseract.recognize(buffer, 'eng', { logger: () => {} })
    return findAmountFromText(String(data?.text || ''))
  } catch {
    return undefined
  }
}

export async function extractAmount(buffer: Buffer, mimeType: string): Promise<number | undefined> {
  if (/^application\/pdf/i.test(mimeType)) return extractAmountFromPdf(buffer)
  if (/^image\//i.test(mimeType)) return extractAmountFromImage(buffer)
  return undefined
}
