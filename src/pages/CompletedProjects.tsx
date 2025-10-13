import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  HiSortAscending, 
  HiSortDescending,
  HiEye
} from 'react-icons/hi'
import { 
  Calendar, 
  Users, 
  Target, 
  CheckCircle2, 
  ArrowUpDown,
  Filter,
  Search
} from 'lucide-react'

interface ProjectMember {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  department: string
}

interface CompletedProject {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  completedAt: string
  status: 'completed'
  progress: 100
  priority: 'low' | 'medium' | 'high' | 'critical'
  team: ProjectMember[]
  phases: {
    id: string
    title: string
    status: 'completed'
    tasks: {
      id: string
      title: string
      status: 'completed'
      assignee: ProjectMember
    }[]
  }[]
  manager: ProjectMember
  department: string
  totalTasks: number
  completedTasks: number
  totalPhases: number
  uniqueAssignees: number
  duration: number
}

const CompletedProjects: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'endDate' | 'name' | 'tasks'>('endDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [managerFilter, setManagerFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Mock completed projects data
  const completedProjects: CompletedProject[] = [
    {
      id: '1',
      title: 'E-commerce Platform Redesign',
      description: 'Complete redesign of the e-commerce platform with modern UI/UX',
      startDate: '2024-01-15',
      endDate: '2024-06-30',
      completedAt: '2024-06-30',
      status: 'completed',
      progress: 100,
      priority: 'high',
      team: [
        { id: '1', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'Project Manager', department: 'Product', avatar: 'SJ' },
        { id: '2', name: 'Mike Chen', email: 'mike@company.com', role: 'Lead Developer', department: 'Engineering', avatar: 'MC' },
        { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' }
      ],
      phases: [
        {
          id: 'phase-1',
          title: 'Research & Planning',
          status: 'completed',
          tasks: [
            { id: 'task-1', title: 'User Research', status: 'completed', assignee: { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' } },
            { id: 'task-2', title: 'Technical Planning', status: 'completed', assignee: { id: '2', name: 'Mike Chen', email: 'mike@company.com', role: 'Lead Developer', department: 'Engineering', avatar: 'MC' } }
          ]
        },
        {
          id: 'phase-2',
          title: 'Design & Development',
          status: 'completed',
          tasks: [
            { id: 'task-3', title: 'UI Design', status: 'completed', assignee: { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' } },
            { id: 'task-4', title: 'Frontend Development', status: 'completed', assignee: { id: '2', name: 'Mike Chen', email: 'mike@company.com', role: 'Lead Developer', department: 'Engineering', avatar: 'MC' } }
          ]
        }
      ],
      manager: { id: '1', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'Project Manager', department: 'Product', avatar: 'SJ' },
      department: 'Product',
      totalTasks: 4,
      completedTasks: 4,
      totalPhases: 2,
      uniqueAssignees: 3,
      duration: 167
    },
    {
      id: '2',
      title: 'Mobile App Development',
      description: 'Native mobile app development for iOS and Android',
      startDate: '2024-03-01',
      endDate: '2024-08-15',
      completedAt: '2024-08-15',
      status: 'completed',
      progress: 100,
      priority: 'medium',
      team: [
        { id: '4', name: 'James Wilson', email: 'james@company.com', role: 'Mobile Developer', department: 'Engineering', avatar: 'JW' },
        { id: '5', name: 'Lisa Anderson', email: 'lisa@company.com', role: 'Backend Developer', department: 'Engineering', avatar: 'LA' }
      ],
      phases: [
        {
          id: 'phase-3',
          title: 'Development',
          status: 'completed',
          tasks: [
            { id: 'task-5', title: 'iOS Development', status: 'completed', assignee: { id: '4', name: 'James Wilson', email: 'james@company.com', role: 'Mobile Developer', department: 'Engineering', avatar: 'JW' } },
            { id: 'task-6', title: 'Backend API', status: 'completed', assignee: { id: '5', name: 'Lisa Anderson', email: 'lisa@company.com', role: 'Backend Developer', department: 'Engineering', avatar: 'LA' } }
          ]
        }
      ],
      manager: { id: '4', name: 'James Wilson', email: 'james@company.com', role: 'Mobile Developer', department: 'Engineering', avatar: 'JW' },
      department: 'Engineering',
      totalTasks: 2,
      completedTasks: 2,
      totalPhases: 1,
      uniqueAssignees: 2,
      duration: 167
    }
  ]

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = completedProjects.filter(project => {
      const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.manager.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesYear = yearFilter === 'all' || 
                         new Date(project.endDate).getFullYear().toString() === yearFilter
      
      const matchesDepartment = departmentFilter === 'all' || 
                               project.department === departmentFilter
      
      const matchesManager = managerFilter === 'all' || 
                            project.manager.id === managerFilter

      return matchesSearch && matchesYear && matchesDepartment && matchesManager
    })

    return filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'endDate':
          comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
          break
        case 'name':
          comparison = a.title.localeCompare(b.title)
          break
        case 'tasks':
          comparison = a.totalTasks - b.totalTasks
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [completedProjects, searchTerm, sortBy, sortOrder, yearFilter, departmentFilter, managerFilter])

  const getUniqueYears = () => {
    const years = [...new Set(completedProjects.map(p => new Date(p.endDate).getFullYear()))]
    return years.sort((a, b) => b - a)
  }

  const getUniqueDepartments = () => {
    const departments = [...new Set(completedProjects.map(p => p.department))]
    return departments.sort()
  }

  const getUniqueManagers = () => {
    const managers = [...new Set(completedProjects.map(p => p.manager))]
    return managers
  }

  const formatDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) {
      return `${diffDays} days`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} month${months > 1 ? 's' : ''}`
    } else {
      const years = Math.floor(diffDays / 365)
      return `${years} year${years > 1 ? 's' : ''}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Completed Projects</h1>
            <Link
              to="/projects"
              className="btn-secondary flex items-center space-x-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span>Active Projects</span>
            </Link>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            View details and history of all finished projects
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects by name or manager..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'endDate' | 'name' | 'tasks')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="endDate">End Date</option>
                <option value="name">Name</option>
                <option value="tasks">Total Tasks</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {sortOrder === 'asc' ? (
                  <HiSortAscending className="h-4 w-4" />
                ) : (
                  <HiSortDescending className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Completion Year
                  </label>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Years</option>
                    {getUniqueYears().map(year => (
                      <option key={year} value={year.toString()}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department
                  </label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Departments</option>
                    {getUniqueDepartments().map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Manager
                  </label>
                  <select
                    value={managerFilter}
                    onChange={(e) => setManagerFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Managers</option>
                    {getUniqueManagers().map(manager => (
                      <option key={manager.id} value={manager.id}>{manager.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedProjects.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Completed</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Set(completedProjects.flatMap(p => p.team.map(m => m.id))).size}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Team Members</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {completedProjects.reduce((sum, p) => sum + p.totalPhases, 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Phases</p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      {filteredAndSortedProjects.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAndSortedProjects.map((project, index) => (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 animate-slide-up group"
              style={{ animationDelay: `${0.3 + index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {project.description}
                  </p>
                </div>
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDuration(project.startDate, project.endDate)}</span>
                  <span>•</span>
                  <span>{new Date(project.endDate).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{project.uniqueAssignees} members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target className="h-4 w-4" />
                    <span>{project.totalPhases} phases</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{project.completedTasks} tasks</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Manager:</span>
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                      {project.manager.avatar}
                    </div>
                    <span className="text-gray-900 dark:text-white">{project.manager.name}</span>
                  </div>
                </div>
              </div>

              {/* Team Avatars */}
              <div className="flex items-center gap-2 mb-4">
                {project.team.slice(0, 4).map((member, idx) => (
                  <div 
                    key={idx}
                    className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400"
                    style={{ marginLeft: idx > 0 ? '-8px' : '0' }}
                  >
                    {member.avatar}
                  </div>
                ))}
                {project.team.length > 4 && (
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-400" style={{ marginLeft: '-8px' }}>
                    +{project.team.length - 4}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    project.priority === 'low' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                  }`}>
                    {project.priority}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    {project.department}
                  </span>
                </div>

                <Link
                  to={`/completed-projects/${project.id}`}
                  className="btn-primary flex items-center space-x-2"
                >
                  <HiEye className="h-4 w-4" />
                  <span>View Project</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No completed projects found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm || yearFilter !== 'all' || departmentFilter !== 'all' || managerFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Mark projects as completed from the Active Projects view to see them here.'
            }
          </p>
          <Link
            to="/projects"
            className="btn-primary"
          >
            View Active Projects
          </Link>
        </div>
      )}

      {/* Results Summary */}
      {filteredAndSortedProjects.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredAndSortedProjects.length} of {completedProjects.length} completed projects
        </div>
      )}
    </div>
  )
}

export default CompletedProjects
