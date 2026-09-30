import { ChevronsUpDown, Check } from 'lucide-react'
import { MOCK_ROLES, useRole } from '@/context/RoleContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  const { role, roleMeta, setRole } = useRole()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn('justify-between gap-2', compact ? 'h-9 w-9 p-0' : 'h-10 w-full px-2')}
          aria-label={`Current role: ${roleMeta.label}. Switch mock role`}
        >
          <span className="flex items-center gap-2 truncate">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                {roleMeta.initials}
              </AvatarFallback>
            </Avatar>
            {!compact && (
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span className="truncate text-xs font-semibold">{roleMeta.label}</span>
                <span className="truncate text-[11px] text-muted-foreground">Mock role</span>
              </span>
            )}
          </span>
          {!compact && <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? 'center' : 'start'} className="w-64">
        <DropdownMenuLabel>Switch mock role (Phase 1)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MOCK_ROLES.map((r) => (
          <DropdownMenuItem
            key={r.id}
            onClick={() => setRole(r.id)}
            className="cursor-pointer"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-muted text-[11px] font-bold">{r.initials}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-medium">{r.label}</span>
              <span className="truncate text-xs text-muted-foreground">{r.description}</span>
            </span>
            {role === r.id && <Check className="ml-auto h-4 w-4 shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <Badge variant="secondary" className="text-[11px]">
            UI-only — no backend auth yet
          </Badge>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
