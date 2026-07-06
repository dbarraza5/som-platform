import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import NewProjectPage from '@/pages/projects/NewProjectPage'
import EditProjectPage from '@/pages/projects/EditProjectPage'
import ProjectDetailPage from '@/pages/projects/ProjectDetailPage'
import NewDatasetPage from '@/pages/projects/datasets/NewDatasetPage'
import EditDatasetPage from '@/pages/projects/datasets/EditDatasetPage'
import DatasetDetailPage from '@/pages/projects/datasets/DatasetDetailPage'
import TrainingJobDetailPage from '@/pages/projects/datasets/TrainingJobDetailPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />
}

function RequireGuest({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return !accessToken ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <RequireGuest><LoginPage /></RequireGuest>,
  },
  {
    path: '/register',
    element: <RequireGuest><RegisterPage /></RequireGuest>,
  },
  {
    path: '/dashboard',
    element: <RequireAuth><DashboardPage /></RequireAuth>,
  },
  {
    path: '/projects/new',
    element: <RequireAuth><NewProjectPage /></RequireAuth>,
  },
  {
    path: '/projects/:id',
    element: <RequireAuth><ProjectDetailPage /></RequireAuth>,
  },
  {
    path: '/projects/:id/edit',
    element: <RequireAuth><EditProjectPage /></RequireAuth>,
  },
  {
    path: '/projects/:id/datasets/new',
    element: <RequireAuth><NewDatasetPage /></RequireAuth>,
  },
  {
    path: '/projects/:id/datasets/:datasetId',
    element: <RequireAuth><DatasetDetailPage /></RequireAuth>,
  },
  {
    path: '/projects/:id/datasets/:datasetId/edit',
    element: <RequireAuth><EditDatasetPage /></RequireAuth>,
  },
  {
    path: '/projects/:id/datasets/:datasetId/trainings/:trainingId',
    element: <RequireAuth><TrainingJobDetailPage /></RequireAuth>,
  },
])
