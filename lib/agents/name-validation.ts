/**
 * Validation for agent display names.
 *
 * Shared by the user-facing rename endpoint (PATCH /api/agents/all) and the
 * agent self-service rename endpoint (PATCH /api/agent/profile) so the rules
 * stay consistent everywhere a name can be written.
 */

/** Hard cap on stored agent name length. */
export const AGENT_NAME_MAX_LENGTH = 100;

/**
 * Matches HTML/XML-ish tags such as `<script>`, `<b>`, `</div>` or `<!-- -->`.
 * Intentionally requires a letter or `!` right after `<` so innocent text like
 * "a < b" or "<3" is left alone.
 */
const HTML_TAG_PATTERN = /<\/?[a-z!][^>]*>/i;

export type NameValidation = { ok: true; value: string } | { ok: false; error: string };

/**
 * Validate a candidate agent name coming off the wire.
 * Returns the trimmed name when valid, or an error message when not.
 */
export function validateAgentName(name: unknown): NameValidation {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return { ok: false, error: 'Name is required (min 1 character)' };
  }

  const trimmed = name.trim();

  if (trimmed.length > AGENT_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Name must be ${AGENT_NAME_MAX_LENGTH} characters or fewer`,
    };
  }

  if (HTML_TAG_PATTERN.test(trimmed)) {
    return { ok: false, error: 'Names cannot contain HTML tags' };
  }

  return { ok: true, value: trimmed };
}
