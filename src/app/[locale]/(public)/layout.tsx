// Public layout — no admin sidebar, no auth required
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
