import { NavLink, useLocation } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { NAV_GROUPS, ALL_NAV_ITEMS } from '@/config/navigation'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RoleSwitcher } from '@/components/layout/RoleSwitcher'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed: boolean
  onNavigate?: () => void
}

// Longest matching nav href wins, so nested entries (e.g. /lab/orders)
// don't also highlight their parent (e.g. /lab).
function isActiveItem(pathname: string, href: string): boolean {
  const matches = (h: string) => pathname === h || pathname.startsWith(h + '/')
  if (!matches(href)) return false
  return !ALL_NAV_ITEMS.some((other) => other.href.length > href.length && matches(other.href))
}

export function SidebarContent({ collapsed, onNavigate }: SidebarProps) {
  const location = useLocation()

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className={cn('flex h-16 items-center gap-2 border-b border-sidebar-border px-4', collapsed && 'justify-center px-2')}>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Activity className="h-5 w-5" />
        </span>
        {!collapsed && (
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-bold">Smart Hospital</span>
            <span className="truncate text-[11px] text-muted-foreground">AI-Powered Hospital</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto p-3" aria-label="Main navigation">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && 'mt-4')}>
            {!collapsed ? (
              <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
            ) : (
              gi > 0 && <Separator className="mx-auto my-3 w-8 bg-sidebar-border" />
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isActiveItem(location.pathname, item.href)
                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        'group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                        collapsed && 'justify-center px-0',
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                      )}
                    >
                      <item.icon className={cn('h-4 w-4 shrink-0', active && 'text-sidebar-primary')} />
                      {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
                      {!collapsed && item.badge && (
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {item.badge}
                        </Badge>
                      )}
                      {active && !collapsed && <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: role switcher */}
      <div className="border-t border-sidebar-border p-3">
        <RoleSwitcher compact={collapsed} />
        {!collapsed && (
          <p className="mt-2 px-1 text-[11px] leading-snug text-muted-foreground">
            Prescriptions, lab & pharmacy included.
          </p>
        )}
      </div>
    </div>
  )
}
