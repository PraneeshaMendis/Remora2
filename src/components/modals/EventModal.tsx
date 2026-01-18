import React, { useState, useEffect } from 'react'
import { HiX } from 'react-icons/hi'

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
  assigneeId?: string
  project?: string
  platform?: 'teams' | 'zoom' | 'google-meet' | 'physical'
  meetingLink?: string
  attendees?: string[]
  isRecurring?: boolean
  recurrenceType?: 'daily' | 'weekly' | 'monthly'
  createdBy: string
  createdAt: string
}

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
  selectedDate: string
  onSave: (event: CalendarEvent) => void
  assigneeOptions?: Array<{ id: string; name: string }>
  defaultAssigneeId?: string
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  event,
  selectedDate,
  onSave,
  assigneeOptions,
  defaultAssigneeId
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'task' as 'task' | 'meeting' | 'reminder' | 'personal' | 'outsourced',
    startTime: '09:00',
    endTime: '10:00',
    date: selectedDate,
    priority: 'medium' as 'high' | 'medium' | 'low',
    status: 'scheduled' as 'scheduled' | 'in-progress' | 'completed' | 'cancelled',
    assigneeId: '',
    project: '',
    platform: 'teams' as 'teams' | 'zoom' | 'google-meet' | 'physical',
    meetingLink: '',
    attendees: [] as string[],
    isRecurring: false,
    recurrenceType: 'weekly' as 'daily' | 'weekly' | 'monthly'
  })

  const [attendeeInput, setAttendeeInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Mock data for dropdowns
  const projects = [
    'Mobile App Redesign',
    'Backend API Development', 
    'Design System',
    'Database Migration',
    'User Authentication'
  ]

  const teamMembers = assigneeOptions && assigneeOptions.length > 0
    ? assigneeOptions
    : [
        { id: 'member-1', name: 'Sarah Johnson' },
        { id: 'member-2', name: 'Mike Chen' },
        { id: 'member-3', name: 'Emily Davis' },
        { id: 'member-4', name: 'James Wilson' },
        { id: 'member-5', name: 'Lisa Anderson' },
        { id: 'member-6', name: 'Alex Rodriguez' },
        { id: 'member-7', name: 'David Kim' },
      ]

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description,
        type: event.type,
        startTime: event.startTime,
        endTime: event.endTime,
        date: event.date,
        priority: event.priority,
        status: event.status,
        assigneeId: event.assigneeId || defaultAssigneeId || '',
        project: event.project || '',
        platform: event.platform || 'teams',
        meetingLink: event.meetingLink || '',
        attendees: event.attendees || [],
        isRecurring: event.isRecurring || false,
        recurrenceType: event.recurrenceType || 'weekly'
      })
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'task',
        startTime: '09:00',
        endTime: '10:00',
        date: selectedDate,
        priority: 'medium',
        status: 'scheduled',
        assigneeId: defaultAssigneeId || '',
        project: '',
        platform: 'teams',
        meetingLink: '',
        attendees: [],
        isRecurring: false,
        recurrenceType: 'weekly'
      })
    }
    setErrors({})
  }, [event, selectedDate, defaultAssigneeId])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required'
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required'
    }

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = 'End time must be after start time'
    }

    if (formData.type === 'meeting' && !formData.meetingLink && (formData.platform === 'teams' || formData.platform === 'zoom' || formData.platform === 'google-meet')) {
      newErrors.meetingLink = 'Meeting link is required for online meetings'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const eventData: CalendarEvent = {
      id: event?.id || `event-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      type: formData.type,
      startTime: formData.startTime,
      endTime: formData.endTime,
      date: formData.date,
      priority: formData.priority,
      status: formData.status,
      assigneeId: formData.assigneeId || undefined,
      assignee: formData.assigneeId
        ? teamMembers.find(member => member.id === formData.assigneeId)?.name
        : undefined,
      project: formData.project || undefined,
      platform: (formData.platform === 'teams' || formData.platform === 'zoom' || formData.platform === 'google-meet') ? formData.platform : undefined,
      meetingLink: formData.meetingLink || undefined,
      attendees: formData.attendees.length > 0 ? formData.attendees : undefined,
      isRecurring: formData.isRecurring,
      recurrenceType: formData.recurrenceType,
      createdBy: 'Current User', // This would come from auth context
      createdAt: event?.createdAt || new Date().toISOString()
    }

    onSave(eventData)
    onClose()
  }

  const handleAddAttendee = () => {
    if (attendeeInput.trim() && !formData.attendees.includes(attendeeInput.trim())) {
      setFormData(prev => ({
        ...prev,
        attendees: [...prev.attendees, attendeeInput.trim()]
      }))
      setAttendeeInput('')
    }
  }

  const handleRemoveAttendee = (attendee: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(a => a !== attendee)
    }))
  }

  const generateMeetingLink = () => {
    const baseLinks: Record<string, string> = {
      teams: 'https://teams.microsoft.com/l/meetup-join/',
      zoom: 'https://zoom.us/j/',
      'google-meet': 'https://meet.google.com/'
    }
    
    const randomId = Math.random().toString(36).substring(2, 15)
    const link = baseLinks[formData.platform] + randomId
    
    setFormData(prev => ({
      ...prev,
      meetingLink: link
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {event ? 'Edit Event' : 'Create Event'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <HiX className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter event title"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="task">Task</option>
                  <option value="meeting">Meeting</option>
                  <option value="reminder">Reminder</option>
                  <option value="personal">Personal</option>
                  <option value="outsourced">Outsourced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter event description"
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.startTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.startTime && <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.endTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.endTime && <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>}
              </div>
            </div>

            {/* Priority and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Project and Assignee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project
                </label>
                <select
                  value={formData.project}
                  onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Project</option>
                  {projects.map(project => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assignee
                </label>
                <select
                  value={formData.assigneeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigneeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Assignee</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Meeting Details */}
            {formData.type === 'meeting' && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">Meeting Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Platform
                    </label>
                    <select
                      value={formData.platform}
                      onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="teams">Microsoft Teams</option>
                      <option value="zoom">Zoom</option>
                      <option value="google-meet">Google Meet</option>
                      <option value="physical">Physical Location</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Meeting Link
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={formData.meetingLink}
                        onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                          errors.meetingLink ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter meeting link"
                      />
                      {(formData.platform === 'teams' || formData.platform === 'zoom' || formData.platform === 'google-meet') && (
                        <button
                          type="button"
                          onClick={generateMeetingLink}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Generate
                        </button>
                      )}
                    </div>
                    {errors.meetingLink && <p className="text-red-500 text-sm mt-1">{errors.meetingLink}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Attendees
                  </label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={attendeeInput}
                      onChange={(e) => setAttendeeInput(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter attendee email or name"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())}
                    />
                    <button
                      type="button"
                      onClick={handleAddAttendee}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  
                  {formData.attendees.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.attendees.map((attendee, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {attendee}
                          <button
                            type="button"
                            onClick={() => handleRemoveAttendee(attendee)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recurring Event */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="recurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="recurring" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Recurring Event
              </label>
            </div>

            {formData.isRecurring && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recurrence Type
                </label>
                <select
                  value={formData.recurrenceType}
                  onChange={(e) => setFormData(prev => ({ ...prev, recurrenceType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {event ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EventModal
