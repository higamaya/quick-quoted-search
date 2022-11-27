/**
 * Script id.
 */
export const ScriptId = {
  ACTION: "ACTION",
  BACKGROUND: "BACKGROUND",
  CONTENT: "-",
  OPTIONS: "OPTIONS",
};

/**
 * Command IDs for keyboard shortcuts and context menus.
 */
export const CommandType = {
  DO_QUOTED_SEARCH: "do_quoted_search",
  PUT_QUOTES: "put_quotes",
};

/**
 * Message types.
 */
export const MessageType = {
  // ---------------------------------------------------------------------------
  // Content scripts --> Background service worker
  // ---------------------------------------------------------------------------
  HELLO: "hello",
  NOTIFY_SELECTION_UPDATED: "notify_selection_updated",
  DO_QUOTED_SEARCH: "do_quoted_search",
  OPEN_OPTIONS_PAGE: "open_options_page",

  // ---------------------------------------------------------------------------
  // Content scripts <-- Background service worker
  // ---------------------------------------------------------------------------
  WELCOME: "welcome",
  PUT_QUOTES: "put_quotes",

  // ---------------------------------------------------------------------------
  // Action scripts --> Background service worker
  // ---------------------------------------------------------------------------
  GET_SELECTION: "get_selection",

  // ---------------------------------------------------------------------------
  // Action scripts <-- Background service worker
  // ---------------------------------------------------------------------------
  NOTIFY_SELECTION: "notify_selection",
};

/**
 * Various double quotes.
 *
 * If you surround your search phrase with characters in this string, Google
 * Search will give you an exact match. In other words, these are the characters
 * that Google Search recognizes as valid double quotes for an exact match.
 *
 * Text containing double quotes cannot be enclosed in double quotes, so those
 * characters must be removed if they are included in the selected text when
 * searching for an exact match.
 */
export const QUOTATION_MARKS = "\u0022\u201c\u201d\u201e\u201f\u2033\u301d\u301e\u301f\uff02"; // "“”„‟″〝〞〟＂

/**
 * The maximum length of the selected text to be processed.
 */
export const SELECTION_TEXT_MAX_LENGTH = 1024;

/**
 * Indicates that the length of the selected text exceeds the limit.
 *
 * A very large text may be selected, in which case this string is preserved
 * instead of the original string as the selected text to avoid wasting memory
 * and making logs noisy.
 */
export const SELECTION_TEXT_TOO_LONG_MARKER = "### Too Long! ### yoBjv^F7%sg#NMxCrqvYKMgD85sRXRiG";
