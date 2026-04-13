'use client'

import { Sidebar } from './Sidebar'
import { CommandPalette } from '@/components/ui/CommandPalette'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#fafaf7]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>
      <CommandPalette />
    </div>
  )
}
