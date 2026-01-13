import React, { useEffect, useState } from 'react'
import { apiJson } from '../services/api'
import { listDepartments } from '../services/departmentsAPI'
import { listRoles } from '../services/rolesAPI'
import { useNavigate } from 'react-router-dom'

const Signup: React.FC = () => {
  const navigate = useNavigate()
  const [departments, setDepartments] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    desiredDepartmentId: '',
    intendedRoleId: '',
    managerName: '',
    billable: false,
  })

  useEffect(() => {
    ;(async () => {
      try { setDepartments(await listDepartments()) } catch {}
      try { setRoles(await listRoles()) } catch {}
    })()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    setLoading(true)
    try {
      const body: any = {
        name: form.name,
        email: form.email,
        password: form.password,
        desiredDepartmentId: form.desiredDepartmentId,
        intendedRoleId: form.intendedRoleId || undefined,
        managerName: form.managerName || undefined,
        billable: !!form.billable,
      }
      const res = await apiJson('/api/auth/signup', 'POST', body)
      setMsg('Thanks! Please verify your email. Once approved, you can log in.')
      // In dev we show verifyUrl for convenience
      if (res?.verifyUrl) {
        setMsg(`Verify via: ${res.verifyUrl}`)
      }
    } catch (e: any) {
      setMsg(e?.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl">
        <div className="card space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sign up, verify your email, and await approval</p>
          </div>
          {msg && <div className="text-sm p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{msg}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Full name</label>
              <input className="input-field" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Work email</label>
              <input type="email" className="input-field" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input type="password" className="input-field" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Desired Department</label>
                <select className="input-field" value={form.desiredDepartmentId} onChange={e=>setForm({...form, desiredDepartmentId: e.target.value})} required>
                  <option value="">Select department</option>
                  {departments.map((d: any)=> <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Intended Role (optional)</label>
                <select className="input-field" value={form.intendedRoleId} onChange={e=>setForm({...form, intendedRoleId: e.target.value})}>
                  <option value="">No preference</option>
                  {roles.map((r: any)=> <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Manager name (optional)</label>
                <input className="input-field" value={form.managerName} onChange={e=>setForm({...form, managerName: e.target.value})} />
              </div>
              <label className="flex items-center gap-2 text-sm mt-6 md:mt-8">
                <input type="checkbox" checked={form.billable} onChange={e=>setForm({...form, billable: e.target.checked})} /> Billable
              </label>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Submitting…' : 'Sign up'}</button>
              <button type="button" className="btn-secondary" onClick={()=> navigate('/login')}>Back to login</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Signup

