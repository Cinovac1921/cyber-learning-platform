import { RouterProvider } from 'react-router'
import { AuthProvider } from '../features/auth/AuthProvider'
import { ConfirmProvider } from './ConfirmProvider'
import { router } from './router'

export default function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
    </AuthProvider>
  )
}