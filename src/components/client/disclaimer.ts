/** i18n key the client view shows as its disclaimer (API value, or the contract key when unknown). */
export const DISCLAIMER_FALLBACK = 'client.disclaimer.percentNotPayment'

export function disclaimerKeyFor(apiKey: string | null | undefined, exists: (key: string) => boolean): string {
  return apiKey && exists(apiKey) ? apiKey : DISCLAIMER_FALLBACK
}
