import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ScrapingProgressBar } from './ScrapingProgressBar'
import { useAuthStore } from '@/store/auth.store'

export function AppLayout() {
  const activeJobId = useAuthStore((s) => s.activeJobId)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />

        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ paddingBottom: activeJobId ? '80px' : undefined }}
        >
          <Outlet />
        </main>
      </div>

      {/* Scraping progress bar fixed at bottom */}
      <ScrapingProgressBar />
    </div>
  )
}
