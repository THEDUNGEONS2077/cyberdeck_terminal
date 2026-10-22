/**
 * src/app/deck/context.ts: what every piece of the deck needs to know:
 * whether the layout is being edited, the bar's items, which are placed
 * elsewhere, and how to start a drag or open an item's menu.
 *
 * Layer: UI (a React context, provided by app/Bookmarks.tsx Deck).
 */
import { createContext, type PointerEvent, useContext } from 'react';

import type { TreeItem } from '@/lib/arrange';

import type { DragPayload } from '../arrangeDrag';

/** Which list an item is shown in: NAV (`main`), an area's id, or inside a folder (`folder`). */
export type SectionId = string;

/** The deck's shared state and actions. */
export interface DeckApi {
  editing: boolean;
  /** Every item of the bar, by key. */
  all: Map<string, TreeItem>;
  /** Keys shown elsewhere or hidden: folders leave these out. */
  excluded: ReadonlySet<string>;
  /** NAV's keys in order (hidden included), for moves into NAV. */
  mainKeys: readonly string[];
  /** Starts a drag (edit mode). */
  startDrag(e: PointerEvent, payload: DragPayload): void;
  /** Opens the ⋯ menu for an item shown in `section`, under `anchor`. */
  openMenu(key: string, section: SectionId, anchor: HTMLElement): void;
}

const DeckContext = createContext<DeckApi | null>(null);

/** Provides the deck's state to its pieces. */
export const DeckProvider = DeckContext.Provider;

/** The deck's state (inside the deck only). */
export function useDeck(): DeckApi {
  const api = useContext(DeckContext);
  if (!api) throw new Error('useDeck outside the deck');
  return api;
}
