import { Link, useNavigate } from 'react-router-dom'
import { Bell, LogIn, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useRole } from '@/context/RoleContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { RoleSwitcher } from '@/components/layout/RoleSwitcher'

interface HeaderProps {
  collapsed: boolean
  onToggleCollapse: () => void
  onOpenMobileNav: () => void
}

export function Header({ collapsed, onToggleCollapse, onOpenMobileNav }: HeaderProps) {
  const { roleMeta } = useRole()
  const { user, isDemo, logout } = useAuth()
  const { success } = useToast()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    success('Signed out', 'Your session has ended.')
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur sm:px-4">
      {/* Mobile hamburger */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobileNav} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </Button>

      {/* Desktop collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </Button>

      {/* Search (decorative) */}
      <div className="relative hidden w-64 md:block lg:w-80">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search patients, doctors…" className="pl-9" aria-label="Global search" />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Badge variant="secondary" className="mr-1 hidden xl:inline-flex">
          {roleMeta.label} view
        </Badge>

        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <ThemeToggle />

        {/* Compact role switcher visible on small screens in header */}
        <div className="hidden sm:block lg:hidden">
          <RoleSwitcher compact />
        </div>

        {user && !isDemo ? (
          <>
            <span className="hidden max-w-40 truncate text-sm font-medium md:block" title={user.email}>
              {user.name}
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">
              <LogIn className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          </Button>
        )}

        <Avatar className="h-9 w-9 border">
          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
            {roleMeta.initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
