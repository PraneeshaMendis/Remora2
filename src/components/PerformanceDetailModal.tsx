import React from 'react'
import { X, Clock, CheckCircle, MessageSquare, FileText, TrendingUp } from 'lucide-react'

interface TeamMemberPerformance {
  member: {
    id: string
    name: string
    email: string
    role: string
    avatar?: string
    department: string
  }
  tasksCompleted: number
  onTimeCompletion: number
  averageLateness: number
  reviewParticipation: number
  approvalRatio: number
  documentsSent: number
  commentsCount: number
  hoursLogged: number
  kpiScore: number
  effortShare: number
}

interface PerformanceDetailModalProps {
  member: TeamMemberPerformance
  onClose: () => void
}

const PerformanceDetailModal: React.FC<PerformanceDetailModalProps> = ({ member, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-lg">
              {member.member.avatar}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{member.member.name}</h2>
              <p className="text-gray-600 dark:text-gray-400">{member.member.role} • {member.member.department}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{member.tasksCompleted}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{member.onTimeCompletion}%</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">On-Time Rate</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{member.hoursLogged}h</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Hours Logged</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Task Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Tasks Completed</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{member.tasksCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">On-Time Completion</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{member.onTimeCompletion}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Average Lateness</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{member.averageLateness} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Effort Share</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{(member.effortShare * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Collaboration</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Comments Given</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{member.commentsCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Documents Sent</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{member.documentsSent}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Documents Reviewed</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{member.reviewParticipation}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Approval Ratio</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{member.approvalRatio}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Score */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Overall Performance Score</h3>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">KPI Score</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{member.kpiScore}/100</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${member.kpiScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Completed task: UI Design Implementation</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">2 days ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FileText className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Uploaded document: Design Mockups</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">3 days ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Added comment on task review</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">4 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PerformanceDetailModal
