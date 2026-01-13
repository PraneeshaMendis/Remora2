import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiJson } from '@/services/api'

const ForgotPassword = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiJson('/api/auth/request-password-reset', 'POST', { email })
      setSent(true)
    } catch (e: any) {
      setError(e?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4 py-12">
      <Card className="max-w-md w-full p-8 shadow-soft">
        <h1 className="text-2xl font-bold mb-2 text-center">Reset your password</h1>
        <p className="text-sm text-muted-foreground mb-6 text-center">Enter your email and we’ll send instructions</p>
        {sent ? (
          <Alert className="mb-4">
            <AlertDescription>
              If this email is registered, you’ll receive reset instructions.
            </AlertDescription>
          </Alert>
        ) : null}
        {error && (
          <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-1.5" placeholder="you@company.com" />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/login')}>Back to login</Button>
        </form>
      </Card>
    </div>
  )
}

export default ForgotPassword

