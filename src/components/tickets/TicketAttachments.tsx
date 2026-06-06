'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TicketAttachment } from '@/lib/types'

const BUCKET = 'ticket-attachments'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return '🖼'
  if (type === 'application/pdf') return '📄'
  if (type.includes('spreadsheet') || type.includes('excel') || type.endsWith('.xlsx')) return '📊'
  if (type.includes('word') || type.endsWith('.docx')) return '📝'
  if (type.includes('zip') || type.includes('compressed')) return '🗜'
  return '📎'
}

export default function TicketAttachments({ ticketId }: { ticketId: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [ticketId])

  async function load() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('ticket_attachments')
      .select('*, profiles(full_name)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })
    if (error) setError(`Error al cargar adjuntos: ${error.message}`)
    setAttachments(data ?? [])
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_BYTES) {
      setError('El archivo no puede superar 10 MB')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setUploading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const path = `${ticketId}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file)
    if (uploadError) {
      setError(`Storage: ${uploadError.message}`)
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    const { error: insertError } = await supabase.from('ticket_attachments').insert({
      ticket_id: ticketId,
      uploaded_by: user!.id,
      filename: file.name,
      size_bytes: file.size,
      mime_type: file.type || 'application/octet-stream',
      storage_path: path,
    })

    if (insertError) {
      // Revertir el archivo del storage si el insert falló
      await supabase.storage.from(BUCKET).remove([path])
      setError(`DB: ${insertError.message}`)
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    await load()
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(att: TicketAttachment) {
    if (!confirm(`¿Eliminar "${att.filename}"?`)) return
    const supabase = createClient()
    await supabase.storage.from(BUCKET).remove([att.storage_path])
    await supabase.from('ticket_attachments').delete().eq('id', att.id)
    setAttachments(prev => prev.filter(a => a.id !== att.id))
  }

  async function handleDownload(att: TicketAttachment) {
    const supabase = createClient()
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(att.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-700">
          Archivos adjuntos
          {attachments.length > 0 && (
            <span className="ml-2 text-xs text-gray-400 font-normal">({attachments.length})</span>
          )}
        </h2>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-secondary py-1 text-xs"
        >
          {uploading ? 'Subiendo...' : '+ Adjuntar archivo'}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      {attachments.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-lg py-6 text-center text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-400 transition-colors"
        >
          Hacé click para adjuntar un archivo (máx. 10 MB)
        </button>
      ) : (
        <div className="space-y-1">
          {attachments.map(att => (
            <div
              key={att.id}
              className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50"
            >
              <span className="text-lg flex-shrink-0">{fileIcon(att.mime_type)}</span>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => handleDownload(att)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline truncate block text-left w-full"
                >
                  {att.filename}
                </button>
                <p className="text-xs text-gray-400">
                  {formatBytes(att.size_bytes)}
                  {att.profiles?.full_name && ` · ${att.profiles.full_name}`}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleDownload(att)}
                  title="Descargar"
                  className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(att)}
                  title="Eliminar"
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
