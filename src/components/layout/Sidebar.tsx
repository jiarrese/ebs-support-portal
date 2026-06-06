'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Ticket, Clock, Receipt,
  Building2, LogOut, ServerCog, FolderKanban
} from 'lucide-react'

const navItems = [
  { href: '/tickets',   label: 'Tickets',     icon: Ticket },
  { href: '/time',      label: 'Horas',       icon: Clock },
  { href: '/billing',   label: 'Facturación', icon: Receipt },
  { href: '/projects',  label: 'Proyectos',   icon: FolderKanban },
  { href: '/companies', label: 'Empresas',    icon: Building2 },
]

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* ── Sidebar desktop ─────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 min-h-screen bg-white border-r border-gray-200 flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <ServerCog className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">EBS Support</p>
              <p className="text-xs text-gray-400 leading-tight">Portal</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-4 border-t border-gray-200">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>
      </aside>

      {/* ── Bottom nav mobile ────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex md:hidden z-50 safe-area-bottom">
        {navItems.slice(0, 4).map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
                active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
        <button onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Salir</span>
        </button>
      </nav>
    </>
  )
}
