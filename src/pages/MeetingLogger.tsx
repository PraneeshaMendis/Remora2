import React, { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Users } from 'lucide-react'
import { getProjects } from '../services/projectsAPI'
import { apiGet, apiJson } from '../services/api'

type ProjectOption = {
  id: string
  name: string
}

type ProjectMemberOption = {
  id: string
  name: string
}

type PhaseOption = {
  id: string
  name: string
}

type TaskOption = {
  id: string
  title: string
}

type MeetingLog = {
  id: string
  title: string
  date: string
  type: 'Online' | 'Physical'
  projectId: string
  projectName?: string
  phaseId?: string | null
  phase?: string | null
  taskId?: string | null
  task?: string | null
  clParticipantIds?: string[]
  clParticipants: string[]
  clientParticipants: string
  durationHours: number
  clHeadcount: number
  totalEffort: number
  discussion: string
  createdAt?: string
}

const fallbackProjects: ProjectOption[] = [
  { id: 'proj-alpha', name: 'Alpha Security Program' },
  { id: 'proj-beta', name: 'Beta Compliance Review' },
  { id: 'proj-gamma', name: 'Gamma Cloud Migration' },
]

const getTodayValue = () => {
  const now = new Date()
  try {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
  } catch {
    return now.toISOString().slice(0, 10)
  }
}

const formatEffort = (value: number) => {
  if (Number.isNaN(value)) return '0'
  return Number.isInteger(value) ? value.toString() : value.toFixed(1)
}

const MeetingLogger: React.FC = () => {
  const [isFormVisible, setIsFormVisible] = useState(true)
  const [projects, setProjects] = useState<ProjectOption[]>(fallbackProjects)
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [isLoadingProjectDetail, setIsLoadingProjectDetail] = useState(false)
  const [projectDetail, setProjectDetail] = useState<any | null>(null)
  const [projectMembers, setProjectMembers] = useState<ProjectMemberOption[]>([])
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState(getTodayValue())
  const [meetingType, setMeetingType] = useState<'Online' | 'Physical'>('Online')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedPhaseId, setSelectedPhaseId] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [clientParticipants, setClientParticipants] = useState('')
  const [durationHours, setDurationHours] = useState('1')
  const [discussion, setDiscussion] = useState('')
  const [meetingLogs, setMeetingLogs] = useState<MeetingLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedHistoryProjectId, setSelectedHistoryProjectId] = useState('all')

  const clHeadcount = selectedParticipants.length

  const totalEffort = useMemo(() => {
    const duration = Number(durationHours) || 0
    return duration * clHeadcount
  }, [durationHours, clHeadcount])


  const phaseOptions = useMemo<PhaseOption[]>(() => {
    const phases = Array.isArray(projectDetail?.phases) ? projectDetail.phases : []
    return phases
      .map((phase: any) => ({
        id: String(phase?.id || ''),
        name: String(phase?.name || phase?.title || ''),
      }))
      .filter((phase: PhaseOption) => phase.id && phase.name)
  }, [projectDetail])

  const taskOptions = useMemo<TaskOption[]>(() => {
    const phases = Array.isArray(projectDetail?.phases) ? projectDetail.phases : []
    const tasksSource = selectedPhaseId
      ? phases.find((phase: any) => String(phase?.id || '') === selectedPhaseId)?.tasks || []
      : phases.flatMap((phase: any) => (Array.isArray(phase?.tasks) ? phase.tasks : []))
    return (tasksSource || [])
      .map((task: any) => ({
        id: String(task?.id || ''),
        title: String(task?.title || task?.name || ''),
      }))
      .filter((task: TaskOption) => task.id && task.title)
  }, [projectDetail, selectedPhaseId])

  const memberById = useMemo(() => {
    const map = new Map<string, ProjectMemberOption>()
    projectMembers.forEach(member => {
      if (member.id) map.set(member.id, member)
    })
    return map
  }, [projectMembers])

  const selectedParticipantNames = useMemo(() => {
    return selectedParticipants
      .map(id => memberById.get(id)?.name)
      .filter((name): name is string => Boolean(name))
  }, [memberById, selectedParticipants])

  useEffect(() => {
    let active = true
    const loadProjects = async () => {
      setIsLoadingProjects(true)
      try {
        const list = await getProjects()
        const mapped = (list || [])
          .map((item: any) => ({
            id: String(item?.id || ''),
            name: String(item?.title || item?.name || ''),
          }))
          .filter((item: ProjectOption) => item.id && item.name)
        if (!active) return
        if (mapped.length > 0) {
          setProjects(mapped)
        } else {
          setProjects(fallbackProjects)
        }
      } catch (error) {
        if (active) setProjects(fallbackProjects)
      } finally {
        if (active) setIsLoadingProjects(false)
      }
    }

    loadProjects()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadProjectDetail = async () => {
      if (!selectedProjectId) {
        setProjectDetail(null)
        setProjectMembers([])
        return
      }
      setIsLoadingProjectDetail(true)
      try {
        const [detailResult, membersResult] = await Promise.allSettled([
          apiGet(`/projects/${selectedProjectId}`),
          apiGet(`/projects/${selectedProjectId}/members`),
        ])

        const detail = detailResult.status === 'fulfilled' ? detailResult.value : null
        if (!active) return
        setProjectDetail(detail || null)

        let members: ProjectMemberOption[] = []
        if (membersResult.status === 'fulfilled' && Array.isArray(membersResult.value)) {
          members = membersResult.value
            .map((entry: any) => {
              const user = entry?.user || entry
              return {
                id: String(user?.id || entry?.id || ''),
                name: String(user?.name || entry?.name || ''),
              }
            })
            .filter((member: ProjectMemberOption) => member.id && member.name)
        }

        if (members.length === 0 && detail && Array.isArray(detail.memberships)) {
          members = detail.memberships
            .map((membership: any) => ({
              id: String(membership?.user?.id || membership?.userId || ''),
              name: String(membership?.user?.name || ''),
            }))
            .filter((member: ProjectMemberOption) => member.id && member.name)
        }

        const unique = new Map<string, ProjectMemberOption>()
        members.forEach(member => {
          if (!unique.has(member.id)) unique.set(member.id, member)
        })
        setProjectMembers(Array.from(unique.values()))
      } catch {
        if (active) setProjectDetail(null)
        if (active) setProjectMembers([])
      } finally {
        if (active) setIsLoadingProjectDetail(false)
      }
    }

    loadProjectDetail()
    return () => {
      active = false
    }
  }, [selectedProjectId])

  useEffect(() => {
    setSelectedPhaseId('')
    setSelectedTaskId('')
    setSelectedParticipants([])
  }, [selectedProjectId])

  useEffect(() => {
    setSelectedTaskId('')
  }, [selectedPhaseId])

  const loadMeetingLogs = async () => {
    setIsLoadingLogs(true)
    setLogsError(null)
    try {
      const list = await apiGet('/api/meeting-logs')
      const normalized = Array.isArray(list)
        ? list.map((item: any) => ({
            ...item,
            clParticipants: Array.isArray(item?.clParticipants) ? item.clParticipants : [],
          }))
        : []
      setMeetingLogs(normalized)
    } catch (error) {
      console.error('Failed to load meeting logs', error)
      setLogsError('Failed to load meeting history.')
      setMeetingLogs([])
    } finally {
      setIsLoadingLogs(false)
    }
  }

  useEffect(() => {
    loadMeetingLogs()
  }, [])

  const handleParticipantToggle = (memberId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(memberId) ? prev.filter(item => item !== memberId) : [...prev, memberId]
    )
  }

  const handleClearForm = () => {
    setMeetingTitle('')
    setMeetingDate(getTodayValue())
    setMeetingType('Online')
    setSelectedProjectId('')
    setSelectedPhaseId('')
    setSelectedTaskId('')
    setSelectedParticipants([])
    setClientParticipants('')
    setDurationHours('1')
    setDiscussion('')
  }

  const handleLogMeeting = (event: React.FormEvent) => {
    event.preventDefault()
    if (!meetingTitle.trim() || !meetingDate || !selectedProjectId) return

    const durationValue = Number(durationHours) || 0
    const payload = {
      title: meetingTitle.trim(),
      date: meetingDate,
      type: meetingType,
      projectId: selectedProjectId,
      phaseId: selectedPhaseId || undefined,
      taskId: selectedTaskId || undefined,
      clParticipantIds: selectedParticipants,
      clientParticipants: clientParticipants.trim(),
      durationHours: durationValue,
      clHeadcount,
      discussion: discussion.trim(),
    }

    setIsSaving(true)
    setLogsError(null)
    apiJson('/api/meeting-logs', 'POST', payload)
      .then((created: MeetingLog) => {
        if (created) {
          const normalized = {
            ...created,
            clParticipants: Array.isArray(created.clParticipants) ? created.clParticipants : [],
          }
          setMeetingLogs(prev => [normalized, ...prev])
        } else {
          loadMeetingLogs()
        }
        handleClearForm()
      })
      .catch(error => {
        console.error('Failed to log meeting', error)
        setLogsError('Failed to log meeting.')
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  const filteredMeetings = useMemo(() => {
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null

    return meetingLogs.filter(log => {
      if (selectedHistoryProjectId !== 'all' && log.projectId !== selectedHistoryProjectId) {
        return false
      }
      if (fromDate || toDate) {
        const logDate = log.date ? new Date(`${log.date}T00:00:00`) : null
        if (!logDate || Number.isNaN(logDate.getTime())) return false
        if (fromDate && logDate < fromDate) return false
        if (toDate && logDate > toDate) return false
      }
      return true
    })
  }, [meetingLogs, dateFrom, dateTo, selectedHistoryProjectId])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meeting Logger</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Capture meeting details, participants, and effort in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <ClipboardList className="h-4 w-4" />
          <span>{meetingLogs.length} logged meetings</span>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Meeting Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Log the essentials before adding the discussion notes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsFormVisible(prev => !prev)}
            className="btn-secondary btn-sm"
          >
            {isFormVisible ? 'Hide Form' : 'Show Form'}
          </button>
        </div>

        {isFormVisible ? (
          <form onSubmit={handleLogMeeting} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(event) => setMeetingTitle(event.target.value)}
                  placeholder="e.g. Weekly Project Update"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meeting Date
                </label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(event) => setMeetingDate(event.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meeting Type
                </label>
                <div className="flex items-center gap-2">
                  {(['Online', 'Physical'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMeetingType(type)}
                      aria-pressed={meetingType === type}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                        meetingType === type
                          ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                          : 'bg-white/80 dark:bg-slate-900/40 text-gray-700 dark:text-gray-200 border-slate-200/70 dark:border-white/10'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">{isLoadingProjects ? 'Loading projects...' : 'Select Project'}</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phase (Optional)
                </label>
                <select
                  value={selectedPhaseId}
                  onChange={(event) => setSelectedPhaseId(event.target.value)}
                  className="input-field"
                  disabled={!selectedProjectId || isLoadingProjectDetail || phaseOptions.length === 0}
                >
                  <option value="">
                    {isLoadingProjectDetail
                      ? 'Loading phases...'
                      : phaseOptions.length === 0
                        ? 'No phases available'
                        : 'Select Phase'}
                  </option>
                  {phaseOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Task (Optional)
                </label>
                <select
                  value={selectedTaskId}
                  onChange={(event) => setSelectedTaskId(event.target.value)}
                  className="input-field"
                  disabled={!selectedProjectId || isLoadingProjectDetail || taskOptions.length === 0}
                >
                  <option value="">
                    {isLoadingProjectDetail
                      ? 'Loading tasks...'
                      : taskOptions.length === 0
                        ? 'No tasks available'
                        : 'Select Task'}
                  </option>
                  {taskOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cyber Labs Participants
                </label>
                <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-black/40 px-3 py-2 min-h-[44px]">
                  {selectedParticipantNames.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedParticipantNames.map(name => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-100 text-xs font-semibold px-2 py-1"
                        >
                          <Users className="h-3 w-3" />
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Select team members...</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {projectMembers.length === 0 ? (
                    <span className="text-sm text-gray-400">
                      {selectedProjectId
                        ? isLoadingProjectDetail
                          ? 'Loading assigned members...'
                          : 'No team members assigned to this project.'
                        : 'Select a project to load assigned members.'}
                    </span>
                  ) : (
                    projectMembers.map(member => {
                      const isSelected = selectedParticipants.includes(member.id)
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleParticipantToggle(member.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                            isSelected
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white/80 dark:bg-slate-900/40 text-gray-700 dark:text-gray-200 border-slate-200/70 dark:border-white/10'
                          }`}
                        >
                          {member.name}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client Participants
                </label>
                <input
                  type="text"
                  value={clientParticipants}
                  onChange={(event) => setClientParticipants(event.target.value)}
                  placeholder="Names (comma separated)"
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (Hrs)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={durationHours}
                  onChange={(event) => setDurationHours(event.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CL Headcount
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={clHeadcount}
                  className="input-field bg-gray-50 dark:bg-slate-900/60 cursor-not-allowed"
                  readOnly
                />
              </div>
              <div className="rounded-2xl border border-dashed border-slate-200/70 dark:border-white/10 px-4 py-3 bg-slate-50/70 dark:bg-slate-900/40">
                <div className="text-xs uppercase tracking-wide text-gray-400">Calculated Total Effort</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatEffort(totalEffort)} Total Man-Hours
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                High-level Discussion
              </label>
              <textarea
                value={discussion}
                onChange={(event) => setDiscussion(event.target.value)}
                placeholder="Summarize what was discussed, key decisions, or action items..."
                className="input-field min-h-[120px]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClearForm}
                className="btn-secondary"
              >
                Clear Form
              </button>
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? 'Logging...' : 'Log Meeting'}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200/70 dark:border-white/10 p-6 text-sm text-gray-500 dark:text-gray-400">
            Form hidden. Click "Show Form" to add or edit meeting details.
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Meeting History</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review previous meetings and search by title, project, or discussion.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-end gap-3 md:w-auto">
            <select
              value={selectedHistoryProjectId}
              onChange={(event) => setSelectedHistoryProjectId(event.target.value)}
              className="input-field w-full md:w-60"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value)
                }}
                className="input-field"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value)
                }}
                className="input-field"
              />
            </div>
          </div>
        </div>
        {logsError && (
          <div className="mb-4 rounded-xl border border-red-200/70 bg-red-50/70 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {logsError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <tr>
                <th className="pb-3 px-4 min-w-[240px]">Meeting &amp; Project</th>
                <th className="pb-3 px-4 min-w-[160px]">Hierarchy</th>
                <th className="pb-3 px-4 min-w-[240px]">Discussion</th>
                <th className="pb-3 px-4 min-w-[200px]">CL Participants</th>
                <th className="pb-3 px-4 min-w-[180px]">Client Participants</th>
                <th className="pb-3 px-4 min-w-[140px]">Effort</th>
                <th className="pb-3 px-4 min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
              {isLoadingLogs ? (
                <tr>
                  <td colSpan={7} className="py-6 px-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading meeting history...
                  </td>
                </tr>
              ) : filteredMeetings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 px-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No meetings logged yet.
                  </td>
                </tr>
              ) : (
                filteredMeetings.map(log => (
                  <tr key={log.id} className="text-gray-700 dark:text-gray-200">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{log.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {log.projectName || 'Unknown Project'} • {log.date} • {log.type}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {log.phase || '—'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {log.task || '—'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {log.discussion ? `${log.discussion.slice(0, 120)}${log.discussion.length > 120 ? '…' : ''}` : '—'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {log.clParticipants.length > 0 ? (
                          log.clParticipants.map(name => (
                            <span
                              key={name}
                              className="inline-flex items-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-100 text-xs font-semibold px-2 py-0.5"
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                      {log.clientParticipants || '—'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatEffort(log.totalEffort)} hrs
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatEffort(log.durationHours)}h x {log.clHeadcount}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-outline btn-compact"
                          onClick={() => setIsFormVisible(true)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn-danger btn-compact"
                          onClick={() => {
                            if (!window.confirm('Delete this meeting log?')) return
                            setLogsError(null)
                            apiJson(`/api/meeting-logs/${log.id}`, 'DELETE')
                              .then(() => {
                                setMeetingLogs(prev => prev.filter(item => item.id !== log.id))
                              })
                              .catch(error => {
                                console.error('Failed to delete meeting log', error)
                                setLogsError('Failed to delete meeting log.')
                              })
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default MeetingLogger
