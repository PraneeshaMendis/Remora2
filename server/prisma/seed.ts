import { PrismaClient, ProjectStatus, Visibility, TaskStatus, ProjectRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding data...')
  // Ensure Departments
  const deptNames = [
    'Executive Department',
    'Tech Department',
    'GRC Department',
    'Sales Department',
    'Sales and Marketing Department',
    'Business Administration Department',
  ]
  const departments = await Promise.all(
    deptNames.map(name => prisma.department.upsert({ where: { name }, update: {}, create: { name } }))
  )
  const deptByName = Object.fromEntries(departments.map(d => [d.name, d]))

  // Ensure Roles
  const roleNames = ['Director', 'Manager', 'Lead', 'Consultant', 'Client']
  const roles = await Promise.all(
    roleNames.map(name => prisma.role.upsert({ where: { name }, update: {}, create: { name } }))
  )
  const roleByName = Object.fromEntries(roles.map(r => [r.name, r]))

  // Clear existing users (as requested)
  await prisma.user.deleteMany({})

  // Helper
  const createUser = (name: string, email: string, roleName: string, deptName: string) =>
    prisma.user.create({ data: {
      name,
      email: email.trim().toLowerCase(),
      roleId: roleByName[roleName].id,
      departmentId: deptByName[deptName].id,
      isActive: true,
    } })

  // Seed Users per spec
  const [mohan, gayan] = await Promise.all([
    createUser('Mohan', 'mohan@company.com', 'Director', 'Executive Department'),
    createUser('Gayan', 'gayan@company.com', 'Director', 'Executive Department'),
  ])

  const [shanuka] = await Promise.all([
    createUser('Shanuka', 'shanuka@company.com', 'Lead', 'Tech Department'),
  ])
  const [nuwan, isuri, kasun] = await Promise.all([
    createUser('Nuwan', 'nuwan.consultant@company.com', 'Consultant', 'Tech Department'),
    createUser('Isuri', 'isuri.consultant@company.com', 'Consultant', 'Tech Department'),
    createUser('Kasun', 'kasun.consultant@company.com', 'Consultant', 'Tech Department'),
  ])

  const [anuradha] = await Promise.all([
    createUser('Anuradha', 'anuradha@company.com', 'Manager', 'GRC Department'),
  ])
  const [grcLead] = await Promise.all([
    createUser('GRC Lead', 'grc.lead@company.com', 'Lead', 'GRC Department'),
  ])
  const [meera, tharindu, sachini] = await Promise.all([
    createUser('Meera', 'meera.grc@company.com', 'Consultant', 'GRC Department'),
    createUser('Tharindu', 'tharindu.grc@company.com', 'Consultant', 'GRC Department'),
    createUser('Sachini', 'sachini.grc@company.com', 'Consultant', 'GRC Department'),
  ])

  const [amira, devon, li] = await Promise.all([
    createUser('Amira', 'amira.salesmkt@company.com', 'Consultant', 'Sales and Marketing Department'),
    createUser('Devon', 'devon.salesmkt@company.com', 'Consultant', 'Sales and Marketing Department'),
    createUser('Li', 'li.salesmkt@company.com', 'Consultant', 'Sales and Marketing Department'),
  ])

  const [peter, sara] = await Promise.all([
    createUser('Peter', 'peter.sales@company.com', 'Consultant', 'Sales Department'),
    createUser('Sara', 'sara.sales@company.com', 'Consultant', 'Sales Department'),
  ])

  const [nathan, olivia] = await Promise.all([
    createUser('Nathan', 'nathan.admin@company.com', 'Consultant', 'Business Administration Department'),
    createUser('Olivia', 'olivia.admin@company.com', 'Consultant', 'Business Administration Department'),
  ])

  // Projects
  const mobile = await prisma.project.upsert({
    where: { code: 'MOBILE-TREE' },
    update: {},
    create: {
      code: 'MOBILE-TREE',
      title: 'Mobile App Tree Design',
      description: 'Designing the mobile app information architecture',
      status: ProjectStatus.IN_PROGRESS,
      ownerId: director.id,
      visibility: Visibility.TEAM,
      allocatedHours: 120,
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  })
  const backend = await prisma.project.upsert({
    where: { code: 'BACKEND-API' },
    update: {},
    create: {
      code: 'BACKEND-API',
      title: 'Backend API Development',
      description: 'Build core services and endpoints',
      status: ProjectStatus.PLANNING,
      ownerId: manager.id,
      visibility: Visibility.TEAM,
      allocatedHours: 160,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  // Memberships
  await prisma.projectMembership.upsert({
    where: { projectId_userId: { projectId: mobile.id, userId: director.id } },
    update: {},
    create: { projectId: mobile.id, userId: director.id, role: ProjectRole.DIRECTOR },
  })
  await prisma.projectMembership.upsert({
    where: { projectId_userId: { projectId: mobile.id, userId: engineer1.id } },
    update: {},
    create: { projectId: mobile.id, userId: engineer1.id, role: ProjectRole.ENGINEER },
  })
  await prisma.projectMembership.upsert({
    where: { projectId_userId: { projectId: mobile.id, userId: engineer2.id } },
    update: {},
    create: { projectId: mobile.id, userId: engineer2.id, role: ProjectRole.ENGINEER },
  })

  await prisma.projectMembership.upsert({
    where: { projectId_userId: { projectId: backend.id, userId: manager.id } },
    update: {},
    create: { projectId: backend.id, userId: manager.id, role: ProjectRole.MANAGER },
  })
  await prisma.projectMembership.upsert({
    where: { projectId_userId: { projectId: backend.id, userId: engineer1.id } },
    update: {},
    create: { projectId: backend.id, userId: engineer1.id, role: ProjectRole.ENGINEER },
  })

  // Phases & Tasks
  const mobilePhase1 = await prisma.phase.upsert({
    where: { id: mobile.id.slice(0, 24) }, // dummy unique guard; fallback to create
    update: {},
    create: { name: 'Planning', projectId: mobile.id },
  })
  const backendPhase1 = await prisma.phase.create({ name: 'Sprint 1', projectId: backend.id })

  const taskA = await prisma.task.create({
    data: { title: 'User journey mapping', description: 'Interview stakeholders and map journeys', status: TaskStatus.COMPLETED, phaseId: mobilePhase1.id },
  })
  const taskB = await prisma.task.create({
    data: { title: 'Component tree draft', description: 'Draft main navigation tree', status: TaskStatus.NOT_STARTED, phaseId: mobilePhase1.id },
  })
  const taskC = await prisma.task.create({
    data: { title: 'Auth service', description: 'JWT + sessions', status: TaskStatus.NOT_STARTED, phaseId: backendPhase1.id },
  })

  // Time logs
  const now = new Date()
  const earlier = new Date(now.getTime() - 2 * 60 * 60 * 1000)
  await prisma.timeLog.create({
    data: { taskId: taskA.id, userId: engineer1.id, startedAt: earlier, endedAt: now, durationMins: 120, description: 'Journey research' },
  })
  await prisma.timeLog.create({
    data: { taskId: taskA.id, userId: engineer2.id, startedAt: earlier, endedAt: now, durationMins: 60, description: 'Notes and flow' },
  })
  // Additional logs to make usedHours visible across projects
  const earlier2 = new Date(now.getTime() - 4 * 60 * 60 * 1000)
  const earlier3 = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  // Mobile project extra logs
  await prisma.timeLog.create({
    data: { taskId: taskB.id, userId: engineer1.id, startedAt: earlier2, endedAt: now, durationMins: 90, description: 'Drafting component tree' },
  })
  // Backend project logs
  await prisma.timeLog.create({
    data: { taskId: taskC.id, userId: manager.id, startedAt: earlier3, endedAt: new Date(earlier3.getTime() + 90 * 60000), durationMins: 90, description: 'Auth service planning' },
  })
  await prisma.timeLog.create({
    data: { taskId: taskC.id, userId: engineer1.id, startedAt: earlier3, endedAt: new Date(earlier3.getTime() + 120 * 60000), durationMins: 120, description: 'Scaffold endpoints' },
  })

  console.log('Seed complete.')
  console.log('Seeded base data and users for departments/roles.')
}

main().catch(async (e) => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
