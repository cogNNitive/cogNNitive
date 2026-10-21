export interface VersionedEnvelope {
  version: string
}

export const ENVELOPE_MAJOR = 1

export function envelopeVersion(contract: string, major: number = ENVELOPE_MAJOR): string {
  return `${contract}@${major}`
}

export function envelope<T extends object>(
  contract: string,
  payload: T,
): T & VersionedEnvelope {
  return { version: envelopeVersion(contract), ...payload }
}

export function envelopeList<T>(
  contract: string,
  key: string,
  items: T[],
): VersionedEnvelope & Record<string, unknown> {
  return { version: envelopeVersion(contract), [key]: items }
}