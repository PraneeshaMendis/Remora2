// Password strength meter UI

function scorePassword(pw: string) {
  let score = 0
  if (!pw) return 0
  // length
  score += Math.min(6, Math.floor(pw.length / 2))
  // variety
  const variations = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/]
  score += variations.reduce((acc, r) => (r.test(pw) ? acc + 2 : acc), 0)
  return Math.min(10, score)
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const s = scorePassword(password)
  const pct = (s / 10) * 100
  const color = s < 4 ? 'bg-red-500' : s < 7 ? 'bg-yellow-500' : 'bg-green-500'
  const label = s < 4 ? 'Weak' : s < 7 ? 'Medium' : 'Strong'
  return (
    <div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-2 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Strength: {label}</div>
    </div>
  )
}
