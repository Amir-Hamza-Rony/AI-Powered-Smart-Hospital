import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type MockRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'patient'

export interface RoleMeta {
  id: MockRole
  label: string
  description: string
  initials: string
}

export const MOCK_ROLES: RoleMeta[] = [
  { id: 'admin', label: 'Administrator', description: 'Full system access', initials: 'AD' },
  { id: 'doctor', label: 'Doctor', description: 'Clinical care & diagnosis', initials: 'DR' },
  { id: 'nurse', label: 'Nurse', description: 'Ward & patient care', initials: 'NR' },
  { id: 'receptionist', label: 'Receptionist', description: 'Front desk & scheduling', initials: 'RC' },
  { id: 'pharmacist', label: 'Pharmacist', description: 'Pharmacy & dispensing', initials: 'PH' },
  { id: 'patient', label: 'Patient', description: 'Limited portal view', initials: 'PT' },
]

interface RoleContextValue {
  role: MockRole
  roleMeta: RoleMeta
  setRole: (role: MockRole) => void
}

const RoleContext = createContext<RoleContextValue | null>(null)
const STORAGE_KEY = 'smart-hospital-role'

function getInitialRole(): MockRole {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as MockRole | null
    if (saved && MOCK_ROLES.some((r) => r.id === saved)) return saved
  } catch {
    /* ignore */
  }
  return 'admin'
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<MockRole>(getInitialRole)

  const setRole = (r: MockRole) => {
    setRoleState(r)
    try {
      localStorage.setItem(STORAGE_KEY, r)
    } catch {
      /* ignore */
    }
  }

  const roleMeta = useMemo(() => MOCK_ROLES.find((r) => r.id === role)!, [role])
  const value = useMemo(() => ({ role, roleMeta, setRole }), [role, roleMeta])

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleProvider')
  return ctx
}
