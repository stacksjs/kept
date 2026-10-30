/**
 * Break up `{{` in text that is about to be shown through a template binding.
 *
 * stx's browser runtime scans text nodes (and attribute values) for `{{ expr }}`
 * and evaluates them against the page, including text a binding such as `:text`
 * has just written. A to-do titled `{{ 1 + 1 }}`, or a shared prompt whose body
 * contains `{{count}}`, would be calculated instead of shown, and an attacker's
 * expression would run in the reader's page. A zero-width space between the
 * braces is invisible, keeps the text selectable, and stops the match. Anything
 * that comes from a person or from the API goes through this on its way to the
 * screen; text that is copied or saved always uses the original string.
 */
export function safe(value: unknown): string {
  return String(value ?? '').replace(/\{\{/g, '{​{').replace(/\}\}/g, '}​}')
}
