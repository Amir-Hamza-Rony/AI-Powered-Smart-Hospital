import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { RoleProvider } from '@/context/RoleContext'
import { ToastProvider } from '@/context/ToastContext'
import { HospitalStoreProvider } from '@/store/HospitalStore'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppRoutes } from '@/routes'

function App() {
  return (
    <ThemeProvider>
      <RoleProvider>
        <ToastProvider>
          <HospitalStoreProvider>
            <TooltipProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </HospitalStoreProvider>
        </ToastProvider>
      </RoleProvider>
    </ThemeProvider>
  )
}

export default App
