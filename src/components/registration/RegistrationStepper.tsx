// Registration stepper UI

type Step = { number: number; title: string }

export function RegistrationStepper({ currentStep, steps }: { currentStep: number; steps: Step[] }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      {steps.map((s, idx) => {
        const active = currentStep >= s.number
        const next = idx < steps.length - 1
        return (
          <div key={s.number} className="flex items-center flex-1">
            <div className={`flex items-center justify-center h-8 w-8 rounded-full text-white text-sm font-semibold ${active ? 'bg-primary' : 'bg-muted text-muted-foreground'}`}>{s.number}</div>
            <div className="ml-2 mr-4">
              <div className={`text-sm font-medium ${active ? '' : 'text-muted-foreground'}`}>{s.title}</div>
            </div>
            {next && (
              <div className="flex-1 h-[2px] rounded-full bg-muted" />
            )}
          </div>
        )
      })}
    </div>
  )
}
