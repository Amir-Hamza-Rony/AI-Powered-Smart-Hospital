import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { RoleProvider } from '@/context/RoleContext'
import { ToastProvider } from '@/context/ToastContext'
import { HospitalStoreProvider } from '@/store/HospitalStore'
import { AutomationStoreProvider } from '@/store/AutomationStore'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppRoutes } from '@/routes'

function App() {
  return (
    <ThemeProvider>
      <RoleProvider>
        <ToastProvider>
          <HospitalStoreProvider>
            <AutomationStoreProvider>
              <TooltipProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </TooltipProvider>
            </AutomationStoreProvider>
          </HospitalStoreProvider>
        </ToastProvider>
      </RoleProvider>
    </ThemeProvider>
  )
}

export default App
