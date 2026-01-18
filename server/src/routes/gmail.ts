import { Router, Request, Response } from 'express'
import axios from 'axios'
// PDF text extractor (no official types)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { extractAmount } from '../utils/slip-extract.ts'
import { prisma } from '../prisma.ts'

const db: any = prisma
const router = Router()

function baseUrl(req: Request) {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol
  const host = req.get('host')
  return `${proto}://${host}`
}

function clientBaseUrl(req: Request) {
  const envBase = process.env.FRONTEND_BASE_URL || process.env.APP_BASE_URL
  if (envBase) return String(envBase).replace(/\/+$/, '')
  const origin = req.get('origin')
  if (origin) return origin.replace(/\/+$/, '')
  // Fallback to typical dev port for Vite
  const api = baseUrl(req)
  try {
    const u = new URL(api)
    return `${u.protocol}//${u.hostname}:5173`
  } catch {
    return 'http://localhost:5173'
  }
}

async function resolveUserId(req: Request): Promise<string | null> {
  const userId = (req as any).userId || null
  if (!userId) return null
  const user = await prisma.user.findUnique({ where: { id: String(userId) } })
  return user ? user.id : null
}

async function ensureGoogleToken(account: any, clientId: string, clientSecret: string) {
  if (!account?.refreshToken) return account
  const now = new Date()
  if (account.expiresAt && new Date(account.expiresAt) > new Date(now.getTime() + 60_000)) return account
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: account.refreshToken,
  })
  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  const { access_token, expires_in } = tokenRes.data || {}
  const expiresAt = expires_in ? new Date(Date.now() + Number(expires_in) * 1000) : null
  const updated = await prisma.calendarAccount.update({ where: { id: account.id }, data: { accessToken: access_token, expiresAt } })
  return updated
}

// Begin OAuth session: return a redirect URL
router.post('/google/session', async (req: Request, res: Response) => {
  const userId = await resolveUserId(req)
  if (!userId) return res.status(401).json({ error: 'Login required' })
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GMAIL_REDIRECT_URI || `${baseUrl(req)}/api/gmail/google/callback`
  if (!clientId) return res.status(500).json({ error: 'Missing GOOGLE_CLIENT_ID' })
  const scope = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
  ].join(' ')
  const state = Buffer.from(JSON.stringify({ userId, next: '/slips-invoices' }), 'utf8').toString('base64url')
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scope)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  res.json({ redirectUrl: url.toString() })
})

// OAuth callback
router.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string
  const stateRaw = (req.query.state as string) || ''
  let state: any = {}
  try { state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8')) } catch {}
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GMAIL_REDIRECT_URI || `${baseUrl(req)}/api/gmail/google/callback`
  if (!clientId || !clientSecret) return res.status(500).send('Missing Google client credentials')
  try {
    const userId = state?.userId || (await resolveUserId(req))
    if (!userId) return res.status(401).send('No user context; please log in and retry')
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    const { access_token, refresh_token, expires_in, id_token, scope } = tokenRes.data || {}

    // Extract email
    let email = ''
    if (id_token) {
      try {
        const payload = JSON.parse(Buffer.from(String(id_token).split('.')[1], 'base64').toString('utf8'))
        email = String(payload?.email || '')
      } catch {}
    }
    if (!email && access_token) {
      try {
        const uinfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${access_token}` } })
        email = String(uinfo.data?.email || '')
      } catch {}
    }

    const expiresAt = expires_in ? new Date(Date.now() + Number(expires_in) * 1000) : null
    // Upsert into CalendarAccount as provider GOOGLE; reuse same table
    await prisma.calendarAccount.upsert({
      where: { userId_provider_email: { userId, provider: 'GOOGLE' as any, email: email || 'unknown' } as any },
      update: { accessToken: access_token, refreshToken: refresh_token || '', expiresAt: expiresAt as any, scope },
      create: { id: undefined as any, userId, provider: 'GOOGLE' as any, email: email || 'unknown', accessToken: access_token, refreshToken: refresh_token || '', expiresAt: expiresAt as any, scope },
    })
    const clientBase = clientBaseUrl(req)
    const nextPath = state?.next || '/slips-invoices'
    res.redirect(`${clientBase}${nextPath}`)
  } catch (e: any) {
    res.status(400).send(e?.response?.data || e?.message || 'Google OAuth failed')
  }
})

// Connection status
router.get('/status', async (req: Request, res: Response) => {
  const userId = await resolveUserId(req)
  if (!userId) return res.json({ connected: false })
  const acc = await prisma.calendarAccount.findFirst({ where: { userId, provider: 'GOOGLE' as any } })
  res.json({ connected: !!acc, email: acc?.email || null, scope: acc?.scope || null })
})

// Send an invoice email via Gmail
router.post('/send', async (req: Request, res: Response) => {
  const userId = await resolveUserId(req)
  if (!userId) return res.status(401).json({ error: 'Login required' })
  const { to, subject, html, text, template, invoice } = req.body || {}
  if (!to || !subject || (!html && !text)) return res.status(400).json({ error: 'Missing to/subject/body' })
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return res.status(500).json({ error: 'Missing Google client credentials' })
  const acc = await prisma.calendarAccount.findFirst({ where: { userId, provider: 'GOOGLE' as any } })
  if (!acc) return res.status(400).json({ error: 'Google not connected' })
  const scope = String(acc.scope || '')
  if (!/gmail\.send/.test(scope)) {
    return res.status(409).json({ error: 'Gmail send scope not granted. Please connect Gmail.', scope })
  }
  try {
    const tokenAcc = await ensureGoogleToken(acc, clientId, clientSecret)

    function invoiceHtml(i: any): string {
      const invNo = String(i?.invoiceNo || '')
      const project = String(i?.projectName || '')
      const phase = String(i?.phaseName || '')
      const clientName = String(i?.clientName || '')
      const clientCompanyName = String(i?.clientCompanyName || '')
      const clientDesignation = String(i?.clientDesignation || '')
      const clientPhone = String(i?.clientPhone || '')
      const clientAddress = String(i?.clientAddress || '')
      const issueDate = i?.issueDate ? new Date(i.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''
      const dueDate = i?.dueDate ? new Date(i.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''
      const currency = String(i?.currency || 'USD')
      const totalNum = Number(i?.total || 0)
      const totalFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(totalNum)
      const desc = String(i?.description || 'Project work')
      return `<!doctype html><html><body style="margin:0;background:#0b1220;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:16px;background:#0b1220;">
          <tr><td align="center">
            <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="max-width:680px;background:#111827;border-radius:14px;overflow:hidden;border:1px solid #1f2937;">
              <tr>
                <td style="background:#0ea5e9;color:#fff;padding:22px 24px;font-size:22px;font-weight:800;letter-spacing:.3px;">
                  Invoice ${invNo}
                </td>
              </tr>
              <tr>
                <td style="padding:22px 24px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1f2937;border-radius:12px;padding:18px;">
                    <tr><td style="color:#93c5fd;font-weight:700;padding-bottom:4px;">Project:</td><td style="text-align:right;color:#e5e7eb;">${project}</td></tr>
                    <tr><td style="color:#93c5fd;font-weight:700;padding:6px 0 4px;">Phase:</td><td style="text-align:right;color:#e5e7eb;">${phase}</td></tr>
                    ${clientCompanyName ? `<tr><td style=\"color:#93c5fd;font-weight:700;padding:6px 0 4px;\">Company:</td><td style=\"text-align:right;color:#e5e7eb;\">${clientCompanyName}</td></tr>` : ''}
                    ${clientName ? `<tr><td style=\"color:#93c5fd;font-weight:700;padding:6px 0 4px;\">Client:</td><td style=\"text-align:right;color:#e5e7eb;\">${clientName}${clientDesignation ? ` (${clientDesignation})` : ''}</td></tr>` : ''}
                    ${clientPhone ? `<tr><td style=\"color:#93c5fd;font-weight:700;padding:6px 0 4px;\">Phone:</td><td style=\"text-align:right;color:#e5e7eb;\">${clientPhone}</td></tr>` : ''}
                    ${clientAddress ? `<tr><td style=\"color:#93c5fd;font-weight:700;padding:6px 0 4px;\">Address:</td><td style=\"text-align:right;color:#e5e7eb;\">${clientAddress}</td></tr>` : ''}
                    ${issueDate ? `<tr><td style=\"color:#93c5fd;font-weight:700;padding:6px 0 4px;\">Issue Date:</td><td style=\"text-align:right;color:#e5e7eb;\">${issueDate}</td></tr>` : ''}
                    ${dueDate ? `<tr><td style=\"color:#93c5fd;font-weight:700;padding:6px 0 4px;\">Due Date:</td><td style=\"text-align:right;color:#e5e7eb;\">${dueDate}</td></tr>` : ''}
                  </table>

                  <h3 style="margin:22px 0 10px 0;font-size:18px;color:#e5e7eb;">Invoice Details</h3>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #374151;border-radius:8px;overflow:hidden;">
                    <tr>
                      <th align="left" style="background:#111827;color:#e5e7eb;padding:10px 12px;border-right:1px solid #374151;">Description</th>
                      <th align="right" style="background:#111827;color:#e5e7eb;padding:10px 12px;">Amount</th>
                    </tr>
                    <tr>
                      <td style="padding:10px 12px;border-top:1px solid #374151;border-right:1px solid #374151;">${desc}</td>
                      <td align="right" style="padding:10px 12px;border-top:1px solid #374151;">${totalFmt}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 12px;border-top:1px solid #374151;background:#0b1220;font-weight:700;">Total</td>
                      <td align="right" style="padding:10px 12px;border-top:1px solid #374151;background:#0b1220;font-weight:700;">${totalFmt}</td>
                    </tr>
                  </table>

                  <div style="margin-top:18px;border-left:4px solid #0ea5e9;background:#0f172a;padding:14px 16px;border-radius:8px;">
                    <div style="font-weight:800;color:#e5e7eb;margin-bottom:6px;">Payment Instructions:</div>
                    <div style="font-size:14px;color:#e5e7eb;line-height:20px;">Please reply to this email with your payment receipt or bank transfer confirmation.</div>
                    <div style="font-size:14px;color:#e5e7eb;line-height:20px;margin-top:6px;">Include the invoice number (${invNo}) in your payment reference.</div>
                  </div>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body></html>`
    }

    const htmlOut = (html && String(html).trim().length > 0)
      ? String(html)
      : (String(template || '').toLowerCase() === 'invoice' && invoice ? invoiceHtml(invoice) : (() => {
          const safeText = String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
          return `<!doctype html><html><body style="margin:0;background:#f7fafc;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7fafc;padding:24px;">
              <tr><td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow:hidden;">
                  <tr><td style="background:#0ea5e9;padding:20px 24px;color:#ffffff;font-size:18px;font-weight:700;">${String(subject)}</td></tr>
                  <tr><td style="padding:24px;font-size:14px;line-height:20px;">${safeText}</td></tr>
                  <tr><td style="background:#f3f4f6;padding:16px 24px;text-align:center;font-size:12px;color:#6b7280;">Sent from Project Hub</td></tr>
                </table>
              </td></tr>
            </table>
          </body></html>`
        })())
    // Build RFC822 message
    const boundary = 'mixed_' + Math.random().toString(36).slice(2)
    const body = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: multipart/alternative; boundary="' + boundary + '"',
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      text ? String(text) : '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      '',
      htmlOut,
      `--${boundary}--`,
      '',
    ].join('\r\n')
    const encoded = Buffer.from(body).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const sendRes = await axios.post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { raw: encoded }, { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` } })

    // Attempt to mark invoice as SENT when we can resolve it by invoiceNo
    try {
      const invNo = String((req.body as any)?.invoice?.invoiceNo || '').trim()
      if (invNo) {
        const inv = await prisma.invoice.findUnique({ where: { invoiceNo: invNo } })
        if (inv && inv.status !== 'PAID') {
          await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'SENT' } })
        }
      }
    } catch {}

    res.json({ id: sendRes.data?.id || null })
  } catch (e: any) {
    res.status(400).json({ error: e?.response?.data || e?.message || 'Failed to send email' })
  }
})

// Pull recent bank emails and extract credits (very basic heuristic)
router.get('/bank-credits', async (req: Request, res: Response) => {
  const userId = await resolveUserId(req)
  if (!userId) return res.status(401).json({ error: 'Login required' })
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return res.status(500).json({ error: 'Missing Google client credentials' })
  const acc = await prisma.calendarAccount.findFirst({ where: { userId, provider: 'GOOGLE' as any } })
  if (!acc) return res.status(409).json({ error: 'Google not connected' })
  const scope = String(acc.scope || '')
  const needsScope = !/gmail\.readonly/.test(scope)
  if (needsScope) {
    return res.status(409).json({ error: 'Gmail scopes not granted. Please connect Gmail.', scope })
  }
  try {
    const tokenAcc = await ensureGoogleToken(acc, clientId, clientSecret)
    // Search last 14 days for suspected credit notifications
    const q = 'newer_than:14d (subject:(credit OR deposit OR payment received) OR from:(bank))'
    const list = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/messages', { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` }, params: { q, maxResults: 50 } })
    const messages = Array.isArray(list.data?.messages) ? list.data.messages : []
    const out: any[] = []
    for (const m of messages) {
      try {
        const detail = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` } })
        const payload = detail.data?.payload
        const headers = (payload?.headers || []) as Array<{ name: string; value: string }>
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || ''
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || ''
        const receivedAt = new Date(Number(detail.data?.internalDate || Date.now())).toISOString()
        // Extract amount heuristically
        const snippet = String(detail.data?.snippet || '')
        const amtMatch = snippet.match(/([A-Z]{3}|Rs\.?|LKR|USD|GBP|EUR|AUD|CAD)?\s?([\d,]+(?:\.\d{1,2})?)/i)
        let amountNum = 0
        let currency = 'USD'
        if (amtMatch) {
          const cur = amtMatch[1] || ''
          const amt = amtMatch[2] || '0'
          amountNum = Number(amt.replace(/,/g, ''))
          currency = cur && cur.length <= 4 ? cur.toUpperCase().replace('RS', 'LKR') : 'USD'
        }
        if (amountNum > 0) {
          try {
            await db.bankCredit.upsert({
              where: { messageId: m.id },
              update: {
                amount: amountNum,
                currency,
                valueDate: receivedAt,
                payerName: from || null,
                bankRef: subject || null,
                memo: snippet || null,
                sourceMailbox: acc.email || 'gmail',
                receivedAt,
                status: 'UNMATCHED',
                confidence: 0.5,
              },
              create: {
                amount: amountNum,
                currency,
                valueDate: receivedAt,
                payerName: from || null,
                bankRef: subject || null,
                memo: snippet || null,
                sourceMailbox: acc.email || 'gmail',
                messageId: m.id,
                receivedAt,
                status: 'UNMATCHED',
                confidence: 0.5,
              },
            })
          } catch {}

          out.push({
            id: `gmail-${m.id}`,
            amount: amountNum,
            currency,
            valueDate: receivedAt,
            payerName: from,
            bankRef: subject,
            memo: snippet,
            sourceMailbox: acc.email || 'gmail',
            messageId: m.id,
            receivedAt,
            status: 'Unmatched',
          })
        }
      } catch {}
    }
    res.json(out)
  } catch (e: any) {
    res.status(400).json({ error: e?.response?.data || e?.message || 'Failed to fetch bank credits' })
  }
})

// Pull recent client replies with attachments (payment slips)
router.get('/receipts', async (req: Request, res: Response) => {
  const userId = await resolveUserId(req)
  if (!userId) return res.status(401).json({ error: 'Login required' })
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return res.status(500).json({ error: 'Missing Google client credentials' })
  const acc = await prisma.calendarAccount.findFirst({ where: { userId, provider: 'GOOGLE' as any } })
  if (!acc) return res.status(409).json({ error: 'Google not connected' })
  const scope = String(acc.scope || '')
  const needsScope = !/gmail\.readonly/.test(scope)
  if (needsScope) {
    return res.status(409).json({ error: 'Gmail scopes not granted. Please connect Gmail.', scope })
  }

  try {
    const tokenAcc = await ensureGoogleToken(acc, clientId, clientSecret)
    // Only pull reply emails to invoices we sent:
    // - in inbox
    // - has attachments
    // - subject contains an invoice number pattern (e.g., INV-XXXX-XXX)
    // Additional filtering below verifies the thread contains a "SENT" message from us with same invoice No
    const q = 'newer_than:45d has:attachment in:inbox subject:INV-'
    const list = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
      headers: { Authorization: `Bearer ${tokenAcc.accessToken}` },
      params: { q, maxResults: 50 }
    })
    const messages = Array.isArray(list.data?.messages) ? list.data.messages : []
    const out: any[] = []

    const bounceFromRe = /(mailer-daemon|postmaster|no-reply|noreply|do-not-reply|bounce)@/i
    const bounceSubjectRe = /(delivery status notification|undelivered mail|mail delivery failed|returned mail)/i
    function looksLikeSlip(fileName: string, mimeType: string, subject: string, snippet: string, invoiceNo?: string | null) {
      const name = (fileName || '').toLowerCase()
      const subj = (subject || '').toLowerCase()
      const snip = (snippet || '').toLowerCase()
      const hasKeyword = /(slip|receipt|payment|transfer|deposit|bank-in|bank in|remittance)/i.test(name + ' ' + subj + ' ' + snip)
      const pdf = /^application\/pdf/i.test(mimeType)
      const img = /^image\//i.test(mimeType)
      if (invoiceNo) return true
      if (pdf && hasKeyword) return true
      if (img && hasKeyword) return true
      return false
    }

    for (const m of messages) {
      try {
        const detail = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` } })
        const msg = detail.data
        const payload = msg?.payload
        const headers = (payload?.headers || []) as Array<{ name: string; value: string }>
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || ''
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || ''
        const replyTo = headers.find(h => h.name.toLowerCase() === 'reply-to')?.value || ''
        const threadId = String(msg?.threadId || '')
        const receivedAt = new Date(Number(msg?.internalDate || Date.now())).toISOString()
        const snippet = String(msg?.snippet || '')

        // Skip obvious bounces/no-replies
        if (bounceFromRe.test(from) || bounceSubjectRe.test(subject)) {
          continue
        }

        // Extract potential invoice number (e.g., INV-2025-001)
        const invMatch = (subject + ' ' + snippet).match(/INV[-_ ]?\d{4}[-_ ]?\d{3,}/i)
        const invoiceNo = invMatch ? invMatch[0].replace(/[_ ]/g, '-').toUpperCase() : null
        // Require a recognizable invoice number
        if (!invoiceNo) continue
        // Invoice must exist in our DB
        let invoice: any = null
        try { invoice = await prisma.invoice.findUnique({ where: { invoiceNo } }) } catch {}
        if (!invoice) continue

        // Flatten parts to find attachments
        const parts: any[] = []
        function walkParts(p: any) {
          if (!p) return
          if (p.parts && Array.isArray(p.parts)) {
            for (const sp of p.parts) walkParts(sp)
          } else {
            parts.push(p)
          }
        }
        walkParts(payload)
        const attachments = parts.filter(p => p?.body?.attachmentId && (
          /^application\/pdf/i.test(p.mimeType) || /^image\//i.test(p.mimeType)
        ))

        // Ensure this message is in a thread that includes our original SENT message for the same invoice
        try {
          if (threadId) {
            const threadRes = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`, { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` } })
            const tMsgs = Array.isArray(threadRes.data?.messages) ? threadRes.data.messages : []
            const hasSent = tMsgs.some((tm: any) => Array.isArray(tm?.labelIds) && tm.labelIds.includes('SENT'))
            const subjInThread = tMsgs.some((tm: any) => {
              const hs = (tm?.payload?.headers || []) as Array<{ name: string; value: string }>
              const s = hs.find(h => h.name.toLowerCase() === 'subject')?.value || ''
              return s.includes(invoiceNo)
            })
            if (!hasSent || !subjInThread) {
              // Not a reply to our sent invoice; skip
              continue
            }
          }
        } catch {
          // If thread fetch fails, skip to be strict
          continue
        }

        for (const att of attachments) {
          let savedReceipt: any = null
          const fileName = att.filename || 'attachment'
          const fileType = att.mimeType || 'application/octet-stream'
          const attachmentId = att.body?.attachmentId
          if (!attachmentId) continue
          // Skip tiny inline images or tiny PDFs
          const partSize = Number(att.body?.size || 0)
          if (/^image\//i.test(fileType) && partSize > 0 && partSize < 20000) continue
          if (/^application\/pdf/i.test(fileType) && partSize > 0 && partSize < 5000) continue
          // We do not download binary here; provide a proxy URL for on-demand fetch
          // Include account id so the proxy can fetch even without user session headers
          const fileKey = `${baseUrl(req)}/api/gmail/messages/${m.id}/attachments/${attachmentId}?account=${encodeURIComponent(acc.id)}`

          // Basic relevance filter to reduce noise
          if (!looksLikeSlip(fileName, fileType, subject, snippet, invoiceNo)) {
            continue
          }

          // Determine amount: prefer reading from slip content over email snippet
          let amountNum: number | undefined = undefined
          try {
            const ares = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}/attachments/${attachmentId}`,
              { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` } })
            const dataB64 = ares.data?.data || ''
            const buf = Buffer.from(String(dataB64).replace(/-/g, '+').replace(/_/g, '/'), 'base64')
            amountNum = await extractAmount(buf, fileType)
          } catch {}
          // Do not fall back to email body; rely solely on slip content

          // Persist to DB idempotently via unique (messageId,fileName)
          try {
            const commonData = {
              paymentRequestId: invoiceNo || undefined,
              invoiceId: invoice?.id || undefined,
              projectId: invoice?.projectId || undefined,
              phaseId: invoice?.phaseId || undefined,
              source: 'email',
              fileKey,
              fileType,
              fileSize: null,
              amount: amountNum || null,
              payerName: from || replyTo || null,
              payerEmail: (from || '').replace(/.*<([^>]+)>.*/, '$1') || null,
              // Do not auto-verify on ingestion; user must verify manually
              status: 'SUBMITTED',
              confidence: invoice ? 0.9 : 0.6,
              senderEmail: (from || '').replace(/.*<([^>]+)>.*/, '$1') || null,
              gmailThreadId: threadId || null,
              receivedAt,
            }
            const dbRec = await db.paymentReceipt.upsert({
              where: { messageId_fileName: { messageId: m.id, fileName } },
              update: commonData,
              create: { ...commonData, fileName, messageId: m.id, flags: [] },
            })
            savedReceipt = dbRec
          } catch {}

          const receiptCode = `RC-${String(m.id).slice(0,6).toUpperCase()}`
          // If we have a saved receipt in DB, mirror its status/id/fileKey
          const statusFromDb = savedReceipt?.status
          const uiStatus = statusFromDb === 'VERIFIED' ? 'Verified' : statusFromDb === 'REJECTED' ? 'Rejected' : 'Submitted'
          const idForUi = savedReceipt?.id || `gmail-${m.id}-${attachmentId}`
          const fileKeyForUi = savedReceipt?.fileKey || fileKey
          out.push({
            id: idForUi,
            paymentRequestId: invoiceNo || undefined,
            invoiceNo: invoiceNo || undefined,
            invoiceId: invoice?.id || undefined,
            matchedInvoiceNo: invoiceNo || undefined,
            receiptCode,
            projectId: invoice?.projectId || 'unknown',
            phaseId: invoice?.phaseId || 'unknown',
            projectName: invoice ? '' : 'Unknown Project',
            phaseName: invoice ? '' : 'Unknown Phase',
            source: 'email',
            fileKey: fileKeyForUi,
            fileName,
            fileType,
            // size will be provided on proxy fetch; unknown here
            amount: amountNum,
            paidDate: undefined,
            transactionRef: undefined,
            payerName: from || replyTo || undefined,
            payerEmail: (from || '').replace(/.*<([^>]+)>.*/, '$1'),
            status: uiStatus,
            confidence: invoice ? 0.9 : 0.6,
            matchedInvoiceId: invoice?.id || undefined,
            matchedAmount: invoice && amountNum ? amountNum : undefined,
            flags: [],
            senderEmail: (from || '').replace(/.*<([^>]+)>.*/, '$1'),
            messageId: m.id,
            gmailThreadId: threadId,
            receivedAt,
          })
        }
      } catch (e) {
        // Skip individual message errors
      }
    }

    res.json(out)
  } catch (e: any) {
    res.status(400).json({ error: e?.response?.data || e?.message || 'Failed to fetch receipts' })
  }
})

// Proxy an attachment download for inline viewing
router.get('/messages/:messageId/attachments/:attachmentId', async (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return res.status(500).json({ error: 'Missing Google client credentials' })

  // Resolve account: prefer explicit account query, else use authenticated user, else first GOOGLE account
  const accountId = (req.query.account as string) || ''
  let acc: any = null
  if (accountId) {
    acc = await prisma.calendarAccount.findUnique({ where: { id: accountId } })
  }
  if (!acc) {
    const userId = await resolveUserId(req)
    if (userId) {
      acc = await prisma.calendarAccount.findFirst({ where: { userId, provider: 'GOOGLE' as any } })
    }
  }
  if (!acc) {
    acc = await prisma.calendarAccount.findFirst({ where: { provider: 'GOOGLE' as any } })
  }
  if (!acc) return res.status(409).json({ error: 'Google not connected' })
  const scope = String(acc.scope || '')
  const needsScope = !/gmail\.readonly/.test(scope)
  if (needsScope) {
    return res.status(409).json({ error: 'Gmail scopes not granted. Please connect Gmail.', scope })
  }

  try {
    const tokenAcc = await ensureGoogleToken(acc, clientId, clientSecret)
    const { messageId, attachmentId } = req.params
    // Fetch message to infer filename and mime type of this attachment
    const msgRes = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` } })
    const payload = msgRes.data?.payload
    // Walk to find the attachment part
    let found: any = null
    function walk(p: any) {
      if (!p || found) return
      if (p.parts && Array.isArray(p.parts)) {
        for (const sp of p.parts) walk(sp)
      } else if (p?.body?.attachmentId === attachmentId) {
        found = p
      }
    }
    walk(payload)
    const mimeType = found?.mimeType || 'application/octet-stream'
    const filename = found?.filename || 'attachment'
    const attRes = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`, { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` } })
    const dataB64 = attRes.data?.data || ''
    const buf = Buffer.from(String(dataB64).replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `inline; filename="${filename.replace(/"/g, '')}"`)
    // Allow embedding in iframe from different origins by removing frameguard
    try { res.removeHeader('X-Frame-Options') } catch {}
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.send(buf)
  } catch (e: any) {
    res.status(400).json({ error: e?.response?.data || e?.message || 'Failed to fetch attachment' })
  }
})

export default router
