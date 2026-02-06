import React, { useEffect, useState } from 'react'
import { getAdminCatalog, registerUserByAdmin, inviteUser } from '../services/adminAPI'

const AdminRegisterUser: React.FC = () => {
  const [roles, setRoles] = useState<string[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleName: '',
    departmentName: '',
    verify: true,
    active: true,
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string>('')

  // Invite form
  const [invite, setInvite] = useState({
    firstName: '',
    lastName: '',
    email: '',
    roleName: '',
    departmentName: '',
  })
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const cat = await getAdminCatalog()
        setRoles(cat.roles || [])
        setDepartments(cat.departments || [])
      } catch (e) {
        setRoles([]); setDepartments([])
      }
    })()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    setLoading(true)
    try {
      const fullName = `${form.firstName} ${form.lastName}`.trim()
      const res = await registerUserByAdmin({ ...form, name: fullName })
      setMsg(`Created: ${res.name} (${res.email}) — ${res.role} @ ${res.department}`)
      setForm({ firstName: '', lastName: '', email: '', password: '', roleName: '', departmentName: '', verify: true, active: true })
    } catch (err: any) {
      setMsg(String(err?.message || 'Failed to register'))
    } finally {
      setLoading(false)
    }
  }

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteMsg('')
    setInviting(true)
    try {
      const fullName = `${invite.firstName} ${invite.lastName}`.trim()
      const res = await inviteUser({
        name: fullName,
        email: invite.email,
        roleName: invite.roleName || undefined,
        departmentName: invite.departmentName,
      })
      setInviteMsg(`Invite sent to ${res.email}${res.verifyUrl ? ` — Dev link: ${res.verifyUrl}` : ''}`)
      setInvite({ firstName: '', lastName: '', email: '', roleName: '', departmentName: '' })
    } catch (err: any) {
      setInviteMsg(String(err?.message || 'Failed to send invite'))
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="space-y-6 w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin: Users</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Register or invite users with role and department</p>
        </div>
      </div>

      {/* Register (set password now) */}
      <form onSubmit={submit} className="card space-y-4 w-full">
        {msg && (
          <div className="text-sm p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{msg}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">First Name</label>
            <input className="input-field" value={form.firstName} onChange={e=>setForm({...form, firstName: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Last Name</label>
            <input className="input-field" value={form.lastName} onChange={e=>setForm({...form, lastName: e.target.value})} required />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" className="input-field" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input type="password" className="input-field" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Role</label>
            <select className="input-field" value={form.roleName} onChange={e=>setForm({...form, roleName: e.target.value})} required>
              <option value="">Select role</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Department</label>
            <select className="input-field" value={form.departmentName} onChange={e=>setForm({...form, departmentName: e.target.value})} required>
              <option value="">Select department</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={form.verify} onChange={e=>setForm({...form, verify: e.target.checked})} /><span>Mark email as verified</span></label>
          <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form, active: e.target.checked})} /><span>Active</span></label>
        </div>
        <div className="pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>

      {/* Invite user (email link to accept invite) */}
      <form onSubmit={submitInvite} className="card space-y-4 w-full">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invite User</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Sends an email with an accept‑invite link</p>
        </div>
        {inviteMsg && (
          <div className="text-sm p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{inviteMsg}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">First Name</label>
            <input className="input-field" value={invite.firstName} onChange={e=>setInvite({...invite, firstName: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Last Name</label>
            <input className="input-field" value={invite.lastName} onChange={e=>setInvite({...invite, lastName: e.target.value})} required />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" className="input-field" value={invite.email} onChange={e=>setInvite({...invite, email: e.target.value})} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Role</label>
            <select className="input-field" value={invite.roleName} onChange={e=>setInvite({...invite, roleName: e.target.value})}>
              <option value="">Client (default)</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Department</label>
            <select className="input-field" value={invite.departmentName} onChange={e=>setInvite({...invite, departmentName: e.target.value})} required>
              <option value="">Select department</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="pt-2">
          <button type="submit" disabled={inviting} className="btn-primary">
            {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AdminRegisterUser
