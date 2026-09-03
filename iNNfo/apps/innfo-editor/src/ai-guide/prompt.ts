/** Prepends the "innfo:" trigger that activates the nn-router. */
export function innfoPrompt(content: string): string {
  return `innfo: ${content}`
}
