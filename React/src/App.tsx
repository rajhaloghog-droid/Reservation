import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import AppHeader from './AppHeader'
import Login from './Login'
import ReservationForm from './ReservationForm'
import VehicleManagement from './VehicleManagement'
import Booking from './Booking'
import TimeTable from './TimeTable'
import AdminHome from './AdminHome'
import AdminPanel from './AdminPanel'
import UserApprovals from './UserApprovals'
import EmployeeManagement from './EmployeeManagement'
import SidebarProfile from './SidebarProfile'
import {
  getDefaultTab,
  getPathFromTab,
  getTabFromPath,
  SESSION_STORAGE_KEY,
  type AuthSession,
} from './appSession'
import { API_BASE_URL } from './api'
import { resizeImageFile } from './imageUpload'

function getInitialSession() {
  const pathname = window.location.pathname.toLowerCase()
  const shouldRestoreSession = pathname !== '/' && pathname !== '/login'
  if (!shouldRestoreSession) return null

  const saved = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!saved) return null

  try {
    return JSON.parse(saved) as AuthSession
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [session, setSession] = useState<AuthSession | null>(() => getInitialSession())
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [scheduleRefresh, setScheduleRefresh] = useState(0)
  const [isSessionReady] = useState(true)
  const isUserDashboard = session?.user.role === 'user'
  const activeTab = session ? getTabFromPath(location.pathname, session.user.role) : null

  const handleLogout = () => {
    setSession(null)
    setProfileImage(null)
    localStorage.removeItem(SESSION_STORAGE_KEY)
    navigate('/login', { replace: true })
  }

  const triggerScheduleRefresh = () => {
    setScheduleRefresh(prev => prev + 1)
  }

  useEffect(() => {
    if (!isSessionReady || session) return
    if (location.pathname !== '/login') {
      navigate('/login', { replace: true })
    }
  }, [isSessionReady, location.pathname, navigate, session])

  useEffect(() => {
    if (!session) return

    const tabFromPath = getTabFromPath(location.pathname, session.user.role)
    if (tabFromPath) {
      const canonicalPath = getPathFromTab(tabFromPath, session.user.role)
      if (location.pathname !== canonicalPath) {
        navigate(canonicalPath, { replace: true })
      }
      return
    }

    const defaultTab = getDefaultTab(session.user.role)
    navigate(getPathFromTab(defaultTab, session.user.role), { replace: true })
  }, [location.pathname, navigate, session])

  useEffect(() => {
    if (!session) return
    setProfileImage(session.user.profile_image || null)
  }, [session])

  useEffect(() => {
    if (!session?.token) return

    let isCancelled = false

    const refreshCurrentUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/me`, {
          headers: { Authorization: `Bearer ${session.token}` },
        })
        const data = await response.json()
        if (!response.ok || !data.success || isCancelled) {
          return
        }

        const nextProfileImage = data.data?.profile_image || null
        setProfileImage((currentProfileImage) =>
          currentProfileImage === nextProfileImage ? currentProfileImage : nextProfileImage
        )

        setSession((currentSession) => {
          if (!currentSession) return currentSession
          const currentProfileImage = currentSession.user.profile_image || null
          const nextRole: AuthSession['user']['role'] = data.data?.role === 'admin' ? 'admin' : 'user'
          if (
            currentProfileImage === nextProfileImage &&
            currentSession.user.email === data.data?.email &&
            currentSession.user.role === nextRole
          ) {
            return currentSession
          }

          const nextSession = {
            ...currentSession,
            user: {
              ...currentSession.user,
              email: String(data.data?.email || currentSession.user.email),
              role: nextRole,
              profile_image: nextProfileImage,
            },
          }
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
          return nextSession
        })
      } catch {
        // Keep the current session/photo if the refresh fails temporarily.
      }
    }

    void refreshCurrentUser()

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void refreshCurrentUser()
      }
    }

    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshCurrentUser()
      }
    }, 15000)

    return () => {
      isCancelled = true
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      window.clearInterval(intervalId)
    }
  }, [session?.token])

  const handleProfileImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !session) return
    if (!file.type.startsWith('image/')) return

    try {
      const resizedImage = await resizeImageFile(file)
      const response = await fetch(`${API_BASE_URL}/api/me/profile-image`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ profile_image: resizedImage }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to save profile photo')
      }

      setProfileImage(data.data?.profile_image || null)
      setSession((currentSession) => {
        if (!currentSession) return currentSession
        const nextSession = {
          ...currentSession,
          user: {
            ...currentSession.user,
            profile_image: data.data?.profile_image || null,
          },
        }
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
        return nextSession
      })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to save profile photo')
    }
  }

  const handleRemoveProfileImage = async () => {
    if (!session) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/me/profile-image`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to remove profile photo')
      }

      setProfileImage(null)
      setSession((currentSession) => {
        if (!currentSession) return currentSession
        const nextSession = {
          ...currentSession,
          user: {
            ...currentSession.user,
            profile_image: null,
          },
        }
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
        return nextSession
      })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to remove profile photo')
    }
  }

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    `sidebar-nav-item ${isActive ? 'active' : ''}`.trim()

  const renderSharedShell = (content: ReactNode, isHome = false, extraMainClass = '') => (
    <main className={`main-content ${isHome ? 'home-main-content' : ''} ${extraMainClass}`.trim()}>
      <div className="main-content-shell">
        <div className="persistent-logo-wrap">
          <img src="/company-logo.png" alt="Company logo" className="persistent-logo" />
        </div>
        {content}
      </div>
    </main>
  )

  const renderUserDashboard = () => {
    if (!session) return null

    return (
      <div className="app-layout">
        <nav className="sidebar-navigation">
          <SidebarProfile
            session={session}
            profileImage={profileImage}
            onProfileImageUpload={handleProfileImageUpload}
            onRemoveProfileImage={handleRemoveProfileImage}
          />
          <NavLink className={getNavClassName} to={getPathFromTab('booking', session.user.role)}>
            Make Booking
          </NavLink>
          <NavLink className={getNavClassName} to={getPathFromTab('schedule', session.user.role)}>
            Schedule
          </NavLink>
          <NavLink className={getNavClassName} to={getPathFromTab('my-approvals', session.user.role)}>
            Authorization To Travel
          </NavLink>
        </nav>
        {renderSharedShell(
          <section className="user-dashboard-panel">
            {activeTab === 'booking' && (
              <Booking
                token={session.token}
                currentUser={session.user}
                onBookingSuccess={triggerScheduleRefresh}
              />
            )}
            {activeTab === 'schedule' && (
              <TimeTable token={session.token} refreshTrigger={scheduleRefresh} />
            )}
            {activeTab === 'my-approvals' && (
              <UserApprovals user={session.user} token={session.token} />
            )}
          </section>,
          false,
          'user-dashboard-main'
        )}
      </div>
    )
  }

  const renderAdminDashboard = () => {
    if (!session) return null

    return (
      <div className="app-layout">
        <nav className="sidebar-navigation">
          <SidebarProfile
            session={session}
            profileImage={profileImage}
            onProfileImageUpload={handleProfileImageUpload}
            onRemoveProfileImage={handleRemoveProfileImage}
          />
          <NavLink className={getNavClassName} to={getPathFromTab('home', session.user.role)}>
            Home
          </NavLink>
          <NavLink className={getNavClassName} to={getPathFromTab('vehicles', session.user.role)}>
            Manage Vehicles
          </NavLink>
          <NavLink className={getNavClassName} to={getPathFromTab('add-company', session.user.role)}>
            Add Company
          </NavLink>
          <NavLink className={getNavClassName} to={getPathFromTab('add-user', session.user.role)}>
            Add User
          </NavLink>
          <NavLink className={getNavClassName} to={getPathFromTab('employee', session.user.role)}>
            Employee
          </NavLink>
          <NavLink className={getNavClassName} to={getPathFromTab('reservation', session.user.role)}>
            Add Entry
          </NavLink>
          <NavLink className={getNavClassName} to={getPathFromTab('schedule', session.user.role)}>
            Schedule
          </NavLink>
        </nav>
        {renderSharedShell(
          <>
            {activeTab === 'home' && <AdminHome token={session.token} />}
            {activeTab === 'vehicles' && <VehicleManagement token={session.token} />}
            {activeTab === 'add-company' && (
              <AdminPanel token={session.token} activeTab="company" showSidebarTabs={false} />
            )}
            {activeTab === 'add-user' && (
              <AdminPanel token={session.token} activeTab="user" showSidebarTabs={false} />
            )}
            {activeTab === 'employee' && <EmployeeManagement token={session.token} />}
            {activeTab === 'reservation' && <ReservationForm token={session.token} />}
            {activeTab === 'schedule' && (
              <TimeTable token={session.token} refreshTrigger={scheduleRefresh} />
            )}
          </>,
          activeTab === 'home'
        )}
      </div>
    )
  }

  if (!isSessionReady) {
    return null
  }

  return (
    <div className="app-container">
      {session ? (
        <>
          <AppHeader
            title={isUserDashboard ? 'User Dashboard' : 'Reservation System'}
            onLogout={handleLogout}
          />
          {isUserDashboard ? renderUserDashboard() : renderAdminDashboard()}
        </>
      ) : (
        <div className="login-container">
          <Login
            onLogin={(authSession) => {
              setSession(authSession)
              localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authSession))
              setProfileImage(authSession.user.profile_image || null)
              navigate(getPathFromTab(getDefaultTab(authSession.user.role), authSession.user.role), {
                replace: true,
              })
            }}
          />
        </div>
      )}
    </div>
  )
}

export default App
