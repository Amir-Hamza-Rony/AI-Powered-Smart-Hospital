import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { RoleProvider } from '@/context/RoleContext'
import { AuthProvider } from '@/context/AuthContext'
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
          <AuthProvider>
          <HospitalStoreProvider>
            <AutomationStoreProvider>
              <TooltipProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </TooltipProvider>
            </AutomationStoreProvider>
          </HospitalStoreProvider>
          </AuthProvider>
        </ToastProvider>
      </RoleProvider>
    </ThemeProvider>
  )
}

export default App
