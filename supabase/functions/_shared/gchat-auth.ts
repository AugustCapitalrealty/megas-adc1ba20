// Google Chat API - Service Account Authentication (RS256 JWT)

let cachedToken: { token: string; expiresAt: number } | null = null

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64urlStr(str: string): string {
  return base64url(new TextEncoder().encode(str))
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .replace(/\s/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  // Return cached token if still valid (5min buffer)
  if (cachedToken && cachedToken.expiresAt > now + 300) {
    return cachedToken.token
  }

  // Handle multiple storage formats: raw JSON, double-escaped, or base64
  let parsed: string = serviceAccountJson.trim()
  
  // If it starts with a quote, it might be double-JSON-encoded
  if (parsed.startsWith('"') || parsed.startsWith("'")) {
    try { parsed = JSON.parse(parsed) } catch { /* use as-is */ }
  }
  
  const sa = JSON.parse(parsed)
  const { client_email, private_key } = sa

  if (!client_email || !private_key) {
    throw new Error('Service account JSON missing client_email or private_key')
  }

  // Build JWT
  const header = base64urlStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64urlStr(JSON.stringify({
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/chat.bot https://www.googleapis.com/auth/chat.spaces.create',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))

  const signingInput = `${header}.${payload}`
  const signingInputBytes = new TextEncoder().encode(signingInput)

  // Import private key
  const keyBuffer = pemToArrayBuffer(private_key)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Sign
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signingInputBytes
  )

  const jwt = `${signingInput}.${base64url(new Uint8Array(signature))}`

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    const errText = await tokenRes.text()
    throw new Error(`Token exchange failed [${tokenRes.status}]: ${errText}`)
  }

  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token

  // Cache
  cachedToken = { token: accessToken, expiresAt: now + (tokenData.expires_in || 3600) }

  return accessToken
}

/**
 * Send a message to Google Chat via authenticated API.
 * Falls back to webhook if service account not configured.
 */
export async function sendGChatMessageAuth(
  message: Record<string, unknown>
): Promise<{ method: 'api' | 'webhook'; response: Response }> {
  const saJson = Deno.env.get('GCHAT_SERVICE_ACCOUNT_JSON')
  const spaceName = Deno.env.get('GCHAT_SPACE_NAME')
  const webhookUrl = Deno.env.get('GCHAT_WEBHOOK_URL')

  // Try authenticated API first
  if (saJson && spaceName) {
    try {
      const token = await getAccessToken(saJson)
      const url = `https://chat.googleapis.com/v1/${spaceName}/messages`

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error(`GChat API failed [${res.status}]: ${errText}`)
        // Fall through to webhook
        if (webhookUrl) {
          console.log('Falling back to webhook...')
        } else {
          throw new Error(`GChat API failed [${res.status}]: ${errText}`)
        }
      } else {
        return { method: 'api', response: res }
      }
    } catch (e) {
      console.error('GChat API auth error:', e)
      if (!webhookUrl) throw e
      console.log('Falling back to webhook...')
    }
  }

  // Fallback: webhook
  if (!webhookUrl) {
    throw new Error('Neither GCHAT_SERVICE_ACCOUNT_JSON+GCHAT_SPACE_NAME nor GCHAT_WEBHOOK_URL configured')
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`GChat webhook failed [${res.status}]: ${errText}`)
  }

  return { method: 'webhook', response: res }
}

/**
 * Check if authenticated API is configured
 */
export function isApiConfigured(): boolean {
  return !!(Deno.env.get('GCHAT_SERVICE_ACCOUNT_JSON') && Deno.env.get('GCHAT_SPACE_NAME'))
}

/**
 * Send a DM to a specific user by email via Google Chat API.
 * Uses spaces.setup to find/create a DM space, then sends the message.
 */
export async function sendGChatDM(
  email: string,
  message: Record<string, unknown>
): Promise<{ spaceName: string; messageId: string }> {
  const saJson = Deno.env.get('GCHAT_SERVICE_ACCOUNT_JSON')
  if (!saJson) {
    throw new Error('GCHAT_SERVICE_ACCOUNT_JSON not configured')
  }

  const token = await getAccessToken(saJson)

  // Step 1: Setup (find or create) the DM space with the user
  const setupRes = await fetch('https://chat.googleapis.com/v1/spaces:setup', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      space: { spaceType: 'DIRECT_MESSAGE' },
      memberships: [
        { member: { name: `users/${email}`, type: 'HUMAN' } }
      ],
    }),
  })

  if (!setupRes.ok) {
    const errText = await setupRes.text()
    throw new Error(`spaces:setup failed for ${email} [${setupRes.status}]: ${errText}`)
  }

  const spaceData = await setupRes.json()
  const spaceName = spaceData.name
  console.log(`DM space for ${email}: ${spaceName}`)

  // Step 2: Send the message in this DM space
  const msgRes = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  if (!msgRes.ok) {
    const errText = await msgRes.text()
    throw new Error(`DM send failed for ${email} [${msgRes.status}]: ${errText}`)
  }

  const msgData = await msgRes.json()
  return { spaceName, messageId: msgData.name || '' }
}
