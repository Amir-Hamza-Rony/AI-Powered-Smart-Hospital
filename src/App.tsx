import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { RoleProvider } from '@/context/RoleContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppRoutes } from '@/routes'

function App() {
  return (
    <ThemeProvider>
      <RoleProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </RoleProvider>
    </ThemeProvider>
  )
}

export default App
