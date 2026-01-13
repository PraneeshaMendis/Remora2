"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/utils/slip-extract.ts
var slip_extract_exports = {};
__export(slip_extract_exports, {
  extractAmount: () => extractAmount,
  extractAmountFromImage: () => extractAmountFromImage,
  extractAmountFromPdf: () => extractAmountFromPdf
});
function findAmountFromText(text) {
  const raw = String(text || "");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const amountLineRe = /amount\s*[:\-]?\s*(?:\(\s*(?:LKR|Rs\.?|USD|GBP|EUR|AUD|CAD)\s*\)\s*|(?:LKR|Rs\.?|USD|GBP|EUR|AUD|CAD)\s*)?([\d,]+(?:\.\d{1,2})?)/i;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const m = ln.match(amountLineRe);
    if (m && m[1]) {
      const val = Number(m[1].replace(/,/g, ""));
      if (!Number.isNaN(val)) return val;
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const ctx = `${lines[i]} ${lines[i + 1] || ""}`;
    const m = ctx.match(amountLineRe);
    if (m && m[1]) {
      const val = Number(m[1].replace(/,/g, ""));
      if (!Number.isNaN(val)) return val;
    }
  }
  const g = raw.match(amountLineRe);
  if (g && g[1]) {
    const val = Number(g[1].replace(/,/g, ""));
    if (!Number.isNaN(val)) return val;
  }
  return void 0;
}
async function extractAmountFromPdf(buffer) {
  try {
    const parsed = await (0, import_pdf_parse.default)(buffer);
    return findAmountFromText(String(parsed?.text || ""));
  } catch {
    return void 0;
  }
}
async function extractAmountFromImage(buffer) {
  try {
    const { data } = await import_tesseract.default.recognize(buffer, "eng", { logger: () => {
    } });
    return findAmountFromText(String(data?.text || ""));
  } catch {
    return void 0;
  }
}
async function extractAmount(buffer, mimeType) {
  if (/^application\/pdf/i.test(mimeType)) return extractAmountFromPdf(buffer);
  if (/^image\//i.test(mimeType)) return extractAmountFromImage(buffer);
  return void 0;
}
var import_pdf_parse, import_tesseract;
var init_slip_extract = __esm({
  "src/utils/slip-extract.ts"() {
    "use strict";
    import_pdf_parse = __toESM(require("pdf-parse"));
    import_tesseract = __toESM(require("tesseract.js"));
  }
});

// src/index.ts
var import_fs2 = __toESM(require("fs"));
var import_path4 = __toESM(require("path"));
var import_dotenv = __toESM(require("dotenv"));
var import_express19 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_morgan = __toESM(require("morgan"));
var import_client18 = require("@prisma/client");

// src/middleware/security.ts
var import_helmet = __toESM(require("helmet"));
var import_express_rate_limit = __toESM(require("express-rate-limit"));
function helmetMiddleware() {
  return (0, import_helmet.default)({
    contentSecurityPolicy: false,
    // can be tuned if you serve HTML
    crossOriginEmbedderPolicy: false
  });
}
function loginRateLimiter() {
  return (0, import_express_rate_limit.default)({
    windowMs: 10 * 60 * 1e3,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later."
  });
}
function buildCorsOptions() {
  const allowAll = (process.env.CORS_ALLOW_ALL || "").toLowerCase() === "true";
  const originEnv = process.env.FRONTEND_BASE_URL || process.env.APP_BASE_URL || "";
  const origins = originEnv ? originEnv.split(",").map((s) => s.trim()) : [];
  return allowAll || origins.length === 0 ? { origin: true, credentials: true } : { origin: origins, credentials: true };
}

// src/routes/projects.ts
var import_express = require("express");
var import_client = require("@prisma/client");
var import_zod = require("zod");
var prisma = new import_client.PrismaClient();
var router = (0, import_express.Router)();
function calcTaskProgress(tasks) {
  const total = tasks.length;
  if (total === 0) return 0;
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  return Math.round(completed / total * 100);
}
async function projectProgressAndHours(projectId) {
  const phases = await prisma.phase.findMany({
    where: { projectId },
    include: { tasks: { select: { id: true, status: true } } }
  });
  const allTasks = phases.flatMap((p) => p.tasks);
  const progress = calcTaskProgress(allTasks);
  const usedMinsAgg = await prisma.timeLog.aggregate({
    _sum: { durationMins: true },
    where: { task: { phase: { projectId } } }
  });
  const usedMins = usedMinsAgg._sum.durationMins || 0;
  const usedHours = Math.round(usedMins / 60 * 100) / 100;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { allocatedHours: true }
  });
  const allocatedHours = project?.allocatedHours ?? 0;
  const leftHours = Math.max(allocatedHours - usedHours, 0);
  return { progress, usedHours, leftHours, allocatedHours };
}
router.get("/", async (_req, res) => {
  const projects = await prisma.project.findMany({
    include: {
      phases: { include: { tasks: { select: { status: true } } } },
      memberships: { include: { user: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  const result = await Promise.all(
    projects.map(async (p) => {
      const allTasks = p.phases.flatMap((ph) => ph.tasks);
      const progress = calcTaskProgress(allTasks);
      const agg = await prisma.timeLog.aggregate({
        _sum: { durationMins: true },
        where: { task: { phase: { projectId: p.id } } }
      });
      const usedHours = Math.round((agg._sum.durationMins || 0) / 60 * 100) / 100;
      const leftHours = Math.max(p.allocatedHours - usedHours, 0);
      const phaseStart = p.phases.map((ph) => ph.startDate).filter(Boolean).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
      const phaseEnd = p.phases.map((ph) => ph.endDate).filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
      const startDate = p.startDate ?? phaseStart ?? null;
      const endDate = p.endDate ?? phaseEnd ?? null;
      return {
        ...p,
        phases: void 0,
        memberships: p.memberships,
        progress,
        usedHours,
        leftHours,
        startDate,
        endDate
      };
    })
  );
  res.json(result);
});
router.get("/basic", async (_req, res) => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      phases: { select: { id: true, name: true } }
    }
  });
  res.json(projects.map((p) => ({ id: p.id, name: p.title, phases: p.phases.map((ph) => ({ id: ph.id, name: ph.name })) })));
});
var createProjectSchema = import_zod.z.object({
  code: import_zod.z.string(),
  title: import_zod.z.string(),
  description: import_zod.z.string().default(""),
  ownerId: import_zod.z.string().optional(),
  allocatedHours: import_zod.z.number().int().nonnegative().default(0),
  visibility: import_zod.z.enum(["PRIVATE", "TEAM", "COMPANY"]).default("TEAM"),
  status: import_zod.z.enum(["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]).default("PLANNING"),
  startDate: import_zod.z.string().datetime().optional(),
  endDate: import_zod.z.string().datetime().optional(),
  memberUserIds: import_zod.z.array(import_zod.z.string()).optional().default([])
});
router.post("/", async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const data = parsed.data;
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    return res.status(400).json({ error: "startDate must be before or equal to endDate" });
  }
  try {
    const { memberUserIds, ...projectData } = data;
    const project = await prisma.project.create({ data: projectData });
    if (memberUserIds && memberUserIds.length > 0) {
      const roleMap = await inferProjectRoles(prisma, memberUserIds);
      for (const userId of memberUserIds) {
        const role = roleMap[userId] || "ENGINEER";
        await prisma.projectMembership.upsert({
          where: { projectId_userId: { projectId: project.id, userId } },
          update: { role },
          create: { projectId: project.id, userId, role }
        });
      }
    }
    res.status(201).json(project);
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to create project" });
  }
});
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      phases: { include: { tasks: { include: { assignees: { include: { user: true } } } } } },
      memberships: { include: { user: true } },
      owner: true
    }
  });
  if (!project) return res.status(404).json({ error: "Not found" });
  const meta = await projectProgressAndHours(id);
  res.json({ ...project, ...meta });
});
router.get("/:id/members", async (req, res) => {
  const id = req.params.id;
  const memberships = await prisma.projectMembership.findMany({
    where: { projectId: id },
    include: { user: true },
    orderBy: { user: { name: "asc" } }
  });
  const users = memberships.map((m) => m.user);
  res.json(users);
});
var updateProjectSchema = createProjectSchema.partial();
router.patch("/:id", async (req, res) => {
  const id = req.params.id;
  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const data = { ...parsed.data };
  if (data.startDate !== void 0) data.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== void 0) data.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    return res.status(400).json({ error: "startDate must be before or equal to endDate" });
  }
  const project = await prisma.project.update({ where: { id }, data });
  const meta = await projectProgressAndHours(id);
  res.json({ ...project, ...meta });
});
router.post("/:id/phases", async (req, res) => {
  const id = req.params.id;
  const schema = import_zod.z.object({
    name: import_zod.z.string(),
    description: import_zod.z.string().optional(),
    startDate: import_zod.z.string().datetime().optional(),
    endDate: import_zod.z.string().datetime().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { name, description, startDate, endDate } = parsed.data;
  const phase = await prisma.phase.create({
    data: {
      name,
      description,
      startDate: startDate ? new Date(startDate) : void 0,
      endDate: endDate ? new Date(endDate) : void 0,
      projectId: id
    }
  });
  res.status(201).json(phase);
});
router.patch("/:id/phases/:phaseId", async (req, res) => {
  const projectId = req.params.id;
  const phaseId = req.params.phaseId;
  const schema = import_zod.z.object({
    name: import_zod.z.string().optional(),
    description: import_zod.z.string().nullable().optional(),
    startDate: import_zod.z.string().datetime().nullable().optional(),
    endDate: import_zod.z.string().datetime().nullable().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const phase = await prisma.phase.findFirst({ where: { id: phaseId, projectId } });
  if (!phase) return res.status(404).json({ error: "Phase not found for project" });
  const data = { ...parsed.data };
  if (data.startDate !== void 0) data.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== void 0) data.endDate = data.endDate ? new Date(data.endDate) : null;
  try {
    const updated = await prisma.phase.update({ where: { id: phaseId }, data });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to update phase" });
  }
});
router.post("/:id/members", async (req, res) => {
  const projectId = req.params.id;
  const schema = import_zod.z.object({ userIds: import_zod.z.array(import_zod.z.string()).min(1), role: import_zod.z.enum(["DIRECTOR", "MANAGER", "CONSULTANT", "LEAD", "ENGINEER", "OPS"]).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { userIds, role } = parsed.data;
  try {
    let roleMap = {};
    if (!role) {
      roleMap = await inferProjectRoles(prisma, userIds);
    }
    let count = 0;
    for (const userId of userIds) {
      const r = role || roleMap[userId] || "ENGINEER";
      await prisma.projectMembership.upsert({
        where: { projectId_userId: { projectId, userId } },
        update: { role: r },
        create: { projectId, userId, role: r }
      });
      count++;
    }
    res.status(201).json({ count });
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to add members" });
  }
});
router.delete("/:id/members", async (req, res) => {
  const projectId = req.params.id;
  const schema = import_zod.z.object({ userIds: import_zod.z.array(import_zod.z.string()).min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { userIds } = parsed.data;
  try {
    const result = await prisma.projectMembership.deleteMany({
      where: { projectId, userId: { in: userIds } }
    });
    res.json({ count: result.count });
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to remove members" });
  }
});
router.post("/:id/phases/:phaseId/tasks", async (req, res) => {
  const projectId = req.params.id;
  const phaseId = req.params.phaseId;
  const schema = import_zod.z.object({
    title: import_zod.z.string().min(1),
    description: import_zod.z.string().optional().default(""),
    dueDate: import_zod.z.string().optional(),
    // Accepts ISO strings or YYYY-MM-DD
    status: import_zod.z.enum(["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED"]).optional().default("NOT_STARTED"),
    assigneeUserIds: import_zod.z.array(import_zod.z.string()).optional().default([]),
    priority: import_zod.z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { title, description, dueDate, status, assigneeUserIds, priority } = parsed.data;
  try {
    const phase = await prisma.phase.findFirst({ where: { id: phaseId, projectId } });
    if (!phase) return res.status(404).json({ error: "Phase not found for project" });
    let due;
    if (dueDate) {
      const asDate = new Date(dueDate);
      if (isNaN(asDate.getTime())) {
        return res.status(400).json({ error: "Invalid dueDate format" });
      }
      due = asDate;
    }
    const existingMemberships = assigneeUserIds.length ? await prisma.projectMembership.findMany({
      where: { projectId, userId: { in: assigneeUserIds } },
      select: { id: true, userId: true }
    }) : [];
    const existingUserIds = new Set(existingMemberships.map((m) => m.userId));
    const missingUserIds = (assigneeUserIds || []).filter((uid) => !existingUserIds.has(uid));
    let createdMemberships = [];
    if (missingUserIds.length > 0) {
      const roleMap = await inferProjectRoles(prisma, missingUserIds);
      await prisma.projectMembership.createMany({
        data: missingUserIds.map((uid) => ({ projectId, userId: uid, role: roleMap[uid] || "ENGINEER" })),
        skipDuplicates: true
      });
      createdMemberships = await prisma.projectMembership.findMany({
        where: { projectId, userId: { in: missingUserIds } },
        select: { id: true }
      });
    }
    const created = await prisma.task.create({
      data: {
        title,
        description: description || "",
        status,
        dueDate: due,
        priority: priority || "MEDIUM",
        phaseId,
        assignees: existingMemberships.length || createdMemberships.length ? { connect: [...existingMemberships, ...createdMemberships].map((m) => ({ id: m.id })) } : void 0
      },
      include: {
        assignees: { include: { user: true } }
      }
    });
    res.status(201).json(created);
  } catch (e) {
    console.error("Failed to create task", e);
    res.status(400).json({ error: e?.message || "Failed to create task" });
  }
});
var projects_default = router;
async function inferProjectRoles(prisma19, userIds) {
  if (!userIds || userIds.length === 0) return {};
  const users = await prisma19.user.findMany({
    where: { id: { in: userIds } },
    include: { role: true, department: true }
  });
  const map = {};
  for (const u of users) {
    const appRole = (u.role?.name || "").toUpperCase();
    const dept = (u.department?.name || "").toUpperCase();
    let pr = "ENGINEER";
    if (["DIRECTOR", "MANAGER", "LEAD", "CONSULTANT", "ENGINEER", "OPS"].includes(appRole)) {
      pr = appRole;
    } else if (dept.includes("OPS")) {
      pr = "OPS";
    } else if (appRole === "CLIENT") {
      pr = "CONSULTANT";
    }
    map[u.id] = pr;
  }
  return map;
}

// src/routes/tasks.ts
var import_express2 = require("express");
var import_client2 = require("@prisma/client");
var import_zod2 = require("zod");
var prisma2 = new import_client2.PrismaClient();
var router2 = (0, import_express2.Router)();
router2.post("/phases/:phaseId/tasks", async (req, res) => {
  const phaseId = req.params.phaseId;
  const schema = import_zod2.z.object({
    title: import_zod2.z.string(),
    description: import_zod2.z.string().default(""),
    dueDate: import_zod2.z.string().datetime().optional(),
    priority: import_zod2.z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { title, description, dueDate, priority } = parsed.data;
  const task = await prisma2.task.create({ data: { title, description, priority: priority || "MEDIUM", dueDate: dueDate ? new Date(dueDate) : null, phaseId } });
  res.status(201).json(task);
});
router2.get("/:id", async (req, res) => {
  const id = req.params.id;
  const task = await prisma2.task.findUnique({
    where: { id },
    include: {
      timeLogs: true,
      comments: {
        include: {
          author: true,
          replies: { include: { author: true } },
          mentions: true
        },
        orderBy: { createdAt: "asc" }
      },
      documents: true,
      phase: { include: { project: true } },
      assignees: { include: { user: true } },
      history: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json(task);
});
router2.patch("/:id", async (req, res) => {
  const id = req.params.id;
  const schema = import_zod2.z.object({
    title: import_zod2.z.string().optional(),
    description: import_zod2.z.string().optional(),
    status: import_zod2.z.nativeEnum(import_client2.TaskStatus).optional(),
    dueDate: import_zod2.z.string().datetime().nullable().optional(),
    priority: import_zod2.z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    assigneeUserIds: import_zod2.z.array(import_zod2.z.string()).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { assigneeUserIds, ...rest } = parsed.data;
  const data = { ...rest };
  if (data.dueDate !== void 0) {
    data.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  await prisma2.task.update({ where: { id }, data });
  if (assigneeUserIds !== void 0) {
    const t = await prisma2.task.findUnique({
      where: { id },
      select: { phase: { select: { projectId: true } } }
    });
    const projectId = t?.phase?.projectId;
    if (!projectId) return res.status(400).json({ error: "Task phase/project not found" });
    const existing = assigneeUserIds.length ? await prisma2.projectMembership.findMany({ where: { projectId, userId: { in: assigneeUserIds } }, select: { id: true, userId: true } }) : [];
    const existingIds = new Set(existing.map((e) => e.userId));
    const missing = (assigneeUserIds || []).filter((uid) => !existingIds.has(uid));
    if (missing.length > 0) {
      await prisma2.projectMembership.createMany({ data: missing.map((uid) => ({ projectId, userId: uid, role: "ENGINEER" })), skipDuplicates: true });
    }
    const allMemberships = assigneeUserIds.length ? await prisma2.projectMembership.findMany({ where: { projectId, userId: { in: assigneeUserIds } }, select: { id: true } }) : [];
    await prisma2.task.update({
      where: { id },
      data: {
        assignees: { set: [], ...allMemberships.length ? { connect: allMemberships.map((m) => ({ id: m.id })) } : {} }
      }
    });
  }
  const updated = await prisma2.task.findUnique({
    where: { id },
    include: { assignees: { include: { user: true } } }
  });
  res.json(updated);
});
router2.post("/:taskId/comments", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "x-user-id required" });
  const taskId = req.params.taskId;
  const schema = import_zod2.z.object({
    content: import_zod2.z.string().min(1),
    parentId: import_zod2.z.string().optional(),
    mentionUserIds: import_zod2.z.array(import_zod2.z.string()).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { content, parentId, mentionUserIds } = parsed.data;
  try {
    const task = await prisma2.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    const comment = await prisma2.comment.create({
      data: {
        taskId,
        authorId: userId,
        content,
        parentId: parentId || void 0,
        ...mentionUserIds && mentionUserIds.length ? { mentions: { connect: mentionUserIds.map((id) => ({ id })) } } : {}
      },
      include: { author: true, replies: { include: { author: true } }, mentions: true }
    });
    const snippet = content.length > 180 ? `${content.slice(0, 180)}\u2026` : content;
    await prisma2.historyEvent.create({
      data: {
        taskId,
        type: import_client2.HistoryType.COMMENT,
        message: `Comment: ${snippet}`,
        createdById: userId
      }
    });
    res.status(201).json(comment);
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to create comment" });
  }
});
router2.get("/:taskId/comments", async (req, res) => {
  const taskId = req.params.taskId;
  try {
    const comments = await prisma2.comment.findMany({
      where: { taskId, parentId: null },
      include: { author: true, replies: { include: { author: true } }, mentions: true },
      orderBy: { createdAt: "asc" }
    });
    res.json(comments);
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to load comments" });
  }
});
router2.get("/:taskId/history", async (req, res) => {
  const taskId = req.params.taskId;
  try {
    const history = await prisma2.historyEvent.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
      include: { createdBy: true }
    });
    res.json(history);
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to load history" });
  }
});
var tasks_default = router2;

// src/routes/timelogs.ts
var import_express3 = require("express");
var import_client3 = require("@prisma/client");
var import_zod3 = require("zod");
var import_multer = __toESM(require("multer"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var prisma3 = new import_client3.PrismaClient();
var router3 = (0, import_express3.Router)();
var UPLOAD_DIR = import_path.default.resolve(process.cwd(), "uploads");
try {
  import_fs.default.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (_) {
}
var storage = import_multer.default.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, `${unique}-${safe}`);
  }
});
var upload = (0, import_multer.default)({ storage });
var createSchema = import_zod3.z.object({
  startedAt: import_zod3.z.string().datetime(),
  endedAt: import_zod3.z.string().datetime(),
  description: import_zod3.z.string()
});
router3.post("/tasks/:taskId/timelogs", upload.single("file"), async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "x-user-id required" });
  const taskId = req.params.taskId;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { startedAt, endedAt, description } = parsed.data;
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const durationMins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 6e4));
  try {
    let attachmentId;
    if (req.file) {
      const file = req.file;
      const task = await prisma3.task.findUnique({ where: { id: taskId }, include: { phase: true } });
      const projectId = task?.phase?.projectId;
      const attachment = await prisma3.attachment.create({
        data: {
          filePath: import_path.default.relative(process.cwd(), import_path.default.join(UPLOAD_DIR, file.filename)),
          fileType: file.mimetype || "application/octet-stream",
          projectId: projectId || void 0
        }
      });
      attachmentId = attachment.id;
    }
    const log = await prisma3.timeLog.create({
      data: { taskId, userId, startedAt: start, endedAt: end, durationMins, description, attachmentId }
    });
    try {
      await prisma3.historyEvent.create({
        data: {
          taskId,
          type: "TIME_LOG",
          message: `Logged ${Math.round(durationMins / 60 * 10) / 10}h: ${description}`,
          createdById: String(userId)
        }
      });
    } catch {
    }
    res.status(201).json(log);
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to create time log" });
  }
});
router3.get("/tasks/:taskId/timelogs", async (req, res) => {
  const scope = req.query.scope || "all";
  const taskId = req.params.taskId;
  const where = { taskId };
  if (scope === "mine") {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "x-user-id required" });
    where.userId = userId;
  }
  const logs = await prisma3.timeLog.findMany({ where, orderBy: { startedAt: "desc" }, include: { attachment: true } });
  res.json(logs);
});
var timelogs_default = router3;

// src/routes/users.ts
var import_express4 = require("express");
var import_client6 = require("@prisma/client");
var import_zod4 = require("zod");

// src/middleware/super-admin.ts
var import_client5 = require("@prisma/client");

// src/utils/settings.ts
var import_client4 = require("@prisma/client");
var prisma4 = new import_client4.PrismaClient();
var cachedEmail = null;
var cachedAt = 0;
async function getSuperAdminEmail() {
  const now = Date.now();
  if (cachedEmail && now - cachedAt < 3e4) return cachedEmail;
  const rec = await prisma4.systemSetting.findUnique({ where: { key: "SUPERADMIN_EMAIL" } }).catch(() => null);
  const envEmail = String(process.env.SUPERADMIN_EMAIL || "").trim();
  const email = (rec?.value || envEmail || "admin@company.com").trim();
  cachedEmail = email;
  cachedAt = now;
  return email;
}
async function setSuperAdminEmail(email) {
  const value = email.trim();
  await prisma4.systemSetting.upsert({ where: { key: "SUPERADMIN_EMAIL" }, update: { value }, create: { key: "SUPERADMIN_EMAIL", value } });
  cachedEmail = value;
  cachedAt = Date.now();
  return value;
}

// src/middleware/super-admin.ts
var prisma5 = new import_client5.PrismaClient();
async function requireSuperAdmin(req, res, next) {
  try {
    const adminEmail = (await getSuperAdminEmail()).toLowerCase();
    if (!adminEmail) {
      return res.status(500).json({ error: "SUPERADMIN_EMAIL is not configured" });
    }
    const impersonatingAdminId = req.adminId;
    const userId = req.userId;
    if (!userId && !impersonatingAdminId) return res.status(401).json({ error: "Authentication required" });
    if (impersonatingAdminId) {
      const adminUser = await prisma5.user.findUnique({ where: { id: impersonatingAdminId } });
      if (!adminUser) return res.status(401).json({ error: "Invalid admin" });
      const isSuperAdmin2 = adminUser.email.toLowerCase() === adminEmail;
      if (!isSuperAdmin2) return res.status(403).json({ error: "Admin only" });
      req.user = adminUser;
      return next();
    }
    const user = await prisma5.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: "Invalid user" });
    const isSuper = user.email.toLowerCase() === adminEmail;
    if (!isSuper) return res.status(403).json({ error: "Admin only" });
    req.user = user;
    return next();
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Authorization failed" });
  }
}
async function isSuperAdminByUserId(userId) {
  if (!userId) return false;
  const adminEmail = String(process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase();
  if (!adminEmail) return false;
  const user = await prisma5.user.findUnique({ where: { id: userId } });
  return !!user && user.email.toLowerCase() === adminEmail;
}

// src/routes/users.ts
var prisma6 = new import_client6.PrismaClient();
var router4 = (0, import_express4.Router)();
var paginationSchema = import_zod4.z.object({
  page: import_zod4.z.coerce.number().int().positive().default(1),
  limit: import_zod4.z.coerce.number().int().positive().max(100).default(20),
  search: import_zod4.z.string().optional(),
  roleId: import_zod4.z.string().optional(),
  departmentId: import_zod4.z.string().optional(),
  isActive: import_zod4.z.coerce.boolean().optional()
});
router4.get("/", requireSuperAdmin, async (req, res) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { page, limit, search, roleId, departmentId, isActive } = parsed.data;
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search.toLowerCase(), mode: "insensitive" } }
    ];
  }
  if (roleId) where.roleId = roleId;
  if (departmentId) where.departmentId = departmentId;
  if (isActive !== void 0) where.isActive = isActive;
  const [total, rows] = await Promise.all([
    prisma6.user.count({ where }),
    prisma6.user.findMany({
      where,
      include: { role: { select: { name: true } }, department: { select: { name: true } } },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit
    })
  ]);
  const items = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isActive: u.isActive,
    verified: !!u.emailVerifiedAt,
    roleId: u.roleId,
    departmentId: u.departmentId,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    role: u.role?.name?.toLowerCase?.() || "",
    department: u.department?.name || ""
  }));
  res.json({ total, page, limit, items });
});
var createUserSchema = import_zod4.z.object({
  name: import_zod4.z.string().min(1),
  email: import_zod4.z.string().email(),
  roleId: import_zod4.z.string(),
  departmentId: import_zod4.z.string(),
  isActive: import_zod4.z.boolean().optional()
});
router4.post("/", requireSuperAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { name, email, roleId, departmentId, isActive } = parsed.data;
  try {
    const user = await prisma6.user.create({
      data: { name, email: email.trim().toLowerCase(), roleId, departmentId, isActive: isActive ?? true }
    });
    res.status(201).json(user);
  } catch (e) {
    if (e.code === "P2002" && e.meta?.target?.includes("email")) {
      return res.status(409).json({ error: "Email already exists" });
    }
    res.status(400).json({ error: e?.message || "Failed to create user" });
  }
});
router4.get("/me", async (req, res) => {
  const auth = String(req.header("authorization") || "");
  const allowDevHeaders = (process.env.ALLOW_DEV_HEADERS || "").toLowerCase() === "true";
  let userId = req.userId;
  let u = null;
  try {
    const hasBearer = auth.toLowerCase().startsWith("bearer ");
    if (hasBearer && !userId && allowDevHeaders) {
      const fromCookie = req.cookies?.xuid || "";
      if (fromCookie) userId = String(fromCookie);
    }
    if (userId) {
      u = await prisma6.user.findUnique({ where: { id: userId }, include: { role: true, department: true } });
    }
    if (!u && allowDevHeaders && !hasBearer) {
      const email = String(req.header("x-email") || req.query.email || "").toLowerCase();
      if (email) {
        u = await prisma6.user.findUnique({ where: { email }, include: { role: true, department: true } });
      }
    }
    if (!u && allowDevHeaders && !hasBearer) {
      u = await prisma6.user.findFirst({ include: { role: true, department: true }, orderBy: { createdAt: "asc" } });
    }
    if (!u) {
      const role = await prisma6.appRole.findFirst({}) || await prisma6.appRole.create({ data: { name: "Director" } });
      const dept = await prisma6.department.findFirst({}) || await prisma6.department.create({ data: { name: "Executive Department" } });
      u = await prisma6.user.create({ data: { name: "Admin", email: "admin@company.com", roleId: role.id, departmentId: dept.id, isActive: true, emailVerifiedAt: /* @__PURE__ */ new Date() }, include: { role: true, department: true } });
    }
    const superById = await isSuperAdminByUserId(userId);
    const adminEmail = (await getSuperAdminEmail()).toLowerCase();
    const isSuper = superById || !!adminEmail && String(u?.email || "").toLowerCase() === adminEmail;
    const me = {
      id: u.id,
      name: u.name,
      email: u.email,
      isActive: u.isActive,
      role: isSuper ? "admin" : u.role?.name?.toLowerCase?.() || "",
      department: u.department?.name || "",
      lastActive: (/* @__PURE__ */ new Date()).toISOString(),
      isSuperAdmin: isSuper
    };
    res.json(me);
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to resolve current user" });
  }
});
router4.get("/:id", requireSuperAdmin, async (req, res) => {
  const u = await prisma6.user.findUnique({
    where: { id: req.params.id },
    include: { role: true, department: true }
  });
  if (!u) return res.status(404).json({ error: "Not found" });
  const user = {
    id: u.id,
    name: u.name,
    email: u.email,
    isActive: u.isActive,
    verified: !!u.emailVerifiedAt,
    roleId: u.roleId,
    departmentId: u.departmentId,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    role: u.role?.name?.toLowerCase?.() || "",
    department: u.department?.name || ""
  };
  res.json(user);
});
var updateUserSchema = createUserSchema.partial();
router4.patch("/:id", requireSuperAdmin, async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const data = { ...parsed.data };
  if (data.email) data.email = data.email.trim().toLowerCase();
  try {
    const user = await prisma6.user.update({ where: { id: req.params.id }, data });
    res.json(user);
  } catch (e) {
    if (e.code === "P2002" && e.meta?.target?.includes("email")) {
      return res.status(409).json({ error: "Email already exists" });
    }
    if (e.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(400).json({ error: e?.message || "Failed to update user" });
  }
});
router4.delete("/:id", requireSuperAdmin, async (req, res) => {
  const id = String(req.params.id);
  const hard = String(req.query.hard || req.query.force || "").toLowerCase() === "true";
  try {
    const u = await prisma6.user.findUnique({ where: { id } });
    if (!u) return res.status(404).json({ error: "Not found" });
    const adminEmail = String(process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase();
    if (adminEmail && String(u.email).toLowerCase() === adminEmail) {
      return res.status(403).json({ error: "Cannot delete super admin user" });
    }
    if (hard) {
      const adminUser = await prisma6.user.findFirst({ where: { email: adminEmail } });
      if (!adminUser) return res.status(500).json({ error: "Super admin user not found" });
      await prisma6.$transaction(async (tx) => {
        await tx.projectMembership.deleteMany({ where: { userId: id } });
        await tx.timeLog.deleteMany({ where: { userId: id } });
        await tx.notification.deleteMany({ where: { userId: id } });
        await tx.authToken.deleteMany({ where: { userId: id } });
        await tx.calendarOAuthState.deleteMany({ where: { userId: id } });
        await tx.calendarSource.deleteMany({ where: { userId: id } });
        await tx.calendarAccount.deleteMany({ where: { userId: id } });
        await tx.document.updateMany({ where: { reviewerId: id }, data: { reviewerId: null } });
        await tx.document.updateMany({ where: { createdById: id }, data: { createdById: adminUser.id } });
        await tx.historyEvent.updateMany({ where: { createdById: id }, data: { createdById: adminUser.id } });
        await tx.comment.updateMany({ where: { authorId: id }, data: { authorId: adminUser.id } });
        await tx.project.updateMany({ where: { ownerId: id }, data: { ownerId: null } });
        try {
          const db7 = tx;
          await db7.impersonationSession.deleteMany({ where: { OR: [{ userId: id }, { adminId: id }] } });
        } catch {
        }
        await tx.user.delete({ where: { id } });
      });
      return res.status(204).end();
    }
    try {
      await prisma6.user.delete({ where: { id } });
      return res.status(204).end();
    } catch (e) {
      if (e?.code === "P2003" || e?.code === "P2014" || String(e?.message || "").toLowerCase().includes("foreign key")) {
        const newEmail = `archived+${id}@example.com`;
        await prisma6.user.update({ where: { id }, data: { isActive: false, email: newEmail, name: "Archived User", passwordHash: null } });
        return res.status(200).json({ ok: true, scrubbed: true });
      }
      throw e;
    }
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Not found" });
    return res.status(400).json({ error: e?.message || "Failed to delete user" });
  }
});
var users_default = router4;

// src/routes/departments.ts
var import_express5 = require("express");
var import_client7 = require("@prisma/client");
var import_zod5 = require("zod");
var prisma7 = new import_client7.PrismaClient();
var router5 = (0, import_express5.Router)();
router5.get("/", async (_req, res) => {
  const items = await prisma7.department.findMany({ orderBy: { name: "asc" } });
  res.json(items);
});
var bodySchema = import_zod5.z.object({ name: import_zod5.z.string().min(1) });
router5.post("/", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    const item = await prisma7.department.create({ data: parsed.data });
    res.status(201).json(item);
  } catch (e) {
    if (e.code === "P2002") return res.status(409).json({ error: "Department already exists" });
    res.status(400).json({ error: e?.message || "Failed to create department" });
  }
});
router5.patch("/:id", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    const item = await prisma7.department.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(item);
  } catch (e) {
    if (e.code === "P2002") return res.status(409).json({ error: "Department already exists" });
    if (e.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(400).json({ error: e?.message || "Failed to update department" });
  }
});
router5.patch("/:id/lead", async (req, res) => {
  const body = import_zod5.z.object({ userId: import_zod5.z.string().min(1) }).parse(req.body || {});
  try {
    const dept = await prisma7.department.update({ where: { id: req.params.id }, data: { leadId: body.userId } });
    res.json(dept);
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(400).json({ error: e?.message || "Failed to set lead" });
  }
});
router5.patch("/:id/settings", async (req, res) => {
  const body = import_zod5.z.object({ disabled: import_zod5.z.coerce.boolean().optional() }).parse(req.body || {});
  try {
    const dept = await prisma7.department.update({ where: { id: req.params.id }, data: body });
    res.json(dept);
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(400).json({ error: e?.message || "Failed to update settings" });
  }
});
router5.delete("/:id", async (req, res) => {
  const id = req.params.id;
  const force = String(req.query.force || "").toLowerCase() === "true";
  const toDeptId = req.query.toDeptId || "";
  const count = await prisma7.user.count({ where: { departmentId: id } });
  if (count > 0 && !force) {
    return res.status(409).json({ error: "Users reference this department" });
  }
  try {
    if (count > 0 && force) {
      let targetId = toDeptId;
      if (!targetId) {
        const unassigned = await prisma7.department.upsert({
          where: { name: "Unassigned" },
          update: {},
          create: { name: "Unassigned" }
        });
        targetId = unassigned.id;
      } else {
        const exists = await prisma7.department.findUnique({ where: { id: targetId } });
        if (!exists) return res.status(400).json({ error: "toDeptId not found" });
        if (targetId === id) return res.status(400).json({ error: "toDeptId cannot equal the department being deleted" });
      }
      await prisma7.user.updateMany({ where: { departmentId: id }, data: { departmentId: targetId } });
    }
    await prisma7.department.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(400).json({ error: e?.message || "Failed to delete department" });
  }
});
var departments_default = router5;

// src/routes/roles.ts
var import_express6 = require("express");
var import_client8 = require("@prisma/client");
var import_zod6 = require("zod");
var prisma8 = new import_client8.PrismaClient();
var router6 = (0, import_express6.Router)();
router6.get("/", async (_req, res) => {
  const items = await prisma8.appRole.findMany({ orderBy: { name: "asc" } });
  res.json(items);
});
var bodySchema2 = import_zod6.z.object({ name: import_zod6.z.string().min(1) });
router6.post("/", async (req, res) => {
  const parsed = bodySchema2.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    const item = await prisma8.appRole.create({ data: parsed.data });
    res.status(201).json(item);
  } catch (e) {
    if (e.code === "P2002") return res.status(409).json({ error: "Role already exists" });
    res.status(400).json({ error: e?.message || "Failed to create role" });
  }
});
router6.patch("/:id", async (req, res) => {
  const parsed = bodySchema2.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    const item = await prisma8.appRole.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(item);
  } catch (e) {
    if (e.code === "P2002") return res.status(409).json({ error: "Role already exists" });
    if (e.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(400).json({ error: e?.message || "Failed to update role" });
  }
});
router6.delete("/:id", async (req, res) => {
  const id = req.params.id;
  const force = String(req.query.force || "").toLowerCase() === "true";
  const toRoleId = req.query.toRoleId || "";
  const count = await prisma8.user.count({ where: { roleId: id } });
  if (count > 0 && !force) return res.status(409).json({ error: "Users reference this role" });
  try {
    if (count > 0 && force) {
      let targetId = toRoleId;
      if (!targetId) {
        const unassigned = await prisma8.appRole.upsert({
          where: { name: "Unassigned" },
          update: {},
          create: { name: "Unassigned" }
        });
        targetId = unassigned.id;
      } else {
        const exists = await prisma8.appRole.findUnique({ where: { id: targetId } });
        if (!exists) return res.status(400).json({ error: "toRoleId not found" });
        if (targetId === id) return res.status(400).json({ error: "toRoleId cannot equal the role being deleted" });
      }
      await prisma8.user.updateMany({ where: { roleId: id }, data: { roleId: targetId } });
    }
    await prisma8.appRole.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(400).json({ error: e?.message || "Failed to delete role" });
  }
});
var roles_default = router6;

// src/routes/auth.ts
var import_express7 = require("express");
var import_client9 = require("@prisma/client");
var import_zod7 = require("zod");
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var import_crypto = __toESM(require("crypto"));

// src/utils/mailer.ts
var import_nodemailer = __toESM(require("nodemailer"));
function isTruthy(v) {
  return String(v || "").toLowerCase() === "true";
}
function emailEnabled() {
  return !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
}
function getTransport() {
  if (!emailEnabled()) throw new Error("SMTP not configured");
  const secure = isTruthy(process.env.SMTP_SECURE);
  const port2 = Number(process.env.SMTP_PORT || (secure ? 465 : 587));
  return import_nodemailer.default.createTransport({
    host: process.env.SMTP_HOST,
    port: port2,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}
async function sendMail(to, subject, html, text) {
  if (!emailEnabled()) return { ok: false, skipped: true };
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@example.com";
  const transporter = getTransport();
  const info = await transporter.sendMail({ from, to, subject, text: text || html.replace(/<[^>]+>/g, ""), html });
  return { ok: true, messageId: info.messageId };
}
function renderVerifyEmail(link) {
  return {
    subject: "Verify your email",
    html: `
      <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2>Verify your email</h2>
        <p>Click the button below to verify your email and continue.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none" target="_blank" rel="noopener">Verify Email</a></p>
        <p>If the button doesn't work, copy and paste this link:</p>
        <p><a href="${link}">${link}</a></p>
      </div>
    `
  };
}
function renderInviteEmail(link, name, roleName, departmentName) {
  const brand = (process.env.MAIL_FROM || "Remora").replace(/<.*?>/g, "").trim() || "Remora";
  const role = roleName ? String(roleName) : void 0;
  const dept = departmentName ? String(departmentName) : void 0;
  const tagStyle = "display:inline-block;padding:6px 10px;border-radius:9999px;background:#F1F5F9;color:#0F172A;font-size:12px;font-weight:600;margin-right:8px;border:1px solid #E2E8F0";
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
          <h2 style="margin:0 0 8px 0;font-size:22px;line-height:28px">Welcome${name ? `, ${name}` : ""}</h2>
          <p style="margin:0 0 12px 0;font-size:14px;line-height:22px;color:#334155">You've been invited to join <strong>${brand}</strong>. Use the button below to create your password and activate your account.</p>
          ${role || dept ? `
          <div style="margin:14px 0 6px 0">
            ${role ? `<span style="${tagStyle}">Role: ${role}</span>` : ""}
            ${dept ? `<span style="${tagStyle}">Department: ${dept}</span>` : ""}
          </div>` : ""}
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
    `
  };
}
function renderApprovedEmail(baseUrl3) {
  const link = baseUrl3.replace(/\/$/, "") + "/login";
  return {
    subject: "Your account has been approved",
    html: `
      <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2>You're in!</h2>
        <p>Your account has been approved. You can now sign in.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none" target="_blank" rel="noopener">Sign in</a></p>
      </div>
    `
  };
}
function renderPasswordResetEmail(link, name) {
  const brand = (process.env.MAIL_FROM || "Remora").replace(/<.*?>/g, "").trim() || "Remora";
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
          <p style="margin:0 0 10px 0">${name ? `Hi ${name},` : "Hi,"}</p>
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
  };
}

// src/routes/auth.ts
var prisma9 = new import_client9.PrismaClient();
var db = prisma9;
var router7 = (0, import_express7.Router)();
var strongPassword = import_zod7.z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Password must include letters and numbers");
var loginSchema = import_zod7.z.object({ email: import_zod7.z.string().email(), password: import_zod7.z.string().min(4) });
var registerSchema = import_zod7.z.object({ name: import_zod7.z.string().min(1), email: import_zod7.z.string().email(), password: strongPassword, roleId: import_zod7.z.string(), departmentId: import_zod7.z.string() });
var signupSchema = import_zod7.z.object({
  name: import_zod7.z.string().min(1),
  email: import_zod7.z.string().email(),
  password: strongPassword,
  desiredDepartmentId: import_zod7.z.string(),
  intendedRoleId: import_zod7.z.string().optional(),
  managerName: import_zod7.z.string().optional(),
  billable: import_zod7.z.coerce.boolean().optional()
});
var setPasswordSchema = import_zod7.z.object({ email: import_zod7.z.string().email(), password: strongPassword });
function sign(userId) {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return import_jsonwebtoken.default.sign({ sub: userId }, secret, { expiresIn: "15m" });
}
function hashToken(raw) {
  return import_crypto.default.createHash("sha256").update(raw).digest("hex");
}
async function createToken(userId, type, ttlSeconds) {
  const raw = import_crypto.default.randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1e3);
  await db.authToken.create({ data: { userId, type, tokenHash, expiresAt } });
  return { raw, expiresAt };
}
async function consumeToken(type, raw) {
  const tokenHash = hashToken(raw);
  const rec = await db.authToken.findFirst({ where: { tokenHash, type, usedAt: null, expiresAt: { gt: /* @__PURE__ */ new Date() } } });
  if (!rec) return null;
  await db.authToken.update({ where: { id: rec.id }, data: { usedAt: /* @__PURE__ */ new Date() } });
  return rec;
}
router7.post("/login", loginRateLimiter(), async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { email, password } = parsed.data;
  const lower = email.toLowerCase();
  let user = null;
  try {
    user = await prisma9.user.findUnique({ where: { email: lower } });
    const adminEmail = (await getSuperAdminEmail()).toLowerCase();
    const adminEnvPass = String(process.env.SUPERADMIN_PASSWORD || "");
    const isSuperAttempt = !!adminEmail && lower === adminEmail;
    if (isSuperAttempt && adminEnvPass && password === adminEnvPass) {
      const role = await prisma9.appRole.findFirst({ where: { name: { equals: "Director", mode: "insensitive" } } }) || await prisma9.appRole.create({ data: { name: "Director" } });
      const dept = await prisma9.department.findFirst({ where: { name: { equals: "Executive Department", mode: "insensitive" } } }) || await prisma9.department.create({ data: { name: "Executive Department" } });
      if (!user) {
        const hash = await import_bcryptjs.default.hash(adminEnvPass, 10);
        user = await prisma9.user.create({ data: { name: "Admin", email: lower, roleId: role.id, departmentId: dept.id, isActive: true, emailVerifiedAt: /* @__PURE__ */ new Date(), passwordHash: hash } });
      } else if (!user.passwordHash) {
        const hash = await import_bcryptjs.default.hash(adminEnvPass, 10);
        user = await prisma9.user.update({ where: { id: user.id }, data: { passwordHash: hash, isActive: true, emailVerifiedAt: user.emailVerifiedAt || /* @__PURE__ */ new Date() } });
      }
    } else {
      if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid credentials" });
      if (user.lockedUntil && user.lockedUntil > /* @__PURE__ */ new Date()) return res.status(403).json({ error: "Account temporarily locked. Try again later." });
      const ok = await import_bcryptjs.default.compare(password, user.passwordHash);
      if (!ok) {
        const attempts = (user.failedLoginAttempts || 0) + 1;
        const lock = attempts >= 5 ? { lockedUntil: new Date(Date.now() + 15 * 60 * 1e3) } : {};
        await prisma9.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts, ...lock } });
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (!user.isActive || !user.emailVerifiedAt) return res.status(403).json({ error: "Account not verified or inactive" });
      user = await prisma9.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: /* @__PURE__ */ new Date() } });
    }
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Login failed" });
  }
  const token = sign(user.id);
  const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
  const allowDevHeaders = (process.env.ALLOW_DEV_HEADERS || "").toLowerCase() === "true";
  if (allowDevHeaders) {
    res.cookie("xuid", user.id, { httpOnly: true, sameSite: "lax", secure: isProd });
  }
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});
router7.post("/signup", loginRateLimiter(), async (req, res) => {
  const body = signupSchema.parse(req.body || {});
  const email = body.email.trim().toLowerCase();
  const hash = await import_bcryptjs.default.hash(body.password, 10);
  try {
    const existing = await prisma9.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already registered" });
    const role = await prisma9.appRole.findFirst({ where: { name: { equals: "Client", mode: "insensitive" } } }) || await prisma9.appRole.create({ data: { name: "Client" } });
    const dept = await prisma9.department.findUnique({ where: { id: body.desiredDepartmentId } });
    if (!dept) return res.status(400).json({ error: "Invalid department" });
    const user = await prisma9.user.create({ data: {
      name: body.name,
      email,
      roleId: role.id,
      departmentId: dept.id,
      passwordHash: hash,
      isActive: false,
      requestedDepartmentId: body.desiredDepartmentId,
      intendedRoleId: body.intendedRoleId || null,
      billable: !!body.billable
    } });
    const db7 = prisma9;
    await db7.approvalRequest.create({ data: { userId: user.id, requestedDepartmentId: body.desiredDepartmentId, requestedRoleId: body.intendedRoleId || null, billable: !!body.billable, referredBy: null, managerName: body.managerName || null } });
    const { raw } = await createToken(user.id, "EMAIL_VERIFY", 24 * 3600);
    const clientBase = process.env.FRONTEND_BASE_URL || "http://localhost:5173";
    const verifyUrl = `${clientBase}/invite/accept?token=${encodeURIComponent(raw)}`;
    if (emailEnabled()) {
      const { subject, html } = renderVerifyEmail(verifyUrl);
      await sendMail(user.email, subject, html);
    }
    return res.status(201).json({ ok: true, ...emailEnabled() ? {} : { verifyUrl }, userId: user.id });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Failed to sign up" });
  }
});
router7.post("/register", loginRateLimiter(), async (req, res) => {
  const auth = req.header("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return res.status(401).json({ error: "Authentication required" });
  try {
    const secret = process.env.JWT_SECRET || "dev-secret";
    const payload = import_jsonwebtoken.default.verify(auth.slice(7), secret);
    const ok = await isSuperAdminByUserId(String(payload?.sub || ""));
    if (!ok) return res.status(403).json({ error: "Admin only" });
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { name, email, password, roleId, departmentId } = parsed.data;
  const hash = await import_bcryptjs.default.hash(password, 10);
  try {
    const adminEmail = (await getSuperAdminEmail()).toLowerCase();
    if (email.toLowerCase() === adminEmail) {
      return res.status(400).json({ error: "Cannot create another super admin" });
    }
    const user = await prisma9.user.create({ data: { name, email: email.toLowerCase(), roleId, departmentId, passwordHash: hash, isActive: true } });
    const { raw } = await createToken(user.id, "EMAIL_VERIFY", 24 * 3600);
    const clientBase = process.env.FRONTEND_BASE_URL || "http://localhost:5173";
    const verifyUrl = `${clientBase}/invite/accept?token=${encodeURIComponent(raw)}`;
    if (emailEnabled()) {
      const { subject, html } = renderInviteEmail(verifyUrl, user.name);
      await sendMail(user.email, subject, html);
    }
    res.status(201).json({ ok: true, user: { id: user.id, name: user.name, email: user.email }, ...emailEnabled() ? {} : { verifyUrl } });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Failed to register" });
  }
});
router7.post("/bootstrap-admin", async (_req, res) => {
  const allowBootstrap = (process.env.ALLOW_ADMIN_BOOTSTRAP || process.env.ENABLE_DEV_AUTH || "").toLowerCase() === "true";
  if (!allowBootstrap) return res.status(403).json({ error: "Forbidden" });
  const adminEmail = (await getSuperAdminEmail()).toLowerCase();
  const name = "Admin";
  const role = await prisma9.appRole.findFirst({ where: { name: { equals: "Director", mode: "insensitive" } } }) || await prisma9.appRole.create({ data: { name: "Director" } });
  const dept = await prisma9.department.findFirst({ where: { name: { equals: "Executive Department", mode: "insensitive" } } }) || await prisma9.department.create({ data: { name: "Executive Department" } });
  let user = await prisma9.user.findUnique({ where: { email: adminEmail } });
  const adminEnvPass = String(process.env.SUPERADMIN_PASSWORD || "");
  if (!user) {
    const passHash = adminEnvPass ? await import_bcryptjs.default.hash(adminEnvPass, 10) : null;
    user = await prisma9.user.create({ data: { name, email: adminEmail, roleId: role.id, departmentId: dept.id, isActive: true, emailVerifiedAt: /* @__PURE__ */ new Date(), ...passHash ? { passwordHash: passHash } : {} } });
  } else if (adminEnvPass && !user.passwordHash) {
    const passHash = await import_bcryptjs.default.hash(adminEnvPass, 10);
    user = await prisma9.user.update({ where: { id: user.id }, data: { passwordHash: passHash } });
  }
  const token = sign(user.id);
  const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
  const allowDevHeaders = (process.env.ALLOW_DEV_HEADERS || "").toLowerCase() === "true";
  if (allowDevHeaders) {
    res.cookie("xuid", user.id, { httpOnly: true, sameSite: "lax", secure: isProd });
  }
  res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email }, token });
});
router7.post("/set-password", loginRateLimiter(), async (req, res) => {
  const parsed = setPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { email, password } = parsed.data;
  const hash = await import_bcryptjs.default.hash(password, 10);
  try {
    const prod = (process.env.NODE_ENV || "").toLowerCase() === "production";
    if (prod) {
      const auth = req.header("authorization") || "";
      if (!auth.toLowerCase().startsWith("bearer ")) return res.status(401).json({ error: "Authentication required" });
      const secret = process.env.JWT_SECRET || "dev-secret";
      try {
        const payload = import_jsonwebtoken.default.verify(auth.slice(7), secret);
        const me = await prisma9.user.findUnique({ where: { id: String(payload?.sub || "") }, include: { role: true } });
        const r = String(me?.role?.name || "").toLowerCase();
        const isRoleAdmin = ["director", "manager"].includes(r);
        const isSuper = await isSuperAdminByUserId(String(payload?.sub || ""));
        if (!(isRoleAdmin || isSuper) && String(me?.email || "").toLowerCase() !== email.toLowerCase()) {
          return res.status(403).json({ error: "Only admins or the same user can change password" });
        }
      } catch {
        return res.status(401).json({ error: "Invalid token" });
      }
    }
    const user = await prisma9.user.update({ where: { email: email.toLowerCase() }, data: { passwordHash: hash } });
    res.json({ ok: true, id: user.id });
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Failed to set password" });
  }
});
router7.post("/public-register", loginRateLimiter(), async (req, res) => {
  const allowPublic = (process.env.PUBLIC_REGISTRATION || "").toLowerCase() === "true";
  if (!allowPublic) return res.status(403).json({ error: "Public registration is disabled" });
  const body = import_zod7.z.object({ name: import_zod7.z.string().min(1), email: import_zod7.z.string().email(), password: strongPassword }).parse(req.body || {});
  const email = body.email.trim().toLowerCase();
  const hash = await import_bcryptjs.default.hash(body.password, 10);
  try {
    const clientRole = await prisma9.appRole.findFirst({ where: { name: { equals: "Client", mode: "insensitive" } } });
    const anyDept = await prisma9.department.findFirst({});
    if (!clientRole || !anyDept) return res.status(500).json({ error: "Server not configured for public registration" });
    const user = await prisma9.user.create({ data: { name: body.name, email, roleId: clientRole.id, departmentId: anyDept.id, passwordHash: hash, isActive: false } });
    const { raw } = await createToken(user.id, "EMAIL_VERIFY", 24 * 3600);
    const clientBase = process.env.FRONTEND_BASE_URL || "http://localhost:5173";
    const verifyUrl = `${clientBase}/invite/accept?token=${encodeURIComponent(raw)}`;
    if (emailEnabled()) {
      const { subject, html } = renderVerifyEmail(verifyUrl);
      await sendMail(user.email, subject, html);
    }
    res.status(201).json({ ok: true, message: "Check your email to verify your account", ...emailEnabled() ? {} : { verifyUrl } });
  } catch (e) {
    if (e.code === "P2002") return res.status(409).json({ error: "Email already exists" });
    res.status(400).json({ error: e?.message || "Failed to register" });
  }
});
router7.post("/verify-email", async (req, res) => {
  const token = String(req.body?.token || req.query.token || "");
  if (!token) return res.status(400).json({ error: "Missing token" });
  const rec = await consumeToken("EMAIL_VERIFY", token);
  if (!rec) return res.status(400).json({ error: "Invalid or expired token" });
  await prisma9.user.update({ where: { id: rec.userId }, data: { emailVerifiedAt: /* @__PURE__ */ new Date() } });
  res.json({ ok: true });
});
router7.get("/invite-info", async (req, res) => {
  try {
    const token = String(req.query.token || "");
    if (!token) return res.status(400).json({ valid: false, status: "invalid" });
    const tokenHash = hashToken(token);
    const rec = await db.authToken.findFirst({ where: { tokenHash, type: "EMAIL_VERIFY" } });
    if (!rec) return res.json({ valid: false, status: "invalid" });
    if (rec.usedAt) return res.json({ valid: false, status: "used" });
    if (rec.expiresAt <= /* @__PURE__ */ new Date()) return res.json({ valid: false, status: "expired" });
    const user = await prisma9.user.findUnique({ where: { id: rec.userId }, include: { role: true, department: true } });
    if (!user) return res.json({ valid: false, status: "invalid" });
    return res.json({
      valid: true,
      status: "ok",
      data: { email: user.email, name: user.name, role: user.role?.name, department: user.department?.name }
    });
  } catch (e) {
    return res.status(400).json({ valid: false, status: "invalid", error: e?.message });
  }
});
router7.post("/accept-invite", loginRateLimiter(), async (req, res) => {
  const body = import_zod7.z.object({ token: import_zod7.z.string().min(16), password: strongPassword.optional(), name: import_zod7.z.string().min(1).optional(), phone: import_zod7.z.string().optional() }).parse(req.body || {});
  const rec = await consumeToken("EMAIL_VERIFY", body.token);
  if (!rec) return res.status(400).json({ error: "Invalid or expired token" });
  const data = { emailVerifiedAt: /* @__PURE__ */ new Date() };
  if (body.password) {
    data.passwordHash = await import_bcryptjs.default.hash(body.password, 10);
  }
  if (body.name) data.name = body.name;
  if (typeof body.phone === "string") data.phone = body.phone;
  await prisma9.user.update({ where: { id: rec.userId }, data });
  res.json({ ok: true });
});
router7.post("/request-password-reset", loginRateLimiter(), async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase();
  if (!email) return res.status(400).json({ error: "Email required" });
  const user = await prisma9.user.findUnique({ where: { email } });
  if (user) {
    const { raw } = await createToken(user.id, "PASSWORD_RESET", 3600);
    const clientBase = process.env.FRONTEND_BASE_URL || "http://localhost:5173";
    const resetUrl = `${clientBase}/reset-password?token=${encodeURIComponent(raw)}`;
    if (emailEnabled()) {
      const { subject, html } = renderPasswordResetEmail(resetUrl, user.name);
      await sendMail(user.email, subject, html);
    } else {
      console.log("Password reset link (dev):", resetUrl);
    }
  }
  res.json({ ok: true });
});
router7.post("/reset-password", loginRateLimiter(), async (req, res) => {
  const body = import_zod7.z.object({ token: import_zod7.z.string().min(16), password: strongPassword }).parse(req.body || {});
  const rec = await consumeToken("PASSWORD_RESET", body.token);
  if (!rec) return res.status(400).json({ error: "Invalid or expired token" });
  const hash = await import_bcryptjs.default.hash(body.password, 10);
  await prisma9.user.update({ where: { id: rec.userId }, data: { passwordHash: hash } });
  res.json({ ok: true });
});
router7.get("/reset-password/validate", async (req, res) => {
  const token = String(req.query.token || "");
  if (!token) return res.status(400).json({ valid: false, status: "invalid" });
  try {
    const tokenHash = hashToken(token);
    const rec = await db.authToken.findFirst({ where: { tokenHash, type: "PASSWORD_RESET" } });
    if (!rec) return res.json({ valid: false, status: "invalid" });
    if (rec.usedAt) return res.json({ valid: false, status: "used" });
    if (rec.expiresAt <= /* @__PURE__ */ new Date()) return res.json({ valid: false, status: "expired" });
    return res.json({ valid: true, status: "ok" });
  } catch (e) {
    return res.status(400).json({ valid: false, status: "invalid", error: e?.message });
  }
});
router7.post("/refresh", async (req, res) => {
  const raw = req.cookies?.rt || req.body?.refreshToken || "";
  if (!raw) return res.status(401).json({ error: "Missing refresh token" });
  const rec = await consumeToken("REFRESH", raw);
  if (!rec) return res.status(401).json({ error: "Invalid or expired refresh token" });
  const token = sign(rec.userId);
  const { raw: newRt, expiresAt } = await createToken(rec.userId, "REFRESH", 30 * 24 * 3600);
  const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
  res.cookie("rt", newRt, { httpOnly: true, secure: isProd, sameSite: "lax", expires: expiresAt });
  res.json({ token });
});
router7.post("/logout", async (req, res) => {
  const raw = req.cookies?.rt || req.body?.refreshToken || "";
  if (raw) {
    const tokenHash = hashToken(raw);
    await db.authToken.deleteMany({ where: { tokenHash, type: "REFRESH" } });
  }
  res.clearCookie("rt");
  res.json({ ok: true });
});
var DEV_AUTH = (process.env.ENABLE_DEV_AUTH || "").toLowerCase() === "true" || (process.env.NODE_ENV || "").toLowerCase() !== "production";
if (DEV_AUTH) {
  router7.post("/dev/verify-email", async (req, res) => {
    const email = String(req.body?.email || "").toLowerCase();
    if (!email) return res.status(400).json({ error: "Email required" });
    try {
      const u = await prisma9.user.update({ where: { email }, data: { emailVerifiedAt: /* @__PURE__ */ new Date(), isActive: true } });
      return res.json({ ok: true, id: u.id });
    } catch (e) {
      return res.status(400).json({ error: e?.message || "Failed to verify" });
    }
  });
  router7.post("/dev/set-password", async (req, res) => {
    const email = String(req.body?.email || "").toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const hash = await import_bcryptjs.default.hash(password, 10);
    try {
      const u = await prisma9.user.update({ where: { email }, data: { passwordHash: hash } });
      return res.json({ ok: true, id: u.id });
    } catch (e) {
      return res.status(400).json({ error: e?.message || "Failed to set password" });
    }
  });
  router7.post("/dev/impersonate", async (req, res) => {
    const { userId, email } = req.body || {};
    let id = String(userId || "");
    try {
      if (!id && email) {
        const u2 = await prisma9.user.findUnique({ where: { email: String(email).toLowerCase() } });
        if (!u2) return res.status(404).json({ error: "User not found" });
        id = u2.id;
      }
      if (!id) return res.status(400).json({ error: "userId or email required" });
      const u = await prisma9.user.findUnique({ where: { id } });
      if (!u) return res.status(404).json({ error: "User not found" });
      const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
      res.cookie("xuid", id, { httpOnly: true, sameSite: "lax", secure: isProd });
      return res.json({ ok: true, id });
    } catch (e) {
      return res.status(400).json({ error: e?.message || "Failed to impersonate" });
    }
  });
  router7.post("/dev/clear-impersonate", async (_req, res) => {
    res.clearCookie("xuid");
    res.json({ ok: true });
  });
}
var auth_default = router7;

// src/routes/approvals.ts
var import_express8 = require("express");
var import_client10 = require("@prisma/client");
var import_zod8 = require("zod");
var prisma10 = new import_client10.PrismaClient();
var router8 = (0, import_express8.Router)();
async function isSuperAdmin(userId) {
  if (!userId) return false;
  const adminEmail = String(process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase();
  if (!adminEmail) return false;
  const u = await prisma10.user.findUnique({ where: { id: userId } });
  return !!u && String(u.email).toLowerCase() === adminEmail;
}
async function isDeptLead(userId, deptId) {
  if (!userId || !deptId) return false;
  const db7 = prisma10;
  const dept = await db7.department.findUnique({ where: { id: deptId } });
  return !!dept && String(dept.leadId || "") === String(userId);
}
router8.get("/pending", async (req, res) => {
  const actorId = req.userId;
  if (!actorId) return res.status(401).json({ error: "Authentication required" });
  const superAdmin = await isSuperAdmin(actorId);
  const db7 = prisma10;
  const leadDepts = await db7.department.findMany({ where: { leadId: actorId } });
  const where = { status: "PENDING" };
  if (!superAdmin) {
    if (!leadDepts.length) return res.json({ items: [], total: 0 });
    where.requestedDepartmentId = { in: leadDepts.map((d) => d.id) };
  }
  const rows = await db7.approvalRequest.findMany({ where, include: { user: true }, orderBy: { submittedAt: "asc" } });
  const items = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.user?.name || "",
    email: r.user?.email || "",
    requestedDepartmentId: r.requestedDepartmentId,
    requestedRoleId: r.requestedRoleId,
    status: r.status,
    billable: r.billable,
    submittedAt: r.submittedAt
  }));
  res.json({ items, total: items.length });
});
router8.post("/:userId/approve", async (req, res) => {
  const actorId = req.userId;
  if (!actorId) return res.status(401).json({ error: "Authentication required" });
  const body = import_zod8.z.object({
    departmentId: import_zod8.z.string().min(1),
    roleId: import_zod8.z.string().min(1),
    active: import_zod8.z.coerce.boolean().default(true),
    billable: import_zod8.z.coerce.boolean().optional(),
    billRate: import_zod8.z.coerce.number().optional(),
    costRate: import_zod8.z.coerce.number().optional(),
    utilizationTarget: import_zod8.z.coerce.number().optional(),
    skills: import_zod8.z.array(import_zod8.z.string()).optional(),
    managerId: import_zod8.z.string().optional()
  }).parse(req.body || {});
  if (actorId === req.params.userId) return res.status(403).json({ error: "Self-approval is not allowed" });
  const superAdmin = await isSuperAdmin(actorId);
  const isLead = await isDeptLead(actorId, body.departmentId);
  if (!(superAdmin || isLead)) return res.status(403).json({ error: "Not authorized to approve for this department" });
  try {
    const user = await prisma10.user.update({
      where: { id: req.params.userId },
      data: {
        departmentId: body.departmentId,
        roleId: body.roleId,
        isActive: body.active,
        billable: body.billable ?? false,
        billRate: body.billRate,
        costRate: body.costRate,
        utilizationTarget: body.utilizationTarget,
        skills: body.skills,
        managerId: body.managerId || null
      }
    });
    await prisma10.approvalRequest.update({ where: { userId: req.params.userId }, data: { status: "APPROVED", decidedById: actorId, decidedAt: /* @__PURE__ */ new Date() } });
    const db7 = prisma10;
    await db7.adminAudit.create({ data: { adminId: actorId, targetUserId: user.id, action: "APPROVE_USER", details: `dept=${body.departmentId}, role=${body.roleId}, active=${body.active}` } });
    if (emailEnabled()) {
      const clientBase = process.env.FRONTEND_BASE_URL || "http://localhost:5173";
      const { subject, html } = renderApprovedEmail(clientBase);
      try {
        await sendMail(user.email, subject, html);
      } catch {
      }
    }
    res.json({ ok: true, id: user.id });
  } catch (e) {
    res.status(400).json({ error: e?.message || "Approval failed" });
  }
});
router8.post("/:userId/reject", async (req, res) => {
  const actorId = req.userId;
  if (!actorId) return res.status(401).json({ error: "Authentication required" });
  const body = import_zod8.z.object({ reason: import_zod8.z.string().min(3) }).parse(req.body || {});
  if (actorId === req.params.userId) return res.status(403).json({ error: "Self-rejection is not allowed" });
  const db7 = prisma10;
  const ar = await db7.approvalRequest.findUnique({ where: { userId: req.params.userId } });
  const superAdmin = await isSuperAdmin(actorId);
  const isLead = await isDeptLead(actorId, ar?.requestedDepartmentId || null);
  if (!(superAdmin || isLead)) return res.status(403).json({ error: "Not authorized to reject" });
  try {
    await prisma10.approvalRequest.update({ where: { userId: req.params.userId }, data: { status: "REJECTED", reason: body.reason, decidedById: actorId, decidedAt: /* @__PURE__ */ new Date() } });
    await prisma10.user.update({ where: { id: req.params.userId }, data: { isActive: false } });
    await db7.adminAudit.create({ data: { adminId: actorId, targetUserId: req.params.userId, action: "REJECT_USER", details: body.reason } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e?.message || "Reject failed" });
  }
});
var approvals_default = router8;

// src/routes/calendar.ts
var import_express9 = require("express");
var import_client11 = require("@prisma/client");
var import_axios = __toESM(require("axios"));
var import_crypto2 = __toESM(require("crypto"));
var prisma11 = new import_client11.PrismaClient();
var router9 = (0, import_express9.Router)();
function baseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host");
  return `${proto}://${host}`;
}
function clientBaseUrl(req) {
  const envBase = process.env.FRONTEND_BASE_URL || process.env.APP_BASE_URL;
  if (envBase) return String(envBase).replace(/\/+$/, "");
  const origin = req.get("origin");
  if (origin) return origin.replace(/\/+$/, "");
  const api = baseUrl(req);
  try {
    const u = new URL(api);
    return `${u.protocol}//${u.hostname}:5173`;
  } catch {
    return "http://localhost:5173";
  }
}
function getEncKey() {
  const raw = process.env.CALENDAR_ENC_KEY || process.env.JWT_SECRET || "dev-secret";
  return import_crypto2.default.createHash("sha256").update(String(raw)).digest();
}
function encrypt(text) {
  const key = getEncKey();
  const iv = import_crypto2.default.randomBytes(12);
  const cipher = import_crypto2.default.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(String(text), "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}
function decrypt(payload) {
  try {
    const buf = Buffer.from(String(payload), "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const key = getEncKey();
    const decipher = import_crypto2.default.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return "";
  }
}
function normalizeIcsUrl(u) {
  if (!u) return "";
  let s = String(u).trim();
  if (s.toLowerCase().startsWith("webcal://")) s = "https://" + s.slice(9);
  if (s.toLowerCase().startsWith("webcals://")) s = "https://" + s.slice(10);
  return s;
}
async function createOAuthStateRecord(userId, provider) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1e3);
  return prisma11.calendarOAuthState.create({ data: { userId, provider, expiresAt, nextPath: "/calendar" } });
}
async function consumeOAuthStateRecord(id) {
  if (!id) return null;
  const rec = await prisma11.calendarOAuthState.findUnique({ where: { id } });
  if (!rec) return null;
  if (rec.expiresAt && rec.expiresAt.getTime() < Date.now()) {
    await prisma11.calendarOAuthState.delete({ where: { id: rec.id } });
    return null;
  }
  await prisma11.calendarOAuthState.delete({ where: { id: rec.id } });
  return rec;
}
router9.post("/google/session", async (req, res) => {
  const userId = await resolveUserId(req);
  if (!userId) return res.status(401).json({ error: "Login required" });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl(req)}/api/calendar/google/callback`;
  if (!clientId) return res.status(500).json({ error: "Missing GOOGLE_CLIENT_ID" });
  const st = await createOAuthStateRecord(userId, "GOOGLE");
  const scope = ["openid", "email", "profile", "https://www.googleapis.com/auth/calendar.readonly"].join(" ");
  const state = Buffer.from(JSON.stringify({ sid: st.id, next: "/calendar" }), "utf8").toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  res.json({ redirectUrl: url.toString() });
});
router9.get("/google/connect", async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl(req)}/api/calendar/google/callback`;
  const scope = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar.readonly"
  ].join(" ");
  if (!clientId) return res.status(500).send("Missing GOOGLE_CLIENT_ID");
  const uid = req.query.uid || "";
  const userId = req.userId || uid || "";
  const state = Buffer.from(JSON.stringify({ userId, next: "/calendar" }), "utf8").toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  res.redirect(url.toString());
});
router9.get("/google/callback", async (req, res) => {
  const code = req.query.code;
  const stateRaw = req.query.state || "";
  let state = {};
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
  } catch {
  }
  let userId = null;
  if (state?.sid) {
    const rec = await consumeOAuthStateRecord(state.sid);
    userId = rec?.userId || null;
  } else {
    const resolved = await resolveUserId(req);
    userId = resolved || state?.userId || req.query.uid || null;
  }
  if (!code) return res.status(400).send("Missing code");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl(req)}/api/calendar/google/callback`;
  if (!clientId || !clientSecret) return res.status(500).send("Missing Google client credentials");
  try {
    if (!userId) return res.status(401).send("No user context; please log in and retry");
    const tokenRes = await import_axios.default.post("https://oauth2.googleapis.com/token", new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    const { access_token, refresh_token, expires_in, id_token, scope } = tokenRes.data || {};
    let email = "";
    if (id_token) {
      try {
        const payload = JSON.parse(Buffer.from(String(id_token).split(".")[1], "base64").toString("utf8"));
        email = String(payload?.email || "");
      } catch {
      }
    }
    if (!email && access_token) {
      try {
        const uinfo = await import_axios.default.get("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
        email = String(uinfo.data?.email || "");
      } catch {
      }
    }
    const now = Date.now();
    const expiresAt = expires_in ? new Date(now + Number(expires_in) * 1e3) : null;
    const exists = await prisma11.user.findUnique({ where: { id: userId } });
    if (!exists) return res.status(400).send("User not found; ensure you are logged in");
    await prisma11.calendarAccount.upsert({
      where: { userId_provider_email: { userId, provider: "GOOGLE", email: email || "unknown" } },
      update: { accessToken: access_token, refreshToken: refresh_token || "", expiresAt, scope },
      create: { id: void 0, userId, provider: "GOOGLE", email: email || "unknown", accessToken: access_token, refreshToken: refresh_token || "", expiresAt, scope }
    });
    const nextPath = state?.next || "/calendar";
    const clientBase = clientBaseUrl(req);
    res.redirect(`${clientBase}${nextPath}`);
  } catch (e) {
    res.status(400).send(e?.response?.data || e?.message || "Google OAuth failed");
  }
});
async function ensureGoogleToken(account, clientId, clientSecret) {
  if (!account?.refreshToken) return account;
  const now = /* @__PURE__ */ new Date();
  if (account.expiresAt && new Date(account.expiresAt) > new Date(now.getTime() + 6e4)) return account;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: account.refreshToken
  });
  const tokenRes = await import_axios.default.post("https://oauth2.googleapis.com/token", params, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  const { access_token, expires_in } = tokenRes.data || {};
  const expiresAt = expires_in ? new Date(Date.now() + Number(expires_in) * 1e3) : null;
  const updated = await prisma11.calendarAccount.update({ where: { id: account.id }, data: { accessToken: access_token, expiresAt } });
  return updated;
}
router9.get("/google/events", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "x-user-id or Bearer token required" });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(500).json({ error: "Missing Google client credentials" });
  const account = await prisma11.calendarAccount.findFirst({ where: { userId, provider: "GOOGLE" } });
  if (!account) return res.status(200).json([]);
  try {
    const acc = await ensureGoogleToken(account, clientId, clientSecret);
    const now = /* @__PURE__ */ new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 3600 * 1e3).toISOString();
    const timeMax = new Date(now.getTime() + 90 * 24 * 3600 * 1e3).toISOString();
    const eventsRes = await import_axios.default.get("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      headers: { Authorization: `Bearer ${acc.accessToken}` },
      params: { maxResults: 2500, singleEvents: true, orderBy: "startTime", timeMin, timeMax }
    });
    res.json(Array.isArray(eventsRes.data?.items) ? eventsRes.data.items : []);
  } catch (e) {
    res.status(400).json({ error: e?.response?.data || e?.message || "Failed to fetch Google events" });
  }
});
router9.post("/microsoft/session", async (req, res) => {
  const userId = await resolveUserId(req);
  if (!userId) return res.status(401).json({ error: "Login required" });
  const clientId = process.env.MS_CLIENT_ID;
  const tenant = process.env.MS_TENANT || "common";
  const redirectUri = process.env.MS_REDIRECT_URI || `${baseUrl(req)}/api/calendar/microsoft/callback`;
  if (!clientId) return res.status(500).json({ error: "Missing MS_CLIENT_ID" });
  const st = await createOAuthStateRecord(userId, "MICROSOFT");
  const state = Buffer.from(JSON.stringify({ sid: st.id, next: "/calendar" }), "utf8").toString("base64url");
  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", ["offline_access", "User.Read", "Calendars.Read"].join(" "));
  url.searchParams.set("state", state);
  res.json({ redirectUrl: url.toString() });
});
router9.get("/microsoft/connect", async (req, res) => {
  const clientId = process.env.MS_CLIENT_ID;
  const tenant = process.env.MS_TENANT || "common";
  const redirectUri = process.env.MS_REDIRECT_URI || `${baseUrl(req)}/api/calendar/microsoft/callback`;
  if (!clientId) return res.status(500).send("Missing MS_CLIENT_ID");
  const uid = req.query.uid || "";
  const userId = req.userId || uid || "";
  const state = Buffer.from(JSON.stringify({ userId, next: "/calendar" }), "utf8").toString("base64url");
  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", ["offline_access", "User.Read", "Calendars.Read"].join(" "));
  url.searchParams.set("state", state);
  res.redirect(url.toString());
});
router9.get("/microsoft/callback", async (req, res) => {
  const code = req.query.code;
  const stateRaw = req.query.state || "";
  let state = {};
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
  } catch {
  }
  let userId = null;
  if (state?.sid) {
    const rec = await consumeOAuthStateRecord(state.sid);
    userId = rec?.userId || null;
  } else {
    const resolved = await resolveUserId(req);
    userId = resolved || state?.userId || req.query.uid || null;
  }
  if (!code) return res.status(400).send("Missing code");
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const tenant = process.env.MS_TENANT || "common";
  const redirectUri = process.env.MS_REDIRECT_URI || `${baseUrl(req)}/api/calendar/microsoft/callback`;
  if (!clientId || !clientSecret) return res.status(500).send("Missing Microsoft client credentials");
  try {
    const tokenRes = await import_axios.default.post(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      scope: ["offline_access", "User.Read", "Calendars.Read"].join(" ")
    }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    const { access_token, refresh_token, expires_in } = tokenRes.data || {};
    let email = "";
    try {
      const meRes = await import_axios.default.get("https://graph.microsoft.com/v1.0/me", { headers: { Authorization: `Bearer ${access_token}` } });
      email = String(meRes.data?.mail || meRes.data?.userPrincipalName || "");
    } catch {
    }
    const expiresAt = expires_in ? new Date(Date.now() + Number(expires_in) * 1e3) : null;
    if (!userId) return res.status(401).send("No user context; please log in and retry");
    const exists = await prisma11.user.findUnique({ where: { id: userId } });
    if (!exists) return res.status(400).send("User not found; ensure you are logged in");
    await prisma11.calendarAccount.upsert({
      where: { userId_provider_email: { userId, provider: "MICROSOFT", email: email || "unknown" } },
      update: { accessToken: access_token, refreshToken: refresh_token || "", expiresAt, scope: "User.Read Calendars.Read offline_access" },
      create: { id: void 0, userId, provider: "MICROSOFT", email: email || "unknown", accessToken: access_token, refreshToken: refresh_token || "", expiresAt, scope: "User.Read Calendars.Read offline_access" }
    });
    const nextPath = state?.next || "/calendar";
    const clientBase = clientBaseUrl(req);
    res.redirect(`${clientBase}${nextPath}`);
  } catch (e) {
    res.status(400).send(e?.response?.data || e?.message || "Microsoft OAuth failed");
  }
});
async function ensureMsToken(account, tenant, clientId, clientSecret) {
  if (!account?.refreshToken) return account;
  const now = /* @__PURE__ */ new Date();
  if (account.expiresAt && new Date(account.expiresAt) > new Date(now.getTime() + 6e4)) return account;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: account.refreshToken,
    scope: "offline_access User.Read Calendars.Read"
  });
  const tokenRes = await import_axios.default.post(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, params, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  const { access_token, expires_in } = tokenRes.data || {};
  const expiresAt = expires_in ? new Date(Date.now() + Number(expires_in) * 1e3) : null;
  const updated = await prisma11.calendarAccount.update({ where: { id: account.id }, data: { accessToken: access_token, expiresAt } });
  return updated;
}
router9.get("/microsoft/events", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "x-user-id or Bearer token required" });
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const tenant = process.env.MS_TENANT || "common";
  if (!clientId || !clientSecret) return res.status(500).json({ error: "Missing Microsoft client credentials" });
  const account = await prisma11.calendarAccount.findFirst({ where: { userId, provider: "MICROSOFT" } });
  if (!account) return res.status(200).json([]);
  try {
    const acc = await ensureMsToken(account, tenant, clientId, clientSecret);
    const start = new Date(Date.now() - 30 * 24 * 3600 * 1e3).toISOString();
    const end = new Date(Date.now() + 90 * 24 * 3600 * 1e3).toISOString();
    const eventsRes = await import_axios.default.get("https://graph.microsoft.com/v1.0/me/calendarView", {
      headers: { Authorization: `Bearer ${acc.accessToken}` },
      params: { startDateTime: start, endDateTime: end, "$top": 1e3, "$orderby": "start/dateTime" }
    });
    res.json(Array.isArray(eventsRes.data?.value) ? eventsRes.data.value : []);
  } catch (e) {
    res.status(400).json({ error: e?.response?.data || e?.message || "Failed to fetch Microsoft events" });
  }
});
async function resolveUserId(req) {
  const primary = req.userId;
  if (primary) {
    const u = await prisma11.user.findUnique({ where: { id: primary } });
    if (u) return primary;
  }
  const headerId = req.header("x-user-id") || null;
  if (headerId) {
    const u = await prisma11.user.findUnique({ where: { id: headerId } });
    if (u) return headerId;
  }
  const dev = process.env.DEV_USER_ID || null;
  if (dev) {
    const u = await prisma11.user.findUnique({ where: { id: dev } });
    if (u) return dev;
  }
  return null;
}
router9.get("/accounts", async (req, res) => {
  const userId = await resolveUserId(req);
  if (!userId) return res.status(401).json({ error: "User not found; ensure you are logged in or DEV_USER_ID is valid." });
  const accts = await prisma11.calendarAccount.findMany({
    where: { userId },
    select: { id: true, provider: true, email: true, updatedAt: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(accts);
});
router9.get("/sources", async (req, res) => {
  const userId = await resolveUserId(req);
  if (!userId) return res.status(401).json({ error: "User not found; ensure you are logged in or DEV_USER_ID is valid." });
  const sources = await prisma11.calendarSource.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  res.json(sources.map((s) => ({ id: s.id, type: s.type, name: s.name, color: s.color, enabled: s.enabled, createdAt: s.createdAt, updatedAt: s.updatedAt })));
});
router9.post("/sources", async (req, res) => {
  const userId = await resolveUserId(req);
  if (!userId) return res.status(401).json({ error: "User not found; ensure you are logged in or DEV_USER_ID is valid." });
  const { name, url, color, enabled } = req.body || {};
  if (!name || !url) return res.status(400).json({ error: "name and url are required" });
  try {
    const normalized = normalizeIcsUrl(String(url));
    if (!/^https?:\/\//i.test(normalized)) return res.status(400).json({ error: "Invalid ICS URL (must start with http/https or webcal/webcals)" });
    const created = await prisma11.calendarSource.create({
      data: { userId, type: "ICS_URL", name, url: encrypt(normalized), color: color || "#10b981", enabled: enabled ?? true }
    });
    res.status(201).json({ id: created.id, type: created.type, name: created.name, color: created.color, enabled: created.enabled, createdAt: created.createdAt, updatedAt: created.updatedAt });
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to create source" });
  }
});
router9.patch("/sources/:id", async (req, res) => {
  const userId = await resolveUserId(req);
  if (!userId) return res.status(401).json({ error: "User not found; ensure you are logged in or DEV_USER_ID is valid." });
  const id = req.params.id;
  const { name, url, color, enabled } = req.body || {};
  try {
    const src = await prisma11.calendarSource.findUnique({ where: { id } });
    if (!src || src.userId !== userId) return res.status(404).json({ error: "Not found" });
    const data = {};
    if (name !== void 0) data.name = name;
    if (color !== void 0) data.color = color;
    if (enabled !== void 0) data.enabled = enabled;
    if (url !== void 0) {
      const normalized = normalizeIcsUrl(String(url));
      if (!/^https?:\/\//i.test(normalized)) return res.status(400).json({ error: "Invalid ICS URL (must start with http/https or webcal/webcals)" });
      data.url = encrypt(normalized);
    }
    const updated = await prisma11.calendarSource.update({ where: { id }, data });
    res.json({ id: updated.id, type: updated.type, name: updated.name, color: updated.color, enabled: updated.enabled, createdAt: updated.createdAt, updatedAt: updated.updatedAt });
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to update source" });
  }
});
router9.delete("/sources/:id", async (req, res) => {
  const userId = await resolveUserId(req);
  if (!userId) return res.status(401).json({ error: "User not found; ensure you are logged in or DEV_USER_ID is valid." });
  const id = req.params.id;
  try {
    const src = await prisma11.calendarSource.findUnique({ where: { id } });
    if (!src || src.userId !== userId) return res.status(404).json({ error: "Not found" });
    await prisma11.calendarSource.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to delete source" });
  }
});
router9.get("/sources/:id/events", async (req, res) => {
  const userId = await resolveUserId(req);
  if (!userId) return res.status(401).json({ error: "User not found; ensure you are logged in or DEV_USER_ID is valid." });
  const id = req.params.id;
  const src = await prisma11.calendarSource.findUnique({ where: { id } });
  if (!src || src.userId !== userId) return res.status(404).json({ error: "Not found" });
  try {
    const icsUrl = normalizeIcsUrl(decrypt(src.url));
    if (!/^https?:\/\//i.test(icsUrl)) return res.status(400).json({ error: "Invalid or undecryptable ICS URL" });
    const r = await import_axios.default.get(icsUrl, { responseType: "text", timeout: 15e3, headers: { "User-Agent": "ProjectHubCalendar/1.0" } });
    const text = String(r.data || "");
    const events = parseICS(text, src.name);
    res.json(events);
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to load ICS events" });
  }
});
var calendar_default = router9;
router9.get("/ics", async (req, res) => {
  try {
    const url = String(req.query.url || req.query.u || "");
    if (!url) return res.status(400).send("Missing url");
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) return res.status(400).send("Only http/https supported");
    const r = await import_axios.default.get(url, { responseType: "text", timeout: 15e3, headers: { "User-Agent": "ProjectHubCalendar/1.0" } });
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.status(200).send(typeof r.data === "string" ? r.data : String(r.data || ""));
  } catch (e) {
    res.status(400).send(e?.response?.statusText || e?.message || "Failed to fetch ICS");
  }
});
router9.get("/holidays", async (req, res) => {
  try {
    const country = String(req.query.country || process.env.HOLIDAY_DEFAULT_COUNTRY || "US").toUpperCase();
    const year = Number(req.query.year || (/* @__PURE__ */ new Date()).getFullYear());
    const month = req.query.month ? Number(req.query.month) : void 0;
    const rapidKey = process.env.RAPIDAPI_KEY || "";
    const rapidHost = process.env.RAPIDAPI_HOLIDAYS_HOST || "";
    if (rapidKey && rapidHost) {
      try {
        const url2 = new URL(`https://${rapidHost}/PublicHolidays/${year}/${country}`);
        const r2 = await import_axios.default.get(url2.toString(), {
          timeout: 15e3,
          headers: { "X-RapidAPI-Key": rapidKey, "X-RapidAPI-Host": rapidHost }
        });
        const items2 = Array.isArray(r2.data) ? r2.data : [];
        const filtered = month && month >= 1 && month <= 12 ? items2.filter((h) => {
          const d = String(h?.date || "").slice(0, 10);
          const m = Number(d.slice(5, 7));
          return m === month;
        }) : items2;
        const events2 = filtered.map((h) => {
          const date = String(h?.date || "").slice(0, 10);
          const name = String(h?.localName || h?.name || "Public Holiday");
          const types = Array.isArray(h?.types) ? h.types.join(", ") : h?.type || "Public holiday";
          return {
            id: `holiday-${country}-${date}-${name.replace(/\s+/g, "-").toLowerCase()}`,
            title: name,
            description: types,
            type: "reminder",
            startTime: "00:00",
            endTime: "23:59",
            date,
            priority: "low",
            status: "scheduled",
            createdBy: "Public Holidays",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          };
        });
        return res.json(events2);
      } catch (err) {
        try {
          const url2 = new URL(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
          const r2 = await import_axios.default.get(url2.toString(), { timeout: 15e3 });
          const items2 = Array.isArray(r2.data) ? r2.data : [];
          const filtered = month && month >= 1 && month <= 12 ? items2.filter((h) => {
            const d = String(h?.date || "").slice(0, 10);
            const m = Number(d.slice(5, 7));
            return m === month;
          }) : items2;
          const events2 = filtered.map((h) => ({
            id: `holiday-${country}-${String(h.date).slice(0, 10)}-${String(h.localName || h.name).replace(/\s+/g, "-").toLowerCase()}`,
            title: String(h.localName || h.name || "Public Holiday"),
            description: Array.isArray(h.types) ? h.types.join(", ") : h.type || "Public holiday",
            type: "reminder",
            startTime: "00:00",
            endTime: "23:59",
            date: String(h.date).slice(0, 10),
            priority: "low",
            status: "scheduled",
            createdBy: "Public Holidays",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          }));
          return res.json(events2);
        } catch {
        }
      }
    }
    const key = process.env.HOLIDAY_API_KEY || "";
    if (!key) {
      try {
        const url2 = new URL(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
        const r2 = await import_axios.default.get(url2.toString(), { timeout: 15e3 });
        const items2 = Array.isArray(r2.data) ? r2.data : [];
        const filtered = month && month >= 1 && month <= 12 ? items2.filter((h) => {
          const d = String(h?.date || "").slice(0, 10);
          const m = Number(d.slice(5, 7));
          return m === month;
        }) : items2;
        const events2 = filtered.map((h) => ({
          id: `holiday-${country}-${String(h.date).slice(0, 10)}-${String(h.localName || h.name).replace(/\s+/g, "-").toLowerCase()}`,
          title: String(h.localName || h.name || "Public Holiday"),
          description: Array.isArray(h.types) ? h.types.join(", ") : h.type || "Public holiday",
          type: "reminder",
          startTime: "00:00",
          endTime: "23:59",
          date: String(h.date).slice(0, 10),
          priority: "low",
          status: "scheduled",
          createdBy: "Public Holidays",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }));
        return res.json(events2);
      } catch {
      }
      return res.status(200).json([]);
    }
    const language = String(req.query.language || "en");
    const url = new URL("https://holidayapi.com/v1/holidays");
    url.searchParams.set("key", key);
    url.searchParams.set("country", country);
    url.searchParams.set("year", String(year));
    url.searchParams.set("public", "true");
    url.searchParams.set("language", language);
    if (month && month >= 1 && month <= 12) url.searchParams.set("month", String(month));
    const r = await import_axios.default.get(url.toString(), { timeout: 15e3 });
    const items = Array.isArray(r.data?.holidays) ? r.data.holidays : [];
    const events = items.map((h) => {
      const date = String(h?.date || "").slice(0, 10);
      const name = String(h?.name || "Public Holiday");
      return {
        id: `holiday-${country}-${date}-${(h?.uuid || name).replace(/\s+/g, "-").toLowerCase()}`,
        title: name,
        description: String(h?.type?.join?.(", ") || "Public holiday"),
        type: "reminder",
        startTime: "00:00",
        endTime: "23:59",
        date,
        priority: "low",
        status: "scheduled",
        createdBy: "HolidayAPI",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    });
    return res.json(events);
  } catch (e) {
    res.status(400).json({ error: e?.response?.data || e?.message || "Failed to load holidays" });
  }
});
function parseICS(text, sourceName) {
  const rawLines = text.split(/\r?\n/);
  const lines = [];
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    if (l.startsWith(" ") && lines.length > 0) lines[lines.length - 1] += l.slice(1);
    else lines.push(l);
  }
  const out = [];
  let cursor = null;
  for (const l of lines) {
    if (l.startsWith("BEGIN:VEVENT")) cursor = {};
    else if (l.startsWith("END:VEVENT")) {
      if (cursor) {
        const uid = cursor["UID"] || Math.random().toString(36).slice(2);
        const summary = cursor["SUMMARY"] || "(No title)";
        const descRaw = (cursor["DESCRIPTION"] || "").replace(/\\n/g, "\n");
        const dtstart = cursor["DTSTART"] || cursor["DTSTART;VALUE=DATE"] || "";
        const dtend = cursor["DTEND"] || cursor["DTEND;VALUE=DATE"] || "";
        const st = parseIcsDate(dtstart);
        const et = parseIcsDate(dtend || dtstart);
        const location = cursor["LOCATION"] || "";
        const urlProp = cursor["URL"] || "";
        const all = `${urlProp}
${descRaw}
${location}`;
        const urls = all.match(/https?:\/\/\S+/g) || [];
        const firstUrl = urls.find((u) => u.toLowerCase().includes("teams.microsoft")) || urls.find((u) => u.toLowerCase().includes("zoom.us")) || urls.find((u) => u.toLowerCase().includes("meet.google.com")) || urls[0];
        const platform = detectPlatform(firstUrl);
        const isAllDay = /VALUE=DATE/i.test(dtstart || "");
        const type = firstUrl ? "meeting" : isAllDay ? "reminder" : "task";
        out.push({
          id: `ics-${uid}`,
          title: summary,
          description: stripUrls(descRaw),
          type,
          startTime: st.time,
          endTime: et.time || st.time,
          date: st.date,
          priority: "medium",
          status: "scheduled",
          platform,
          meetingLink: firstUrl,
          attendees: [],
          createdBy: sourceName,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      cursor = null;
    } else if (cursor) {
      const idx = l.indexOf(":");
      if (idx > 0) {
        const key = l.slice(0, idx).split(";")[0].toUpperCase();
        const value = l.slice(idx + 1);
        cursor[key] = value;
      }
    }
  }
  return out;
}
function parseIcsDate(val) {
  const m = String(val || "");
  const datePart = m.slice(0, 8);
  const year = datePart.slice(0, 4);
  const month = datePart.slice(4, 6);
  const day = datePart.slice(6, 8);
  const date = `${year}-${month}-${day}`;
  let time = "00:00";
  if (m.length >= 15 && m[8] === "T") time = `${m.slice(9, 11)}:${m.slice(11, 13)}`;
  return { date, time };
}
function stripUrls(s) {
  return String(s || "").replace(/https?:\/\/\S+/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function detectPlatform(u) {
  const s = String(u || "").toLowerCase();
  if (s.includes("aka.ms/jointeams")) return "teams";
  if (s.includes("teams.microsoft")) return "teams";
  if (s.includes("zoom.us")) return "zoom";
  if (s.includes("meet.google.com")) return "google-meet";
  return void 0;
}

// src/routes/gmail.ts
var import_express10 = require("express");
var import_client12 = require("@prisma/client");
var import_axios2 = __toESM(require("axios"));
init_slip_extract();
var prisma12 = new import_client12.PrismaClient();
var db2 = prisma12;
var router10 = (0, import_express10.Router)();
function baseUrl2(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host");
  return `${proto}://${host}`;
}
function clientBaseUrl2(req) {
  const envBase = process.env.FRONTEND_BASE_URL || process.env.APP_BASE_URL;
  if (envBase) return String(envBase).replace(/\/+$/, "");
  const origin = req.get("origin");
  if (origin) return origin.replace(/\/+$/, "");
  const api = baseUrl2(req);
  try {
    const u = new URL(api);
    return `${u.protocol}//${u.hostname}:5173`;
  } catch {
    return "http://localhost:5173";
  }
}
async function resolveUserId2(req) {
  const userId = req.userId || null;
  if (!userId) return null;
  const user = await prisma12.user.findUnique({ where: { id: String(userId) } });
  return user ? user.id : null;
}
async function ensureGoogleToken2(account, clientId, clientSecret) {
  if (!account?.refreshToken) return account;
  const now = /* @__PURE__ */ new Date();
  if (account.expiresAt && new Date(account.expiresAt) > new Date(now.getTime() + 6e4)) return account;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: account.refreshToken
  });
  const tokenRes = await import_axios2.default.post("https://oauth2.googleapis.com/token", params, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  const { access_token, expires_in } = tokenRes.data || {};
  const expiresAt = expires_in ? new Date(Date.now() + Number(expires_in) * 1e3) : null;
  const updated = await prisma12.calendarAccount.update({ where: { id: account.id }, data: { accessToken: access_token, expiresAt } });
  return updated;
}
router10.post("/google/session", async (req, res) => {
  const userId = await resolveUserId2(req);
  if (!userId) return res.status(401).json({ error: "Login required" });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GMAIL_REDIRECT_URI || `${baseUrl2(req)}/api/gmail/google/callback`;
  if (!clientId) return res.status(500).json({ error: "Missing GOOGLE_CLIENT_ID" });
  const scope = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send"
  ].join(" ");
  const state = Buffer.from(JSON.stringify({ userId, next: "/slips-invoices" }), "utf8").toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  res.json({ redirectUrl: url.toString() });
});
router10.get("/google/callback", async (req, res) => {
  const code = req.query.code;
  const stateRaw = req.query.state || "";
  let state = {};
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
  } catch {
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI || `${baseUrl2(req)}/api/gmail/google/callback`;
  if (!clientId || !clientSecret) return res.status(500).send("Missing Google client credentials");
  try {
    const userId = state?.userId || await resolveUserId2(req);
    if (!userId) return res.status(401).send("No user context; please log in and retry");
    const tokenRes = await import_axios2.default.post("https://oauth2.googleapis.com/token", new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    const { access_token, refresh_token, expires_in, id_token, scope } = tokenRes.data || {};
    let email = "";
    if (id_token) {
      try {
        const payload = JSON.parse(Buffer.from(String(id_token).split(".")[1], "base64").toString("utf8"));
        email = String(payload?.email || "");
      } catch {
      }
    }
    if (!email && access_token) {
      try {
        const uinfo = await import_axios2.default.get("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
        email = String(uinfo.data?.email || "");
      } catch {
      }
    }
    const expiresAt = expires_in ? new Date(Date.now() + Number(expires_in) * 1e3) : null;
    await prisma12.calendarAccount.upsert({
      where: { userId_provider_email: { userId, provider: "GOOGLE", email: email || "unknown" } },
      update: { accessToken: access_token, refreshToken: refresh_token || "", expiresAt, scope },
      create: { id: void 0, userId, provider: "GOOGLE", email: email || "unknown", accessToken: access_token, refreshToken: refresh_token || "", expiresAt, scope }
    });
    const clientBase = clientBaseUrl2(req);
    const nextPath = state?.next || "/slips-invoices";
    res.redirect(`${clientBase}${nextPath}`);
  } catch (e) {
    res.status(400).send(e?.response?.data || e?.message || "Google OAuth failed");
  }
});
router10.get("/status", async (req, res) => {
  const userId = await resolveUserId2(req);
  if (!userId) return res.json({ connected: false });
  const acc = await prisma12.calendarAccount.findFirst({ where: { userId, provider: "GOOGLE" } });
  res.json({ connected: !!acc, email: acc?.email || null, scope: acc?.scope || null });
});
router10.post("/send", async (req, res) => {
  const userId = await resolveUserId2(req);
  if (!userId) return res.status(401).json({ error: "Login required" });
  const { to, subject, html, text, template, invoice } = req.body || {};
  if (!to || !subject || !html && !text) return res.status(400).json({ error: "Missing to/subject/body" });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(500).json({ error: "Missing Google client credentials" });
  const acc = await prisma12.calendarAccount.findFirst({ where: { userId, provider: "GOOGLE" } });
  if (!acc) return res.status(400).json({ error: "Google not connected" });
  const scope = String(acc.scope || "");
  if (!/gmail\.send/.test(scope)) {
    return res.status(409).json({ error: "Gmail send scope not granted. Please connect Gmail.", scope });
  }
  try {
    let invoiceHtml2 = function(i) {
      const invNo = String(i?.invoiceNo || "");
      const project = String(i?.projectName || "");
      const phase = String(i?.phaseName || "");
      const clientName = String(i?.clientName || "");
      const issueDate = i?.issueDate ? new Date(i.issueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
      const dueDate = i?.dueDate ? new Date(i.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
      const currency = String(i?.currency || "USD");
      const totalNum = Number(i?.total || 0);
      const totalFmt = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(totalNum);
      const desc = String(i?.description || "Project work");
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
                    ${clientName ? `<tr><td style="color:#93c5fd;font-weight:700;padding:6px 0 4px;">Client:</td><td style="text-align:right;color:#e5e7eb;">${clientName}</td></tr>` : ""}
                    ${issueDate ? `<tr><td style="color:#93c5fd;font-weight:700;padding:6px 0 4px;">Issue Date:</td><td style="text-align:right;color:#e5e7eb;">${issueDate}</td></tr>` : ""}
                    ${dueDate ? `<tr><td style="color:#93c5fd;font-weight:700;padding:6px 0 4px;">Due Date:</td><td style="text-align:right;color:#e5e7eb;">${dueDate}</td></tr>` : ""}
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
      </body></html>`;
    };
    var invoiceHtml = invoiceHtml2;
    const tokenAcc = await ensureGoogleToken2(acc, clientId, clientSecret);
    const htmlOut = html && String(html).trim().length > 0 ? String(html) : String(template || "").toLowerCase() === "invoice" && invoice ? invoiceHtml2(invoice) : (() => {
      const safeText = String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
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
          </body></html>`;
    })();
    const boundary = "mixed_" + Math.random().toString(36).slice(2);
    const body = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: multipart/alternative; boundary="' + boundary + '"',
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      text ? String(text) : "",
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "",
      htmlOut,
      `--${boundary}--`,
      ""
    ].join("\r\n");
    const encoded = Buffer.from(body).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const sendRes = await import_axios2.default.post("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { raw: encoded }, { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` } });
    try {
      const invNo = String(req.body?.invoice?.invoiceNo || "").trim();
      if (invNo) {
        const inv = await prisma12.invoice.findUnique({ where: { invoiceNo: invNo } });
        if (inv && inv.status !== "PAID") {
          await prisma12.invoice.update({ where: { id: inv.id }, data: { status: "SENT" } });
        }
      }
    } catch {
    }
    res.json({ id: sendRes.data?.id || null });
  } catch (e) {
    res.status(400).json({ error: e?.response?.data || e?.message || "Failed to send email" });
  }
});
router10.get("/bank-credits", async (req, res) => {
  const userId = await resolveUserId2(req);
  if (!userId) return res.status(401).json({ error: "Login required" });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(500).json({ error: "Missing Google client credentials" });
  const acc = await prisma12.calendarAccount.findFirst({ where: { userId, provider: "GOOGLE" } });
  if (!acc) return res.status(409).json({ error: "Google not connected" });
  const scope = String(acc.scope || "");
  const needsScope = !/gmail\.readonly/.test(scope);
  if (needsScope) {
    return res.status(409).json({ error: "Gmail scopes not granted. Please connect Gmail.", scope });
  }
  try {
    const tokenAcc = await ensureGoogleToken2(acc, clientId, clientSecret);
    const q = "newer_than:14d (subject:(credit OR deposit OR payment received) OR from:(bank))";
    const list = await import_axios2.default.get("https://gmail.googleapis.com/gmail/v1/users/me/messages", { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` }, params: { q, maxResults: 50 } });
    const messages = Array.isArray(list.data?.messages) ? list.data.messages : [];
    const out = [];
    for (const m of messages) {
      try {
        const detail = await import_axios2.default.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` } });
        const payload = detail.data?.payload;
        const headers = payload?.headers || [];
        const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value || "";
        const from = headers.find((h) => h.name.toLowerCase() === "from")?.value || "";
        const receivedAt = new Date(Number(detail.data?.internalDate || Date.now())).toISOString();
        const snippet = String(detail.data?.snippet || "");
        const amtMatch = snippet.match(/([A-Z]{3}|Rs\.?|LKR|USD|GBP|EUR|AUD|CAD)?\s?([\d,]+(?:\.\d{1,2})?)/i);
        let amountNum = 0;
        let currency = "USD";
        if (amtMatch) {
          const cur = amtMatch[1] || "";
          const amt = amtMatch[2] || "0";
          amountNum = Number(amt.replace(/,/g, ""));
          currency = cur && cur.length <= 4 ? cur.toUpperCase().replace("RS", "LKR") : "USD";
        }
        if (amountNum > 0) {
          try {
            await db2.bankCredit.upsert({
              where: { messageId: m.id },
              update: {
                amount: amountNum,
                currency,
                valueDate: receivedAt,
                payerName: from || null,
                bankRef: subject || null,
                memo: snippet || null,
                sourceMailbox: acc.email || "gmail",
                receivedAt,
                status: "UNMATCHED",
                confidence: 0.5
              },
              create: {
                amount: amountNum,
                currency,
                valueDate: receivedAt,
                payerName: from || null,
                bankRef: subject || null,
                memo: snippet || null,
                sourceMailbox: acc.email || "gmail",
                messageId: m.id,
                receivedAt,
                status: "UNMATCHED",
                confidence: 0.5
              }
            });
          } catch {
          }
          out.push({
            id: `gmail-${m.id}`,
            amount: amountNum,
            currency,
            valueDate: receivedAt,
            payerName: from,
            bankRef: subject,
            memo: snippet,
            sourceMailbox: acc.email || "gmail",
            messageId: m.id,
            receivedAt,
            status: "Unmatched"
          });
        }
      } catch {
      }
    }
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e?.response?.data || e?.message || "Failed to fetch bank credits" });
  }
});
router10.get("/receipts", async (req, res) => {
  const userId = await resolveUserId2(req);
  if (!userId) return res.status(401).json({ error: "Login required" });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(500).json({ error: "Missing Google client credentials" });
  const acc = await prisma12.calendarAccount.findFirst({ where: { userId, provider: "GOOGLE" } });
  if (!acc) return res.status(409).json({ error: "Google not connected" });
  const scope = String(acc.scope || "");
  const needsScope = !/gmail\.readonly/.test(scope);
  if (needsScope) {
    return res.status(409).json({ error: "Gmail scopes not granted. Please connect Gmail.", scope });
  }
  try {
    let looksLikeSlip2 = function(fileName, mimeType, subject, snippet, invoiceNo) {
      const name = (fileName || "").toLowerCase();
      const subj = (subject || "").toLowerCase();
      const snip = (snippet || "").toLowerCase();
      const hasKeyword = /(slip|receipt|payment|transfer|deposit|bank-in|bank in|remittance)/i.test(name + " " + subj + " " + snip);
      const pdf = /^application\/pdf/i.test(mimeType);
      const img = /^image\//i.test(mimeType);
      if (invoiceNo) return true;
      if (pdf && hasKeyword) return true;
      if (img && hasKeyword) return true;
      return false;
    };
    var looksLikeSlip = looksLikeSlip2;
    const tokenAcc = await ensureGoogleToken2(acc, clientId, clientSecret);
    const q = "newer_than:45d has:attachment in:inbox subject:INV-";
    const list = await import_axios2.default.get("https://gmail.googleapis.com/gmail/v1/users/me/messages", {
      headers: { Authorization: `Bearer ${tokenAcc.accessToken}` },
      params: { q, maxResults: 50 }
    });
    const messages = Array.isArray(list.data?.messages) ? list.data.messages : [];
    const out = [];
    const bounceFromRe = /(mailer-daemon|postmaster|no-reply|noreply|do-not-reply|bounce)@/i;
    const bounceSubjectRe = /(delivery status notification|undelivered mail|mail delivery failed|returned mail)/i;
    for (const m of messages) {
      try {
        let walkParts2 = function(p) {
          if (!p) return;
          if (p.parts && Array.isArray(p.parts)) {
            for (const sp of p.parts) walkParts2(sp);
          } else {
            parts.push(p);
          }
        };
        var walkParts = walkParts2;
        const detail = await import_axios2.default.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` } });
        const msg = detail.data;
        const payload = msg?.payload;
        const headers = payload?.headers || [];
        const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value || "";
        const from = headers.find((h) => h.name.toLowerCase() === "from")?.value || "";
        const replyTo = headers.find((h) => h.name.toLowerCase() === "reply-to")?.value || "";
        const threadId = String(msg?.threadId || "");
        const receivedAt = new Date(Number(msg?.internalDate || Date.now())).toISOString();
        const snippet = String(msg?.snippet || "");
        if (bounceFromRe.test(from) || bounceSubjectRe.test(subject)) {
          continue;
        }
        const invMatch = (subject + " " + snippet).match(/INV[-_ ]?\d{4}[-_ ]?\d{3,}/i);
        const invoiceNo = invMatch ? invMatch[0].replace(/[_ ]/g, "-").toUpperCase() : null;
        if (!invoiceNo) continue;
        let invoice = null;
        try {
          invoice = await prisma12.invoice.findUnique({ where: { invoiceNo } });
        } catch {
        }
        if (!invoice) continue;
        const parts = [];
        walkParts2(payload);
        const attachments = parts.filter((p) => p?.body?.attachmentId && (/^application\/pdf/i.test(p.mimeType) || /^image\//i.test(p.mimeType)));
        try {
          if (threadId) {
            const threadRes = await import_axios2.default.get(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`, { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` } });
            const tMsgs = Array.isArray(threadRes.data?.messages) ? threadRes.data.messages : [];
            const hasSent = tMsgs.some((tm) => Array.isArray(tm?.labelIds) && tm.labelIds.includes("SENT"));
            const subjInThread = tMsgs.some((tm) => {
              const hs = tm?.payload?.headers || [];
              const s = hs.find((h) => h.name.toLowerCase() === "subject")?.value || "";
              return s.includes(invoiceNo);
            });
            if (!hasSent || !subjInThread) {
              continue;
            }
          }
        } catch {
          continue;
        }
        for (const att of attachments) {
          let savedReceipt = null;
          const fileName = att.filename || "attachment";
          const fileType = att.mimeType || "application/octet-stream";
          const attachmentId = att.body?.attachmentId;
          if (!attachmentId) continue;
          const partSize = Number(att.body?.size || 0);
          if (/^image\//i.test(fileType) && partSize > 0 && partSize < 2e4) continue;
          if (/^application\/pdf/i.test(fileType) && partSize > 0 && partSize < 5e3) continue;
          const fileKey = `${baseUrl2(req)}/api/gmail/messages/${m.id}/attachments/${attachmentId}?account=${encodeURIComponent(acc.id)}`;
          if (!looksLikeSlip2(fileName, fileType, subject, snippet, invoiceNo)) {
            continue;
          }
          let amountNum = void 0;
          try {
            const ares = await import_axios2.default.get(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}/attachments/${attachmentId}`,
              { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` } }
            );
            const dataB64 = ares.data?.data || "";
            const buf = Buffer.from(String(dataB64).replace(/-/g, "+").replace(/_/g, "/"), "base64");
            amountNum = await extractAmount(buf, fileType);
          } catch {
          }
          try {
            const commonData = {
              paymentRequestId: invoiceNo || void 0,
              invoiceId: invoice?.id || void 0,
              projectId: invoice?.projectId || void 0,
              phaseId: invoice?.phaseId || void 0,
              source: "email",
              fileKey,
              fileType,
              fileSize: null,
              amount: amountNum || null,
              payerName: from || replyTo || null,
              payerEmail: (from || "").replace(/.*<([^>]+)>.*/, "$1") || null,
              // Do not auto-verify on ingestion; user must verify manually
              status: "SUBMITTED",
              confidence: invoice ? 0.9 : 0.6,
              senderEmail: (from || "").replace(/.*<([^>]+)>.*/, "$1") || null,
              gmailThreadId: threadId || null,
              receivedAt
            };
            const dbRec = await db2.paymentReceipt.upsert({
              where: { messageId_fileName: { messageId: m.id, fileName } },
              update: commonData,
              create: { ...commonData, fileName, messageId: m.id, flags: [] }
            });
            savedReceipt = dbRec;
          } catch {
          }
          const receiptCode = `RC-${String(m.id).slice(0, 6).toUpperCase()}`;
          const statusFromDb = savedReceipt?.status;
          const uiStatus = statusFromDb === "VERIFIED" ? "Verified" : statusFromDb === "REJECTED" ? "Rejected" : "Submitted";
          const idForUi = savedReceipt?.id || `gmail-${m.id}-${attachmentId}`;
          const fileKeyForUi = savedReceipt?.fileKey || fileKey;
          out.push({
            id: idForUi,
            paymentRequestId: invoiceNo || void 0,
            invoiceNo: invoiceNo || void 0,
            invoiceId: invoice?.id || void 0,
            matchedInvoiceNo: invoiceNo || void 0,
            receiptCode,
            projectId: invoice?.projectId || "unknown",
            phaseId: invoice?.phaseId || "unknown",
            projectName: invoice ? "" : "Unknown Project",
            phaseName: invoice ? "" : "Unknown Phase",
            source: "email",
            fileKey: fileKeyForUi,
            fileName,
            fileType,
            // size will be provided on proxy fetch; unknown here
            amount: amountNum,
            paidDate: void 0,
            transactionRef: void 0,
            payerName: from || replyTo || void 0,
            payerEmail: (from || "").replace(/.*<([^>]+)>.*/, "$1"),
            status: uiStatus,
            confidence: invoice ? 0.9 : 0.6,
            matchedInvoiceId: invoice?.id || void 0,
            matchedAmount: invoice && amountNum ? amountNum : void 0,
            flags: [],
            senderEmail: (from || "").replace(/.*<([^>]+)>.*/, "$1"),
            messageId: m.id,
            gmailThreadId: threadId,
            receivedAt
          });
        }
      } catch (e) {
      }
    }
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e?.response?.data || e?.message || "Failed to fetch receipts" });
  }
});
router10.get("/messages/:messageId/attachments/:attachmentId", async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(500).json({ error: "Missing Google client credentials" });
  const accountId = req.query.account || "";
  let acc = null;
  if (accountId) {
    acc = await prisma12.calendarAccount.findUnique({ where: { id: accountId } });
  }
  if (!acc) {
    const userId = await resolveUserId2(req);
    if (userId) {
      acc = await prisma12.calendarAccount.findFirst({ where: { userId, provider: "GOOGLE" } });
    }
  }
  if (!acc) {
    acc = await prisma12.calendarAccount.findFirst({ where: { provider: "GOOGLE" } });
  }
  if (!acc) return res.status(409).json({ error: "Google not connected" });
  const scope = String(acc.scope || "");
  const needsScope = !/gmail\.readonly/.test(scope);
  if (needsScope) {
    return res.status(409).json({ error: "Gmail scopes not granted. Please connect Gmail.", scope });
  }
  try {
    let walk2 = function(p) {
      if (!p || found) return;
      if (p.parts && Array.isArray(p.parts)) {
        for (const sp of p.parts) walk2(sp);
      } else if (p?.body?.attachmentId === attachmentId) {
        found = p;
      }
    };
    var walk = walk2;
    const tokenAcc = await ensureGoogleToken2(acc, clientId, clientSecret);
    const { messageId, attachmentId } = req.params;
    const msgRes = await import_axios2.default.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` } });
    const payload = msgRes.data?.payload;
    let found = null;
    walk2(payload);
    const mimeType = found?.mimeType || "application/octet-stream";
    const filename = found?.filename || "attachment";
    const attRes = await import_axios2.default.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`, { headers: { Authorization: `Bearer ${tokenAcc.accessToken}` } });
    const dataB64 = attRes.data?.data || "";
    const buf = Buffer.from(String(dataB64).replace(/-/g, "+").replace(/_/g, "/"), "base64");
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${filename.replace(/"/g, "")}"`);
    try {
      res.removeHeader("X-Frame-Options");
    } catch {
    }
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.send(buf);
  } catch (e) {
    res.status(400).json({ error: e?.response?.data || e?.message || "Failed to fetch attachment" });
  }
});
var gmail_default = router10;

// src/routes/invoices.ts
var import_express11 = require("express");
var import_client13 = require("@prisma/client");
var import_zod9 = require("zod");
var prisma13 = new import_client13.PrismaClient();
var db3 = prisma13;
var router11 = (0, import_express11.Router)();
function mapInvoice(i) {
  return {
    id: i.id,
    invoiceNo: i.invoiceNo,
    projectId: i.projectId,
    phaseId: i.phaseId,
    projectName: i.project?.title || "",
    phaseName: i.phase?.name || "",
    issueDate: i.issueDate,
    dueDate: i.dueDate,
    currency: i.currency,
    subtotal: i.subtotal,
    taxAmount: i.taxAmount,
    total: i.total,
    collected: i.collected,
    outstanding: i.outstanding,
    status: i.status,
    pdfKey: i.pdfKey || null,
    notes: i.notes || "",
    createdAt: i.createdAt,
    updatedAt: i.updatedAt
  };
}
router11.get("/", async (_req, res) => {
  const list = await db3.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { project: true, phase: true }
  });
  res.json(list.map(mapInvoice));
});
var createSchema2 = import_zod9.z.object({
  invoiceNo: import_zod9.z.string(),
  projectId: import_zod9.z.string(),
  phaseId: import_zod9.z.string(),
  issueDate: import_zod9.z.string(),
  dueDate: import_zod9.z.string(),
  currency: import_zod9.z.string().default("USD"),
  subtotal: import_zod9.z.number().nonnegative().default(0),
  taxAmount: import_zod9.z.number().nonnegative().default(0),
  total: import_zod9.z.number().nonnegative().default(0),
  notes: import_zod9.z.string().optional().default("")
});
router11.post("/", async (req, res) => {
  const parsed = createSchema2.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const data = parsed.data;
  try {
    const created = await db3.invoice.create({
      data: {
        invoiceNo: data.invoiceNo,
        projectId: data.projectId,
        phaseId: data.phaseId,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        currency: data.currency,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        total: data.total,
        collected: 0,
        outstanding: data.total,
        status: "DRAFT",
        notes: data.notes || ""
      },
      include: { project: true, phase: true }
    });
    res.status(201).json(mapInvoice(created));
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to create invoice" });
  }
});
var updateSchema = createSchema2.partial();
router11.patch("/:id", async (req, res) => {
  const id = req.params.id;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const data = parsed.data;
  if (data.issueDate !== void 0) data.issueDate = new Date(data.issueDate);
  if (data.dueDate !== void 0) data.dueDate = new Date(data.dueDate);
  try {
    const updated = await db3.invoice.update({ where: { id }, data, include: { project: true, phase: true } });
    res.json(mapInvoice(updated));
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to update invoice" });
  }
});
router11.delete("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await db3.invoice.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to delete invoice" });
  }
});
router11.post("/:id/mark-paid", async (req, res) => {
  const id = req.params.id;
  try {
    const inv = await db3.invoice.findUnique({ where: { id } });
    if (!inv) return res.status(404).json({ error: "Not found" });
    const updated = await db3.invoice.update({
      where: { id },
      data: { collected: inv.total, outstanding: 0, status: "PAID" },
      include: { project: true, phase: true }
    });
    res.json(mapInvoice(updated));
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to mark invoice paid" });
  }
});
var invoices_default = router11;

// src/routes/receipts.ts
var import_express12 = require("express");
var import_client14 = require("@prisma/client");
var import_zod10 = require("zod");
var import_path2 = __toESM(require("path"));
var import_promises = __toESM(require("fs/promises"));
var prisma14 = new import_client14.PrismaClient();
var db4 = prisma14;
var router12 = (0, import_express12.Router)();
function hasModel(name) {
  const m = db4[name];
  return m && typeof m.findMany === "function";
}
function mapReceipt(r) {
  return {
    id: r.id,
    paymentRequestId: r.paymentRequestId || null,
    invoiceId: r.invoiceId || null,
    matchedInvoiceNo: r.invoice?.invoiceNo || null,
    receiptCode: `RC-${String(r.messageId || r.id).slice(0, 6).toUpperCase()}`,
    projectId: r.projectId || null,
    phaseId: r.phaseId || null,
    projectName: r.project?.title || "",
    phaseName: r.phase?.name || "",
    source: r.source,
    fileKey: r.fileKey || null,
    fileName: r.fileName || null,
    fileType: r.fileType || null,
    fileSize: r.fileSize || null,
    amount: r.amount || null,
    paidDate: r.paidDate || null,
    transactionRef: r.transactionRef || null,
    payerName: r.payerName || null,
    payerEmail: r.payerEmail || null,
    status: r.status === "VERIFIED" ? "Verified" : r.status === "REJECTED" ? "Rejected" : "Submitted",
    confidence: r.confidence || null,
    matchedInvoiceId: r.invoiceId || null,
    matchedAmount: null,
    flags: r.flags || [],
    senderEmail: r.senderEmail || null,
    messageId: r.messageId || null,
    gmailThreadId: r.gmailThreadId || null,
    receivedAt: r.receivedAt,
    reviewedBy: r.reviewedBy || null,
    reviewedAt: r.reviewedAt || null,
    reviewNote: r.reviewNote || null
  };
}
router12.get("/", async (_req, res) => {
  if (!hasModel("paymentReceipt")) return res.json([]);
  const list = await db4.paymentReceipt.findMany({ orderBy: { receivedAt: "desc" }, include: { project: true, phase: true, invoice: true } });
  res.json(list.map(mapReceipt));
});
router12.post("/:id/verify", async (req, res) => {
  const id = req.params.id;
  if (!hasModel("paymentReceipt")) return res.status(501).json({ error: "Receipts persistence not migrated yet" });
  const userId = req.userId || "system";
  const body = import_zod10.z.object({ reviewNote: import_zod10.z.string().optional() }).parse(req.body || {});
  try {
    const prev = await db4.paymentReceipt.findUnique({ where: { id } });
    if (!prev) return res.status(404).json({ error: "Receipt not found" });
    const wasVerified = String(prev.status || "").toUpperCase() === "VERIFIED";
    if (wasVerified) {
      try {
        const prevFull = await db4.paymentReceipt.findUnique({ where: { id }, include: { invoice: true, project: true, phase: true } });
        return res.json(mapReceipt(prevFull));
      } catch {
        return res.json(mapReceipt(prev));
      }
    }
    const updated = await db4.paymentReceipt.update({ where: { id }, data: { status: "VERIFIED", reviewedBy: userId, reviewedAt: /* @__PURE__ */ new Date(), reviewNote: body.reviewNote || void 0 }, include: { invoice: true, project: true, phase: true } });
    let shouldApply = true;
    try {
      if (prev.messageId || prev.fileName) {
        const already = await db4.paymentReceipt.findFirst({
          where: {
            id: { not: id },
            status: "VERIFIED",
            OR: [
              { messageId: prev.messageId || void 0, fileName: prev.fileName || void 0 },
              { messageId: prev.messageId || void 0 }
            ]
          }
        });
        if (already) shouldApply = false;
      }
    } catch {
    }
    if (shouldApply && updated.invoiceId && updated.amount && updated.amount > 0) {
      const inv = await db4.invoice.findUnique({ where: { id: updated.invoiceId } });
      if (inv) {
        const newCollected = (inv.collected || 0) + Number(updated.amount);
        const outstanding = Math.max(0, Number(inv.total) - newCollected);
        const status = outstanding === 0 ? "PAID" : newCollected > 0 ? "PARTIALLY_PAID" : inv.status;
        await db4.invoice.update({ where: { id: inv.id }, data: { collected: newCollected, outstanding, status } });
      }
    }
    try {
      if (updated.fileKey) {
        const axios5 = (await import("axios")).default;
        const resp = await axios5.get(String(updated.fileKey), { responseType: "arraybuffer" });
        const buf = Buffer.from(resp.data);
        const mime = String(resp.headers["content-type"] || updated.fileType || "application/octet-stream");
        const uploadDir2 = process.env.UPLOAD_DIR || "uploads";
        const recDir = import_path2.default.resolve(process.cwd(), uploadDir2, "receipts");
        await import_promises.default.mkdir(recDir, { recursive: true });
        const extFromName = (updated.fileName || "").split(".").pop() || "";
        const ext = extFromName ? extFromName.toLowerCase() : mime.includes("pdf") ? "pdf" : "bin";
        const filename = `${updated.id}.${ext}`;
        const absPath = import_path2.default.join(recDir, filename);
        await import_promises.default.writeFile(absPath, buf);
        const relPath = import_path2.default.posix.join("receipts", filename);
        try {
          await db4.attachment.create({ data: { filePath: relPath, fileType: mime, projectId: updated.projectId || null } });
        } catch {
        }
        await db4.paymentReceipt.update({ where: { id: updated.id }, data: { fileKey: `/uploads/${relPath}` } });
      }
    } catch {
    }
    res.json(mapReceipt(updated));
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to verify receipt" });
  }
});
router12.post("/:id/reject", async (req, res) => {
  const id = req.params.id;
  if (!hasModel("paymentReceipt")) return res.status(501).json({ error: "Receipts persistence not migrated yet" });
  const userId = req.userId || "system";
  const body = import_zod10.z.object({ reason: import_zod10.z.string(), reviewNote: import_zod10.z.string().optional() }).parse(req.body || {});
  try {
    const updated = await db4.paymentReceipt.update({ where: { id }, data: { status: "REJECTED", reviewedBy: userId, reviewedAt: /* @__PURE__ */ new Date(), reviewNote: body.reviewNote || body.reason }, include: { invoice: true, project: true, phase: true } });
    res.json(mapReceipt(updated));
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to reject receipt" });
  }
});
router12.get("/:id/suggestions", async (req, res) => {
  const id = req.params.id;
  if (!hasModel("paymentReceipt")) return res.status(501).json({ error: "Receipts persistence not migrated yet" });
  const r = await db4.paymentReceipt.findUnique({ where: { id } });
  if (!r) return res.status(404).json({ error: "Not found" });
  const amt = r.amount || 0;
  const invs = await db4.invoice.findMany({ where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE", "DRAFT"] } } });
  const suggestions = invs.map((i) => ({ invoice: i, delta: Math.abs((i.total || 0) - amt) })).sort((a, b) => a.delta - b.delta).slice(0, 5).map((x) => ({
    id: x.invoice.id,
    invoiceNo: x.invoice.invoiceNo,
    projectId: x.invoice.projectId,
    phaseId: x.invoice.phaseId,
    projectName: "",
    phaseName: "",
    issueDate: x.invoice.issueDate,
    dueDate: x.invoice.dueDate,
    currency: x.invoice.currency,
    subtotal: x.invoice.subtotal,
    taxAmount: x.invoice.taxAmount,
    total: x.invoice.total,
    collected: x.invoice.collected,
    outstanding: x.invoice.outstanding,
    status: x.invoice.status,
    pdfKey: x.invoice.pdfKey || null,
    notes: x.invoice.notes || "",
    createdAt: x.invoice.createdAt,
    updatedAt: x.invoice.updatedAt
  }));
  res.json(suggestions);
});
router12.post("/:id/match", async (req, res) => {
  const id = req.params.id;
  if (!hasModel("paymentReceipt")) return res.status(501).json({ error: "Receipts persistence not migrated yet" });
  const body = import_zod10.z.object({ invoiceId: import_zod10.z.string(), amount: import_zod10.z.number().nonnegative() }).parse(req.body || {});
  const userId = req.userId || "system";
  try {
    const inv = await db4.invoice.findUnique({ where: { id: body.invoiceId } });
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    const rec = await db4.paymentReceipt.findUnique({ where: { id } });
    if (!rec) return res.status(404).json({ error: "Receipt not found" });
    await db4.$transaction(async (tx) => {
      await tx.paymentReceipt.update({ where: { id }, data: { invoiceId: body.invoiceId } });
      await tx.paymentMatch.create({ data: { invoiceId: body.invoiceId, receiptId: id, amount: body.amount, matchedBy: String(userId), type: "receipt" } });
    });
    const updated = await db4.paymentReceipt.findUnique({ where: { id }, include: { invoice: true, project: true, phase: true } });
    res.json(mapReceipt(updated));
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to match receipt" });
  }
});
router12.post("/:id/unmatch", async (req, res) => {
  const id = req.params.id;
  if (!hasModel("paymentReceipt")) return res.status(501).json({ error: "Receipts persistence not migrated yet" });
  try {
    const rec = await db4.paymentReceipt.findUnique({ where: { id } });
    if (!rec) return res.status(404).json({ error: "Receipt not found" });
    await db4.paymentReceipt.update({ where: { id }, data: { invoiceId: null, status: "SUBMITTED" } });
    const updated = await db4.paymentReceipt.findUnique({ where: { id }, include: { invoice: true, project: true, phase: true } });
    res.json(mapReceipt(updated));
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to unmatch receipt" });
  }
});
router12.post("/:id/reextract", async (req, res) => {
  const id = req.params.id;
  if (!hasModel("paymentReceipt")) return res.status(501).json({ error: "Receipts persistence not migrated yet" });
  try {
    const r = await db4.paymentReceipt.findUnique({ where: { id } });
    if (!r) return res.status(404).json({ error: "Receipt not found" });
    if (!r.fileKey) return res.status(400).json({ error: "No slip attached" });
    const axios5 = (await import("axios")).default;
    const resp = await axios5.get(String(r.fileKey), { responseType: "arraybuffer" });
    const buf = Buffer.from(resp.data);
    const mime = String(resp.headers["content-type"] || r.fileType || "application/octet-stream");
    const { extractAmount: extractAmount2 } = await Promise.resolve().then(() => (init_slip_extract(), slip_extract_exports));
    const amount = await extractAmount2(buf, mime);
    if (amount === void 0) return res.status(422).json({ error: "Could not extract amount from slip" });
    const updated = await db4.paymentReceipt.update({ where: { id }, data: { amount, confidence: Math.max(0.7, r.confidence || 0.7) } });
    res.json(mapReceipt(updated));
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to re-extract amount" });
  }
});
var receipts_default = router12;

// src/routes/bank-credits.ts
var import_express13 = require("express");
var import_client15 = require("@prisma/client");
var import_zod11 = require("zod");
var prisma15 = new import_client15.PrismaClient();
var db5 = prisma15;
var router13 = (0, import_express13.Router)();
function hasModel2(name) {
  const m = prisma15[name];
  return m && typeof m.findMany === "function";
}
function mapCredit(c) {
  return {
    id: c.id,
    amount: c.amount,
    currency: c.currency,
    valueDate: c.valueDate,
    payerName: c.payerName || null,
    bankRef: c.bankRef || null,
    memo: c.memo || null,
    sourceMailbox: c.sourceMailbox,
    messageId: c.messageId,
    receivedAt: c.receivedAt,
    matchedInvoiceId: c.matchedInvoiceId || null,
    matchedAmount: c.matchedAmount || null,
    confidence: c.confidence || null,
    status: c.status === "MATCHED" ? "Matched" : c.status === "NEEDS_REVIEW" ? "NeedsReview" : "Unmatched",
    suggestions: []
  };
}
router13.get("/", async (_req, res) => {
  if (!hasModel2("bankCredit")) return res.json([]);
  const list = await db5.bankCredit.findMany({ orderBy: { receivedAt: "desc" } });
  res.json(list.map(mapCredit));
});
router13.post("/:id/match", async (req, res) => {
  const id = req.params.id;
  if (!hasModel2("bankCredit")) return res.status(501).json({ error: "Bank credits persistence not migrated yet" });
  const body = import_zod11.z.object({ invoiceId: import_zod11.z.string(), confirm: import_zod11.z.boolean().optional() }).parse(req.body || {});
  const userId = req.userId || "system";
  try {
    const credit = await db5.bankCredit.findUnique({ where: { id } });
    if (!credit) return res.status(404).json({ error: "Bank credit not found" });
    const inv = await db5.invoice.findUnique({ where: { id: body.invoiceId } });
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    await db5.$transaction(async (tx) => {
      await tx.bankCredit.update({ where: { id }, data: { matchedInvoiceId: body.invoiceId, matchedAmount: credit.amount, status: "MATCHED", confidence: 0.95 } });
      await tx.paymentMatch.create({ data: { invoiceId: body.invoiceId, bankCreditId: id, amount: credit.amount, matchedBy: String(userId), type: "bank_credit" } });
      await tx.invoice.update({ where: { id: body.invoiceId }, data: {
        collected: inv.collected + credit.amount,
        outstanding: Math.max(0, inv.total - (inv.collected + credit.amount)),
        status: inv.total === inv.collected + credit.amount ? "PAID" : inv.collected + credit.amount > 0 ? "PARTIALLY_PAID" : inv.status
      } });
    });
    const updated = await db5.bankCredit.findUnique({ where: { id } });
    res.json(mapCredit(updated));
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to match bank credit" });
  }
});
router13.post("/:id/not-ours", async (req, res) => {
  const id = req.params.id;
  if (!hasModel2("bankCredit")) return res.status(501).json({ error: "Bank credits persistence not migrated yet" });
  try {
    const updated = await db5.bankCredit.update({ where: { id }, data: { status: "MATCHED" } });
    res.json(mapCredit(updated));
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to mark bank credit" });
  }
});
var bank_credits_default = router13;

// src/routes/documents.ts
var import_express14 = require("express");
var import_client16 = require("@prisma/client");
var import_multer2 = __toESM(require("multer"));
var import_path3 = __toESM(require("path"));
var import_promises2 = __toESM(require("fs/promises"));
var import_zod12 = require("zod");
var prisma16 = new import_client16.PrismaClient();
var db6 = prisma16;
var router14 = (0, import_express14.Router)();
var uploadDir = import_path3.default.resolve(process.cwd(), "uploads", "documents");
var storage2 = import_multer2.default.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await import_promises2.default.mkdir(uploadDir, { recursive: true });
    } catch {
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const name = String(file.originalname || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = import_path3.default.extname(name);
    const base = import_path3.default.basename(name, ext);
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}`;
    cb(null, `${unique}${ext}`);
  }
});
var upload2 = (0, import_multer2.default)({ storage: storage2 });
function mapStatus(s) {
  switch (s) {
    case "DRAFT":
      return "draft";
    case "IN_REVIEW":
      return "in-review";
    case "APPROVED":
      return "approved";
    case "NEEDS_CHANGES":
      return "needs-changes";
    case "REJECTED":
      return "rejected";
    default:
      return "draft";
  }
}
function mapDocument(d) {
  return {
    id: d.id,
    name: d.name,
    fileUrl: d.filePath?.startsWith("/uploads") ? d.filePath : `/uploads/${d.filePath}`,
    filePath: d.filePath,
    status: mapStatus(d.status || "DRAFT"),
    reviewerId: d.reviewerId || null,
    reviewer: d.reviewer ? { id: d.reviewer.id, name: d.reviewer.name, email: d.reviewer.email } : null,
    reviewerRole: d.reviewer?.role?.name || null,
    createdById: d.createdById,
    createdBy: d.createdBy ? { id: d.createdBy.id, name: d.createdBy.name, email: d.createdBy.email } : null,
    createdByRole: d.createdBy?.role?.name || null,
    projectId: d.projectId || null,
    phaseId: d.phaseId || null,
    taskId: d.taskId || null,
    projectName: d.project?.title || "",
    phaseName: d.phase?.name || "",
    taskTitle: d.task?.title || "",
    reviewComment: d.reviewComment || null,
    reviewedAt: d.reviewedAt || null,
    version: d.version || 1,
    createdAt: d.createdAt
  };
}
router14.post("/upload", upload2.array("files"), async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Login required" });
  const schema = import_zod12.z.object({
    projectId: import_zod12.z.string(),
    phaseId: import_zod12.z.string(),
    taskId: import_zod12.z.string().optional().nullable(),
    reviewerId: import_zod12.z.string(),
    status: import_zod12.z.enum(["draft", "in-review"]).optional().default("in-review"),
    name: import_zod12.z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { projectId, phaseId, taskId, reviewerId, status, name } = parsed.data;
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: 'No files uploaded (use field name "files")' });
  try {
    const [project, phase, reviewer] = await Promise.all([
      prisma16.project.findUnique({ where: { id: projectId } }),
      prisma16.phase.findUnique({ where: { id: phaseId } }),
      prisma16.user.findUnique({ where: { id: reviewerId } })
    ]);
    if (!project) return res.status(400).json({ error: "Invalid projectId" });
    if (!phase || phase.projectId !== projectId) return res.status(400).json({ error: "Invalid phaseId for project" });
    if (!reviewer) return res.status(400).json({ error: "Invalid reviewerId" });
    const statusDb = status === "in-review" ? "IN_REVIEW" : "DRAFT";
    const created = [];
    for (const f of files) {
      const relPath = import_path3.default.posix.join("documents", import_path3.default.basename(f.path));
      const doc = await db6.document.create({
        data: {
          name: name || f.originalname || "document",
          filePath: relPath,
          // served at /uploads/<relPath>
          projectId,
          phaseId,
          taskId: taskId || null,
          reviewerId,
          createdById: userId,
          status: statusDb
        },
        include: { reviewer: { include: { role: true } }, createdBy: { include: { role: true } }, project: true, phase: true, task: true }
      });
      created.push(mapDocument(doc));
      try {
        if (taskId) {
          await prisma16.historyEvent.create({
            data: {
              taskId: String(taskId),
              type: "DOCUMENT",
              message: `Document: ${doc.name}`,
              createdById: userId
            }
          });
        }
      } catch {
      }
    }
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to upload documents" });
  }
});
router14.get("/inbox", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Login required" });
  const rows = await db6.document.findMany({
    where: { reviewerId: userId },
    orderBy: { createdAt: "desc" },
    include: { reviewer: { include: { role: true } }, createdBy: { include: { role: true } }, project: true, phase: true, task: true }
  });
  res.json(rows.map(mapDocument));
});
router14.get("/sent", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Login required" });
  const rows = await db6.document.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
    include: { reviewer: { include: { role: true } }, createdBy: { include: { role: true } }, project: true, phase: true, task: true }
  });
  res.json(rows.map(mapDocument));
});
router14.get("/by-task/:taskId", async (req, res) => {
  const taskId = req.params.taskId;
  if (!taskId) return res.status(400).json({ error: "taskId required" });
  try {
    const rows = await db6.document.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
      include: { reviewer: { include: { role: true } }, createdBy: { include: { role: true } }, project: true, phase: true, task: true }
    });
    res.json(rows.map(mapDocument));
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to load documents" });
  }
});
router14.get("/:id", async (req, res) => {
  const d = await db6.document.findUnique({
    where: { id: req.params.id },
    include: { reviewer: { include: { role: true } }, createdBy: { include: { role: true } }, project: true, phase: true, task: true }
  });
  if (!d) return res.status(404).json({ error: "Not found" });
  res.json(mapDocument(d));
});
router14.patch("/:id/review", async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Login required" });
  const schema = import_zod12.z.object({
    status: import_zod12.z.enum(["approved", "rejected", "needs-changes", "in-review"]),
    reviewComment: import_zod12.z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { status, reviewComment } = parsed.data;
  const d = await db6.document.findUnique({ where: { id: req.params.id } });
  if (!d) return res.status(404).json({ error: "Not found" });
  if (d.reviewerId !== userId) return res.status(403).json({ error: "Only assigned reviewer can update status" });
  const statusDb = status === "approved" ? "APPROVED" : status === "rejected" ? "REJECTED" : status === "needs-changes" ? "NEEDS_CHANGES" : "IN_REVIEW";
  const updated = await db6.document.update({
    where: { id: d.id },
    data: { status: statusDb, reviewComment: reviewComment || void 0, reviewedAt: /* @__PURE__ */ new Date() },
    include: { reviewer: { include: { role: true } }, createdBy: { include: { role: true } }, project: true, phase: true, task: true }
  });
  res.json(mapDocument(updated));
});
var documents_default = router14;

// src/routes/admin.ts
var import_express15 = require("express");
var import_client17 = require("@prisma/client");
var import_zod13 = require("zod");
var import_bcryptjs2 = __toESM(require("bcryptjs"));
var import_crypto3 = __toESM(require("crypto"));
var prisma17 = new import_client17.PrismaClient();
var router15 = (0, import_express15.Router)();
async function ensureRole(name) {
  const found = await prisma17.appRole.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (found) return found;
  return prisma17.appRole.create({ data: { name } });
}
async function ensureDepartment(name) {
  const found = await prisma17.department.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (found) return found;
  return prisma17.department.create({ data: { name } });
}
router15.use(requireSuperAdmin);
router15.post("/register-user", async (req, res) => {
  const body = import_zod13.z.object({
    name: import_zod13.z.string().min(1),
    email: import_zod13.z.string().email(),
    password: import_zod13.z.string().min(6),
    roleName: import_zod13.z.string().min(1),
    departmentName: import_zod13.z.string().min(1),
    verify: import_zod13.z.coerce.boolean().optional().default(true),
    active: import_zod13.z.coerce.boolean().optional().default(true)
  }).parse(req.body || {});
  try {
    const adminEmail = String(process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase();
    if (body.email.trim().toLowerCase() === adminEmail) {
      return res.status(400).json({ error: "Cannot create another super admin" });
    }
    const [role, dept] = await Promise.all([
      ensureRole(body.roleName),
      ensureDepartment(body.departmentName)
    ]);
    const hash = await import_bcryptjs2.default.hash(body.password, 10);
    const user = await prisma17.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        roleId: role.id,
        departmentId: dept.id,
        passwordHash: hash,
        isActive: body.active,
        emailVerifiedAt: body.verify ? /* @__PURE__ */ new Date() : null
      }
    });
    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: role.name,
      department: dept.name,
      isActive: user.isActive,
      verified: !!user.emailVerifiedAt
    });
  } catch (e) {
    if (e?.code === "P2002") return res.status(409).json({ error: "Email already exists" });
    res.status(400).json({ error: e?.message || "Failed to register user" });
  }
});
router15.get("/catalog", async (_req, res) => {
  const [roles, depts] = await Promise.all([
    prisma17.appRole.findMany({ orderBy: { name: "asc" } }),
    prisma17.department.findMany({ orderBy: { name: "asc" } })
  ]);
  res.json({ roles: roles.map((r) => r.name), departments: depts.map((d) => d.name) });
});
var admin_default = router15;
router15.post("/invite-user", async (req, res) => {
  const body = import_zod13.z.object({
    name: import_zod13.z.string().min(1),
    email: import_zod13.z.string().email(),
    roleName: import_zod13.z.string().min(1).optional(),
    departmentName: import_zod13.z.string().min(1)
  }).parse(req.body || {});
  try {
    const role = body.roleName ? await ensureRole(body.roleName) : await prisma17.appRole.findFirst({ where: { name: { equals: "Client", mode: "insensitive" } } }) || await ensureRole("Client");
    const dept = await ensureDepartment(body.departmentName);
    const email = body.email.toLowerCase();
    let user = await prisma17.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma17.user.create({ data: {
        name: body.name,
        email,
        roleId: role.id,
        departmentId: dept.id,
        isActive: true,
        emailVerifiedAt: null
      } });
    }
    await prisma17.approvalRequest.upsert({
      where: { userId: user.id },
      update: { status: "APPROVED", decidedById: req.userId, decidedAt: /* @__PURE__ */ new Date() },
      create: { userId: user.id, status: "APPROVED", decidedById: req.userId, decidedAt: /* @__PURE__ */ new Date(), requestedDepartmentId: dept.id, requestedRoleId: role.id }
    });
    const raw = await createVerifyToken(user.id, 24 * 3600);
    const clientBase = process.env.FRONTEND_BASE_URL || "http://localhost:5173";
    const verifyUrl = `${clientBase}/invite/accept?token=${encodeURIComponent(raw)}`;
    if (emailEnabled()) {
      const { subject, html } = renderInviteEmail(verifyUrl, user.name, role?.name, dept.name);
      await sendMail(user.email, subject, html);
    }
    res.status(201).json({ ok: true, id: user.id, email: user.email, ...emailEnabled() ? {} : { verifyUrl } });
  } catch (e) {
    if (e?.code === "P2002") return res.status(409).json({ error: "Email already exists" });
    res.status(400).json({ error: e?.message || "Failed to invite user" });
  }
});
router15.post("/impersonation/start", async (req, res) => {
  const body = import_zod13.z.object({ userId: import_zod13.z.string().min(1) }).parse(req.body || {});
  const adminId = req.userId;
  if (!adminId) return res.status(401).json({ error: "Authentication required" });
  try {
    const target = await prisma17.user.findUnique({ where: { id: body.userId } });
    if (!target) return res.status(404).json({ error: "User not found" });
    const db7 = prisma17;
    const session = await db7.impersonationSession.create({ data: { adminId, userId: target.id } });
    await db7.adminAudit.create({ data: { adminId, targetUserId: target.id, action: "IMPERSONATION_START", details: `path=/api/admin/impersonation/start` } });
    const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
    res.cookie("impSid", session.id, { httpOnly: true, sameSite: "lax", secure: isProd });
    res.json({ ok: true, sessionId: session.id, user: { id: target.id, name: target.name, email: target.email } });
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to start impersonation" });
  }
});
router15.post("/impersonation/stop", async (req, res) => {
  const adminId = req.userId;
  const impSid = req.cookies?.impSid || "";
  if (!adminId) return res.status(401).json({ error: "Authentication required" });
  try {
    if (impSid) {
      const db8 = prisma17;
      await db8.impersonationSession.updateMany({ where: { id: String(impSid), adminId, endedAt: null }, data: { endedAt: /* @__PURE__ */ new Date() } });
    }
    const db7 = prisma17;
    await db7.adminAudit.create({ data: { adminId, action: "IMPERSONATION_STOP", details: `path=/api/admin/impersonation/stop` } });
    res.clearCookie("impSid");
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to stop impersonation" });
  }
});
router15.get("/impersonation/status", async (req, res) => {
  const adminId = req.userId;
  const impSid = req.cookies?.impSid || "";
  if (!adminId) return res.status(401).json({ error: "Authentication required" });
  if (!impSid) return res.json({ active: false });
  try {
    const db7 = prisma17;
    const session = await db7.impersonationSession.findFirst({ where: { id: String(impSid), adminId, endedAt: null }, include: { user: true } });
    if (!session) return res.json({ active: false });
    res.json({ active: true, session: { id: session.id, user: { id: session.userId, name: session.user.name, email: session.user.email }, startedAt: session.startedAt } });
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to read status" });
  }
});
router15.post("/purge-non-admin-users", async (_req, res) => {
  const adminEmail = String(process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase();
  if (!adminEmail) return res.status(500).json({ error: "SUPERADMIN_EMAIL not configured" });
  try {
    const survivor = await prisma17.user.findFirst({ where: { email: adminEmail } });
    let deleted = 0;
    let scrubbed = 0;
    const others = await prisma17.user.findMany({ where: { NOT: { email: adminEmail } } });
    for (const u of others) {
      try {
        await prisma17.user.delete({ where: { id: u.id } });
        deleted++;
      } catch {
        const newEmail = `archived+${u.id}@example.com`;
        await prisma17.user.update({ where: { id: u.id }, data: { isActive: false, email: newEmail, name: "Archived User", passwordHash: null } });
        scrubbed++;
      }
    }
    res.json({ ok: true, kept: survivor ? 1 : 0, deleted, scrubbed });
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to purge users" });
  }
});
function hashToken2(raw) {
  return import_crypto3.default.createHash("sha256").update(raw).digest("hex");
}
async function createVerifyToken(userId, ttlSeconds) {
  const raw = import_crypto3.default.randomBytes(32).toString("hex");
  const tokenHash = hashToken2(raw);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1e3);
  await prisma17.authToken.create({ data: { userId, type: "EMAIL_VERIFY", tokenHash, expiresAt } });
  return raw;
}

// src/routes/settings.ts
var import_express16 = require("express");
var import_zod14 = require("zod");
var router16 = (0, import_express16.Router)();
router16.get("/superadmin-email", requireSuperAdmin, async (_req, res) => {
  const email = await getSuperAdminEmail();
  const fromEnv = !!process.env.SUPERADMIN_EMAIL;
  res.json({ email, source: fromEnv ? "env" : "db" });
});
router16.put("/superadmin-email", requireSuperAdmin, async (req, res) => {
  const body = import_zod14.z.object({ email: import_zod14.z.string().email() }).parse(req.body || {});
  const value = await setSuperAdminEmail(body.email);
  res.json({ ok: true, email: value });
});
var settings_default = router16;

// src/routes/speech.ts
var import_express17 = require("express");
var import_multer3 = __toESM(require("multer"));
var import_axios3 = __toESM(require("axios"));
var router17 = (0, import_express17.Router)();
var upload3 = (0, import_multer3.default)({ storage: import_multer3.default.memoryStorage() });
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
router17.post("/transcribe", upload3.single("audio"), async (req, res) => {
  try {
    const key = process.env.ASSEMBLYAI_API_KEY || "";
    if (!key) return res.status(500).json({ error: "Missing ASSEMBLYAI_API_KEY" });
    const file = req.file;
    if (!file || !file.buffer) return res.status(400).json({ error: 'No audio uploaded (field name "audio")' });
    const uploadResp = await import_axios3.default.post("https://api.assemblyai.com/v2/upload", file.buffer, {
      headers: {
        authorization: key,
        "content-type": "application/octet-stream"
      },
      maxBodyLength: Infinity
    });
    const uploadUrl = uploadResp?.data?.upload_url;
    if (!uploadUrl) return res.status(400).json({ error: "Failed to upload audio" });
    const trResp = await import_axios3.default.post("https://api.assemblyai.com/v2/transcript", {
      audio_url: uploadUrl,
      punctuate: true,
      format_text: true
    }, {
      headers: { authorization: key, "content-type": "application/json" }
    });
    const trId = trResp?.data?.id;
    if (!trId) return res.status(400).json({ error: "Failed to create transcript" });
    let text = "";
    for (let i = 0; i < 30; i++) {
      await sleep(2e3);
      const poll = await import_axios3.default.get(`https://api.assemblyai.com/v2/transcript/${trId}`, {
        headers: { authorization: key }
      });
      const status = String(poll?.data?.status || "");
      if (status === "completed") {
        text = String(poll?.data?.text || "");
        break;
      }
      if (status === "error") {
        return res.status(400).json({ error: poll?.data?.error || "Transcription failed" });
      }
    }
    if (!text) return res.status(504).json({ error: "Transcription timeout" });
    res.json({ text });
  } catch (e) {
    res.status(400).json({ error: e?.message || "Failed to transcribe audio" });
  }
});
router17.get("/realtime-token", async (_req, res) => {
  try {
    const key = process.env.ASSEMBLYAI_API_KEY || "";
    if (!key) return res.status(500).json({ error: "Missing ASSEMBLYAI_API_KEY" });
    const headers = { authorization: key, "content-type": "application/json" };
    const body = { expires_in: 3600 };
    const r = await import_axios3.default.post("https://api.assemblyai.com/v2/realtime/token", body, { headers });
    const token = r?.data?.token;
    if (!token) return res.status(400).json({ error: "Failed to obtain realtime token" });
    res.json({ token, model: "universal" });
  } catch (e) {
    res.status(400).json({ error: e?.response?.data || e?.message || "Failed to obtain realtime token" });
  }
});
var speech_default = router17;

// src/routes/chatbot.ts
var import_express18 = require("express");
var import_axios4 = __toESM(require("axios"));
var router18 = (0, import_express18.Router)();
router18.post("/send", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ error: "message is required" });
    const pdUrl = process.env.PIPEDREAM_CHAT_URL || "";
    const pdKey = process.env.PIPEDREAM_API_KEY || "";
    if (pdUrl) {
      const extract2 = (d) => {
        if (!d) return "";
        const fields = ["reply", "response", "answer", "message", "result", "text"];
        for (const f of fields) {
          if (typeof d?.[f] === "string" && d[f].trim()) return d[f].trim();
        }
        if (typeof d?.body === "string" && d.body.trim()) return d.body.trim();
        if (typeof d?.body === "object" && d.body) {
          for (const f of fields) {
            const v = d.body[f];
            if (typeof v === "string" && v.trim()) return v.trim();
          }
        }
        if (Array.isArray(d?.choices) && typeof d.choices[0]?.text === "string") return d.choices[0].text.trim();
        if (typeof d?.data?.text === "string") return d.data.text.trim();
        return "";
      };
      const jsonHeaders = { "Content-Type": "application/json" };
      if (pdKey) {
        jsonHeaders["Authorization"] = `Bearer ${pdKey}`;
        jsonHeaders["x-api-key"] = pdKey;
      }
      const formHeaders = { "Content-Type": "application/x-www-form-urlencoded" };
      if (pdKey) {
        formHeaders["Authorization"] = `Bearer ${pdKey}`;
        formHeaders["x-api-key"] = pdKey;
      }
      const attempts2 = [
        async () => ({ ok: true, status: 0, data: await (await import_axios4.default.post(pdUrl, { message, userId: req.userId || null, ts: (/* @__PURE__ */ new Date()).toISOString() }, { headers: jsonHeaders, timeout: 3e4, validateStatus: () => true })).data }),
        async () => ({ ok: true, status: 0, data: await (await import_axios4.default.post(pdUrl, { text: message }, { headers: jsonHeaders, timeout: 3e4, validateStatus: () => true })).data }),
        async () => ({ ok: true, status: 0, data: await (await import_axios4.default.post(pdUrl, { prompt: message }, { headers: jsonHeaders, timeout: 3e4, validateStatus: () => true })).data }),
        async () => ({ ok: true, status: 0, data: await (await import_axios4.default.post(pdUrl, { query: message }, { headers: jsonHeaders, timeout: 3e4, validateStatus: () => true })).data }),
        async () => ({ ok: true, status: 0, data: await (await import_axios4.default.post(pdUrl, new URLSearchParams({ message }), { headers: formHeaders, timeout: 3e4, validateStatus: () => true })).data }),
        async () => ({ ok: true, status: 0, data: await (await import_axios4.default.get(`${pdUrl}?message=${encodeURIComponent(message)}`, { headers: jsonHeaders, timeout: 3e4, validateStatus: () => true })).data })
      ];
      for (const fn of attempts2) {
        try {
          const resp = await fn();
          const reply = extract2(resp.data);
          if (reply) return res.json({ reply });
        } catch (err) {
          const code = err?.response?.status;
          const data = err?.response?.data;
          console.warn("Pipedream upstream error", { code, data: typeof data === "string" ? data : JSON.stringify(data) });
          if (code === 401 || code === 403) return res.status(code).json({ error: "Pipedream authentication failed. Check PIPEDREAM_API_KEY or workflow auth." });
        }
      }
      try {
        const probe = await import_axios4.default.get(pdUrl, { timeout: 5e3, validateStatus: () => true });
        const data = probe?.data;
        if (typeof data === "string" && data.trim()) return res.json({ reply: data.substring(0, 1e3) });
      } catch {
      }
      return res.status(502).json({ error: 'Pipedream workflow error (no reply). Ensure your workflow responds with { reply: "..." } or a text body.' });
    }
    const key = process.env.RAPIDAPI_CHAT_KEY || process.env.RAPIDAPI_KEY || "";
    const host = process.env.RAPIDAPI_CHAT_HOST || "chatgpt-ai-chat-bot.p.rapidapi.com";
    if (!key) return res.status(500).json({ error: "Missing chatbot provider configuration" });
    const headers = { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host };
    const timeout = 3e4;
    const extract = (data) => {
      if (!data) return "";
      const fields = ["response", "answer", "message", "result", "reply", "content"];
      for (const f of fields) {
        if (typeof data[f] === "string" && data[f].trim()) return data[f].trim();
      }
      if (typeof data?.data?.text === "string") return data.data.text.trim();
      if (Array.isArray(data?.choices) && data.choices[0]?.text) return String(data.choices[0].text).trim();
      return "";
    };
    const attempts = [
      async () => {
        const url = new URL(`https://${host}/ask`);
        url.searchParams.set("query", message);
        const r = await import_axios4.default.get(url.toString(), { headers, timeout });
        return extract(r.data);
      },
      async () => {
        const url = `https://${host}/chat`;
        const r = await import_axios4.default.post(url, { message }, { headers: { ...headers, "Content-Type": "application/json" }, timeout });
        return extract(r.data);
      }
    ];
    for (const attempt of attempts) {
      try {
        const txt = await attempt();
        if (txt) return res.json({ reply: txt });
      } catch (err) {
        const code = err?.response?.status;
        const data = err?.response?.data;
        console.warn("Chatbot upstream error", { code, data: typeof data === "string" ? data : JSON.stringify(data) });
        if (code === 403) {
          return res.status(403).json({ error: "Upstream says your RapidAPI key is not subscribed to this API. Subscribe to the API or set RAPIDAPI_CHAT_KEY for a subscribed app." });
        }
        if (code === 429) {
          const retryAfter = err?.response?.headers?.["retry-after"] || null;
          return res.status(429).json({ error: "Upstream rate limit reached. Please wait and try again.", retryAfter });
        }
      }
    }
    return res.status(502).json({ error: "Chatbot upstream did not return a response" });
  } catch (e) {
    res.status(400).json({ error: e?.message || "Chatbot failed" });
  }
});
var chatbot_default = router18;

// src/index.ts
var import_cookie_parser = __toESM(require("cookie-parser"));
(() => {
  const candidates = [
    import_path4.default.resolve(process.cwd(), "server/.env"),
    import_path4.default.resolve(process.cwd(), ".env"),
    import_path4.default.resolve(__dirname, "../.env")
  ];
  for (const p of candidates) {
    try {
      if (import_fs2.default.existsSync(p)) {
        import_dotenv.default.config({ path: p });
        break;
      }
    } catch {
    }
  }
})();
var app = (0, import_express19.default)();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmetMiddleware());
app.use((0, import_cors.default)(buildCorsOptions()));
app.use((0, import_cookie_parser.default)());
app.use(import_express19.default.json());
app.use((0, import_morgan.default)("dev"));
app.use("/uploads", import_express19.default.static(import_path4.default.resolve(process.cwd(), "uploads")));
var prisma18 = new import_client18.PrismaClient();
app.get("/health", async (_req, res) => {
  try {
    await prisma18.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});
app.use(async (req, _res, next) => {
  const auth = req.header("authorization") || "";
  let userId = null;
  let adminId = null;
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7);
    try {
      const secret = process.env.JWT_SECRET || "dev-secret";
      const jwt2 = require("jsonwebtoken");
      const payload = jwt2.verify(token, secret);
      userId = payload?.sub || null;
      adminId = userId;
    } catch {
    }
  }
  const allowDevHeaders = (process.env.ALLOW_DEV_HEADERS || "").toLowerCase() === "true";
  if (!userId && allowDevHeaders) {
    const fromHeader = req.header("x-user-id") || "";
    const fromCookie = req.cookies?.xuid || "";
    userId = fromHeader || fromCookie || null;
  }
  try {
    const impSid = req.cookies?.impSid || "";
    if (impSid && adminId) {
      const { PrismaClient: PrismaClient19 } = await import("@prisma/client");
      const prisma19 = new PrismaClient19();
      const db7 = prisma19;
      const session = await db7.impersonationSession.findUnique({ where: { id: String(impSid) } });
      if (session && !session.endedAt && session.adminId === adminId) {
        userId = session.userId;
        req.adminId = adminId;
        req.impersonationSessionId = session.id;
      }
    }
  } catch {
  }
  ;
  req.userId = userId;
  next();
});
app.use("/projects", projects_default);
app.use("/tasks", tasks_default);
app.use("/timelogs", timelogs_default);
app.use("/api/users", users_default);
app.use("/api/departments", departments_default);
app.use("/api/roles", roles_default);
app.use("/auth", auth_default);
app.use("/api/auth", auth_default);
app.use("/api/approvals", approvals_default);
app.use("/api/calendar", calendar_default);
app.use("/api/gmail", gmail_default);
app.use("/api/receipts", receipts_default);
app.use("/api/bank-credits", bank_credits_default);
app.use("/invoices", invoices_default);
app.use("/api/documents", documents_default);
app.use("/api/admin", admin_default);
app.use("/api/settings", settings_default);
app.use("/api/speech", speech_default);
app.use("/api/chatbot", loginRateLimiter(), chatbot_default);
var port = process.env.PORT || 4e3;
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});
//# sourceMappingURL=index.js.map