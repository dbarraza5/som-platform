import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/button'

export default function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { user, refreshToken, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {})
    }
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/dashboard" className="text-lg font-semibold tracking-tight">
            SOM Platform
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:block">{user?.nombre}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
