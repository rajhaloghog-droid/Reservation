export type UserRole = 'admin' | 'user'

export type AppTab =
  | 'home'
  | 'reservation'
  | 'vehicles'
  | 'booking'
  | 'schedule'
  | 'add-company'
  | 'add-user'
  | 'employee'
  | 'my-approvals'

export interface AuthUser {
  id: number
  email: string
  role: UserRole
  profile_image?: string | null
}

export interface AuthSession {
  token: string
  user: AuthUser
}

export const SESSION_STORAGE_KEY = 'reservation-auth-session'

const adminTabPaths: Record<Exclude<AppTab, 'booking' | 'my-approvals'>, string> = {
  home: '/home',
  reservation: '/reservation',
  vehicles: '/vehicles',
  schedule: '/schedule',
  'add-company': '/add-company',
  'add-user': '/add-user',
  employee: '/employee',
}

const userTabPaths: Record<Extract<AppTab, 'booking' | 'schedule' | 'my-approvals'>, string> = {
  booking: '/booking',
  schedule: '/schedule',
  'my-approvals': '/my-approvals',
}

const adminTabAliases: Record<Exclude<AppTab, 'booking' | 'my-approvals'>, string[]> = {
  home: ['/', '/home', '/admin', '/admin/home', '/dashboard'],
  reservation: ['/reservation', '/reservations', '/entry', '/add-entry'],
  vehicles: ['/vehicles', '/vehicle', '/manage-vehicles'],
  schedule: ['/schedule', '/schedules', '/calendar'],
  'add-company': ['/add-company', '/company', '/companies', '/company-management'],
  'add-user': ['/add-user', '/user', '/users', '/user-management'],
  employee: ['/employee', '/employees', '/employee-management'],
}

const userTabAliases: Record<Extract<AppTab, 'booking' | 'schedule' | 'my-approvals'>, string[]> = {
  booking: ['/', '/booking', '/book', '/request-booking'],
  schedule: ['/schedule', '/schedules', '/calendar'],
  'my-approvals': ['/my-approvals', '/approvals', '/travel-authorization'],
}

function normalizePath(pathname: string): string {
  const normalizedPath = pathname.trim().toLowerCase()
  if (!normalizedPath || normalizedPath === '/') return '/'
  return normalizedPath.replace(/\/+$/, '')
}

export function getTabFromPath(pathname: string, role: UserRole | null): AppTab | null {
  if (!role) return null
  const normalizedPath = normalizePath(pathname)
  const tabPaths = role === 'admin' ? adminTabAliases : userTabAliases
  const entry = Object.entries(tabPaths).find(([, paths]) =>
    paths.some(path => normalizePath(path) === normalizedPath)
  )
  return (entry?.[0] as AppTab | undefined) ?? null
}

export function getPathFromTab(tab: AppTab, role: UserRole | null): string {
  if (role === 'admin') {
    return adminTabPaths[tab as keyof typeof adminTabPaths] ?? '/home'
  }
  if (role === 'user') {
    return userTabPaths[tab as keyof typeof userTabPaths] ?? '/booking'
  }
  return '/login'
}

export function getDefaultTab(role: UserRole): AppTab {
  return role === 'user' ? 'booking' : 'home'
}
