import React, { useState } from 'react'
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Trash2
} from 'lucide-react'
import EventModal from '../components/modals/EventModal'

// Types
interface CalendarEvent {
  id: string
  title: string
  description: string
  type: 'task' | 'meeting' | 'reminder' | 'personal' | 'outsourced'
  startTime: string
  endTime: string
  date: string
  priority: 'high' | 'medium' | 'low'
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  assignee?: string
  project?: string
  platform?: 'teams' | 'zoom' | 'google-meet' | 'physical'
  meetingLink?: string
  attendees?: string[]
  isRecurring?: boolean
  recurrenceType?: 'daily' | 'weekly' | 'monthly'
  createdBy: string
  createdAt: string
}

interface DayEvents {
  [date: string]: CalendarEvent[]
}

// Mock Data
const mockEvents: CalendarEvent[] = [
  // Today's events for testing
  {
    id: 'today-1',
    title: 'Daily Standup',
    description: 'Product team daily standup meeting',
    type: 'meeting',
    startTime: '10:00',
    endTime: '10:15',
    date: new Date().toISOString().split('T')[0],
    priority: 'high',
    status: 'scheduled',
    assignee: 'Sarah Johnson',
    project: 'Mobile App Redesign',
    platform: 'teams',
    meetingLink: 'https://teams.microsoft.com/l/meetup-join/daily-standup-123',
    attendees: ['Emma Wilson', 'John Doe', 'Sarah Johnson'],
    createdBy: 'Sarah Johnson',
    createdAt: new Date().toISOString()
  },
  {
    id: 'today-2',
    title: 'Client Zoom Meeting',
    description: 'Discuss project requirements with client',
    type: 'meeting',
    startTime: '14:00',
    endTime: '15:00',
    date: new Date().toISOString().split('T')[0],
    priority: 'high',
    status: 'scheduled',
    assignee: 'Sarah Johnson',
    project: 'Mobile App Redesign',
    platform: 'zoom',
    meetingLink: 'https://zoom.us/j/client-meeting-456',
    attendees: ['Client Team'],
    createdBy: 'Sarah Johnson',
    createdAt: new Date().toISOString()
  },
  {
    id: 'today-3',
    title: 'Submit Invoice Report',
    description: 'Complete and submit monthly invoice report',
    type: 'task',
    startTime: '09:00',
    endTime: '10:00',
    date: new Date().toISOString().split('T')[0],
    priority: 'high',
    status: 'scheduled',
    assignee: 'Sarah Johnson',
    project: 'Administrative',
    createdBy: 'Sarah Johnson',
    createdAt: new Date().toISOString()
  },
  {
    id: '1',
    title: 'Daily Standup Meeting',
    description: 'Team sync meeting to discuss progress and blockers',
    type: 'meeting',
    startTime: '09:00',
    endTime: '09:30',
    date: '2025-01-15',
    priority: 'high',
    status: 'scheduled',
    assignee: 'Sarah Johnson',
    project: 'Mobile App Redesign',
    platform: 'teams',
    meetingLink: 'https://teams.microsoft.com/l/meetup-join/...',
    attendees: ['Sarah Johnson', 'Mike Chen', 'Emily Davis'],
    createdBy: 'Sarah Johnson',
    createdAt: '2025-01-10T10:00:00Z'
  },
  {
    id: '2',
    title: 'Review Client Proposal',
    description: 'Review and provide feedback on client proposal draft',
    type: 'task',
    startTime: '10:00',
    endTime: '11:30',
    date: '2025-01-15',
    priority: 'high',
    status: 'in-progress',
    assignee: 'Sarah Johnson',
    project: 'Mobile App Redesign',
    createdBy: 'Mike Chen',
    createdAt: '2025-01-12T14:00:00Z'
  },
  {
    id: '3',
    title: 'Client Presentation',
    description: 'Present design mockups to client',
    type: 'meeting',
    startTime: '14:00',
    endTime: '15:00',
    date: '2025-01-15',
    priority: 'high',
    status: 'scheduled',
    assignee: 'Sarah Johnson',
    project: 'Mobile App Redesign',
    platform: 'zoom',
    meetingLink: 'https://zoom.us/j/123456789',
    attendees: ['Sarah Johnson', 'Client Team'],
    createdBy: 'Sarah Johnson',
    createdAt: '2025-01-08T09:00:00Z'
  },
  {
    id: '4',
    title: 'Team Lunch',
    description: 'Monthly team building lunch',
    type: 'personal',
    startTime: '12:00',
    endTime: '13:00',
    date: '2025-01-15',
    priority: 'low',
    status: 'scheduled',
    assignee: 'Sarah Johnson',
    createdBy: 'Sarah Johnson',
    createdAt: '2025-01-05T16:00:00Z'
  },
  {
    id: '5',
    title: 'Code Review Session',
    description: 'Review backend API implementation',
    type: 'task',
    startTime: '15:30',
    endTime: '17:00',
    date: '2025-01-16',
    priority: 'medium',
    status: 'scheduled',
    assignee: 'Sarah Johnson',
    project: 'Backend API Development',
    createdBy: 'Mike Chen',
    createdAt: '2025-01-13T11:00:00Z'
  },
  {
    id: '6',
    title: 'Design System Review',
    description: 'Review component library updates',
    type: 'meeting',
    startTime: '10:00',
    endTime: '11:00',
    date: '2025-01-16',
    priority: 'medium',
    status: 'scheduled',
    assignee: 'Sarah Johnson',
    project: 'Design System',
    platform: 'teams',
    meetingLink: 'https://teams.microsoft.com/l/meetup-join/...',
    attendees: ['Sarah Johnson', 'Alex Rodriguez'],
    createdBy: 'Alex Rodriguez',
    createdAt: '2025-01-11T15:30:00Z'
  },
  {
    id: '7',
    title: 'Follow up with vendor',
    description: 'Check on outsourced design work progress',
    type: 'outsourced',
    startTime: '16:00',
    endTime: '16:30',
    date: '2025-01-17',
    priority: 'medium',
    status: 'scheduled',
    assignee: 'Sarah Johnson',
    project: 'Design System',
    createdBy: 'Sarah Johnson',
    createdAt: '2025-01-14T10:00:00Z'
  }
]

const CalendarDashboard: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [events, setEvents] = useState<CalendarEvent[]>(mockEvents)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [isDayEventsModalOpen, setIsDayEventsModalOpen] = useState(false)
  const [selectedDayDate, setSelectedDayDate] = useState<string>('')

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]
  
  // Get today's events
  const todayEvents = events.filter(event => event.date === today)

  // Group events by date
  const eventsByDate: DayEvents = events.reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = []
    }
    acc[event.date].push(event)
    return acc
  }, {} as DayEvents)

  // Calendar navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  // Get calendar days for current month
  const getCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const current = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      const day = new Date(current)
      // Only include days that are in the current month
      if (day.getMonth() === month) {
        days.push(day)
      } else {
        // Add null for days not in current month
        days.push(null)
      }
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  // Handle date click
  const handleDateClick = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    const dayEvents = eventsByDate[dateString] || []
    
    setSelectedDate(dateString)
    setSelectedDayEvents(dayEvents)
    
    // If date has events, show day events modal, otherwise open event creation modal
    if (dayEvents.length > 0) {
      setSelectedDayDate(dateString)
      setIsDayEventsModalOpen(true)
    } else {
      setEditingEvent(null)
      setIsEventModalOpen(true)
    }
  }

  // Handle event creation
  const handleCreateEvent = (date: string) => {
    setSelectedDate(date)
    setEditingEvent(null)
    setIsEventModalOpen(true)
  }

  // Handle event edit
  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event)
    setIsEventModalOpen(true)
  }

  // Handle event save
  const handleSaveEvent = (eventData: CalendarEvent) => {
    if (editingEvent) {
      // Update existing event
      setEvents(prev => prev.map(event => 
        event.id === eventData.id ? eventData : event
      ))
      setSelectedDayEvents(prev => prev.map(event => 
        event.id === eventData.id ? eventData : event
      ))
    } else {
      // Create new event
      setEvents(prev => [...prev, eventData])
      if (eventData.date === selectedDate) {
        setSelectedDayEvents(prev => [...prev, eventData])
      }
    }
  }

  // Handle event delete
  const handleDeleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId))
    setSelectedDayEvents(prev => prev.filter(event => event.id !== eventId))
  }

  // Get event type color
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-green-100 text-green-800 border-green-200'
      case 'meeting': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'reminder': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'personal': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'outsourced': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'in-progress': return <Clock className="h-4 w-4 text-blue-600" />
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  // Filter events
  const filteredTodayEvents = filterType === 'all' 
    ? todayEvents 
    : todayEvents.filter(event => event.type === filterType)

  const filteredSelectedDayEvents = filterType === 'all' 
    ? selectedDayEvents 
    : selectedDayEvents.filter(event => event.type === filterType)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar Dashboard</h1>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'day' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'week' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'month' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Month
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Events</option>
                <option value="task">Tasks</option>
                <option value="meeting">Meetings</option>
                <option value="reminder">Reminders</option>
                <option value="personal">Personal</option>
                <option value="outsourced">Outsourced</option>
              </select>
              
              {/* Add Event Button */}
              <button
                onClick={() => handleCreateEvent(today)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Event</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Calendar - Full Width */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-6">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {getCalendarDays().map((day, index) => {
                // Handle null days (not in current month)
                if (day === null) {
                  return (
                    <div
                      key={index}
                      className="min-h-[140px] p-3 border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50"
                    >
                      {/* Empty box for days not in current month */}
                    </div>
                  )
                }

                const dayString = day.toISOString().split('T')[0]
                const dayEvents = eventsByDate[dayString] || []
                const isToday = dayString === today
                const isSelected = dayString === selectedDate

                return (
                  <div
                    key={index}
                    className={`
                      min-h-[140px] p-3 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md transition-all duration-200 group
                      ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''}
                      ${isSelected ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-500' : ''}
                    `}
                    onClick={() => handleDateClick(day)}
                    title="Click to create event"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-lg font-semibold ${isToday ? 'text-white' : ''}`}>
                        {isToday ? (
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            {day.getDate()}
                          </div>
                        ) : (
                          day.getDate()
                        )}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCreateEvent(dayString)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full transition-all duration-200 hover:scale-110"
                        title="Add event to this date"
                      >
                        <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </button>
                    </div>
                    
                    {/* Day Events */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 4).map(event => (
                        <div
                          key={event.id}
                          className={`text-xs p-2 rounded border ${getEventTypeColor(event.type)} cursor-pointer hover:shadow-sm transition-shadow`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditEvent(event)
                          }}
                        >
                          <div className="flex items-center space-x-1">
                            <span className="text-xs font-medium">{event.startTime}</span>
                            <span className="truncate">{event.title}</span>
                          </div>
                        </div>
                      ))}
                      {dayEvents.length > 4 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          +{dayEvents.length - 4} more
                        </div>
                      )}
                    </div>
                    
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Tasks</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Meetings</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Reminders</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Outsourcing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Events Section Below Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Events */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Today's Events</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {todayEvents.length} events scheduled
              </p>
            </div>
            
            <div className="p-6">
              {filteredTodayEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No events today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTodayEvents.map(event => (
                    <div
                      key={event.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => handleEditEvent(event)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-3 py-1 text-sm rounded-full ${getEventTypeColor(event.type)}`}>
                              {event.type}
                            </span>
                            <span className={`px-3 py-1 text-sm rounded-full ${getPriorityColor(event.priority)}`}>
                              {event.priority}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {event.startTime} - {event.endTime}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{event.title}</h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-2">{event.description}</p>
                          {event.project && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                              <Users className="h-4 w-4" />
                              <span>{event.project}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(event.status)}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteEvent(event.id)
                            }}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Day Events */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Select a Date'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedDate ? `${selectedDayEvents.length} events scheduled` : 'Click on a date to view events'}
              </p>
            </div>
            
            <div className="p-6">
              {!selectedDate ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Click on a date to view events</p>
                </div>
              ) : filteredSelectedDayEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No events on this day</p>
                  <button
                    onClick={() => handleCreateEvent(selectedDate)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Add Event
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSelectedDayEvents.map(event => (
                    <div
                      key={event.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => handleEditEvent(event)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-3 py-1 text-sm rounded-full ${getEventTypeColor(event.type)}`}>
                              {event.type}
                            </span>
                            <span className={`px-3 py-1 text-sm rounded-full ${getPriorityColor(event.priority)}`}>
                              {event.priority}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {event.startTime} - {event.endTime}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{event.title}</h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-2">{event.description}</p>
                          {event.project && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                              <Users className="h-4 w-4" />
                              <span>{event.project}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(event.status)}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteEvent(event.id)
                            }}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false)
          setEditingEvent(null)
        }}
        event={editingEvent}
        selectedDate={selectedDate}
        onSave={handleSaveEvent}
      />

      {/* Day Events Modal */}
      {isDayEventsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Date(selectedDayDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setIsDayEventsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Events List */}
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {selectedDayEvents.map(event => (
                  <div
                    key={event.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => {
                      setIsDayEventsModalOpen(false)
                      handleEditEvent(event)
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Event Type Indicator */}
                      <div className={`w-3 h-3 rounded-full mt-1 ${
                        event.type === 'task' ? 'bg-green-500' :
                        event.type === 'meeting' ? 'bg-blue-500' :
                        event.type === 'reminder' ? 'bg-yellow-500' :
                        event.type === 'personal' ? 'bg-purple-500' :
                        'bg-orange-500'
                      }`} />
                      
                      <div className="flex-1 min-w-0">
                        {/* Event Type and Priority Badges */}
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                          </span>
                          {event.priority === 'high' && (
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                              High Priority
                            </span>
                          )}
                        </div>
                        
                        {/* Event Title */}
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {event.title}
                        </h3>
                        
                        {/* Event Description */}
                        {event.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {event.description}
                          </p>
                        )}
                        
                        {/* Event Time */}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {event.startTime} - {event.endTime}
                        </p>
                        
                        {/* Meeting Platform and Join Button */}
                        {event.type === 'meeting' && event.platform && (
                          <div className="mt-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {event.platform === 'teams' ? 'Teams' :
                                 event.platform === 'zoom' ? 'Zoom' :
                                 event.platform === 'google-meet' ? 'Google Meet' :
                                 'Physical'}
                              </span>
                            </div>
                            
                            {/* Join Button for Online Meetings */}
                            {(event.platform === 'teams' || event.platform === 'zoom' || event.platform === 'google-meet') && event.meetingLink && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(event.meetingLink, '_blank')
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                <span>Join via {event.platform === 'teams' ? 'Teams' : event.platform === 'zoom' ? 'Zoom' : 'Google Meet'}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Event Button */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsDayEventsModalOpen(false)
                  setSelectedDate(selectedDayDate)
                  setEditingEvent(null)
                  setIsEventModalOpen(true)
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Another Event</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarDashboard
