/** `{{name}}` placeholders in a prompt, in order of first appearance. */
export function promptVariables(body: string): string[] {
  const seen = new Set<string>()
  for (const match of body.matchAll(/\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g)) seen.add(match[1]!)
  return [...seen]
}

/** Fill a prompt's placeholders. A placeholder with no value is left as written. */
export function fillPrompt(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g, (whole, name: string) => Object.hasOwn(values, name) && values[name] !== '' ? values[name]! : whole)
}
