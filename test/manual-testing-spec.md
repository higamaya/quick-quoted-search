# Manual Testing Specification

## Overview

### Why 'manual'?

Most tests are automated using Cypress, but those that cannot be automated must be done manually.

### When to test

Each time when modifying or adding a feature, tests related to the feature should be done. Also, all tests should be done before releasing a new version of the product.

### What to test

The scope of manual testing is as follows:

- Cooperation with platforms or systems
  - Context menus
  - Keyboard shortcuts
  - Tab switching
  - Idled Background service worker
  - System clipboard
  - Storage data synced using Chrome Sync
- Appearance
  - Layout in general
  - Font size preferred in browser settings
  - Internationalization
- Popup Icon
  - Position it appears
  - Size
  - Dragging
- Document structure
  - iframe
  - Shadow DOM
  - Different `body` styles
  - Not HTML

## Test Cases

### [a] Cooperation with platforms or systems

- [a-1] Context menus
  - [a-1-1] when selecting **_Do Quoted Search_** item in the context menu
    - [ ] should execute Do Quoted Search
  - [a-1-2] when selecting **_Put Quotes_** item in the context menu
    - [ ] should execute Put Quotes
- [a-2] Keyboard shortcuts
  - [a-2-1] when pressing shortcuts to invoke **_Do Quoted Search_**
    - [ ] should execute Do Quoted Search
  - [a-2-2] when pressing shortcuts to invoke **_Put Quotes_**
    - [ ] should execute Put Quotes
- [a-3] Tab switching
  - [a-3-1] when switching to another tab after selecting text, and then pressing shortcuts to invoke Do Quoted Search
    - [ ] should **_NOT_** execute Do Quoted Search
  - [a-3-2] when switching to another tab after selecting text, then **_switching back to the original tab_**, and finally pressing shortcuts to invoke Do Quoted Search
    - [ ] should execute Do Quoted Search
- [a-4] Idled Background service worker
  - [a-4-1] when selecting text **_after Background service worker goes idle_**
    > Use the debug log to determine if Background service worker goes idle. Most of the time it takes about 5 minutes.
    - [ ] should display Popup Icon
- [a-5] System clipboard
  - [a-5-1] when invoking Do Quoted Search **_via Popup Icon_**
    - [ ] should copy the selected text to the system clipboard
  - [a-5-2] when invoking Do Quoted Search **_via context menus_**
    - [ ] should copy the selected text to the system clipboard
  - [a-5-3] when invoking Do Quoted Search **_via keyboard shortcuts_**
    - [ ] should copy the selected text to the system clipboard
  - [a-5-4] when invoking Do Quoted Search **_via the search bar in Action page_**
    - [ ] should copy the selected text to the system clipboard
  - [a-5-5] when invoking Do Quoted Search **_via Auto Enter_**
    - [ ] should copy the selected text to the system clipboard
- [a-6] Storage data synced using Chrome Sync
  - [a-6-1] when changing extension's options on another device where you are logged in as the same user
    - [ ] should reflect extension's options changes made by another device

### [b] Appearance

- [b-1] Layout in general
  - [b-1-1] when displaying **_Popup Icon_**
    - [ ] should display Popup Icon in the expected layout
      > Points to check especially are as follows:
      >
      > - Icons in each button such as search, quotes, and options
      > - Animation when hovered
  - [b-1-2] when displaying **_Action page_**
    - [ ] should display Action page in the expected layout
      > Points to check especially are as follows:
      >
      > - Icons in header and search bar
      > - Keyboard shortcuts that is not set
  - [b-1-3] when displaying **_Options page_**
    - [ ] should display Options page in the expected layout
      > Points to check especially are as follows:
      >
      > - Icons embedded in various sentences
      > - Width of the 'select' component
- [b-2] Font size preferred in browser settings
  - [b-2-1] when changing font size preferred in browser settings
    - [ ] should reflect the font size to Popup Icon, Action page and Options page
      > Popup Icon inherits font size from `body` element. Therefore, Popup Icon size would not be changed if the font size of `body` element is constant (i.e. does not follow font size preferred in browser settings).
- [b-3] Internationalization
  - [b-3-1] when the language preferred in browser settings is **_Japanese_**
    - [ ] should display text in **_Japanese_**
  - [b-3-2] when the language preferred in browser settings is **_English_**
    - [ ] should display text in **_English_**
  - [b-3-3] when the language preferred in browser settings is **_neither Japanese nor English_**
    - [ ] should display text in **_English_**

### [c] Popup Icon

- [c-1] Position it appears
  - [c-1-1] when moving the mouse pointer to the **_right_** to select text
    - [ ] should display Popup Icon to the **_right_** of the mouse pointer
  - [c-1-2] when moving the mouse pointer to the **_left_** to select text
    - [ ] should display Popup Icon to the **_left_** of the mouse pointer
  - [c-1-3] when **_Avoid Selection option is on_**
    - [ ] should display Popup Icon avoiding up or down rectangular range of selected text
  - [c-1-4] when **_changing selection range_** by clicking mouse button while Popup Icon showing
    - [ ] should update the position of Popup Icon following the mouse pointer
  - [c-1-5] when clicking mouse button, **_but selection has not been changed_**
    > e.g. when clicking a checkbox
    - [ ] should **NOT** update the position of Popup Icon
- [c-2] Size
  - [c-2-1] when changing Icon Size option to '**_Very small_**'
    - [ ] should display Popup Icon with font size **_10px_**
  - [c-2-2] when changing Icon Size option to '**_Small_**'
    - [ ] should display Popup Icon with font size **_12px_**
  - [c-2-3] when changing Icon Size option to '**_Medium_**'
    - [ ] should display Popup Icon with font size **_16px_**
  - [c-2-4] when changing Icon Size option to '**_Large_**'
    - [ ] should display Popup Icon with font size **_20px_**
  - [c-2-5] when changing Icon Size option to '**_Very large_**'
    - [ ] should display Popup Icon with font size **_24px_**
- [c-3] Dragging
  - [c-3-1] when dragging Popup Icon
    - [ ] should move Popup Icon following the mouse pointer
  - [c-3-2] when dragging Popup Icon **_outside the viewport_**
    - [ ] should adjust the position of Popup Icon so that it is **_inside the viewport_**

### [d] Document structure

- [d-1] iframe
  - [d-1-1] when selecting text **_inside iframe_**
    - [ ] should display Popup Icon in the correct position (not misaligned)
    - [ ] should search with the selected text if clicking on the search button
- [d-2] Shadow DOM
  - [d-2-1] when selecting text **_inside shadow DOM_**
    > A example of the page using shadow DOM: https://m3.material.io/foundations/glossary
    - [ ] should display Popup Icon in the correct position (not misaligned)
    - [ ] should search with the selected text if clicking on the search button
- [d-3] Different body styles
  - [d-3-1] when the **_`body` element has margin_** on the left or top
    > Use this html: [test-body.html](test-body.html)
    - [ ] should display Popup Icon in the correct position (not misaligned)
  - [d-3-2] when the height of `body` is shorter than its content, and **_selecting text outside the `body`_**
    > A example of such page: https://developer.chrome.com/docs/extensions/mv3/getstarted/
    - [ ] should display Popup Icon in the correct position (not misaligned)
- [d-4] Not HTML
  - [d-4-1] when Content scripts is **_injected into non-HTML_** content
    > A example of such page: https://shields.io/
    - [ ] should exit, and should **NOT** cause any error
      > Check console of devtools
