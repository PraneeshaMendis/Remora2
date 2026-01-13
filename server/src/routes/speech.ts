import { Router, Request, Response } from 'express'
import multer from 'multer'
import axios from 'axios'
import fs from 'fs'

const router = Router()

// Use multer to accept single audio blob
const upload = multer({ storage: multer.memoryStorage() })

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const key = process.env.ASSEMBLYAI_API_KEY || ''
    if (!key) return res.status(500).json({ error: 'Missing ASSEMBLYAI_API_KEY' })
    const file = (req as any).file as Express.Multer.File
    if (!file || !file.buffer) return res.status(400).json({ error: 'No audio uploaded (field name "audio")' })

    // 1) Upload audio bytes to AssemblyAI
    const uploadResp = await axios.post('https://api.assemblyai.com/v2/upload', file.buffer, {
      headers: {
        authorization: key,
        'content-type': 'application/octet-stream',
      },
      maxBodyLength: Infinity,
    })
    const uploadUrl = uploadResp?.data?.upload_url
    if (!uploadUrl) return res.status(400).json({ error: 'Failed to upload audio' })

    // 2) Create transcript job
    const trResp = await axios.post('https://api.assemblyai.com/v2/transcript', {
      audio_url: uploadUrl,
      punctuate: true,
      format_text: true,
    }, {
      headers: { authorization: key, 'content-type': 'application/json' },
    })
    const trId = trResp?.data?.id
    if (!trId) return res.status(400).json({ error: 'Failed to create transcript' })

    // 3) Poll for completion
    let text = ''
    for (let i = 0; i < 30; i++) {
      await sleep(2000)
      const poll = await axios.get(`https://api.assemblyai.com/v2/transcript/${trId}`, {
        headers: { authorization: key },
      })
      const status = String(poll?.data?.status || '')
      if (status === 'completed') { text = String(poll?.data?.text || '') ; break }
      if (status === 'error') {
        return res.status(400).json({ error: poll?.data?.error || 'Transcription failed' })
      }
    }
    if (!text) return res.status(504).json({ error: 'Transcription timeout' })
    res.json({ text })
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to transcribe audio' })
  }
})

// Issue an ephemeral token for AssemblyAI Realtime (prevents exposing permanent key to client)
router.get('/realtime-token', async (_req: Request, res: Response) => {
  try {
    const key = process.env.ASSEMBLYAI_API_KEY || ''
    if (!key) return res.status(500).json({ error: 'Missing ASSEMBLYAI_API_KEY' })

    // Per Universal Streaming docs: omit model field; tokens default to Universal.
    const headers = { authorization: key, 'content-type': 'application/json' }
    const body = { expires_in: 3600 }
    const r = await axios.post('https://api.assemblyai.com/v2/realtime/token', body, { headers })
    const token = r?.data?.token
    if (!token) return res.status(400).json({ error: 'Failed to obtain realtime token' })
    res.json({ token, model: 'universal' })
  } catch (e: any) {
    res.status(400).json({ error: e?.response?.data || e?.message || 'Failed to obtain realtime token' })
  }
})

export default router
