import nodemailer from 'nodemailer'

function isTruthy(v?: string) {
  return String(v || '').toLowerCase() === 'true'
}

export function emailEnabled() {
  return !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS
}

export function getTransport() {
  if (!emailEnabled()) throw new Error('SMTP not configured')
  const secure = isTruthy(process.env.SMTP_SECURE)
  const port = Number(process.env.SMTP_PORT || (secure ? 465 : 587))
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: { user: process.env.SMTP_USER as string, pass: process.env.SMTP_PASS as string },
  })
}

export async function sendMail(to: string, subject: string, html: string, text?: string) {
  if (!emailEnabled()) return { ok: false, skipped: true }
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@example.com'
  const transporter = getTransport()
  const info = await transporter.sendMail({ from, to, subject, text: text || html.replace(/<[^>]+>/g, ''), html })
  return { ok: true, messageId: info.messageId }
}

export function renderVerifyEmail(link: string) {
  return {
    subject: 'Verify your email',
    html: `
      <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2>Verify your email</h2>
        <p>Click the button below to verify your email and continue.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none" target="_blank" rel="noopener">Verify Email</a></p>
        <p>If the button doesn't work, copy and paste this link:</p>
        <p><a href="${link}">${link}</a></p>
      </div>
    `,
  }
}

export function renderInviteEmail(link: string, name?: string, roleName?: string, departmentName?: string) {
  const brand = (process.env.MAIL_FROM || 'Remora').replace(/<.*?>/g, '').trim() || 'Remora'
  const role = roleName ? String(roleName) : undefined
  const dept = departmentName ? String(departmentName) : undefined
  const tagStyle = 'display:inline-block;padding:6px 10px;border-radius:9999px;background:#F1F5F9;color:#0F172A;font-size:12px;font-weight:600;margin-right:8px;border:1px solid #E2E8F0'
  return {
    subject: `You're invited to ${brand}`,
    html: `
  <div style="background:#F8FAFC;padding:24px">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
      <tr>
        <td style="padding:32px 24px;background:linear-gradient(135deg,#7C3AED, #2563EB);color:#ffffff">
          <div style="font-size:20px;font-weight:700;letter-spacing:0.2px">${brand}</div>
          <div style="margin-top:8px;font-size:14px;opacity:0.9">Secure invitation to join the workspace</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 24px 8px 24px;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
          <h2 style="margin:0 0 8px 0;font-size:22px;line-height:28px">Welcome${name ? `, ${name}` : ''}</h2>
          <p style="margin:0 0 12px 0;font-size:14px;line-height:22px;color:#334155">You've been invited to join <strong>${brand}</strong>. Use the button below to create your password and activate your account.</p>
          ${role || dept ? `
          <div style="margin:14px 0 6px 0">
            ${role ? `<span style="${tagStyle}">Role: ${role}</span>` : ''}
            ${dept ? `<span style="${tagStyle}">Department: ${dept}</span>` : ''}
          </div>` : ''}
          <div style="margin:20px 0 26px 0">
            <a href="${link}" target="_blank" rel="noopener" style="background:#7C3AED;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;display:inline-block">Accept Invitation</a>
          </div>
          <p style="margin:0 0 10px 0;font-size:12px;color:#64748B">This link expires in 24 hours for your security.</p>
          <p style="margin:0 0 8px 0;font-size:12px;color:#64748B">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="margin:0 0 18px 0;font-size:12px;word-break:break-all"><a href="${link}" style="color:#2563EB;text-decoration:none">${link}</a></p>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 24px;background:#F8FAFC;border-top:1px solid #e5e7eb;color:#64748B;font-size:12px">
          Sent by ${brand}. If you weren't expecting this invitation, you can ignore this email.
        </td>
      </tr>
    </table>
  </div>
    `,
  }
}

export function renderApprovedEmail(baseUrl: string) {
  const link = baseUrl.replace(/\/$/, '') + '/login'
  return {
    subject: 'Your account has been approved',
    html: `
      <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2>You're in!</h2>
        <p>Your account has been approved. You can now sign in.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none" target="_blank" rel="noopener">Sign in</a></p>
      </div>
    `,
  }
}

export function renderPasswordResetEmail(link: string, name?: string) {
  const brand = (process.env.MAIL_FROM || 'Remora').replace(/<.*?>/g, '').trim() || 'Remora'
  return {
    subject: `${brand}: Reset your password`,
    html: `
  <div style="background:#F8FAFC;padding:24px">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
      <tr>
        <td style="padding:28px 24px;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff">
          <div style="font-size:20px;font-weight:700;letter-spacing:0.2px">${brand}</div>
          <div style="margin-top:6px;font-size:14px;opacity:0.9">Password reset request</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
          <p style="margin:0 0 10px 0">${name ? `Hi ${name},` : 'Hi,'}</p>
          <p style="margin:0 0 16px 0;color:#334155;font-size:14px">We received a request to reset your password. Click the button below to set a new password. This link expires in 60 minutes.</p>
          <div style="margin:18px 0 24px 0">
            <a href="${link}" target="_blank" rel="noopener" style="background:#2563EB;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;display:inline-block">Reset Password</a>
          </div>
          <p style="margin:0 0 8px 0;font-size:12px;color:#64748B">If the button doesn't work, copy and paste this link:</p>
          <p style="margin:0 0 18px 0;font-size:12px;word-break:break-all"><a href="${link}" style="color:#2563EB;text-decoration:none">${link}</a></p>
          <p style="margin:0;font-size:12px;color:#64748B">If you didn't request this change, you can safely ignore this email.</p>
        </td>
      </tr>
    </table>
  </div>`
  }
}
