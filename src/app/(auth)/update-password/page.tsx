'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('No se pudo actualizar la contraseña. El link puede haber expirado.')
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/tickets'), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
        </div>

        <div className="card p-6">
          {!done ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nueva contraseña</label>
                <input type="password" className="input" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
              </div>
              <div>
                <label className="label">Confirmar contraseña</label>
                <input type="password" className="input" placeholder="••••••••"
                  value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-3">
              <div className="text-4xl">✅</div>
              <p className="text-sm font-medium text-gray-700">¡Contraseña actualizada!</p>
              <p className="text-sm text-gray-500">Redirigiendo al portal...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
