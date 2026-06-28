import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { clearAuth, refreshToken } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me().then((r) => r.data.data.user),
    staleTime: 1000 * 60 * 5,
  })

  const handleLogout = async () => {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {})
    }
    clearAuth()
    navigate('/login')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle>SOM Platform</CardTitle>
          <CardDescription>Sesión activa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Nombre</p>
            <p className="font-medium">{data?.nombre}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{data?.email}</p>
          </div>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}