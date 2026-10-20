export const TEMPLATE_MAX_LENGTH = 1000;

const VARIABLE = /\{\{(\w+)\}\}/g;

/** Names used as {{name}} that are not in `allowed`, each once, in order of appearance. */
export function unknownVariables(
  template: string,
  allowed: readonly string[],
): string[] {
  const unknown: string[] = [];
  for (const match of template.matchAll(VARIABLE)) {
    const name = match[1];
    if (!allowed.includes(name) && !unknown.includes(name)) {
      unknown.push(name);
    }
  }
  return unknown;
}

/** Inserts "{{name}}" at the selection; returns the new text and caret position. */
export function insertVariable(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  name: string,
): { text: string; caret: number } {
  const token = `{{${name}}}`;
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  return {
    text: text.slice(0, start) + token + text.slice(end),
    caret: start + token.length,
  };
}

/** Keys of `admin.chat.types` for each template type. */
export const TEMPLATE_TITLE_KEYS: Record<string, string> = {
  "campaign.opened": "campaignOpened",
  "campaign.reopened": "campaignReopened",
  "listing.published": "listingPublished",
  "chat.digest": "digest",
};
