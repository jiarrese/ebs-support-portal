/**
 * Agente: Gmail → Tickets EBS Support Portal
 *
 * Tools integradas:
 *   1. escalar_urgente   → Claude detecta urgencia y asigna prioridad automáticamente
 *   2. buscar_duplicado  → verifica si ya existe un ticket abierto similar antes de crear
 *   3. responder_email   → responde al cliente con el número de ticket creado
 *
 * Uso manual: node scripts/gmail-to-tickets.mjs
 */

import { readFileSync, appendFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir  = dirname(fileURLToPath(import.meta.url))
const root   = resolve(__dir, '..')
const logFile = resolve(root, 'scripts', 'agent.log')

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  appendFileSync(logFile, line + '\n')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'))
}

function loadEnv() {
  return Object.fromEntries(
    readFileSync(resolve(root, '.env.local'), 'utf8')
      .split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
  )
}

// ─── Gmail API ────────────────────────────────────────────────────────────────

async function getAccessToken(creds) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: creds.refresh_token,
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('No se pudo renovar access_token: ' + JSON.stringify(data))
  return data.access_token
}

async function gmailGet(token, path) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

function decodeBase64(str) {
  return Buffer.from(str.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8')
}

function extractBody(payload) {
  if (payload.body?.data) return decodeBase64(payload.body.data)
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) return decodeBase64(part.body.data)
    }
    for (const part of payload.parts) {
      const nested = extractBody(part)
      if (nested) return nested
    }
  }
  return ''
}

function header(payload, name) {
  return payload.headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

// ─── Tool 3: Responder email ──────────────────────────────────────────────────

async function responderEmail(gmailToken, msg, ticketNumber) {
  const from    = header(msg.payload, 'From')
  const subject = header(msg.payload, 'Subject')
  const msgId   = header(msg.payload, 'Message-ID')

  // Extrae solo el email del campo From (puede venir como "Nombre <email>")
  const toEmail = from.match(/<(.+)>/)?.[ 1] ?? from

  const replyBody = [
    `Hola,`,
    ``,
    `Recibimos tu consulta y creamos el ticket #${ticketNumber} en nuestro sistema de soporte EBS.`,
    ``,
    `Vamos a analizar el problema y te responderemos a la brevedad.`,
    ``,
    `Saludos,`,
    `Jose Ignacio Arrese`,
    `TT Consulting`,
  ].join('\n')

  // Construye el email MIME
  const mimeLines = [
    `To: ${toEmail}`,
    `Subject: Re: ${subject.startsWith('Re:') ? subject.slice(4).trim() : subject}`,
    `In-Reply-To: ${msgId}`,
    `References: ${msgId}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    replyBody,
  ]

  const raw = Buffer.from(mimeLines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gmailToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw, threadId: msg.threadId }),
  })

  const data = await res.json()
  if (data.id) {
    log(`    📬  Reply enviado a ${toEmail}`)
  } else {
    log(`    ⚠️  No se pudo enviar reply: ${JSON.stringify(data)}`)
  }
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

async function supabaseGet(url, key, table, query) {
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  })
  return res.json()
}

async function supabaseInsert(url, key, table, data) {
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  })
  return res.json()
}

// ─── Tool 2: Buscar duplicado ─────────────────────────────────────────────────

async function buscarDuplicado(supabaseUrl, supabaseKey, companyId, title) {
  if (!companyId) return null

  // Busca tickets abiertos de la misma empresa creados en los últimos 7 días
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const data  = await supabaseGet(
    supabaseUrl, supabaseKey, 'tickets',
    `company_id=eq.${companyId}&status=not.in.(closed,resolved)&created_at=gte.${since}&select=id,number,title,status`
  )

  if (!Array.isArray(data) || data.length === 0) return null

  // Verifica si algún ticket tiene palabras clave similares al título nuevo
  const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 4)
  const duplicate  = data.find(t =>
    titleWords.some(word => t.title.toLowerCase().includes(word))
  )
  return duplicate ?? null
}

// ─── Tool 1 + Análisis: Claude con prioridad automática ───────────────────────

async function analyzeEmailWithClaude(apiKey, subject, from, body, companies) {
  const cleanBody = body
    .replace(/^(>.*|On .* wrote:|_{3,}|-{3,}).*$/gm, '')
    .replace(/\r/g, '').trim().slice(0, 1500)

  const companyList = companies.map(c => `- ${c.name} (keywords: ${c.keywords.join(', ')})`).join('\n')

  const urgentKeywords = 'caído, caida, no funciona, urgente, urgente!, crítico, bloqueado, producción parada, no podemos operar'

  const prompt = `Analizá este email de soporte Oracle EBS. Respondé SOLO con JSON válido, sin texto extra.

Email:
- De: ${from}
- Asunto: ${subject}
- Cuerpo: ${cleanBody}

Empresas posibles:
${companyList}

Reglas de prioridad (tool escalar_urgente):
- "critical": menciona producción caída, sistema bloqueado, no pueden operar (palabras: ${urgentKeywords})
- "high": problema grave que afecta operaciones pero hay workaround
- "medium": consulta o error no crítico (default)
- "low": consulta informativa, duda, pregunta general

Respondé con este JSON:
{
  "company": "nombre exacto de la empresa o null",
  "title": "título conciso del problema (max 80 chars, no copies el asunto si es genérico)",
  "description": "descripción clara del problema en 2-4 oraciones",
  "priority": "critical | high | medium | low",
  "priority_reason": "por qué asignaste esa prioridad (una línea)"
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()
  if (!data.content?.[0]?.text) throw new Error('Claude no respondió: ' + JSON.stringify(data))

  try {
    return JSON.parse(data.content[0].text)
  } catch {
    return { company: null, title: subject.slice(0, 80), description: cleanBody.slice(0, 300), priority: 'medium', priority_reason: 'fallback' }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('🤖 Agente Gmail → Tickets iniciado')

  const creds  = loadJson('gmail_token.json')
  const config = loadJson('scripts/agent-config.json')
  const env    = loadEnv()

  const SUPABASE_URL  = env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY

  const gmailToken = await getAccessToken(creds)

  // Busca emails en el label o por remitentes
  const hours = config.gmail.check_last_hours
  const since = Math.floor((Date.now() - hours * 3600 * 1000) / 1000)
  let q
  if (config.gmail.label) {
    q = encodeURIComponent(`label:${config.gmail.label} after:${since}`)
    log(`📁  Leyendo label: ${config.gmail.label}`)
  } else {
    const fromQuery = config.gmail.senders.map(s => `from:${s}`).join(' OR ')
    q = encodeURIComponent(`(${fromQuery}) after:${since}`)
  }

  const listData = await gmailGet(gmailToken, `messages?q=${q}&maxResults=50`)
  const messages = listData.messages ?? []
  log(`📧  ${messages.length} emails encontrados`)
  if (messages.length === 0) { log('✅  Nada nuevo.'); return }

  // Agrupa por thread
  const threads = {}
  for (const msg of messages) {
    const detail = await gmailGet(gmailToken, `messages/${msg.id}?format=metadata&metadataHeaders=Subject,From,Date`)
    const tid = detail.threadId
    if (!threads[tid]) threads[tid] = { id: tid, messages: [] }
    threads[tid].messages.push(msg.id)
  }

  log(`🧵  ${Object.keys(threads).length} threads únicos`)

  // Verifica cuáles threads ya tienen ticket
  const threadIds = Object.keys(threads)
  const existing  = await supabaseGet(
    SUPABASE_URL, SUPABASE_KEY, 'tickets',
    `source_ref=in.(${threadIds.map(id => `"${id}"`).join(',')})&select=source_ref`
  )
  const existingRefs = new Set((Array.isArray(existing) ? existing : []).map(t => t.source_ref))
  const newThreads   = threadIds.filter(id => !existingRefs.has(id))
  log(`🆕  ${newThreads.length} threads nuevos para procesar`)

  const profiles    = await supabaseGet(SUPABASE_URL, SUPABASE_KEY, 'profiles', 'role=eq.consultant&select=id&limit=1')
  const consultantId = Array.isArray(profiles) && profiles[0]?.id

  let created = 0

  for (const threadId of newThreads) {
    const firstMsgId = threads[threadId].messages[threads[threadId].messages.length - 1]
    const msg        = await gmailGet(gmailToken, `messages/${firstMsgId}?format=full`)

    const subject = header(msg.payload, 'Subject')
    const from    = header(msg.payload, 'From')
    const body    = extractBody(msg.payload)

    log(`📨  Thread: ${threadId} | De: ${from} | Asunto: ${subject}`)

    // ── Claude analiza (incluye escalar_urgente) ──────────────────────────────
    const analysis = await analyzeEmailWithClaude(ANTHROPIC_KEY, subject, from, body, config.companies)
    const company  = config.companies.find(c => c.name === analysis.company) ?? null
    log(`    🧠  Empresa: ${analysis.company ?? 'desconocida'} | Prioridad: ${analysis.priority} (${analysis.priority_reason})`)

    // Busca company_id en Supabase
    let companyId = null
    if (company) {
      const companyData = await supabaseGet(
        SUPABASE_URL, SUPABASE_KEY, 'companies',
        `name=eq.${encodeURIComponent(company.name)}&select=id&limit=1`
      )
      companyId = Array.isArray(companyData) && companyData[0]?.id
    }

    // ── Tool 2: Buscar duplicado ──────────────────────────────────────────────
    const duplicado = await buscarDuplicado(SUPABASE_URL, SUPABASE_KEY, companyId, analysis.title)
    if (duplicado) {
      log(`    🔁  Duplicado → Ticket #${duplicado.number} ya existe: "${duplicado.title}" (${duplicado.status}) — saltando`)
      continue
    }

    // Crea el ticket
    const ticketData = {
      title:       analysis.title,
      description: analysis.description,
      priority:    analysis.priority,
      status:      config.supabase.default_status,
      source_ref:  threadId,
      ...(companyId    && { company_id:  companyId }),
      ...(consultantId && { reported_by: consultantId }),
    }

    const result = await supabaseInsert(SUPABASE_URL, SUPABASE_KEY, 'tickets', ticketData)

    if (Array.isArray(result) && result[0]?.id) {
      const ticket = result[0]
      log(`    ✅  Ticket #${ticket.number} creado: "${ticket.title}" [${ticket.priority}]`)
      created++

      // ── Tool 3: Responder email ───────────────────────────────────────────
      await responderEmail(gmailToken, msg, ticket.number)
    } else {
      log(`    ❌  Error al crear ticket: ${JSON.stringify(result)}`)
    }
  }

  log(`✅  Listo. ${created} ticket(s) creado(s).\n`)
}

main().catch(err => { log(`❌ Error: ${err.message}`); process.exit(1) })
