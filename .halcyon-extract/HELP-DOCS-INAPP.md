- center
- 2px 0
- input
- checkbox
- aria-label
- Exception enabled
- none
- none
- border-box
- 1px solid ${e.border}
- pointer
- input
- aria-label
- Exception label
- **button**
- aria-label
- Remove exception
- none
- none
- pointer
- button
- standardizeHighlightExceptions
- yellow
- #ffff00
- Add exception
- 0 3px
- 20px
- center
- pointer
- 1px solid ${f?n:e.border}
- transparent
- #fff
- div
- div
- flex
- input
- Phrase (e.g. weapons of mass destruction)
- button
- Add
- div
- flex
- wrap


## Click the letters the acronym commands should mark

- span
- span
- div
- flex
- center
- 2px 0
- span
- hidden
- ellipsis
- nowrap
- span
- button
- aria-label
- Remove phrase
- none
- none
- pointer
- string
- string


## Getting Started


_Signing in, landing on the dashboard, and opening your first document._

- (bullets) **Sign in** – Halcyon Docs opens to a sign-in screen. Enter your Halcyon account, or click "Create account" to open halcyondebate.org in your browser, where new accounts are created. The app remembers you: the next launch shows a brief "Connecting…" splash and drops you straight onto the dashboard. There is no unverified offline mode. If Halcyon cannot re-verify an open session for 15 minutes, the sign-in screen returns over your saved work, and it lifts by itself once the connection is back. One account can run Halcyon Docs and Halcyon Flow together on this device, while another device is blocked until both app sessions here have signed out.
- **Sign Out Of All Devices** – if signing in says your account is in use on another device and you cannot reach that device (you reinstalled, the laptop died, it was a loaner), choose "Sign Out Other Device & Continue" on the sign-in screen. Halcyon emails you a one-time code, and only after you enter it does the other device get signed out and this one signed in. Because an account can hold only one session at a time, signing out that one device is the same as signing out everywhere. The code step means someone who only knows your password cannot use this to push you out quietly.
- **Account security** – Open your account chip to manage email-based two-factor authentication. Sign-in codes go to your verified authentication email when one is set, otherwise to your account email; turn on "Require a code every time I sign in" when every login should be confirmed. Use halcyondebate.org for profile-picture, password, and email self-service.
- **You stay signed in** – there is no time-based sign-out: your session stays live for as long as you keep using the app, on any schedule. Signing out happens only when you choose "Sign out" yourself (or your access is ended by an admin). Closing the window does not sign you out either; see "Runs in the background" below.
- **The tray icon (Windows notification area; macOS menu bar)** – the Halcyon icon is there whenever the app is running, window open or not. Right-click it (click on macOS) for "Open Halcyon Docs", a line showing who is signed in, "Sign out" (the sign-in screen greets the next open), and "Quit Halcyon Docs". On Windows, closing the last window keeps the app running in the background so your session stays signed in and collaboration stays connected; "Keep Running in the Background When Closed" in Settings ("General") turns that off, making the close button exit the app (the icon stays while the app runs). On macOS it is a small monochrome status icon that follows the light or dark menu bar. The same setting shows or hides it, and the window itself keeps the platform convention: closing it leaves the app in the Dock, Cmd+Q quits.
- **Your lists are private to your account** – on a shared computer, "Recent", "Pinned", your nav "Pinned" snapshots, and "Information" belong to whoever is signed in; sign in as someone else and you see your own, never the previous person's. The document files themselves stay on the disk and anyone on the computer can still open them from a folder.
- **The "Start" row** – creates things from the dashboard.
- (sub) **"New document"** – a blank evidence file.
- **"New speech document"** – a fresh speech doc to read from.
- **"Open…"** – open an existing .hal, .docx, or .cmir file.
- **"Convert"** – turn Word documents into .hal files, one batch at a time (see "Import, Export, and Saving").
- **Open from your file manager** – double-clicking a .hal, .docx, or .cmir file opens it in the app (on macOS, set Halcyon as the app to "Open With", or the default, for that file type). If you were signed out, the file waits behind the sign-in screen and opens right after you log in.
- **Become the Word-document opener (Windows)** – on first run the app offers "Open Word documents with Halcyon Docs?". Choosing "Set as default" opens Windows' Default Apps page, where you pick Halcyon Docs under .docx (Windows requires that choice to happen in its own settings). The offer shows once and never nags; "Open Word Documents with Halcyon Docs" in Settings ("General") re-offers it or turns the claim off, and changing the default in Windows' Default Apps always works on its own. On macOS, select a .docx in Finder, "Get Info", pick Halcyon Docs under "Open with", then "Change All".
- **Dashboard header** – the top-right holds "Search" (find folders and files), "Information" (personal info, tournament schedule, and this manual), "Settings", and your account chip. While a document is open, "Back to document" appears there too.
- **The guided tour (first launch)** – the first time you sign in, a short guided tour walks you through the pieces you will use most: converting your Word files into .hal from the dashboard, the toolbar layout, the structure keys, cutting a card, the reading marks, the two search palettes (Doc Search and Command Search), the Navigation panel, Read Mode, sending a card to your speech document, and a keyboard-shortcuts card. Each step spotlights the real control and explains it; use "Next" and "Back" or the arrow keys, and "Skip" ends it (you can always replay it later). It runs once per account and never interrupts you again. To replay it, press "Replay Tutorial" in Settings ("General"), or open "Information" from the dashboard header or the View menu and on the "Manual" tab press "Replay tutorial" to run the whole tour or "What Halcyon offers" for just the one-screen overview. Both are also in Command Search as "Replay Tutorial" and "What Halcyon Offers".
- **Working from the keyboard** – closing a document tab is reachable from the keyboard: Tab to its "✕" and press Enter or Space. A confirmation that deletes or discards something opens with "Cancel" already selected, so pressing Enter takes the safe answer, and you have to move to the other button to go ahead.


## Dashboard and Folders


_The Working Folder is a real folder on disk: its sub-folders are your library._

- (bullets) **Working Folder ("Choose", later "Change")** – pick a folder from the left sidebar. Folders in the app are real sub-directories of that folder on disk, so anything you organize here is visible in your file manager too.
- **Automatic library scan** – when you pick a Working Folder, every .hal, .docx, and .cmir already inside it (sub-folders included) appears on the dashboard; nothing has to be opened first.
- (sub) The list re-checks the disk whenever you return to the dashboard, so it stays current with files added or changed outside the app.
- Very large libraries show a first batch of cards with a "Show all N" button below.
- **Nested folders** – a folder inside a folder shows in the sidebar as a tree, and each level steps a little further right so depth is visible at a glance. Click the small arrow on a folder, or double-click the row, to show or hide its sub-folders; the list scrolls when it grows tall. Which folders are open resets when the app restarts.
- **Reorganize by drag** – drag a folder onto another folder to nest it inside, or onto "All documents" to make it a first-level folder again. The move is real: the directory and every document in it move on disk, and the folder stays selected afterward.
- (sub) A folder cannot be dropped into one of its own sub-folders (the cursor shows it).
- If the destination already has a folder with that name, the app asks: Keep both (moves under "name (1)") or Cancel.
- Right-click a folder and choose "New folder" to create a sub-folder inside it.
- **Create and assign** – make a folder with the "+" button in the sidebar. Assign a document with the folder menu on its card (it lists the Working Folder and its top-level folders), or drag the card onto any folder row in the sidebar, however deep; the row under the drag lights up. Either way the file MOVES into that directory on disk.
- (sub) A document that has never been saved asks you to save it first.
- If a file with that name is already there, the app asks: Keep both (saves under "name (1)"), Replace, or Cancel.
- **"All documents" and delete** – "All documents" shows everything the app knows about; clicking a folder shows every document in it and its sub-folders. The ✕ on a card deletes the document after a confirm: its file moves to the OS Recycle Bin (recoverable there) and the card disappears everywhere. Renaming folders is still done in your file manager; the app rescans on its own.
- **Dashboard body** – two sections below the header.
- (sub) **"Recent"** – the files you opened last (newest first, capped). It always shows the same list no matter which folder is selected, keeps files that live outside the Working Folder (their card shows the real path and opens normally), and survives changing the Working Folder. "Clear recent" only forgets that list, never touching files.
- **"All documents"** – everything in your library newest first, narrowed by the selected folder. A card whose file was moved or deleted outside the app shows a red "Missing" tag; the star pins a card to the "Pinned" section above.
- **Search (Ctrl+F)** – find folders and documents "By name", or switch to "By content" to search inside your .hal documents (with POC / HAT / BLK / CARD / TAG / AN / BODY filters).
- (sub) It always covers the whole Working Folder plus your Search Folders; if a sidebar folder is selected, an "In: folder" chip shows that narrowing, and clicking it searches everywhere.
- Opening a content hit lands on the exact match. By-name search browses the whole folder tree, so a document nested many folders deep still shows up. Exact names lead prefixes, word starts, and substrings; pinned files lead their tier. "Search Tie-Break" in Settings chooses Recency or Alphabetical, and "Cycle Search Tie-Break" in Command Search switches it directly.


## Document Structure


_Pockets, hats, blocks, tags, cards, and analytics: the debate skeleton, on function keys._

- **The heading hierarchy (function keys)** – Pocket (F4) over Hat (F5) over Block (F6) over Tag (F7); Analytic is Ctrl+F7 and Undertag is Ctrl+F8. "Clear Formatting" (F12) returns a line to Normal.
- (sub) Styling a body line under a heading splits that line out on its own.
- Styling while the cursor is on a heading converts the whole thing.
- {{button:structure.createCard}} **"Create Card" (Ctrl+Alt+C)** – wraps your selection as a card, starting with its tag; it is also in the toolbar's "Card" menu, under "Insert". Set the cite line with F8 on the author or date text.
- **Move a card or section (Ctrl+Alt+ArrowUp / Ctrl+Alt+ArrowDown)** – shifts the current card or section up and down. Alt+A selects the current heading's whole section, and "Delete Current Heading/Section" in Command Search removes one.
- **Protected card heads** – deleting across a card boundary keeps the card's head intact, so a stray Backspace never merges a card into the line above it. Backspace at the very start of a tag moves the cursor to the end of the previous line instead of doing nothing.
- **Word-snap selection** – dragging a selection past the word you started in snaps it to whole words, like Word; drag back into the starting word for character-level precision. Hyphens and dashes end a word, so "extraction---that's" snaps as two words and "re-search" snaps as two, just like Word. Double-click and triple-click drags keep their usual word and paragraph behavior. Turn it off with "Snap selection to words" in Settings ("Editing", "Formatting Behavior") to keep every drag character-level.
- **Condense (F3)** – collapses a card's body into one paragraph, to save paper. Select text first and only the paragraphs you selected collapse; with nothing selected the whole body of the card you are in collapses. A selection covering several cards condenses each card on its own. The tag stays where it is, and a citation or an undertag is never swallowed: it stays its own line and the paragraphs on either side of it collapse separately. On a Mac, F3 reaches Halcyon Docs only when "Use F1, F2, etc. as standard function keys" is on in System Settings; otherwise press Fn+F3.
- (sub) **Keep pilcrows (Ctrl+Alt+F3)** – condenses but leaves pilcrow marks at the old paragraph breaks, which is what makes it reversible.
- **Un-condense (Ctrl+Alt+Shift+F3)** – restores the paragraph breaks at those marks.
- **"Join Broken Lines"** – for evidence pasted out of a PDF that arrives chopped mid-sentence. It joins only the lines that were broken in the middle of a sentence and leaves real sentence breaks alone, so it repairs the paste without condensing the card. Run it from Command Search; it has no shortcut of its own.
- **"Shrink Card Text" (Ctrl+Alt+,)** – drops unread body text to a small size; Ctrl+Alt+. restores it.
- **Toggle case (Shift+F3)** – flips the case of the selection.
- **Analytics** – blocks of your own argument.
- (sub) **"Create Analytic Unit" (Card menu)** – builds a labeled analytic block.
- **"Convert Analytics to Tags" (Doc menu)** – promotes your analytics into card tags in bulk.
- **"Convert Cited Analytics to Tags" (Edit menu)** – promotes only the analytics that carry a cite into card tags.
- **"Repair Paragraph"** – splits a paragraph that has grown together (a floating bar walks you through it).
- **Images** – paste, or insert with the toolbar Image button, and drag freely on the page. Right-click an image for transparency, exact position, rotation, front/back order, float versus inline, and resets. Images round-trip to Word with their rotation and transparency.
- **Resize handles** – click an image to select it and eight resize handles appear: drag a round corner handle to resize it proportionally (the picture keeps its shape), or a side handle to stretch one direction. The new size exports to Word. Handles do not show in Read or Judge mode.
- **Image alt text (right-click, "Edit alt text…")** – describe an image for screen readers and Word export. With AI on, "AI: Write alt text" drafts the description, and "AI: Convert to Table" reads a table out of the image and inserts a real, editable table right after it (the image stays).
- {{button:insert.footnote}} **Footnotes and endnotes (the "Doc" menu, under "Insert")** – "Insert Footnote" or "Insert Endnote" drops a small superscript marker at the cursor and opens the note panel so you can type.
- (sub) Footnotes number 1, 2, 3 and endnotes i, ii, iii in document order, renumbering on their own.
- Click a marker to read its note (links inside are clickable); "Edit" changes it, "Delete" removes it, and Backspace over the marker deletes marker and note together.
- Notes travel with their text on copy and paste, and exporting to Word writes real Word notes that come back unchanged.
- {{button:editing.insertTable}} **Table editing (the "Table" menu, under "Insert")** – acts on the cell under the cursor.
- (sub) "Add Row Above" / "Add Row Below" and "Add Column Left" / "Add Column Right".
- "Delete Row", "Delete Column", and "Delete Table".
- "Merge Cells" and "Split Cell".
- **"Copy Previous Cite" (Alt+F8, Card menu)** – copies the previous card's citation into the current card, replacing its cite line or inserting one under the tag.
- **"Extract Undertag" (Card menu)** – turns the selection into a new undertag beneath the card's tag, leaving the original text in place. "Wrap Extracted Undertag in Quotes" in Settings ("Editing") adds quotation marks around it.
- **"Smart Shrink" (Card menu)** – compresses a card in one pass: body paragraphs with no underlining or emphasis drop to a small size, and marked paragraphs shrink only their connective text to the standard shrink size.
- (sub) Bracketed omission notes like "[Table Omitted]" stay full size.
- Add your own protected strings under "Shrink Protections" in Settings ("Editing").
- **"Paste and Destructively Condense" (Doc menu)** – pastes the clipboard as plain text joined into a single paragraph: line breaks, tabs, and runs of spaces collapse to single spaces, and one undo removes the whole paste. It also appears in Settings, "Keybindings" even before it has a shortcut.
- **Jump between headings (PageUp / PageDown)** – moves the cursor to the previous or next structural heading (Pocket, Hat, Block, Tag, or Analytic), skipping body text; hold Shift to extend the selection. When there is no heading in that direction the keys scroll as usual.
- {{button:numbering.toggleNumber}} **Card numbering (the toolbar's "Numbering" cluster)** – assigns display-only number or sub roles to the current card, analytic, or every one touched by the selection; inserting, deleting, or moving a card renumbers the run automatically. Right-click a Block and choose "Auto-number block" to rebuild its entire card/analytic run as 1, 2, 3.
- (sub) "Toggle Number Role" (Ctrl+Alt+1) counts 1, 2, 3; "Toggle Sub Role" (Ctrl+Alt+2) counts a, b, c beneath the current number. Press the active role again to clear it.
- "Toggle Number Restart" (Ctrl+Alt+3) starts a fresh run at the current card or analytic. On a Block heading it switches between the default fresh run and continuing the preceding Block. "Show/Hide Card Numbers" (Ctrl+Alt+0) toggles the display without changing any assigned roles.
- Pick several rows in the navigation panel outline to number them together: click a card or analytic row to pick it, Shift-click another to take the whole same-level run between them, and Ctrl-click (Cmd-click on macOS) to add or remove one. With two or more rows picked, "Toggle Number Role", "Toggle Sub Role", and the "Numbering" toolbar buttons act on exactly those rows instead of the cursor; moving the cursor in the document clears the picks.
- Press Tag or Analytic again while the cursor is in that head to add a blank sibling on the next line instead of moving into a body paragraph. The new unit continues the active role; only Toggle Number Role / Toggle Sub Role (or their keybinds) clears that role. Pocket and Hat headings always begin a fresh scope, and cards with no role are skipped without breaking the count.
- Exporting to Word writes native editable Word numbering, and importing numbered Tag or Analytic paragraphs restores the same role and restart skeleton.
- **Live views and linked copies (the "Doc" menu)** – place the cursor where the section should appear, then choose "Insert Live View…", "Insert Linked Copy…", or "Insert Linked Copy from File…".
- (sub) A live view is a read-only window onto another section in the same document. Edit the original and every view follows it; use the rail menu for "Go to source", "Re-pick source", "Unlink", or "Delete".
- A linked copy is an editable snapshot that remembers its source. "Refresh" pulls the latest source after warning before it replaces local edits; refreshing never writes back to the source file.
- A dot and the message "Source has new content - Refresh to update" mark a linked copy whose source changed. Missing or unreadable sources stay unchanged.
- Copying a live view within the same document keeps the link. Pasting it into another document, or choosing "Unlink", leaves ordinary editable cards instead.
- **"New paragraph on Enter"** – lives inside each structural style's editor (Settings, "Appearance", "Document Styles", then open a style like Tag or Block). It chooses what pressing Enter at the end of that style creates: a "Normal paragraph", the same style again (a run of tags keeps producing cards), or another structural style that fits the same spot. The menu lists only styles that can appear there, so a heading never offers "Undertag" and a Tag, Analytic, or Undertag inside a card never offers a heading. Most styles start on "Normal paragraph"; Analytic starts on a new Analytic, so pressing Enter keeps a run of analytics going.


## Formatting and Highlighting


_The debate marks (underline, emphasis, highlight, cite) plus ordinary text formatting._

- {{button:marks.highlight}} **The core reading marks** – Underline is F9, Emphasis (the boxed style) is F10, Cite is F8, Highlight is F11 (its color swatch sits in the toolbar under "Color & Size"; the palette remembers your last color). You do not have to select a whole word first: put the cursor anywhere in a word, including at either end of it, and the key marks that word. Press it again on the same word to take the mark off, which is how you clear underlining or highlighting word by word. A hyphenated compound counts as separate words, so only the part under the cursor is marked, while "that's" stays one word. With the cursor in a space instead of a word, the key arms the style for what you type next, as before. Turn "Apply Marks to the Word at the Cursor" off in Settings, "Editing", "Formatting Behavior" to keep only that older behavior.
- (sub) Reapplying the same highlight color to a uniformly highlighted selection removes that highlight. A mixed or differently colored selection takes the chosen color first, and a second press removes it.
- Emphasis boxes wrap a phrase as one continuous box. A highlight on emphasized text is the same height as a highlight anywhere else, with the box drawn as a thin frame on top of it, so a box never makes the highlight look shorter (with the box shown or hidden), and a highlight inside an enlarged box fills the box's full height.
- A reading underline stays one continuous, uniform stroke when font size or highlighting changes inside the phrase, including inside an Emphasis box.
- When you highlight straight across text of different sizes, that run of highlighting stays one even height on each line instead of stepping up and down at each size change, boxed words included. Where the run wraps onto more than one line, only the line that holds the taller text grows, so the lines above and below keep their normal height. Only highlighting that runs together matches: a piece of highlighting rises to larger highlighting it touches on the same line, with the larger always prevailing (even over a smaller box), and separate highlighting nearby always keeps its own height. Highlighting inside an emphasis box never drops below the largest highlighting in that box, on any line.
- {{button:marks.bold}} **Ordinary formatting (the toolbar's "Text" cluster)** – Bold (Ctrl+Shift+B), Italic (Ctrl+I) {{button:marks.italic}}, direct underline (Ctrl+Shift+U), strikethrough {{button:marks.strikethrough}}, superscript (Ctrl+Shift+=) {{button:marks.superscript}}, subscript (Ctrl+Shift+,) {{button:marks.subscript}}, font color, and a font-size stepper live in the toolbar and the usual places. Everything, including underline weight and the spellcheck squiggle, scales when you zoom, like Word at 120%.
- **Cleanup commands** – fix messy formatting in one pass.
- (sub) **"Clear Formatting" (F12)** – resets the selection to Normal.
- **"Fix Formatting Gaps" (Ctrl+Shift+G)** – heals the small unstyled gaps between styled runs.
- **"Clean Cutting Style" (Ctrl+Shift+K)** – tidies a card body in one pass (highlights to underlines, completes cut-off words, shrinks stray punctuation).
- **Highlight housekeeping** – the highlight toolbar button's palette popup holds the bulk recolor actions for the active track, plus a couple of related card commands in the Card menu.
- (sub) **"Standardize highlighting"** – repaints every highlight in one color.
- **"Standardize with Exceptions"** – repaints every highlight except your enabled exception colors. The popup lists those colors under "Exceptions": tick or untick each to protect it, remove one with its "X", or pick a color in the palette above and press "Add current color" to add it as a new exception. Press "Standardize with Exceptions" to run. The same list lives in Settings, "Editing", "Standardize exceptions".
- **"Convert to background"** – swaps the highlighted runs to background shading, keeping every color.
- **"Lock highlighting"** – turns highlights gray so later restyling passes leave them alone.
- **"Create Reference" (Shift+F9, Card menu, formerly "Convert to Insert")** – grays a card as reference material.
- **"Sync Cutting Across Doc" (Ctrl+Shift+Y, Card menu)** – copies one card's cutting onto its duplicates after a preview.
- **Background color (a second track beside highlighting)** – shade text without touching highlights.
- (sub) **"Background"** – the highlight palette popup has a "Highlight" / "Background" toggle (Ctrl+F11, or the "Background" mode of the highlight palette); switch to "Background" to shade the selection in the current background color, reapply the same color to remove uniform shading, or pick "None" to strip shading only, leaving highlights alone.
- **"Convert to highlighting"** – in "Background" mode, swaps the shaded runs back to highlighting, keeping every color.
- **"Standardize backgrounds" and "Standardize with Exceptions"** – recolor every shaded run at once, optionally sparing your enabled exception colors (managed in the same popup under "Exceptions").
- **The "with Exceptions" variants** – "Standardize with Exceptions" (highlight and background tracks) recolors everything EXCEPT the exception colors you have enabled. Each track keeps its own list: add as many entries as you like, give each a color and an optional name (for example yellow "re-highlights" and green "for reference"), and tick its checkbox to protect it. You manage the list in three places, all sharing one saved list per track: the highlight popup's "Exceptions" section (tick, remove, or "Add current color"); Settings, "Editing", "Standardize exceptions" (a full editor with per-entry color and name); and, when you run the command from the keyboard or command search, a small pop-up editor. With nothing enabled the command recolors everything. Both lists start with yellow.
- **The "Custom" color wheel** – picking a shade from the "Custom" wheel in the highlight, font color, and background palettes keeps the palette open so you can choose where the shade goes.
- (sub) **"Color"** – applies the custom shade to the selection (the button reads "Background" while the "Background" track is active), and saves it as the last-used color so it is not lost when the palette closes.
- To protect a custom shade from "Standardize (with Exception)", add it as an exception color in Settings ("Editing"), "Standardize exceptions".
- **The acronym trio** – mark the first letter of each word in the selection.
- (sub) {{button:marks.emphasizeAcronym}} **"Emphasize Acronym" (Alt+F10, the toolbar's "Text" cluster)**, **"Highlight Acronym" (Alt+F11)**, and **"Underline Acronym" (the "Doc" menu)**.
- Under "Acronym Marking" in Settings ("Editing") you can teach exact letter picks per phrase: type the phrase, click its letters, and whenever your selection equals that phrase all three commands mark exactly those letters.
- **Typing aids (Settings, "Editing")** – make repeatable corrections while you type.
- (sub) **"Smart Quotes"** – curls straight quotes as you type.
- **"Custom Autocorrect"** – add a source word and its replacement. A correction runs when you type punctuation or whitespace, and duplicate source words are refused.
- **"Auto-Capitalize Tags and Analytics"** – capitalizes sentence starts in Tag and Analytic text while leaving abbreviations, initials, and enumerations alone.
- **"Complete Typed Dashes"** – turns a typed -- or --- into an en or em dash. One Backspace right after a typing-aid change restores exactly what you typed.
- **"Flip Quote Direction" (Doc menu)** – flips every curly quote in the selection to its opposite direction.
- {{button:list.bullet}} **Lists and layout (the toolbar's "Paragraph" cluster)** – bullet list Ctrl+Shift+8, numbered list Ctrl+Shift+7 {{button:list.ordered}}, indent Ctrl+] {{button:list.indent}} and outdent Ctrl+[ {{button:list.outdent}}, left {{button:align.left}} / center {{button:align.center}} / right {{button:align.right}} alignment, hyperlinks with Ctrl+K {{button:marks.addLink}} (the dialog on an existing link has a "Remove link" button; Ctrl+Shift+L also removes a link), and tables from the toolbar's "Table" menu (Ctrl+Alt+T).
- {{button:marks.addLink}} **"Remove All Hyperlinks" (right-click the toolbar's Insert-hyperlink button)** – strips every hyperlink from the document at once, keeping the text. A dialog first shows the real count ("Remove N hyperlinks from this document?"); one Ctrl+Z restores them all. Also in Command Search. A document with no links just reports "No hyperlinks in this document."
- **Custom styles (Settings, "Appearance", "Document Styles")** – define a named preset with size, weight, underline, color, and an optional shortcut, which then appears with the built-in style buttons. Open a built-in paragraph style to set its "Alignment" to Left, Center, Right, or Justify.
- **"Select Similar Formatting" (Edit menu)** – selects every run in the document that matches the current one; right-clicking a style button in the toolbar does the same for that style, and whatever you do next (restyle, delete, copy) hits all of them.
- **Paste Plain Text (F2 by default)** – immediately pastes clipboard text without its formatting. Turn on Settings, "Editing", "Destructive Paste" to make F2 immediately run "Paste and Destructively Condense" by default instead; an explicit keybinding for F2 or either paste command always takes priority. The spellchecker underlines misspellings in red; right-click one for suggestions, "Add to Dictionary", or "Ignore". It understands debate writing: cite lines are never flagged, ALL-CAPS initialisms and tokens with digits (2NC, 7.6%) are skipped, hyphen or "---" joined parts are checked separately, and words from your tags, headings, and "Acronym Marking" phrases are trusted throughout the document.


## Navigation and Search


_The outline panel, in-document Find, and cross-document Doc Search._

- {{button:view.navPane}} **Navigation panel (Ctrl+Alt+N, the toolbar's "View" cluster)** – the document outline. The 1 / 2 / 3 / 4 buttons collapse it to pockets, hats, blocks, or everything.
- (sub) Drag the panel's right edge to resize it in this window. The final width is saved as "Navigation Width" for future windows; double-click the edge to restore the standard width.
- Hovering a row shows a small chip beside the panel: a card shows its cite and read time ("Jones 3-18, 0:17"), and a block shows the time for everything under it (never a cite). With several readers set, each reader's time is listed by name.
- Drag rows to reorder the document; right-click for insert and pin actions.
- Right-click, "Send to Flow" pushes a card, block, or analytic into Halcyon Flow's selected cell. The message afterwards says what became of it: placed, held until you open a round there, or not readable.
- **The "Pinned" section (top of the panel)** – holds snapshots you pin from any document; they survive switching documents.
- (sub) Each row carries a small type chip (POC, HAT, BLK, CARD, AN) and shows its real content at small scale; a card row shows its tag over its cite.
- Drag a row anywhere onto the page (even below the last line) or into the outline below it (an accent line marks the exact spot between rows) to insert a copy there, and the outline jumps to it; click a row for insert options. Toggle the section in Settings.
- {{button:search.find}} **Find (Ctrl+F, the toolbar's "Edit" cluster)** – searches the open document with case, whole-word, and element-kind filters (Pocket / Hat / Block / Tag / Analytic / Cite / Body), a results dropdown, and match navigation. Searches treat curly and straight quotes alike, and en dashes, em dashes, and hyphens match each other too.
- **Find and Replace (Ctrl+H, also the Doc menu)** – adds a replace row to the find bar: "Replace" swaps the current match and steps to the next, "Replace All" replaces every match as one undo step and reports the count. Replacements respect the active filters and take the formatting of the text they replace. The row is an editing surface, so it is hidden in Read and Judge mode.
- **Command Search (Ctrl+Shift+P, also View menu)** – a palette of every command; type to filter by name, alias, or category, and Enter or "Run" executes the highlighted row.
- (sub) Each row shows the command's category and its current keyboard shortcut (rebinds included). Rows that need an open document appear dimmed until one is active.
- Typing "s " followed by words searches Settings rows instead, and Enter opens Settings on that tab.
- With an empty search it lists every command grouped by category; Up and Down wrap, Esc closes.
- **Hyperlink menu (right-click a link)** – "Open Link", "Copy Link", "Edit Link…" (opens the link prompt prefilled), and "Remove Link".
- **Shared readers** – your readers follow you across the Halcyon apps: the same readers list drives the read-time chips here and the cell hover pills in Halcyon Flow, and editing the list in either app updates the other on its own.
- **Doc Search (Ctrl+B)** – lists Halcyon, Word, and CardMirror documents from your search folders so you can copy a block, card, or section into the current document or your speech document.
- (sub) Very large libraries are listed in full. If a folder ever holds more files than one search can list, or nests deeper than the search reaches, the line at the bottom of the window says so instead of quietly showing a short list.
- Pick a Word or CardMirror document to browse its structure without opening it. "Insert" copies the selected block, card, or section at the cursor or the end, using the destination controls at the bottom of Doc Search.
- A Word document is marked with a "DOCX" chip and a CardMirror document with a "CMIR" chip, so you can tell at a glance which results are not Halcyon files.
- "Open At" opens the document and jumps to the selected element. It works for Halcyon and CardMirror documents; Word documents have no stable position to jump to, so it stays unavailable for them.
- Move through results with the up and down arrows, which walk the whole result list even when only part of it is drawn on screen. "Home" jumps to the first result and "End" jumps to the last, in both the document list and the block list; while a search is still filling in, "End" keeps meaning the newest last result. Because the typing box holds the keyboard focus, "Home" and "End" move the selection rather than the text cursor, so use the left and right arrows to move within what you have typed.
- Select a result and press "Pin" (bottom right, beside "Insert") to keep it in the "Pinned" list at the top of the window; "Add" on a pinned row inserts it later, into any document.
- Each pinned row leads with the same type chip (POC, HAT, BLK, CARD, TAG, AN) as the results below, so you can tell what you pinned at a glance.
- A document you saved shows its latest blocks and cards.
- Turn "Search Word Documents" off in Settings, "General", "File Search" to hide .docx files from Doc Search, and "Search CardMirror Documents" off to hide .cmir files. Each format is controlled on its own.
- **Split screen (right-click a tab, "Split screen with…")** – puts two or three documents side by side. The active pane is outlined in yellow (recolorable in Settings, "Accessibility", "Split Screen Active Document"). Each pane zooms independently from 50% to 300% (Ctrl+wheel or the status-bar stepper), Ctrl+1 / Ctrl+2 / Ctrl+3 focus panes directly, and the cycle commands step through them.
- **Status bar** – keeps the live word count and your first two readers' time estimates on the left, shown inline as plain numbers; the right side shows the autosave state and a typeable 50%–300% zoom stepper.
- **Read times (Navigation panel only)** – never on the page itself. Each card row carries a small chip reading "CITE, TIME" ("Johnson 19, 0:21"); with several readers in Settings the times are listed per reader by name, in the order you set. Block rows carry a time-only chip covering everything under the block. Inserted material is not counted: text converted with "Create Reference" and text highlighted in gray stay visible but never add to a time. One switch controls all of them: "Show Read time in Navigation Panel" in Settings under "Read Time Estimates".
- **Drag a file in** – dragging a .hal, .docx, or .cmir file from your file manager onto the window opens it. An optional dropzone shelf (Settings, "Appearance") gives drags a landing strip.


## Read Mode, Judge Mode, and the Reading Marker


_Views for reading a speech aloud or flowing as a judge, without risking edits._

- (bullets) {{button:view.readMode}} **Read Mode (Ctrl+Shift+R, the toolbar's "View" cluster)** – strips the document down to what you would actually read aloud: structure, cites, and the read text, with unread body hidden. Highlighted text inside a card's table reads inline with the card body, so table evidence is never lost. Your scroll position carries over in and out.
- {{button:view.judgeMode}} **Judge Mode (Ctrl+Shift+J, the toolbar's "View" cluster)** – the cards-only variant for flowing a speech you are hearing: tags stay hidden behind a placeholder until you click them, and the document is locked against edits.
- {{button:view.readingMarker}} **The Reading Marker (Ctrl+Shift+M, a double press of "Enter" while in Read Mode, or the toolbar's "View" cluster)** – drops a marker at your reading position so you can find your place again mid-speech. Turn on "Mark Unread After Reading Marker" in Settings, "Editing", to tint the rest of each marked card with "Unread Text Color"; Word exports carry the same tint.


## Speech Documents


_Build the doc you will read from, by sending content out of your files._

- (bullets) **Mark or create the speech doc** – mark any document as the speech document ("Speech" menu, "Mark Active Doc as Speech Doc"), or create one fresh ("New Speech Document"). It is the standing target for every send. "Seed New Speech Docs with a Pocket Heading" in Settings, "General", starts a new speech with a Pocket named for that speech; turn it off to start blank.
- {{button:speech.sendEnd}} **Send to the speech doc (` and Alt+`)** – the backtick key (`) sends the current card or selection to the speech doc's cursor; Alt+` (or the toolbar's "To Speech" button) appends at its end. In split screen the focused pane is always the source, and a speech document visible in either pane receives the content immediately. The nav panel's right-click menu sends whole blocks or sections the same way.
- **Where a backtick send lands** – click the spot in your speech document where you want the next block, then switch to the file you are cutting from and press the backtick. It lands at the spot you left your cursor, even though the speech document is in another tab. Send again and the next block stacks below the first, so a run of sends keeps its reading order. If you have not put your cursor in the speech document yet, sends land at the end. Alt+` always appends at the end, whatever your cursor is doing.
- **"Save Send Doc" (Ctrl+Alt+S)** – writes a share-ready copy of the open document: analytics, undertags, and comments are stripped, the file is prefixed "[F] " by default, and your working file is never rebound. The prefix is editable under "Prefix preset saves" in Settings, which also holds the "[R] " read-doc and "[M] " marked-cards prefixes; a prefix may contain spaces (kept exactly as typed, so "[F] " keeps its trailing space), and emptying a field turns that prefix off.
- **"Save Marked Cards" (Card menu)** – saves only the cards carrying a reading marker, in document order, as their own document prefixed "[M] " by default. With nothing marked it tells you and does nothing.
- **"Create Wiki…" (File menu)** – compiles selected speech documents into one "Wiki---[Tournament] [Round].docx" for disclosure, using the same stripping rules as send docs.


## Collaboration and Messaging


_Live co-editing rooms, and end-to-end encrypted card sharing between accounts._

- (bullets) {{button:collab.open}} **Collaborate (the toolbar's "Share" cluster, or "Collaborate…" in the command palette)** – opens the Collaboration window. "Create room" hosts a live room on the current document and shows a room id to copy; a guest clicks "Join a room", pastes the id, and presses "Join". The host controls whether guests can edit; presence chips show who is connected. Guests open the shared document as its own tab, never over their own work.
- **Cards being edited** – while a collaborator's cursor is inside a card, that card shows their name with a pencil so you can see where everyone is working. Nothing is locked: everyone's edits merge live.
- **Connection drops** – keep working. When the connection comes back, your edits and your collaborators' edits come together on their own; nothing typed while offline is lost.
- **Split-pane session status** – in split screen, the shared document's pane gets its own footer with "Synced", "Sending", or "Offline" and one presence dot per participant. Other panes show no collaboration status, even when you work in them while the shared document receives edits.
- **Closing a shared document** – choose "Leave session" to disconnect only yourself while others continue, or, when you are the host, "End session for everyone" to close the room cleanly for every participant. "Cancel" keeps the document and room open. Any unsaved file then gets the usual "Unsaved changes" prompt.
- **LIVE markers** – a document with a live room shows a small green "LIVE" chip on its dashboard card and on its tab (recolorable in Settings, "Accessibility", "Live Document Marker"). The chip stays lit while the room is in use. Leaving a room as the last person turns the chip off; leaving while others remain, or losing the connection, keeps it lit briefly so you can rejoin.
- **One window per room** – rooms are per account: each signed-in account can be in a given room from one window at a time. Joining the same room from a second window or device shows "This account is already in the room on another window or device" until the first connection leaves.
- **Co-editing is experimental** – keep saving your own copies while using a room.
- {{button:share.inbox}} **Messaging (the toolbar's "Share" cluster)** – sends content to a contact you have connected with, end-to-end encrypted. In Compose, "What to send" offers "Use current selection", "Choose content" (search the current document and order the cards, blocks, and analytics to send), "Entire document" (every section's content, sent inline), and "Attach document" (send a whole .hal or .docx as a sealed file, either "Attach current document" or "Choose a file…" from disk, up to about 25 MB). The Inbox previews what arrived: a card bundle offers "Insert", and a received document offers "Save" (to disk) or "Open" (as a tab), with "Discard" for anything unwanted. Receive filters live in Settings ("Messaging").
- **Session survives a collaboration** – if your session expires mid-edit, the sign-in screen comes back OVER your work; signing back in returns you exactly where you were, nothing lost.


## Import, Export, and Saving


_Word in, Word out, CardMirror .cmir files, native .hal files, and the safety nets underneath._

- (bullets) **Save (Ctrl+S) and Save As (Ctrl+Shift+S)** – a never-saved document falls through to Save As so you pick a place, defaulting into your selected folder. When you Save As on a document that already lives on disk, the dialog opens in that document's own folder (or the nearest folder still present if the original was renamed or moved). The native format is .hal; opening and saving .docx works directly, and Word documents keep their identity (a .docx stays a .docx on Ctrl+S).
- **CardMirror files (.cmir)** – you can open a CardMirror document the same way you open any file (the "Open" dialog, a double-click in your file manager, or dragging it onto the window), and it appears in your library and "Recent" list alongside .hal and .docx files. Saving keeps it a .cmir (Ctrl+S), and Save As lets you keep .cmir or switch to .hal or .docx. Any document can also be saved as a .cmir from the Save As format list.
- (sub) Evidence carries over both ways: pockets, hats, blocks, cards, tags, cites, analytics, tables, and all of the highlighting, underlining, emphasis, font, and color formatting.
- A few CardMirror-only details are adjusted on the way in and noted when they are: footnote text keeps its words but not its inline styling, and CardMirror's read-only linked sections come in as normal editable content.
- {{button:workspace.convertDocuments}} **"Convert" (the dashboard's "Start" row, or Command Search)** – turns Word documents into .hal files in one batch, in two steps.
- (sub) **Step 1, what:** "Doc Convert" picks individual Word documents; "Folder Convert" picks a folder, and every Word document in it and in all of its subfolders is converted.
- **Step 2, where:** ".hal next to each original" (the default) writes each converted file into its document's own folder; "Choose a folder for the converted files" writes them into a folder you pick; "Convert, then delete the original Word documents" is for experienced users – it places each .hal beside its original and, after you confirm a warning that spells out exactly what will be deleted, moves each successfully converted original to the Recycle Bin (a file that fails to convert is always kept).
- When Folder Convert writes into a folder you pick, choose the layout: "Keep the folder structure" (the default) recreates the subfolders inside the destination, and "Put every file in one folder" drops every converted file straight into the destination, giving any same-name files a "(2)" suffix so none overwrite another.
- Documents that already have an up-to-date .hal at the target are left in place – never overwritten – and listed by name, so an existing .hal you have edited is kept as is. A progress bar names the current file; "Cancel" finishes the file in progress and stops. The end summary lists everything converted, kept, or failed – one bad file never stops the batch.
- **Open into a new tab** – the folder button next to the tab strip's "+" opens a file straight into a new tab (no trip back to the dashboard). It uses your system's file dialog by default; "Open files with" in Settings ("General", "File Search") can switch it to the Halcyon file browser, where picking a result opens it as a tab.
- **"Close Active Document" (Ctrl/Cmd+W)** – closes the document you are working in, using the same collaboration and unsaved-changes prompts as the tab's close button. It closes the document tab, not the app window, and can be rebound in Settings ("Keybindings").
- **Tab strip placement** – Settings ("Appearance") can move the document tab strip to the top, bottom, left, or right. On the left or right it becomes a vertical strip you can resize by dragging its inner edge, just like the navigation panel; moving it back to the top or bottom returns it to its regular size.
- **"Export .docx…" (Ctrl+Shift+D)** – offers three shapes. Exports use Verbatim-compatible style names, so the reader's own template controls the look. Exports open as modern Word documents, with no "Compatibility Mode" banner and no "Convert" prompt, so comments show in the margin and the layout does not reflow when the reader saves.
- (sub) **Regular document** – the whole document.
- **Send document** – analytics and undertags stripped.
- **Read document** – structure, cites, and read-aloud text only.
- **Word import** – understands debate formatting: bold-over-underline and boxed styles arrive as Emphasis, highlights and shading come through separately, and equations stay editable. Imported tables with rows of unequal width are padded to a rectangle. An imported document is named after the file it came from, however you opened it.
- **Autosave and crash recovery** – autosave is on by default and keeps a recovery copy of your unsaved edits as you work; your file itself changes only when you Save. The recovery copy is written a few seconds after you stop typing, and also whenever you switch away from the window, so the last thing you typed is covered. The status bar shows "Saved" or "Unsaved changes", and warns if the recovery copy cannot be written.
- **If one document hits a problem** – it is contained to that pane. The pane says which file it was and offers "Reload this document"; your other documents, your tabs, and anything unsaved are untouched. Nothing is discarded, so reloading picks the document back up where it was.
- **After a crash** – reopening the app brings back every document you had open, in the same order, with the same tab selected. Documents with unsaved edits return as unsaved tabs under their own names, still pointing at their files, so "Save" writes where it always would; documents that were already saved simply reopen from disk. A document that has since been moved or deleted is skipped, and one message summarizes what came back. If recovered work cannot be matched to a file with certainty, it comes back unsaved and unnamed and says so, so "Save as" lets you choose where it belongs instead of it writing over the wrong file. Quitting deliberately still gives you a clean slate on the next launch, which is unchanged.
- **Safe saves when a file changes elsewhere** – before replacing an open file, Halcyon compares the copy on disk with the version you opened or last saved. If another app changed it, choose "Overwrite", "Save As...", or "Cancel". If the original disappeared, Save opens "Save As..." instead. A locked file stays unsaved and shows a notice so autosave never overwrites or discards the newer copy. Halcyon also checks that the file you are about to write really is the document in the tab, and asks the same way if it turns out to be a different one.
- **Copies of the same document** – copying a .hal file (from camp, a teammate, or a backup) makes a second file that still remembers being the first. Open both and Halcyon gives the second one its own identity so the two never share a tab, and tells you once; save it to make that permanent. Both copies stay listed separately under "Recent" so you can always get back to either. Using "Save as" to make a copy gives that copy its own identity straight away, so it never gets confused with the original.
- **Files in OneDrive or another cloud folder** – opening an online-only file waits briefly while your cloud provider downloads it; if it still cannot be read, the app tells you to set the file to "Always keep on this device" (or open it once in Explorer) and try again.
- **Quit on macOS (Cmd+Q)** – each dirty document opens "Unsaved changes" in turn. Choose "Save", "Don't save", or "Cancel"; confirming every document fully quits, while "Cancel" or a failed or cancelled save leaves the app running.
- **"Optimize Library…" (File menu)** – re-packs your .hal documents in place to reclaim space, and reports what it improved.


## AI Tools


_Optional, off by default: cite formatting, translation, and document Q&A with your own API key._

- (bullets) **Turn AI on (Settings, "Editing", "AI (opt-in)")** – paste your Anthropic API key; the AI features stay off until you do (the keyless "Translate Selection" is the one exception, described below). A custom model id can be set there too. Once AI is on, an "AI" menu appears in the toolbar gathering every AI action in one place.
- {{button:ai.createCite}} **"AI: Create Cite" (Ctrl+Shift+X, the toolbar's "AI" menu)** – formats the citation you are on to your own cite style; a progress pill shows over the cite and can be canceled.
- (sub) **"AI: Format All Cites" (Ctrl+Shift+A)** – formats every citation in the document in one pass.
- **"Translate Selection"** – translates the selected passage into your target language (set in Settings), inserting the translation under the original as one undoable step. The "Translation Engine" setting picks the backend: "Automatic" uses Anthropic when AI is on and the keyless MyMemory service otherwise, so translation works even with AI off; "Label Translations with Their Engine" controls the engine name in the inserted header.
- **"Ask AI"** – answers questions about the selection or the whole document (images included); answers land as comment threads so they never touch the text.
- **"AI: Repair Text" (Ctrl+Alt+R, in the "AI" toolbar menu)** – fixes common extraction artifacts in the selection (garbled characters, broken or run-together words, stray spacing). It makes targeted fixes in place, never rewording, as one undo step, and reports how many landed.
- **"AI: Repair Formatting" (Ctrl+Alt+Shift+R, in the "AI" toolbar menu)** – normalizes an imported card's body to the debate marks (underline, emphasis, highlight) without changing its text. Tags and cites are left alone. One undo step.
- **"AI: Write Alt Text" and "AI: Convert Image to Table"** – also live as commands (the "AI" toolbar menu and Command Search), not just the image right-click menu, so they can be run from the menu or search whenever an image is selected.
- **@AI in a comment** – typing @AI in a comment or reply summons an AI answer into that thread, with the commented text as context; later replies continue the same conversation. AI replies carry a small "AI" chip. With AI off, @AI is just text.


## Comments and Annotations


_Margin conversations, plus per-card Extension and Note badges._

- (bullets) {{button:comments.add}} **Comments (Ctrl+Shift+C, panel Ctrl+Alt+M)** – add a comment on the selection with the toolbar's "Comment" button or Ctrl+Shift+C; the Comments panel lists threads with replies, resolve, and delete. Deleting or resolving removes the text highlight too.
- **Extensions (Ctrl+Shift+E) and Notes (Ctrl+Shift+N)** – small labeled badges under a card's tag: quick round-prep marks that are side data, never document text. The toolbar's Extension and Note buttons add them; right-click those buttons to show or hide all annotations. Their colors and text style live in Settings ("Appearance", "Annotations").


## Round Timer


_A floating speech-and-prep clock, shared live with Halcyon Flow._

- (bullets) **Toggle the timer (toolbar View cluster)** – it floats over the document, drags anywhere by its header, and remembers its spot.
- **Speech and prep clocks** – pick a speech or prep clock and start, pause, or reset it. The same clock is shared live with Halcyon Flow when both apps run, so starting prep in one shows in the other.
- **Switch to Halcyon Flow (Ctrl+Shift+T)** – with both apps open, jumps straight to the Halcyon Flow window; the same shortcut inside Flow jumps back, so you move between your cards and your flow without reaching for the mouse. Rebind it in Settings, "Keybindings".
- **Timer settings ("Timer" tab)** – "Alert Points" rings once as the clock crosses each listed remaining-second mark, and "Alert Volume" controls those alerts and the end alarm. The timer's color theme and sound include a preview button. Under "Times", a "Preset" fills "Constructive", "Rebuttal", "Cross-ex", and "Prep", and each remains editable.
- **Typing a time** – enter "MM:SS" or bare digits: one or two digits set minutes ("9" is 9:00), while three or four digits work like a keypad where the last two are seconds ("800" is 8:00, "1230" is 12:30).
- **Pop out the timer** – choose "Pop Out" in the timer header for a small always-on-top window. Choose "Close" there to return the timer to its normal panel. The pop-out closes with the app and is never restored on launch.


## The Information Window


_Personal info, your tournament schedule, and this manual, in one place._

- (bullets) **"Personal"** – open Information from the dashboard header, the View menu, or Help. "Personal" stores your name, school, code, and notes. Personal info is shared between the Halcyon apps on this device: edit it in Halcyon Docs or Halcyon Flow and the other app picks it up on its own.
- **"Tournament Schedule"** – a small table of tournaments and dates with "Add tournament", "Remove selected", "Clear all", and "Save". Bulk changes undo with Ctrl+Z and redo with Ctrl+Y while that tab is open.
- **"Manual"** – this guide: pick a section on the left, read on the right.
- **Search the manual (Ctrl+F)** – while the "Manual" tab is open, Ctrl+F focuses a "Search the manual" box that filters the section list to matches (with a per-section count) and highlights the hits on the right. Esc clears the box. Switch tabs or close the window and Ctrl+F goes back to its normal job.


## Settings


_Where every preference lives, tab by tab._

- (bullets) **"General"** – startup and default formats, "Open Documents In", "Keep Running in the Background When Closed" (Windows tray behavior), library search folders (and which file types they scan), read-time readers and their words-per-minute, and "Reset" (its "Reset all settings" button restores every setting to its default after a confirmation). "Open Documents In" defaults to "Tabs"; choose "Separate Windows" when future dashboard, search, picker, drag, and file-manager opens should use one document window each. Changing it does not move documents that are already open, and opening an existing document focuses its current window.
- **"Report a Bug" and "Suggest a Feature"** ("General", "Feedback") open focused forms that send your report to the Halcyon team. Give the report a short "Title (Optional)" so the team can tell it apart at a glance, then write the description, which needs at least 30 words (the title does not count toward it). The app and version are filled automatically, device and operating-system details can be corrected, and bug reports can include the current document or other supporting files. Clicking outside the window leaves it open so a stray click cannot lose what you typed; close it deliberately with "Close", the ✕, or the Escape key.
- **"Appearance"** – theme (light / dark / system), UI style and accent, document typography, per-style overrides and your custom styles, annotation colors and text styles, and nav panel sizing. "Default Document Zoom (%)" supports 50%–300%, while "Interface Scale (%)" supports 50%–200%. "Maximum Text Width" uses 0 for the current full-width page; any other value limits the text column, and "Text Column Position" places it Centered, Left, or Right. "Interface Font" and the experimental multi-range selection toggle live here too. On the dark document canvas, light highlight colors darken automatically so the light text stays readable; saved files and exports keep the original colors.
- **"Scrollbar Width"** ("Appearance") – choose "Thin" (the default) or "Standard" for every scrollbar in the app. The scrollbar color is set in "Accessibility", "Scrollbar Color".
- **"Underline and Boxes"** ("Appearance") – "Underline Thickness (px)" and "Box Thickness (pt)" set the weight of the reading underline and the emphasis box. "Underline Zoom Scaling (%)" and "Box Zoom Scaling (%)" set how much each grows with document zoom, from 0% to 200% in 25% steps: 100% scales with zoom (the default), 0% keeps a fixed thickness at any zoom, and above 100% the line grows faster than the zoom. Zooming out never erases the line: at high scaling a thin minimum always stays visible. Line spacing always keeps the room the emphasis box needs, so a thicker box or very tight spacing can never fuse the boxes on two neighboring lines into one bar. A later full-size paragraph cannot enlarge the line gaps in earlier shrunken text.
- **"Card Numbering"** ("Appearance") – "Show Card Numbers" and "Show Numbering Buttons" control the display and toolbar cluster; while numbers are shown they also appear before the matching card and analytic rows in the navigation panel outline. "Number Format" and "Sub Format" choose their punctuation; "Capitalize Sub Letters", "Bold Sub-numbers", "Number Indent", and "Sub Indent" adjust only your display, where "Bold Sub-numbers" off renders the sub letters at a plain weight instead of matching the number. "Card Number" under "Accessibility" recolors the labels without changing the document.
- **Transclusion colors** ("Accessibility") – "Live View / Linked Copy Rail" recolors the gutter rail, and "Linked Copy Changed" recolors the source-change dot. Both are display-only.
- **"Editing"** – spellcheck, autosave, text drag and drop, read-mode options including "Mark Unread After Reading Marker" and "Unread Text Color", condense and shrink sizes, "Destructive Paste", formatting-gap behavior, comment identity, the Halcyon Flow connection port, and the AI section.
- **The remaining tabs** – smaller, single-purpose panels.
- (sub) **"Timer"** – clock color theme and alert sound.
- **"Keybindings"** – search and rebind every command, and record text macros.
- **"Messaging"** – receive filters for shared cards.
- **"Accessibility"** – reduced motion, larger hit targets, display-only recolors for highlights and shading (including "Scrollbar Color", "Live Document Marker", and "Split Screen Active Document"), "Steady Text Cursor", "Annotation Underline Shapes", and "Color-vision Friendly Palette".
- **Rebinding shortcuts** – keyboard shortcuts shown in this manual are the defaults; anything you rebind in Settings ("Keybindings", also Ctrl+Alt+K) applies everywhere, menus and Command Search included.
- **Software Update** – updates download silently in the background. When a strictly newer version is ready, an "Update ready" chip appears in the status bar; hover it for the version and click it to install. No automatic check opens a dialog or steals focus.
- (sub) On Windows and Linux, clicking the chip installs now; quitting normally also applies an update that is already downloaded.
- On macOS, Halcyon publishes separate Intel and Apple Silicon files. An unsigned build verifies the update for the processor it is running on, closes cleanly, replaces a writable installed app, checks the new bytecode, and reopens it. If the app is translocated, read-only, or fails verification, Halcyon opens the matching .dmg for manual replacement instead. A signed and notarized build uses the native macOS updater.
- **"Check for Updates on Launch"** ("General", "About this install") checks silently each time the app starts.
- **"Pause update checks for 1 week"** stops automatic checks and downloads until the shown date. While paused, **"Resume now"** restarts them immediately. Help › "Check for Updates…" is an explicit manual request and still works while paused, reporting through the same non-blocking status chip.
- **Shared read-time readers** – change a reader's name or words-per-minute in "General" (or in Halcyon Flow's "Read Time" settings) and the other app picks it up automatically, newest edit wins.
- **CardMirror-parity additions ("Editing")** – smart quotes and dash completion, shrink protections, the highlight and background exception colors, acronym letter picks, "Wrap Extracted Undertag in Quotes", and the translation engine choice. (Prefix preset saves live under "General".) Each structural style's editor under "Appearance", "Document Styles" carries its own "New paragraph on Enter" choice.
- **
- marks.bold
- marks.italic
- marks.strikethrough
- marks.superscript
- marks.subscript
- marks.emphasizeAcronym
- marks.highlight
- list.bullet
- list.ordered
- list.outdent
- list.indent
- align.left
- align.center
- align.right
- marks.addLink
- numbering.toggleNumber
- numbering.toggleSub
- numbering.toggleRestart
- numbering.toggleVisibility
- editing.insertTable
- insert.footnote
- workspace.convertDocuments
- structure.createCard
- ai.createCite
- editing.undo
- editing.redo
- search.find
- view.settings
- comments.add
- speech.sendEnd
- collab.open
- share.inbox
- file.emailChain
- view.readMode
- view.judgeMode
- view.readingMarker
- view.navPane
- view.commentsPane
- span
- img
- aria-label
