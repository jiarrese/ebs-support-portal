'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      router.push('/tickets')
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    if (error) {
      setError('No se pudo enviar el email. Verificá la dirección.')
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EBS Support Portal</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' ? 'Ingresá con tu cuenta' : 'Recuperar contraseña'}
          </p>
        </div>

        <div className="card p-6">
          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="tu@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <div>
                <label className="label">Contraseña</label>
                <input type="password" className="input" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
              <button type="button" onClick={() => { setMode('reset'); setError('') }}
                className="text-sm text-indigo-600 hover:text-indigo-800 w-full text-center mt-1">
                Olvidé mi contraseña
              </button>
            </form>
          )}

          {/* RESET */}
          {mode === 'reset' && !resetSent && (
            <form onSubmit={handleReset} className="space-y-4">
              <p className="text-sm text-gray-600">
                Ingresá tu email y te enviamos un link para restablecer la contraseña.
              </p>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="tu@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link'}
              </button>
              <button type="button" onClick={() => { setMode('login'); setError('') }}
                className="text-sm text-gray-500 hover:text-gray-700 w-full text-center">
                Volver al login
              </button>
            </form>
          )}

          {/* RESET SENT */}
          {mode === 'reset' && resetSent && (
            <div className="text-center space-y-4">
              <div className="text-4xl">📬</div>
              <p className="text-sm text-gray-700 font-medium">¡Revisá tu email!</p>
              <p className="text-sm text-gray-500">
                Te enviamos un link a <strong>{email}</strong> para restablecer la contraseña.
              </p>
              <button onClick={() => { setMode('login'); setResetSent(false) }}
                className="text-sm text-indigo-600 hover:text-indigo-800">
                Volver al login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
