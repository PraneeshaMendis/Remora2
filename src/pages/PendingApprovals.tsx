import React, { useEffect, useState } from 'react'
import { listPendingApprovals, approveUser, rejectUser } from '../services/adminAPI'
import { listDepartments } from '../services/departmentsAPI'
import { listRoles } from '../services/rolesAPI'

const PendingApprovals: React.FC = () => {
  const [items, setItems] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [approving, setApproving] = useState<string | null>(null)
  const [form, setForm] = useState<any>({ departmentId: '', roleId: '', active: true })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const [p, d, r] = await Promise.all([
          listPendingApprovals(),
          listDepartments(),
          listRoles(),
        ])
        setItems(p.items || [])
        setDepartments(d || [])
        setRoles(r || [])
      } catch {}
    })()
  }, [])

  const startApprove = (item: any) => {
    setApproving(item.userId)
    setForm({ departmentId: item.requestedDepartmentId || '', roleId: item.requestedRoleId || '', active: true })
  }

  const doApprove = async () => {
    if (!approving) return
    try {
      await approveUser(approving, form)
      setItems(prev => prev.filter(i => i.userId !== approving))
      setApproving(null)
      setMsg('Approved user')
    } catch (e: any) {
      setMsg(e?.message || 'Failed to approve')
    }
  }

  const doReject = async (userId: string) => {
    const reason = prompt('Reason for rejection?') || ''
    if (!reason) return
    try {
      await rejectUser(userId, reason)
      setItems(prev => prev.filter(i => i.userId !== userId))
      setMsg('Rejected user')
    } catch (e: any) {
      setMsg(e?.message || 'Failed to reject')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pending Approvals</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Approve or reject verified sign-ups</p>
        </div>
      </div>
      {msg && <div className="text-sm p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{msg}</div>}
      <div className="card">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requested Dept</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {items.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No pending approvals</td></tr>
            ) : items.map(item => (
              <tr key={item.userId}>
                <td className="px-6 py-4">{item.name}</td>
                <td className="px-6 py-4">{item.email}</td>
                <td className="px-6 py-4">{item.requestedDepartmentId || '-'}</td>
                <td className="px-6 py-4 space-x-3">
                  <button className="text-blue-600" onClick={() => startApprove(item)}>Approve</button>
                  <button className="text-red-600" onClick={() => doReject(item.userId)}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {approving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm">
          <div className="modal-overlay" onClick={() => setApproving(null)}></div>
          <div className="modal-panel max-w-lg">
            <div className="modal-header">
              <h3 className="modal-title">Approve User</h3>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={() => setApproving(null)}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="block text-sm mb-1">Department</label>
                <select className="input-field" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                  <option value="">Select department</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Role</label>
                <select className="input-field" value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })}>
                  <option value="">Select role</option>
                  {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active</label>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setApproving(null)}>Cancel</button>
              <button className="btn-primary" onClick={doApprove} disabled={!form.departmentId || !form.roleId}>Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PendingApprovals

