'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Los links de invitación/recuperación de contraseña de Supabase traen la
    // sesión en el fragmento (#) de la URL — solo el cliente puede leerlo, así
    // que este chequeo no puede ser un redirect del lado del servidor.
    const isRecovery = window.location.hash.includes('type=invite') || window.location.hash.includes('type=recovery')
    const supabase = createClient()
    supabase.auth.getSession().then(() => {
      router.replace(isRecovery ? '/update-password' : '/tickets')
    })
  }, [router])

  return null
}
