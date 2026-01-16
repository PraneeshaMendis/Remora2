import React, { useEffect, useState } from 'react'
import { listUsers, updateUser, deleteUser as apiDeleteUser } from '../services/usersAPI.ts'
import { inviteUser } from '../services/adminAPI.ts'
import { listDepartments, createDepartment as apiCreateDepartment, deleteDepartment as apiDeleteDepartment } from '../services/departmentsAPI.ts'
import { listRoles, createRole as apiCreateRole, deleteRole as apiDeleteRole } from '../services/rolesAPI.ts'
import { startImpersonation, stopImpersonation, getImpersonationStatus, purgeNonAdminUsers } from '../services/adminAPI'
import { Button } from '@/components/ui/button'
import { Plus, Building2, Shield, Trash2, LogOut } from 'lucide-react'

const Users: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  // Reuse local state for the Invite User modal
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: '', // optional (defaults to Client on server)
    department: '',
    isActive: true,
  })
  const [isManageDepartmentsOpen, setIsManageDepartmentsOpen] = useState(false)
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const handleAddDepartment = async () => {
    const trimmed = newDepartmentName.trim()
    if (!trimmed) return
    const exists = departmentOptions.some((dept) => dept.toLowerCase() === trimmed.toLowerCase())
      || departments.some((dept) => String(dept || '').toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      alert('Department already exists')
      return
    }
    try {
      const created = await apiCreateDepartment(trimmed)
      const name = String(created?.name || trimmed)
      const id = String(created?.id || '')
      setDepartmentOptions(prev => Array.from(new Set([...prev, name])))
      if (id) {
        setDepartmentIdByName(prev => ({ ...prev, [name]: id }))
      }
      setNewDepartmentName('')
    } catch (e: any) {
      console.error('Failed to create department', e)
      alert(e?.message || 'Failed to create department')
    }
  }
  const handleDeleteDepartment = async (name: string) => {
    try {
      if (!name) return
      const id = departmentIdByName[name]
      if (!id) {
        alert('Could not resolve department id')
        return
      }
      const ok = window.confirm(`Delete department "${name}"? Users will be reassigned to Unassigned.`)
      if (!ok) return
      // Attempt safe delete first; if blocked, force with reassignment
      try {
        await apiDeleteDepartment(id)
      } catch (e) {
        await apiDeleteDepartment(id, { force: true })
      }
      // Refresh departments from backend to sync maps
      const depts = await listDepartments().catch(() => [])
      setDepartmentOptions((depts || []).map((d: any) => String(d.name)))
      setDepartmentIdByName(Object.fromEntries((depts || []).map((d: any) => [String(d.name), String(d.id)])))
      // Update users in UI: move those in deleted dept to Unassigned
      setUsers(prev => prev.map(u => (u.department === name ? { ...u, department: 'Unassigned' } : u)))
    } catch (e) {
      console.error('Failed to delete department', e)
      alert('Failed to delete department')
    }
  }

  // Manage Roles state (frontend only)
  const [isManageRolesOpen, setIsManageRolesOpen] = useState(false)
  const [roleList, setRoleList] = useState<string[]>([])
  const [newRoleName, setNewRoleName] = useState('')
  const handleAddRole = async () => {
    const trimmed = newRoleName.trim()
    if (!trimmed) return
    try {
      // Create via API using exact case as entered
      const created = await apiCreateRole(trimmed)
      setRoleList(prev => Array.from(new Set([...prev, String(created.name || '').toLowerCase()])))
      setRoleIdByName(prev => ({ ...prev, [String(created.name || '').toLowerCase()]: String(created.id) }))
      setNewRoleName('')
    } catch (e: any) {
      alert(e?.message || 'Failed to create role')
    }
  }
  const handleDeleteRole = async (name: string) => {
    try {
      const id = roleIdByName[name]
      if (!id) { alert('Could not resolve role id'); return }
      const ok = window.confirm(`Delete role "${name}"? Users will be reassigned to Unassigned.`)
      if (!ok) return
      try {
        await apiDeleteRole(id)
      } catch {
        await apiDeleteRole(id, { force: true })
      }
      // Refresh roles from backend
      const roles = await listRoles().catch(() => [])
      setRoleList((roles || []).map((r: any) => String(r.name || '').toLowerCase()))
      setRoleIdByName(Object.fromEntries((roles || []).map((r: any) => [String(r.name || '').toLowerCase(), String(r.id)])))
      // Update users: move from deleted role to 'unassigned'
      setUsers(prev => prev.map(u => (String(u.role).toLowerCase() === String(name).toLowerCase() ? { ...u, role: 'unassigned' } : u)))
    } catch (e: any) {
      console.error('Failed to delete role', e)
      alert('Failed to delete role')
    }
  }

  // Backend metadata for creating users (IDs)
  const [roleIdByName, setRoleIdByName] = useState<Record<string, string>>({})
  const [departmentIdByName, setDepartmentIdByName] = useState<Record<string, string>>({})
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([])
  const [impersonationActive, setImpersonationActive] = useState(false)

  // Load roles + departments for Add User (keeps UI as names)
  useEffect(() => {
    ;(async () => {
      try {
        const roles = await listRoles()
        setRoleList((roles || []).map((r: any) => String(r.name || '').toLowerCase()))
        setRoleIdByName(Object.fromEntries((roles || []).map((r: any) => [String(r.name || '').toLowerCase(), String(r.id)])))
      } catch (e) { console.error('Failed to load roles', e) }
      try {
        const depts = await listDepartments()
        setDepartmentOptions((depts || []).map((d: any) => String(d.name)))
        setDepartmentIdByName(Object.fromEntries((depts || []).map((d: any) => [String(d.name), String(d.id)])))
      } catch (e) { console.error('Failed to load departments', e) }
      try {
        const st = await getImpersonationStatus()
        setImpersonationActive(!!st?.active)
      } catch {}
    })()
  }, [])

  // Load roles for Manage Roles modal display (names only, lowercase to match UI)
  useEffect(() => {
    ;(async () => {
      try {
        const roles = await listRoles()
        setRoleList((roles || []).map((r: any) => String(r.name || '').toLowerCase()))
      } catch (e) {
        console.error('Failed to load roles', e)
      }
    })()
  }, [])

  const [users, setUsers] = useState<any[]>([])
  const [inviteMsg, setInviteMsg] = useState('')
  const [invitingId, setInvitingId] = useState<string | null>(null)

  // Edit user modal state
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [editUser, setEditUser] = useState<{ id: string; name: string; email: string; role: string; department: string; isActive: boolean }>({
    id: '',
    name: '',
    email: '',
    role: '',
    department: '',
    isActive: true,
  })

  // Load users from API
  useEffect(() => {
    ;(async () => {
      try {
        const res = await listUsers({ page: 1, limit: 100 })
        console.log('Users fetch response', res)
        const items = (res.items || []).map((u: any) => ({
          ...u,
          role: (u?.role?.name || u?.role || '').toLowerCase(),
          department: u?.department?.name || u?.department || '',
          verified: !!u.verified,
        }))
        setUsers(items)
        console.log('Users set count', items.length)
      } catch (e) {
        console.error('Failed to load users', e)
      }
    })()
  }, [])

  

  const handleStatusToggle = async (userId: string, isActive: boolean) => {
    try {
      await updateUser(userId, { isActive })
      // Optimistic local update
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, isActive } : u)))
    } catch (error) {
      console.error('Failed to toggle status:', error)
      alert('Failed to update status')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Permanently delete this user and clean up related data? This action cannot be undone.')) return

    try {
      // Use hard delete to avoid archival/scrub fallback on the server
      await apiDeleteUser(userId, true)
      // Refresh list or optimistic removal
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert('Failed to delete user')
    }
  }

  const handleInvite = async (user: any) => {
    try {
      setInviteMsg('')
      setInvitingId(user.id)
      const body = {
        name: user.name,
        email: user.email,
        departmentName: user.department || '',
        roleName: user.role || undefined,
      }
      const r = await inviteUser(body)
      setInviteMsg(`Invite sent to ${r.email}${r.verifyUrl ? ` — Dev link: ${r.verifyUrl}` : ''}`)
    } catch (e: any) {
      setInviteMsg(e?.message || 'Failed to send invite')
    } finally {
      setInvitingId(null)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'director': return 'bg-red-600 text-white'
      case 'manager': return 'bg-blue-600 text-white'
      case 'consultant': return 'bg-green-600 text-white'
      case 'lead': return 'bg-purple-600 text-white'
      case 'client': return 'bg-orange-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  // Derive departments like original UI from loaded users
  const departments = [...new Set(users.map((u: any) => u.department).filter(Boolean))] as string[]
  const departmentList = (departmentOptions.length ? departmentOptions : departments).map((name) => ({ id: name, name }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage users, departments, and roles for your organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddUserOpen(true)} className="rounded-full shadow-sm gap-2">
            <Plus className="h-4 w-4" />
            Invite User
          </Button>
          <Button variant="outline" onClick={() => setIsManageDepartmentsOpen(true)} className="rounded-full gap-2">
            <Building2 className="h-4 w-4" />
            Manage Departments
          </Button>
          <Button variant="outline" onClick={() => setIsManageRolesOpen(true)} className="rounded-full gap-2">
            <Shield className="h-4 w-4" />
            Manage Roles
          </Button>
          <Button
            variant="destructive"
            className="rounded-full gap-2"
            onClick={async () => {
              if (!window.confirm('Purge all non-admin users? This will delete or archive them.')) return
              try { const r = await purgeNonAdminUsers(); alert(`Deleted: ${r.deleted}, Scrubbed: ${r.scrubbed}`); window.location.reload() } catch (e: any) { alert(e?.message || 'Failed to purge') }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Purge Non-admins
          </Button>
          {impersonationActive && (
            <Button variant="outline" className="rounded-full gap-2" onClick={async () => { try { await stopImpersonation(); window.location.reload() } catch {} }}>
              <LogOut className="h-4 w-4" />
              Stop Impersonation
            </Button>
          )}
        </div>
      </div>

      {/* Search, Filters and Users Table inside one card */}
      <div className="card">
        {inviteMsg && (
          <div className="mb-3 text-sm p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{inviteMsg}</div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 h-11 rounded-full"
              />
            </div>
          </div>
          <div className="flex space-x-4">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field h-11 rounded-full"
            >
              <option value="all">All Roles</option>
              <option value="director">Director</option>
              <option value="manager">Manager</option>
              <option value="consultant">Consultant</option>
              <option value="lead">Lead</option>
              <option value="client">Client</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input-field h-11 rounded-full"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Try adjusting your search or filter criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      <div className={`text-xs mt-0.5 ${user.verified ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {user.verified ? 'Verified' : 'Unverified'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{user.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={user.isActive}
                            onChange={(e) => handleStatusToggle(user.id, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer ${
                            user.isActive 
                              ? 'bg-blue-600 peer-checked:bg-blue-600' 
                              : 'bg-gray-200 dark:bg-gray-700'
                          } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600`}></div>
                          <span className={`ml-3 text-sm font-medium ${
                            user.isActive 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </label>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                          title="Edit user"
                          onClick={() => { setEditUser({ id: user.id, name: user.name, email: user.email, role: String(user.role || '').toLowerCase(), department: user.department || '', isActive: !!user.isActive }); setIsEditUserOpen(true) }}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full px-3 py-1"
                          onClick={() => handleInvite(user)}
                          title="Send invite"
                          disabled={invitingId === user.id}
                        >
                          {invitingId === user.id ? 'Inviting…' : 'Invite'}
                        </Button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full px-3 py-1"
                          onClick={async () => { try { await startImpersonation(user.id); window.location.reload() } catch (e: any) { alert(e?.message || 'Failed to impersonate') } }}
                          title="View as this user"
                        >
                          View as
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite User Modal (replacing Add User functionality) */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="modal-overlay" onClick={() => setIsAddUserOpen(false)}></div>
          <div className="modal-panel max-w-2xl">
            <div className="modal-header">
              <h3 className="modal-title">Invite User</h3>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={() => setIsAddUserOpen(false)}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="space-y-1">
                <label className="field-label">Full Name (Optional)</label>
                <input
                  type="text"
                  className="input-field input-lg rounded-2xl"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="field-label">Email</label>
                <input
                  type="email"
                  className="input-field input-lg rounded-2xl"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="field-label">Role</label>
                  <select
                    className="input-field select-lg rounded-2xl"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="">Client (default)</option>
                    <option value="director">Director</option>
                    <option value="manager">Manager</option>
                    <option value="consultant">Consultant</option>
                    <option value="lead">Lead</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="field-label">Department</label>
                  <select
                    className="input-field select-lg rounded-2xl"
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  >
                    {departmentList.map((dept) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Optional: personal message field (UI only for now) */}
              <div className="space-y-1">
                <label className="field-label">Personal Message (Optional)</label>
                <textarea className="input-field rounded-2xl min-h-[64px]" placeholder="Add a personal note to the invitation…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsAddUserOpen(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={async () => {
                  try {
                    const name = newUser.name.trim()
                    const email = newUser.email.trim()
                    const roleName = String(newUser.role || '').toLowerCase()
                    const deptName = String(newUser.department || '')
                    if (!email || !deptName) {
                      alert('Please fill email and department')
                      return
                    }
                    const res = await inviteUser({
                      name: name || email.split('@')[0],
                      email,
                      departmentName: deptName,
                      ...(roleName ? { roleName } : {}),
                    })
                    setInviteMsg(`Invite sent to ${res.email}${res.verifyUrl ? ` — Dev link: ${res.verifyUrl}` : ''}`)
                    // Optimistically add to list for visibility
                    const mapped = {
                      id: res.id || `tmp-${Date.now()}`,
                      name: name || email,
                      email,
                      role: roleName || 'client',
                      department: deptName,
                      isActive: true,
                      verified: false,
                    }
                    setUsers(prev => [mapped, ...prev])
                    setIsAddUserOpen(false)
                    setNewUser({ name: '', email: '', role: '', department: deptName, isActive: true })
                  } catch (e: any) {
                    console.error(e)
                    alert(e?.message || 'Failed to send invite')
                  }
                }}
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="modal-overlay" onClick={() => setIsEditUserOpen(false)}></div>
          <div className="modal-panel max-w-2xl">
            <div className="modal-header">
              <h3 className="modal-title">Edit User</h3>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={() => setIsEditUserOpen(false)}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="space-y-1">
                <label className="field-label">Name</label>
                <input
                  type="text"
                  className="input-field input-lg rounded-2xl"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-1">
                <label className="field-label">Email</label>
                <input
                  type="email"
                  className="input-field input-lg rounded-2xl opacity-70 cursor-not-allowed"
                  value={editUser.email}
                  readOnly
                  disabled
                  placeholder="name@company.com"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="field-label">Role</label>
                  <select
                    className="input-field select-lg rounded-2xl"
                    value={editUser.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                  >
                    {roleList.map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="field-label">Department</label>
                  <select
                    className="input-field select-lg rounded-2xl"
                    value={editUser.department}
                    onChange={(e) => setEditUser({ ...editUser, department: e.target.value })}
                  >
                    {departmentList.map((dept) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="field-label">Active Status</label>
                <div className="flex items-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editUser.isActive}
                      onChange={(e) => setEditUser({ ...editUser, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full peer ${
                      editUser.isActive
                        ? 'bg-blue-600 peer-checked:bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600`}></div>
                    <span className={`ml-3 text-sm font-medium ${
                      editUser.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {editUser.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsEditUserOpen(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={async () => {
                  try {
                    const name = editUser.name.trim()
                    const roleName = String(editUser.role || '').toLowerCase()
                    const deptName = String(editUser.department || '')
                    if (!name || !roleName || !deptName) {
                      alert('Please fill name, role and department')
                      return
                    }
                    const roleId = roleIdByName[roleName]
                    const departmentId = departmentIdByName[deptName]
                    if (!roleId || !departmentId) {
                      alert('Invalid role or department. Please select valid options.')
                      return
                    }
                    await updateUser(editUser.id, { name, roleId, departmentId, isActive: editUser.isActive })
                    setUsers(prev => prev.map(u => (u.id === editUser.id ? { ...u, name, role: roleName, department: deptName, isActive: editUser.isActive } : u)))
                    setIsEditUserOpen(false)
                  } catch (e: any) {
                    alert(e?.message || 'Failed to update user')
                  }
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Departments Modal */}
      {isManageDepartmentsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="modal-overlay" onClick={() => setIsManageDepartmentsOpen(false)}></div>
          <div className="modal-panel max-w-xl">
            <div className="modal-header">
              <h3 className="modal-title">Manage Departments</h3>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={() => setIsManageDepartmentsOpen(false)}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  className="input-field input-lg rounded-2xl flex-1"
                  placeholder="New department name"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddDepartment() }}
                />
                <button className="btn-icon" onClick={handleAddDepartment} aria-label="Add department">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {departmentList.map((dept) => (
                  <div key={dept.id} className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-gray-800 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{dept.name}</span>
                    <button className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full p-2" onClick={() => handleDeleteDepartment(dept.name)} aria-label={`Delete ${dept.name}`}>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                {departmentList.length === 0 && (
                  <div className="rounded-md bg-gray-50 dark:bg-gray-800 px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No departments yet</div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsManageDepartmentsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Roles Modal */}
      {isManageRolesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="modal-overlay" onClick={() => setIsManageRolesOpen(false)}></div>
          <div className="modal-panel max-w-xl">
            <div className="modal-header">
              <h3 className="modal-title">Manage Roles</h3>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={() => setIsManageRolesOpen(false)}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  className="input-field input-lg rounded-2xl flex-1"
                  placeholder="New role name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddRole() }}
                />
                <button className="btn-icon" onClick={handleAddRole} aria-label="Add role">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {roleList.map((role) => (
                  <div key={role} className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-gray-800 px-4 py-3">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">
                      {role}
                    </span>
                    <button className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full p-2" onClick={() => handleDeleteRole(role)} aria-label={`Delete ${role}`}>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                {roleList.length === 0 && (
                  <div className="rounded-md bg-gray-50 dark:bg-gray-800 px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No roles yet</div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsManageRolesOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users
