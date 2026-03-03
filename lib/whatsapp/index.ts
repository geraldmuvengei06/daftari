import features from '@/features.json'
import type { WhatsAppProvider } from './types'
import { twilioProvider } from './twilio'
import { cloudProvider } from './cloud'

export type { WhatsAppProvider, InboundMessage } from './types'

type WaProvider = 'twilio' | 'cloud'

export function getWhatsAppProvider(): WhatsAppProvider {
  // ENV override takes priority, then feature flag
  const env = process.env.WHATSAPP_PROVIDER?.toLowerCase()
  if (env === 'twilio' || env === 'cloud') return env === 'cloud' ? cloudProvider : twilioProvider

  const flag = (features as Record<string, unknown>).whatsappProvider as WaProvider | undefined
  return flag === 'cloud' ? cloudProvider : twilioProvider
}
