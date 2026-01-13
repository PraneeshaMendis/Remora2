import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import type { CorsOptions } from 'cors'

export function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: false, // can be tuned if you serve HTML
    crossOriginEmbedderPolicy: false,
  })
}

export function loginRateLimiter() {
  return rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
  })
}

export function buildCorsOptions(): CorsOptions {
  const allowAll = (process.env.CORS_ALLOW_ALL || '').toLowerCase() === 'true'
  const originEnv = process.env.FRONTEND_BASE_URL || process.env.APP_BASE_URL || ''
  const origins = originEnv ? originEnv.split(',').map(s => s.trim()) : []
  return allowAll || origins.length === 0
    ? { origin: true, credentials: true }
    : { origin: origins, credentials: true }
}
