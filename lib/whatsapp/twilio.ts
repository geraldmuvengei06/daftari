import type { WhatsAppProvider, InboundMessage } from './types'

function escapeXml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export const twilioProvider: WhatsAppProvider = {
  async parseInbound(request) {
    const formData = await request.formData()
    const body = Object.fromEntries(formData.entries())
    const text = body['Body'] as string
    const phone = body['From']?.toString().replace('whatsapp:', '')

    if (!text || !phone) return null
    return { phone, text, messageId: body['MessageSid'] as string | undefined }
  },

  async sendReply() {
    // Twilio handles replies via TwiML response — no outbound API call needed
  },

  buildResponse(message) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`
    return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } })
  },
}
