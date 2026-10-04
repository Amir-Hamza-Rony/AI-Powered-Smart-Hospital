import { Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function ApiLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground" aria-live="polite">
        {label}
      </CardContent>
    </Card>
  )
}

export function ApiErrorState({
  title = 'Failed to load data',
  message,
  onRetry,
}: {
  title?: string
  message: string | null
  onRetry: () => void
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{message ?? 'Something went wrong.'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  )
}

export function ApiForbiddenState({ message }: { message: string | null }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
        <div>
          <p className="font-semibold">Access denied</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {message ?? 'Your role cannot access this data.'}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
