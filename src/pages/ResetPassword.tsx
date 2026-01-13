import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PasswordStrengthMeter } from '@/components/registration/PasswordStrengthMeter'
import { apiGet, apiJson } from '@/services/api'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

const ResetPassword = () => {
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const token = search.get('token') || ''
  const [valid, setValid] = useState<'loading' | 'ok' | 'invalid' | 'expired' | 'used'>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setValid('invalid'); return }
    ;(async () => {
      try {
        const r: any = await apiGet(`/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`)
        setValid(r?.valid ? 'ok' : (r?.status || 'invalid'))
      } catch { setValid('invalid') }
    })()
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) return
    setSubmitting(true)
    try {
      await apiJson('/api/auth/reset-password', 'POST', { token, password })
      setDone(true)
      setTimeout(() => navigate('/login'), 4000)
    } catch {}
    setSubmitting(false)
  }

  if (valid !== 'ok') {
    if (valid === 'loading') {
      return (
        <div className="min-h-screen bg-gradient-subtle flex items-center justify-center"><Card className="p-8">Validating…</Card></div>
      )
    }
    const msg = valid === 'used' ? 'This link was already used.' : valid === 'expired' ? 'This link has expired.' : 'This link is invalid.'
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 shadow-soft text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
          <h2 className="text-xl font-semibold mb-2">Cannot reset password</h2>
          <p className="text-sm text-muted-foreground mb-6">{msg}</p>
          <Button onClick={() => navigate('/forgot-password')} className="w-full">Request new link</Button>
        </Card>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 shadow-soft text-center">
          <h2 className="text-2xl font-bold mb-2">Password updated</h2>
          <p className="text-sm text-muted-foreground mb-6">Redirecting to login…</p>
          <Button onClick={() => navigate('/login')} className="w-full">Go to login</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4 py-12">
      <Card className="max-w-md w-full p-8 shadow-soft">
        <h1 className="text-2xl font-bold mb-2 text-center">Set a new password</h1>
        <p className="text-sm text-muted-foreground mb-6 text-center">Choose a strong password for your account</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="password">New Password</Label>
            <div className="relative mt-1.5">
              <Input id="password" type={showPass ? 'text' : 'password'} required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Create a strong password" />
              <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </div>
          {password && (<div className="bg-muted/50 p-4 rounded-xl"><PasswordStrengthMeter password={password} /></div>)}
          <div>
            <Label htmlFor="confirm">Confirm Password</Label>
            <div className="relative mt-1.5">
              <Input id="confirm" type={showConfirm ? 'text' : 'password'} required value={confirm} onChange={(e)=>setConfirm(e.target.value)} placeholder="Confirm your password" />
              <button type="button" onClick={()=>setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
            {confirm && password !== confirm && (
              <Alert variant="destructive" className="mt-2"><AlertDescription>Passwords do not match</AlertDescription></Alert>
            )}
          </div>
          <Button type="submit" className="w-full bg-gradient-primary" disabled={submitting || password !== confirm}>
            {submitting ? 'Updating…' : 'Update password'}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/login')}>Back to login</Button>
        </form>
      </Card>
    </div>
  )
}

export default ResetPassword

