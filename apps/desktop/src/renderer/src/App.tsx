import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { queryClient } from '@gd-monorepo/web/lib/query-client'
import { routes } from '@gd-monorepo/web/app/routes'

const router = createHashRouter(routes)

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
