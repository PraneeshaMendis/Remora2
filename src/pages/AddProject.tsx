import React, { useState, useEffect } from 'react'
import { listUsers as fetchUsers } from '../services/usersAPI.ts'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  HiArrowLeft, 
  HiPlus,
  HiX,
  HiUpload,
  HiUsers,
  HiDocument,
  HiEye,
  HiSave,
  HiCheckCircle
} from 'react-icons/hi'
import { 
  CalendarDays, 
  User, 
  Clock, 
  AlertCircle,
  FileText,
  Shield,
  Settings
} from 'lucide-react'

interface ProjectMember {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  department: string
}

interface Client {
  id: string
  name: string
  email: string
  company: string
  phone?: string
  comments?: string
}


const AddProject: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const draftData = location.state?.draft
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectCode: '',
    category: '',
    subcategory: '',
    tags: [] as string[],
    projectTypeComments: '',
    startDate: '',
    projectDeadline: '',
    estimatedDuration: 0,
    workingDays: 0,
    totalWorkingHours: 0,
    projectHours: 0,
    excludeWeekends: true,
    status: 'planning' as const,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    visibility: 'assigned-only' as const
  })

  const [newTag, setNewTag] = useState('')
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [attachments, setAttachments] = useState<File[]>([])
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    comments: ''
  })
  const [isAddingClient, setIsAddingClient] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Team assignment filters
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [filteredTeamMembers, setFilteredTeamMembers] = useState<ProjectMember[]>([])
  const [teamMembers, setTeamMembers] = useState<ProjectMember[]>([])

  // Load real users for team assignment
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetchUsers({ page: 1, limit: 100 })
        const items = (res.items || []).map((u: any) => {
          const name = String(u.name || '')
          const initials = name
            .split(' ')
            .map((p: string) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
          return {
            id: String(u.id),
            name,
            email: String(u.email || ''),
            role: String((u?.role?.name || u?.role || '')).toLowerCase(),
            department: String(u?.department?.name || u?.department || ''),
            avatar: initials,
          } as ProjectMember
        })
        setTeamMembers(items)
        setFilteredTeamMembers(items)
      } catch (e) {
        console.error('Failed to load team members', e)
        setTeamMembers([])
        setFilteredTeamMembers([])
      }
    })()
  }, [])

  // Get unique departments and roles
  const departments = [...new Set(teamMembers.map(member => member.department).filter(Boolean))]
  const roles = [...new Set(teamMembers.map(member => member.role).filter(Boolean))]

  const clients: Client[] = [
    
    { id: '4', name: 'Akila Dineth', email: 'akila@client4.com', company: 'Aurelia Labs', phone: '+1-555-0114' },
    { id: '5', name: 'Tharusha Sampath', email: 'tharusha@client5.com', company: 'Sampath Holdings', phone: '+1-555-0115' },
    { id: '6', name: 'Sahan Madurangaa', email: 'sahan@client6.com', company: 'Madurangaa Group', phone: '+1-555-0116' }
  ]

  const categories = {
    'GRC-Related Services': [
      'Virtual CISO',
      'GDPR Compliance Programs',
      'ISO 27001:2013',
      'Cyber Security Strategy',
      'Threat Intelligence',
      'Data Classification'
    ],
    'Tech-Related Services': [
      'Vulnerability Assessment',
      'Penetration Testing',
      'Web Application Security Assessment',
      'Mobile Application Security Assessment',
      'Red Team',
      'API Security Testing',
      'Configuration Review',
      'Incident Response Support',
      'Social Engineering Assessment',
      'Code Review',
      'Digital Forensics'
    ]
  }

  // Auto-generate project code
  useEffect(() => {
    if (!formData.projectCode) {
      const code = `PRJ-${Date.now().toString().slice(-6)}`
      setFormData(prev => ({ ...prev, projectCode: code }))
    }
  }, [])

  // Calculate working days and hours
  useEffect(() => {
    if (formData.startDate && formData.projectDeadline) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.projectDeadline)
      const diffTime = end.getTime() - start.getTime()
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      let workingDays = totalDays
      if (formData.excludeWeekends) {
        // Calculate working days excluding weekends
        workingDays = calculateWorkingDays(start, end)
      }
      
      const totalWorkingHours = workingDays * 8 // 8 hours per working day
      
      setFormData(prev => ({ 
        ...prev, 
        estimatedDuration: totalDays,
        workingDays: workingDays,
        totalWorkingHours: totalWorkingHours
      }))
    }
  }, [formData.startDate, formData.projectDeadline, formData.excludeWeekends])

  // Helper function to calculate working days excluding weekends
  const calculateWorkingDays = (startDate: Date, endDate: Date) => {
    let count = 0
    const current = new Date(startDate)
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay()
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }
    
    return count
  }

  // Auto-calculate priority
  useEffect(() => {
    if (formData.projectDeadline) {
      const deadline = new Date(formData.projectDeadline)
      const today = new Date()
      const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
      if (daysUntilDeadline < 7) priority = 'critical'
      else if (daysUntilDeadline < 14) priority = 'high'
      else if (daysUntilDeadline < 30) priority = 'medium'
      else priority = 'low'
      
      setFormData(prev => ({ ...prev, priority }))
    }
  }, [formData.projectDeadline])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // Load draft data if available
  useEffect(() => {
    if (draftData) {
      setFormData({
        title: draftData.title || '',
        description: draftData.description || '',
        projectCode: draftData.projectCode || '',
        category: draftData.category || '',
        subcategory: draftData.subcategory || '',
        tags: draftData.tags || [],
        projectTypeComments: draftData.projectTypeComments || '',
        startDate: draftData.startDate || '',
        projectDeadline: draftData.projectDeadline || '',
        estimatedDuration: draftData.estimatedDuration || 0,
        workingDays: draftData.workingDays || 0,
        totalWorkingHours: draftData.totalWorkingHours || 0,
        projectHours: draftData.projectHours || 0,
        excludeWeekends: draftData.excludeWeekends !== undefined ? draftData.excludeWeekends : true,
        status: draftData.status || 'planning',
        priority: draftData.priority || 'medium',
        visibility: draftData.visibility || 'assigned-only'
      })
      setSelectedTeamMembers(draftData.team || [])
      setSelectedClients(draftData.clients || [])
    }
  }, [draftData])

  // Filter team members based on department and role
  useEffect(() => {
    let filtered = teamMembers

    if (selectedDepartment) {
      filtered = filtered.filter(member => member.department === selectedDepartment)
    }

    if (selectedRole) {
      filtered = filtered.filter(member => member.role === selectedRole)
    }

    setFilteredTeamMembers(filtered)
  }, [selectedDepartment, selectedRole, teamMembers])

  const handleTeamMemberToggle = (memberId: string) => {
    setSelectedTeamMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleDepartmentChange = (department: string) => {
    setSelectedDepartment(department)
    setSelectedRole('') // Reset role when department changes
  }

  const handleRoleChange = (role: string) => {
    setSelectedRole(role)
  }

  const handleClientToggle = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const handleAddClient = () => {
    if (clientInfo.name.trim() && clientInfo.email.trim()) {
      // In a real app, this would be added to the clients list
      // const newClient: Client = { ... }
      setClientInfo({ name: '', email: '', company: '', phone: '', comments: '' })
      setIsAddingClient(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    
    // Create draft project object
    const draftProject = {
      id: draftData?.id || `draft-${Date.now()}`,
      ...formData,
      status: 'draft',
      createdAt: draftData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      team: selectedTeamMembers,
      clients: selectedClients,
      attachments: attachments.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      })),
      allocatedHours: formData.projectHours,
      loggedHours: 0,
      remainingHours: formData.projectHours
    }
    
    // Save to localStorage
    const existingDrafts = JSON.parse(localStorage.getItem('projectDrafts') || '[]')
    
    if (draftData) {
      // Update existing draft
      const updatedDrafts = existingDrafts.map((draft: any) => 
        draft.id === draftData.id ? draftProject : draft
      )
      localStorage.setItem('projectDrafts', JSON.stringify(updatedDrafts))
    } else {
      // Add new draft
      existingDrafts.push(draftProject)
      localStorage.setItem('projectDrafts', JSON.stringify(existingDrafts))
    }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Project saved as draft:', draftProject)
    setIsSaving(false)
    navigate('/projects')
  }

  const handleCreateAndPublish = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a project title')
      return
    }

    setIsSaving(true)

    try {
      const body = {
        code: formData.projectCode || `PRJ-${Date.now().toString().slice(-6)}`,
        title: formData.title,
        description: formData.description,
        allocatedHours: Number(formData.projectHours) || 0,
        visibility: 'TEAM',
        status: 'PLANNING',
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.projectDeadline ? new Date(formData.projectDeadline).toISOString() : undefined,
        memberUserIds: selectedTeamMembers,
      }
      const base = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000'
      const res = await fetch(`${base}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `Failed to create project: ${res.status}`)
      }
      const created = await res.json()
      // Ensure selected team members are added as project members even if backend ignores memberUserIds
      if (selectedTeamMembers && selectedTeamMembers.length > 0) {
        try {
          await fetch(`${base}/projects/${created.id}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: selectedTeamMembers }),
          })
        } catch (e) {
          console.warn('Failed to attach members to project', e)
        }
      }
      console.log('Project created and published:', created)
      navigate('/projects')
    } catch (e: any) {
      console.error(e)
      alert(e.message || 'Failed to create project')
    } finally {
      setIsSaving(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200'
      case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'on-hold': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'completed': return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 mr-4"
          >
            <HiArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {draftData ? 'Continue Draft Project' : 'Create New Project'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {draftData 
            ? 'Continue working on your saved draft project' 
            : 'Set up a new project with all necessary details and team assignments'
          }
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* 1. Project Basic Information */}
          <div className="card">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg mr-3">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Project Basic Information</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="input-field"
                  placeholder="Enter project title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="input-field"
                  rows={4}
                  placeholder="Describe the project objectives and scope"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Code / ID
                  </label>
                  <input
                    type="text"
                    value={formData.projectCode}
                    onChange={(e) => handleInputChange('projectCode', e.target.value)}
                    className="input-field"
                    placeholder="Auto-generated"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="input-field"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      handleInputChange('category', e.target.value)
                      handleInputChange('subcategory', '')
                    }}
                    className="input-field"
                  >
                    <option value="">Select category</option>
                    {Object.keys(categories).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subcategory
                  </label>
                  <select
                    value={formData.subcategory}
                    onChange={(e) => handleInputChange('subcategory', e.target.value)}
                    className="input-field"
                    disabled={!formData.category}
                  >
                    <option value="">Select subcategory</option>
                    {formData.category && categories[formData.category as keyof typeof categories]?.map(subcategory => (
                      <option key={subcategory} value={subcategory}>{subcategory}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags / Keywords
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                      >
                        <HiX className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="input-field rounded-r-none"
                    placeholder="Add a tag and press Enter"
                  />
                  <button
                    onClick={handleAddTag}
                    className="btn-primary rounded-l-none px-4"
                  >
                    <HiPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Type Comments
                </label>
                <textarea
                  value={formData.projectTypeComments}
                  onChange={(e) => handleInputChange('projectTypeComments', e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Describe what kind of project this is in your own words"
                />
              </div>
            </div>
          </div>

          {/* 2. Timeline & Scheduling */}
          <div className="card">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg mr-3">
                <CalendarDays className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Timeline & Scheduling</h2>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Deadline *
                  </label>
                  <input
                    type="date"
                    value={formData.projectDeadline}
                    onChange={(e) => handleInputChange('projectDeadline', e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Exclude Weekends
                  </label>
                  <select
                    value={formData.excludeWeekends ? 'yes' : 'no'}
                    onChange={(e) => handleInputChange('excludeWeekends', e.target.value === 'yes')}
                    className="input-field"
                  >
                    <option value="yes">Yes (Monday - Friday only)</option>
                    <option value="no">No (Include all days)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Allocated Project Hours
                  </label>
                  <input
                    type="number"
                    value={formData.projectHours}
                    onChange={(e) => handleInputChange('projectHours', parseInt(e.target.value) || 0)}
                    className="input-field"
                    placeholder="Enter total project hours"
                    min="0"
                  />
                </div>
              </div>

              {(formData.estimatedDuration > 0 || formData.workingDays > 0) && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Days</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">{formData.estimatedDuration}</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Working Days</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">{formData.workingDays}</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Hours</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">{formData.totalWorkingHours}h</div>
                      </div>
                    </div>
                  </div>
                  
                  {formData.projectHours > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-2 w-32 bg-gray-200 dark:bg-gray-600 rounded-full mr-3">
                            <div 
                              className="h-2 bg-primary-600 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.min(100, (formData.projectHours / formData.totalWorkingHours) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {Math.round((formData.projectHours / formData.totalWorkingHours) * 100)}% of available time
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formData.projectHours}h allocated
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 3. Assign Team & Roles */}
          <div className="card">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg mr-3">
                <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Assign Team & Roles</h2>
            </div>

            <div className="space-y-6">
              {/* Filter Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="input-field"
                    disabled={!selectedDepartment}
                  >
                    <option value="">All Roles</option>
                    {selectedDepartment ? 
                      [...new Set(teamMembers.filter(m => m.department === selectedDepartment).map(m => m.role))].map((role) => (
                        <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                      )) :
                      roles.map((role) => (
                        <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              {/* Selected Members Summary */}
              {selectedTeamMembers.length > 0 && (
                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-primary-900 dark:text-primary-100">
                      Selected Team Members ({selectedTeamMembers.length})
                    </h3>
                    <button
                      onClick={() => setSelectedTeamMembers([])}
                      className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTeamMembers.map((memberId) => {
                      const member = teamMembers.find(m => m.id === memberId)
                      return member ? (
                        <span
                          key={memberId}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-200"
                        >
                          {member.name}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTeamMemberToggle(memberId)
                            }}
                            className="ml-1 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                          >
                            <HiX className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              {/* Team Members List */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Available Team Members
                  {filteredTeamMembers.length !== teamMembers.length && (
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      ({filteredTeamMembers.length} of {teamMembers.length})
                    </span>
                  )}
                </label>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {filteredTeamMembers.length > 0 ? (
                    filteredTeamMembers.map((member) => (
                      <div
                        key={member.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors duration-200 ${
                          selectedTeamMembers.includes(member.id)
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => handleTeamMemberToggle(member.id)}
                      >
                        <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium mr-3">
                          {member.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">{member.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)} • {member.department}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{member.email}</div>
                        </div>
                        <div className={`h-5 w-5 rounded border-2 ${
                          selectedTeamMembers.includes(member.id)
                            ? 'bg-primary-600 border-primary-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedTeamMembers.includes(member.id) && (
                            <HiCheckCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <User className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p>No team members found for the selected filters</p>
                      <button
                        onClick={() => {
                          setSelectedDepartment('')
                          setSelectedRole('')
                        }}
                        className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200 text-sm mt-2"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Add Clients */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg mr-3">
                  <User className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Clients</h2>
              </div>
              <button
                onClick={() => setIsAddingClient(true)}
                className="btn-primary text-sm"
              >
                <HiPlus className="h-4 w-4 mr-2" />
                Add Client
              </button>
            </div>

            <div className="space-y-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors duration-200 ${
                    selectedClients.includes(client.id)
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => handleClientToggle(client.id)}
                >
                  <div className="h-10 w-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-medium mr-3">
                    {client.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{client.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{client.company} • {client.email}</div>
                  </div>
                  <div className={`h-5 w-5 rounded border-2 ${
                    selectedClients.includes(client.id)
                      ? 'bg-primary-600 border-primary-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedClients.includes(client.id) && (
                      <HiCheckCircle className="h-4 w-4 text-white" />
                    )}
                  </div>
                </div>
              ))}

              {isAddingClient && (
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Add New Client</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Client Name"
                        value={clientInfo.name}
                        onChange={(e) => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                        className="input-field"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={clientInfo.email}
                        onChange={(e) => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Company"
                        value={clientInfo.company}
                        onChange={(e) => setClientInfo(prev => ({ ...prev, company: e.target.value }))}
                        className="input-field"
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={clientInfo.phone}
                        onChange={(e) => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                    <textarea
                      placeholder="Comments"
                      value={clientInfo.comments}
                      onChange={(e) => setClientInfo(prev => ({ ...prev, comments: e.target.value }))}
                      className="input-field"
                      rows={2}
                    />
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setIsAddingClient(false)}
                        className="btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddClient}
                        className="btn-primary text-sm"
                      >
                        Add Client
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. Attachments */}
          <div className="card">
            <div className="flex items-center mb-6">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg mr-3">
                <HiUpload className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Attachments</h2>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <HiUpload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">Upload project documents (proposal, contract, scope doc, etc.)</p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="btn-primary cursor-pointer"
                >
                  Choose Files
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center">
                        <HiDocument className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-sm text-gray-900 dark:text-white">{file.name}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveAttachment(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                      >
                        <HiX className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Status & Priority */}
          <div className="card">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg mr-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Status & Priority</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="input-field"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(formData.priority)}`}>
                    {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)} Priority
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(formData.status)}`}>
                    {formData.status.charAt(0).toUpperCase() + formData.status.slice(1).replace('-', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions & Visibility */}
          <div className="card">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mr-3">
                <HiEye className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Visibility</h3>
            </div>

            <div className="space-y-3">
              {[
                { value: 'assigned-only', label: 'Only assigned members', icon: HiUsers },
                { value: 'organization', label: 'Whole organization', icon: Shield },
                { value: 'directors-managers', label: 'Directors + Managers only', icon: Settings }
              ].map((option) => (
                <label key={option.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={formData.visibility === option.value}
                    onChange={(e) => handleInputChange('visibility', e.target.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <div className="ml-3 flex items-center">
                    <option.icon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="w-full btn-secondary flex items-center justify-center"
              >
                <HiSave className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handleCreateAndPublish}
                disabled={isSaving}
                className="w-full btn-primary flex items-center justify-center"
              >
                <HiCheckCircle className="h-4 w-4 mr-2" />
                {isSaving ? 'Creating...' : 'Create & Publish'}
              </button>
              <button
                onClick={() => navigate('/projects')}
                className="w-full btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddProject
