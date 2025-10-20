import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { PrismaClient } from '@prisma/client'
import projectsRouter from './routes/projects.ts'
import tasksRouter from './routes/tasks.ts'
import timelogsRouter from './routes/timelogs.ts'
import usersRouter from './routes/users.ts'
import departmentsRouter from './routes/departments.ts'
import rolesRouter from './routes/roles.ts'

const app = express()
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

const prisma = new PrismaClient()

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) })
  }
})

// Simple current user middleware (header-based for now)
app.use((req, _res, next) => {
  const userId = req.header('x-user-id')
  // attach optionally; endpoints requiring it will validate
  ;(req as any).userId = userId || null
  next()
})

app.use('/projects', projectsRouter)
app.use('/tasks', tasksRouter)
app.use('/timelogs', timelogsRouter)
// New admin data APIs
app.use('/api/users', usersRouter)
app.use('/api/departments', departmentsRouter)
app.use('/api/roles', rolesRouter)

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`API listening on :${port}`)
})
