/**
 * Correr UNA SOLA VEZ para obtener el refresh token de Gmail.
 * Requiere: GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET en .env.local
 *
 * Uso:
 *   node scripts/gmail-auth.mjs
 */

import { createServer } from 'http'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

// Lee .env.local
const envPath = resolve(__dir, '..', '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
)

const CLIENT_ID     = env.GMAIL_CLIENT_ID
const CLIENT_SECRET = env.GMAIL_CLIENT_SECRET
const REDIRECT_URI  = 'http://localhost:3333/callback'
const SCOPES        = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
]

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌  Falta GMAIL_CLIENT_ID o GMAIL_CLIENT_SECRET en .env.local')
  process.exit(1)
}

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
  `&access_type=offline` +
  `&prompt=consent`

console.log('\n🔗  Abrí esta URL en tu navegador:\n')
console.log(authUrl)
console.log('\n⏳  Esperando autorización...\n')

const server = createServer(async (req, res) => {
  const url  = new URL(req.url, 'http://localhost:3333')
  const code = url.searchParams.get('code')
  if (!code) { res.end('Sin código'); return }

  // Intercambia el code por tokens
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  })

  const tokens = await resp.json()

  if (!tokens.refresh_token) {
    console.error('❌  No se obtuvo refresh_token. Revisá que hayas autorizado con la cuenta correcta.')
    res.end('Error: no refresh_token')
    server.close()
    return
  }

  // Guarda el token
  const tokenPath = resolve(__dir, '..', 'gmail_token.json')
  writeFileSync(tokenPath, JSON.stringify({
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: tokens.refresh_token,
  }, null, 2))

  console.log('✅  Token guardado en gmail_token.json')
  console.log('    Podés cerrar el navegador y este script.\n')
  res.end('<h2>✅ Autenticado. Podés cerrar esta ventana.</h2>')
  server.close()
  process.exit(0)
})

server.listen(3333)
