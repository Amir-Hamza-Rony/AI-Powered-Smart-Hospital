import { Link } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <Badge variant="secondary">Planned module</Badge>
      <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Construction className="h-6 w-6 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The <strong>{title}</strong> module is not available in this build yet.
      </p>
      <Button asChild className="mt-6">
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <Badge variant="destructive">404</Badge>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This route does not exist. Check the address or return to the dashboard.</p>
      <Button asChild className="mt-6">
        <Link to="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  )
}
