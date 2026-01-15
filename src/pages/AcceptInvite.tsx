import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RegistrationStepper } from '@/components/registration/RegistrationStepper'
import { PasswordStrengthMeter } from '@/components/registration/PasswordStrengthMeter'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiGet, apiJson } from '@/services/api'
import { listDepartments } from '@/services/departmentsAPI'
import { listRoles } from '@/services/rolesAPI'

const steps = [
  { number: 1, title: 'Verify' },
  { number: 2, title: 'Profile' },
  { number: 3, title: 'Password' },
  { number: 4, title: 'Finish' },
]

const AcceptInvite = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [validationState, setValidationState] = useState<{ loading: boolean; valid: boolean; status: string; data?: any }>({ loading: true, valid: false, status: '' })
  const [currentStep, setCurrentStep] = useState(2)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [deptOptions, setDeptOptions] = useState<string[]>([])
  const [roleOptions, setRoleOptions] = useState<string[]>([])

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    role: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptPolicy: false,
  })

  useEffect(() => {
    ;(async () => {
      try {
        const [rolesRes, deptsRes] = await Promise.all([
          listRoles().catch(() => []),
          listDepartments().catch(() => []),
        ])
        setRoleOptions((rolesRes || []).map((r: any) => String(r.name || '')).filter(Boolean))
        setDeptOptions((deptsRes || []).map((d: any) => String(d.name || '')).filter(Boolean))
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (!token) {
      setValidationState({ loading: false, valid: false, status: 'invalid' })
      return
    }
    ;(async () => {
      try {
        const res: any = await apiGet(`/api/auth/invite-info?token=${encodeURIComponent(token)}`)
        if (res?.valid) {
          setValidationState({ loading: false, valid: true, status: 'ok', data: res.data })
          setFormData((prev) => ({
            ...prev,
            email: res?.data?.email || '',
            department: res?.data?.department || '',
            role: (res?.data?.role || '').toString(),
          }))
        } else {
          setValidationState({ loading: false, valid: false, status: res?.status || 'invalid' })
        }
      } catch {
        setValidationState({ loading: false, valid: false, status: 'invalid' })
      }
    })()
  }, [token])

  const handleNextStep = () => {
    if (currentStep === 2) {
      if (!formData.firstName || !formData.lastName) return
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (formData.password !== formData.confirmPassword) return
    if (!formData.acceptPolicy) return
    setSubmitting(true)
    try {
      await apiJson('/api/auth/accept-invite', 'POST', {
        token,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone || undefined,
      })
      setCurrentStep(4)
    } catch (e) {
      // keep user on the form
    } finally {
      setSubmitting(false)
    }
  }

  if (validationState.loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="p-8 text-center shadow-soft max-w-md w-full mx-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Validating invitation...</p>
        </Card>
      </div>
    )
  }

  if (!validationState.valid) {
    const errorConfig: any = {
      expired: { title: 'This invitation has expired', description: 'Invitation links are valid for 7 days. Please request a new invitation from your administrator.', action: 'Contact Admin' },
      used: { title: 'This invitation link was already used', description: 'This link has already been used to create an account. If you need access, please sign in or contact your administrator.', action: 'Go to Login' },
      invalid: { title: "We couldn't validate this link", description: 'The invitation link appears to be invalid or malformed. Please check the link or request a new invitation.', action: 'Back to Login' },
    }
    const config = errorConfig[validationState.status] || errorConfig.invalid
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4 shadow-soft text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
          <p className="text-muted-foreground mb-6">{config.description}</p>
          <Button onClick={() => navigate('/login')} className="w-full">{config.action}</Button>
        </Card>
      </div>
    )
  }

  if (currentStep === 4) {
    setTimeout(() => navigate('/login'), 5000)
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4 shadow-soft text-center animate-slide-up">
          <div className="mb-6">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="inline-block text-4xl animate-confetti" style={{ animationDelay: `${i * 0.1}s`, marginRight: '8px' }}>🎉</span>
            ))}
          </div>
          <h2 className="text-3xl font-bold mb-4">Your account is ready{formData.firstName ? `, ${formData.firstName}` : ''}!</h2>
          <div className="flex gap-2 justify-center mb-6">
            {formData.department ? <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">{formData.department}</span> : null}
            {formData.role ? <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm">{formData.role}</span> : null}
          </div>
          <p className="text-muted-foreground mb-6">Redirecting to login in 5 seconds...</p>
          <Button onClick={() => navigate('/login')} size="lg" className="bg-gradient-primary">Continue to Login</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 shadow-soft">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create Your Account</h1>
            <p className="text-muted-foreground">Welcome to Cyber Labs</p>
          </div>
          <div className="mb-6 p-4 bg-secondary/50 rounded-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Invited as:</span>
              <div className="flex gap-2">
                <span className="font-medium">{validationState.data?.role}</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium">{validationState.data?.department}</span>
              </div>
            </div>
          </div>
          <RegistrationStepper currentStep={currentStep} steps={steps} />
          <form onSubmit={handleSubmit} className="space-y-6">
            {currentStep === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="John" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Doe" className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} disabled className="mt-1.5 bg-muted" />
                  <p className="text-xs text-muted-foreground mt-1">Your work email will be your login</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Select value={formData.department}>
                      <SelectTrigger disabled className="mt-1.5"><SelectValue /></SelectTrigger>
                      {/* content kept for structure but trigger is disabled */}
                      <SelectContent>
                        {deptOptions.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role}>
                      <SelectTrigger disabled className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 (555) 000-0000" className="mt-1.5" />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={handleNextStep} size="lg" className="bg-gradient-primary">Continue</Button>
                </div>
              </div>
            )}
            {currentStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative mt-1.5">
                    <Input id="password" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Create a strong password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {formData.password && (<div className="bg-muted/50 p-4 rounded-xl"><PasswordStrengthMeter password={formData.password} /></div>)}
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative mt-1.5">
                    <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Confirm your password" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <Alert variant="destructive" className="mt-2"><AlertDescription>Passwords do not match</AlertDescription></Alert>
                  )}
                </div>
                <div className="flex items-start space-x-3 pt-2">
                  <Checkbox id="acceptPolicy" checked={formData.acceptPolicy} onCheckedChange={(c) => setFormData({ ...formData, acceptPolicy: !!c })} />
                  <div className="space-y-1 leading-none"><Label htmlFor="acceptPolicy" className="cursor-pointer text-sm">I agree to the company policies and terms of service</Label></div>
                </div>
                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>Back</Button>
                  <Button type="submit" size="lg" disabled={submitting || !formData.acceptPolicy || formData.password !== formData.confirmPassword} className="bg-gradient-primary">{submitting ? 'Creating Account...' : 'Create Account'}</Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  )
}

export default AcceptInvite
