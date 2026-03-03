/** Normalized inbound message from any WhatsApp provider */
export interface InboundMessage {
  /** Sender phone number without prefix (e.g. "254712345678") */
  phone: string
  /** Message body text */
  text: string
  /** Original message ID from the provider (for read receipts etc.) */
  messageId?: string
}

/** Provider-agnostic interface for WhatsApp integrations */
export interface WhatsAppProvider {
  /** Parse an inbound webhook request into a normalized message. Returns null if not a valid message. */
  parseInbound(request: Request): Promise<InboundMessage | null>
  /** Send a text reply to a phone number */
  sendReply(to: string, message: string): Promise<void>
  /** Build the HTTP response for the webhook (e.g. TwiML for Twilio, 200 OK for Cloud API) */
  buildResponse(message: string): Response
  /** Handle webhook verification (GET requests). */
  handleVerification?(request: Request): Response
  /** Mark a message as read (blue ticks). Optional - not all providers support this. */
  markAsRead?(messageId: string): Promise<void>
  /** Send a processing indicator message. Optional. */
  sendProcessingIndicator?(to: string): Promise<void>
}
