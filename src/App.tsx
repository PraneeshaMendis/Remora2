import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import Login from './pages/Login.tsx'
import Signup from './pages/Signup.tsx'
import AcceptInvite from './pages/AcceptInvite.tsx'
import ForgotPassword from './pages/ForgotPassword.tsx'
import ResetPassword from './pages/ResetPassword.tsx'
import AuthenticatedLayout from './components/AuthenticatedLayout.tsx'
import DirectorDashboard from './pages/DirectorDashboard.tsx'
import ProjectsList from './pages/ProjectsList.tsx'
import AddProject from './pages/AddProject.tsx'
import ProjectDetail from './pages/ProjectDetail.tsx'
import GlobalTasks from './pages/GlobalTasks'
import TaskDetail from './pages/TaskDetail.tsx'
import Users from './pages/Users.tsx'
import Documents from './pages/Documents.tsx'
import Profile from './pages/Profile.tsx'
import CompletedProjects from './pages/CompletedProjects.tsx'
import CompletedProjectDetail from './pages/CompletedProjectDetail.tsx'
import CalendarDashboard from './pages/CalendarDashboard.tsx'
import SlipsInvoicesPage from './pages/SlipsInvoicesPage.tsx'
import AdminRegisterUser from './pages/AdminRegisterUser.tsx'
import PendingApprovals from './pages/PendingApprovals.tsx'
import Permissions from './pages/Permissions.tsx'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen bg-background app-bg">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/invite/accept" element={<AcceptInvite />} />
            
            {/* Protected routes */}
            <Route path="/" element={<AuthenticatedLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DirectorDashboard />} />
              <Route path="projects" element={<ProjectsList />} />
              <Route path="projects/add" element={<AddProject />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="projects/:projectId/tasks/:taskId" element={<TaskDetail />} />
              <Route path="tasks" element={<GlobalTasks />} />
              <Route path="users" element={<Users />} />
              <Route path="admin/approvals" element={<PendingApprovals />} />
              <Route path="admin/permissions" element={<Permissions />} />
              <Route path="admin/register-user" element={<AdminRegisterUser />} />
              <Route path="documents" element={<Documents />} />
              <Route path="profile" element={<Profile />} />
              <Route path="completed-projects" element={<CompletedProjects />} />
              <Route path="completed-projects/:id" element={<CompletedProjectDetail />} />
              <Route path="calendar" element={<CalendarDashboard />} />
              <Route path="slips-invoices" element={<SlipsInvoicesPage />} />
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
