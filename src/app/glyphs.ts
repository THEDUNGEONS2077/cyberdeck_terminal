/**
 * src/app/glyphs.ts: the text glyphs used as icons (a subset of
 * quest_log_desktop's src/app/glyphs.ts).
 *
 * Layer: UI. Plain characters in JetBrains Mono instead of icon images, so
 * the page stays a terminal.
 */
export const G = {
  /** The terminal prompt in front of titles. */
  prompt: '>',
  close: '✕',
  /** Fullscreen (F). */
  fullscreen: '⛶',
  /** SYSTEM (S). */
  system: '⊛',
  /** A selected choice / an unselected one. */
  radioOn: '(•)',
  radioOff: '( )',
  /** The block cursor. */
  cursor: '█',
  /** A folder's caret (turns 90° when open). */
  caret: '▸',
  /** A link. */
  link: '›',
  /** A link a webpage can't open (chrome://, javascript:…). */
  blocked: '⊘',
  /** A folder. */
  folder: '▤',
} as const;
