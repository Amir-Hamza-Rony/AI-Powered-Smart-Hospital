import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarContent } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-svh shrink-0 border-r border-sidebar-border transition-all duration-300 lg:block',
          collapsed ? 'w-[4.5rem]' : 'w-[16.5rem]',
        )}
        aria-label="Sidebar"
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground sm:text-left">
          Smart Hospital · Phase 1 application shell — layout, navigation, theme & mock roles only.
        </footer>
      </div>
    </div>
  )
}
