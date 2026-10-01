import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const TEXTS = {
  triage:
    'AI-generated clinical assistance only. This does not provide a medical diagnosis. Final clinical decisions must be made by a qualified healthcare professional.',
  clinical:
    'AI-generated summary. Verify against the patient\u2019s medical record before making clinical decisions.',
  prescription:
    'AI prescription advisory is for clinical decision support only. A qualified physician must review and approve the final prescription.',
  prediction:
    'Prediction is based on simulated data for frontend demonstration. Do not use for real capacity planning.',
  analytics:
    'Simulated data for frontend demonstration only. These are not real hospital statistics.',
  general: 'AI-generated information — verify with a qualified healthcare professional.',
} as const

export type AIDisclaimerVariant = keyof typeof TEXTS

export function AIDisclaimer({ variant = 'general', className }: { variant?: AIDisclaimerVariant; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground',
        className,
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{TEXTS[variant]}</p>
    </div>
  )
}
