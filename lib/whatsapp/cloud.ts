import { NextRequest, NextResponse } from 'next/server'
import type { WhatsAppProvider, InboundMessage } from './types'

const GRAPH_API = 'https://graph.facebook.com/v21.0'

function getCredentials() {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID
  return { token, phoneId }
}

export const cloudProvider: WhatsAppProvider = {
  async parseInbound(request) {
    const body = await request.json()

    // Meta sends various webhook events; we only care about incoming messages
    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value

    // Only process actual user messages (not status updates, etc.)
    if (!value?.messages?.length) return null

    const msg = value.messages[0]
    // We only handle text messages for now
    if (msg.type !== 'text') return null

    const phone = msg.from // e.g. "254712345678" (no + prefix)
    const text = msg.text?.body

    if (!phone || !text) return null
    return { phone, text, messageId: msg.id }
  },

  async markAsRead(messageId) {
    const { token, phoneId } = getCredentials()
    if (!token || !phoneId) return

    try {
      await fetch(`${GRAPH_API}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      })
    } catch (err) {
      console.error('[Cloud API] Mark as read failed:', err)
    }
  },

  async sendProcessingIndicator(to) {
    const { token, phoneId } = getCredentials()
    if (!token || !phoneId) return

    try {
      await fetch(`${GRAPH_API}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'reaction',
          reaction: {
            message_id: '', // Will be set by caller if needed
            emoji: '⏳',
          },
        }),
      })
    } catch {
      // Reaction might fail, fall back to text
      await this.sendReply(to, '⏳ Processing...')
    }
  },

  async sendReply(to, message) {
    const { token, phoneId } = getCredentials()

    if (!token || !phoneId) {
      console.error('[Cloud API] Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_ID')
      return
    }

    const res = await fetch(`${GRAPH_API}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[Cloud API] Send failed:', res.status, err)
    }
  },

  buildResponse() {
    // Cloud API expects a simple 200 OK — the actual reply is sent via sendReply
    return NextResponse.json({ status: 'ok' })
  },

  handleVerification(request) {
    const url = new URL(request.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('[Cloud API] Webhook verified')
      return new NextResponse(challenge, { status: 200 })
    }

    return new NextResponse('Forbidden', { status: 403 })
  },
}
