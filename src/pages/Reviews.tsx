import React from 'react'
import { Link } from 'react-router-dom'
import { Review } from '../types/index.ts'

const Reviews: React.FC = () => {
  // Mock data
  const reviews: Review[] = [
    {
      id: '1',
      content: 'The wireframes look great! The user flow is intuitive and the layout is clean. I have a few minor suggestions for the navigation component.',
      date: '2024-01-20T14:30:00Z',
      taskId: 'task-1',
      taskTitle: 'Wireframe Creation',
      projectId: '1',
      projectName: 'Mobile App Redesign',
      reviewer: 'Sarah Johnson',
      attachment: 'wireframe-feedback.pdf'
    },
    {
      id: '2',
      content: 'API documentation is comprehensive and well-structured. The endpoints are clearly defined with proper error handling examples.',
      date: '2024-01-19T16:45:00Z',
      taskId: 'task-2',
      taskTitle: 'API Documentation',
      projectId: '2',
      projectName: 'Backend API Development',
      reviewer: 'Mike Chen'
    },
    {
      id: '3',
      content: 'The component library is coming along nicely. I noticed some inconsistencies in the button styles that need to be addressed.',
      date: '2024-01-18T11:20:00Z',
      taskId: 'task-3',
      taskTitle: 'Component Library Setup',
      projectId: '3',
      projectName: 'Design System',
      reviewer: 'Alex Rodriguez',
      attachment: 'component-feedback.fig'
    },
    {
      id: '4',
      content: 'Database schema design looks solid. The relationships are well-defined and the indexing strategy is appropriate for our use case.',
      date: '2024-01-17T09:15:00Z',
      taskId: 'task-4',
      taskTitle: 'Database Schema Design',
      projectId: '2',
      projectName: 'Backend API Development',
      reviewer: 'David Kim'
    },
    {
      id: '5',
      content: 'User research analysis provides valuable insights. The personas are well-developed and the recommendations are actionable.',
      date: '2024-01-16T13:30:00Z',
      taskId: 'task-5',
      taskTitle: 'User Research Analysis',
      projectId: '1',
      projectName: 'Mobile App Redesign',
      reviewer: 'Sarah Johnson'
    },
    {
      id: '6',
      content: 'The authentication flow implementation is secure and follows best practices. Good use of JWT tokens and proper session management.',
      date: '2024-01-15T15:45:00Z',
      taskId: 'task-6',
      taskTitle: 'User Authentication',
      projectId: '1',
      projectName: 'Mobile App Redesign',
      reviewer: 'Mike Chen',
      attachment: 'auth-review.md'
    }
  ]

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'pdf': return '📄'
      case 'fig': return '🎨'
      case 'md': return '📝'
      case 'doc': return '📄'
      case 'docx': return '📄'
      default: return '📎'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffTime / (1000 * 60))

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reviews Feed</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Recent reviews and feedback on tasks and projects
        </p>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No reviews yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Reviews will appear here as team members provide feedback.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="card hover:shadow-md transition-shadow duration-200">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                    {review.reviewer.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{review.reviewer}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(review.date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(review.date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="mb-4">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{review.content}</p>
              </div>

              {/* Task/Project Links */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4">
                  <Link
                    to={`/projects/${review.projectId}/tasks/${review.taskId}`}
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                  >
                    {review.taskTitle}
                  </Link>
                  {review.projectName && (
                    <>
                      <span className="text-gray-400">in</span>
                      <Link
                        to={`/projects/${review.projectId}`}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        {review.projectName}
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Attachment */}
              {review.attachment && (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <span className="text-lg">{getFileIcon(review.attachment)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{review.attachment}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Attachment</p>
                  </div>
                  <button className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    <svg className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Like
                  </button>
                  <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    <svg className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Reply
                  </button>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Review #{review.id}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Reviews
