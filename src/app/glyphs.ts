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
  /** Fullscreen (F). In JetBrains Mono (⛶ isn't, and showed blank). */
  fullscreen: '⊞',
  /** SYSTEM (S). */
  system: '⊛',
  /** A selected choice / an unselected one. */
  radioOn: '(•)',
  radioOff: '( )',
  /** A folder's caret (turns 90° when open). */
  caret: '▸',
  /** A link. */
  link: '›',
  /** A link a webpage can't open (chrome://, javascript:…). */
  blocked: '⊘',
  /** A folder. */
  folder: '▤',
  /** Opens somewhere else (a new tab). */
  external: '↗',
  /** The ⋯ menu's items: move earlier / later, move to, a new area, back to Chrome's place, hide. */
  earlier: '←',
  later: '→',
  moveTo: '⇥',
  newArea: '+',
  restore: '↺',
  hide: '⊘',
} as const;
