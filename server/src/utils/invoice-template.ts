export function renderInvoiceEmailHtml(i: any): string {
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
  const subtotalNum = Number(i?.subtotal || 0)
  const taxNum = Number(i?.taxAmount || 0)
  const vatNum = Number(i?.vatAmount || 0)
  const totalNum = Number(i?.total || (subtotalNum + taxNum + vatNum))
  const taxRate = subtotalNum > 0 ? (taxNum / subtotalNum) * 100 : 0
  const vatRate = subtotalNum > 0 ? (vatNum / subtotalNum) * 100 : 0
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency })
  const subtotalFmt = formatter.format(subtotalNum)
  const taxFmt = formatter.format(taxNum)
  const vatFmt = formatter.format(vatNum)
  const totalFmt = formatter.format(totalNum)
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
                  <td align="right" style="padding:10px 12px;border-top:1px solid #374151;">${subtotalFmt}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border-top:1px solid #374151;border-right:1px solid #374151;">Tax (${taxRate.toFixed(2)}%)</td>
                  <td align="right" style="padding:10px 12px;border-top:1px solid #374151;">${taxFmt}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;border-top:1px solid #374151;border-right:1px solid #374151;">VAT (${vatRate.toFixed(2)}%)</td>
                  <td align="right" style="padding:10px 12px;border-top:1px solid #374151;">${vatFmt}</td>
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
