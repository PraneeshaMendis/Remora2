import { Router, Request, Response } from 'express'
import axios from 'axios'

const router = Router()

// Simple proxy to RapidAPI ChatGPT AI Chat Bot
router.post('/send', async (req: Request, res: Response) => {
  try {
    const message = String(req.body?.message || '').trim()
    if (!message) return res.status(400).json({ error: 'message is required' })

    // Prefer RapidAPI Chat-GPT26 if forced via env
    const forceRapid = String(process.env.CHATBOT_FORCE_RAPIDAPI || '').toLowerCase() === 'true'

    // Pipedream workflow (only when configured and not forcing RapidAPI)
    const pdUrl = process.env.PIPEDREAM_CHAT_URL || ''
    const pdKey = process.env.PIPEDREAM_API_KEY || ''
    if (pdUrl && !forceRapid) {
      const extract = (d: any): string => {
        if (!d) return ''
        const fields = ['reply','response','answer','message','result','text']
        for (const f of fields) {
          if (typeof d?.[f] === 'string' && d[f].trim()) return d[f].trim()
        }
        // Common Pipedream Respond step: { body: { reply: '...', text: '...' } } or body as string
        if (typeof d?.body === 'string' && d.body.trim()) return d.body.trim()
        if (typeof d?.body === 'object' && d.body) {
          for (const f of fields) {
            const v = d.body[f]
            if (typeof v === 'string' && v.trim()) return v.trim()
          }
        }
        if (Array.isArray(d?.choices) && typeof d.choices[0]?.text === 'string') return d.choices[0].text.trim()
        if (typeof d?.data?.text === 'string') return d.data.text.trim()
        return ''
      }
      const jsonHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      if (pdKey) { jsonHeaders['Authorization'] = `Bearer ${pdKey}`; jsonHeaders['x-api-key'] = pdKey }
      const formHeaders: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
      if (pdKey) { formHeaders['Authorization'] = `Bearer ${pdKey}`; formHeaders['x-api-key'] = pdKey }
      const attempts: Array<() => Promise<{ ok: boolean; status: number; data: any }>> = [
        async () => ({ ok: true, status: 0, data: await (await axios.post(pdUrl, { message, userId: (req as any).userId || null, ts: new Date().toISOString() }, { headers: jsonHeaders, timeout: 30000, validateStatus: () => true })).data, }),
        async () => ({ ok: true, status: 0, data: await (await axios.post(pdUrl, { text: message }, { headers: jsonHeaders, timeout: 30000, validateStatus: () => true })).data, }),
        async () => ({ ok: true, status: 0, data: await (await axios.post(pdUrl, { prompt: message }, { headers: jsonHeaders, timeout: 30000, validateStatus: () => true })).data, }),
        async () => ({ ok: true, status: 0, data: await (await axios.post(pdUrl, { query: message }, { headers: jsonHeaders, timeout: 30000, validateStatus: () => true })).data, }),
        async () => ({ ok: true, status: 0, data: await (await axios.post(pdUrl, new URLSearchParams({ message }), { headers: formHeaders, timeout: 30000, validateStatus: () => true })).data, }),
        async () => ({ ok: true, status: 0, data: await (await axios.get(`${pdUrl}?message=${encodeURIComponent(message)}`, { headers: jsonHeaders, timeout: 30000, validateStatus: () => true })).data, }),
      ]
      for (const fn of attempts) {
        try {
          const resp = await fn()
          const reply = extract(resp.data)
          if (reply) return res.json({ reply })
        } catch (err: any) {
          const code = err?.response?.status
          const data = err?.response?.data
          console.warn('Pipedream upstream error', { code, data: typeof data === 'string' ? data : JSON.stringify(data) })
          if (code === 401 || code === 403) return res.status(code).json({ error: 'Pipedream authentication failed. Check PIPEDREAM_API_KEY or workflow auth.' })
        }
      }
      // As a last-resort fallback, if Pipedream responded with any string, surface it
      try {
        const probe = await axios.get(pdUrl, { timeout: 5000, validateStatus: () => true })
        const data = probe?.data
        if (typeof data === 'string' && data.trim()) return res.json({ reply: data.substring(0, 1000) })
      } catch {}
      return res.status(502).json({ error: 'Pipedream workflow error (no reply). Ensure your workflow responds with { reply: "..." } or a text body.' })
    }

    // RapidAPI provider (Chat-GPT26 by default)
    const key = process.env.RAPIDAPI_CHAT_KEY || process.env.RAPIDAPI_KEY || ''
    const host = process.env.RAPIDAPI_CHAT_HOST || 'chat-gpt26.p.rapidapi.com'
    if (!key) return res.status(500).json({ error: 'Missing chatbot provider configuration' })

    const headers = { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': host }
    const timeout = 30000

    const extract = (data: any): string => {
      if (!data) return ''
      // Common fields across providers
      const fields = ['response', 'answer', 'message', 'result', 'reply', 'content', 'text']
      for (const f of fields) {
        if (typeof data[f] === 'string' && data[f].trim()) return data[f].trim()
      }
      // Some APIs return { data: { text: '...' } }
      if (typeof data?.data?.text === 'string') return data.data.text.trim()
      // OpenAI-like response shape
      if (Array.isArray(data?.choices)) {
        const choice = data.choices[0]
        const c1 = choice?.message?.content || choice?.text
        if (typeof c1 === 'string' && c1.trim()) return c1.trim()
      }
      return ''
    }

    // Try Chat-GPT26 endpoint first (root path) then fallbacks
    const attempts: Array<() => Promise<string>> = [
      // Chat-GPT26 (RapidAPI) — root path with model + messages
      async () => {
        const url = `https://${host}/`
        const payload = {
          model: process.env.RAPIDAPI_CHAT_MODEL || 'GPT-5-mini',
          messages: [{ role: 'user', content: message }],
        }
        const r = await axios.post(url, payload, {
          headers: { ...headers, 'Content-Type': 'application/json' },
          timeout,
          validateStatus: () => true,
        })
        if (r.status >= 200 && r.status < 300) return extract(r.data)
        throw Object.assign(new Error('Chat-GPT26 upstream error'), { response: r })
      },
      // Legacy endpoints some RapidAPI providers offer
      async () => {
        const url = new URL(`https://${host}/ask`)
        url.searchParams.set('query', message)
        const r = await axios.get(url.toString(), { headers, timeout, validateStatus: () => true })
        if (r.status >= 200 && r.status < 300) return extract(r.data)
        throw Object.assign(new Error('ask endpoint error'), { response: r })
      },
      async () => {
        const url = `https://${host}/chat`
        const r = await axios.post(url, { message }, { headers: { ...headers, 'Content-Type': 'application/json' }, timeout, validateStatus: () => true })
        if (r.status >= 200 && r.status < 300) return extract(r.data)
        throw Object.assign(new Error('chat endpoint error'), { response: r })
      },
    ]

    for (const attempt of attempts) {
      try {
        const txt = await attempt()
        if (txt) return res.json({ reply: txt })
      } catch (err: any) {
        // log and continue to next attempt
        const code = err?.response?.status
        const data = err?.response?.data
        console.warn('Chatbot upstream error', { code, data: typeof data === 'string' ? data : JSON.stringify(data) })
        if (code === 403) {
          return res.status(403).json({ error: 'Upstream says your RapidAPI key is not subscribed to this API. Subscribe to the API or set RAPIDAPI_CHAT_KEY for a subscribed app.' })
        }
        if (code === 429) {
          const retryAfter = err?.response?.headers?.['retry-after'] || null
          return res.status(429).json({ error: 'Upstream rate limit reached. Please wait and try again.', retryAfter })
        }
      }
    }

    return res.status(502).json({ error: 'Chatbot upstream did not return a response' })
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Chatbot failed' })
  }
})

export default router
