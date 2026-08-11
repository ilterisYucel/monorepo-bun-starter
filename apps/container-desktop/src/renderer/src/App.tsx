import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { queryClient } from '@gd-monorepo/container-web/lib/query-client'
import { routes } from '@gd-monorepo/container-web/app/routes'
import { TransportProvider } from '@gd-monorepo/container-web/contexts/TransportContext'
import { RealtimeProvider } from '@gd-monorepo/container-web/contexts/RealtimeContext'
import { ErrorBoundary } from '@gd-monorepo/container-web/components/ErrorBoundary'

import { TranslationWrapper } from '@gd-monorepo/container-web/app/providers'

const router = createHashRouter(routes)

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TranslationWrapper>
          <TransportProvider>
            <RealtimeProvider>
              <RouterProvider router={router} />
            </RealtimeProvider>
          </TransportProvider>
        </TranslationWrapper>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
