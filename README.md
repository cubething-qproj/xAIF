# xAIF editor

In-browser editor for [xAIF](https://github.com/arg-tech/xaif) files using
Inference Anchoring Theory (IAT; see
`.docs/reference/IAT_guidelines_and_tutorials-2023-10.pdf`), annotated with
Periodic Table of Arguments (PTA 3.1) data that mirrors the lab's INCEpTION
schema (`../nlp/inception/pta-layers.json`).

```sh
pnpm install
pnpm dev      # editor at http://localhost:5173
pnpm test     # load/save, IAT structure, derivation and INCEpTION parity tests
pnpm check    # svelte-check
```

Open `examples/downloading.json` (a dialogue with an undercut) or
`examples/einstein.json` (reported speech, a δ argument).

## Sessions

Work is autosaved to named sessions in localStorage. The URL hash names the
tab's session (`…/#k3x9a`), so different tabs can show different sessions
side by side, and back/forward moves between sessions you've switched to.

- The picker switches this tab to another saved session.
- **New** starts an empty session here; **New tab** starts one in another tab.
- **Open…** loads a file as a new session, leaving the current one alone.
- **Save as…** asks where to save (the browser's native file dialog) and
  makes that file the session's name and Save target; **Save** writes back to
  the session's file, asking the first time. Files opened with **Open…** are
  Save targets too. Without native dialogs (Firefox), Save as asks for a
  name and both download. File targets last until the tab is closed. File
  handling uses [browser-fs-access](https://github.com/GoogleChromeLabs/browser-fs-access).
- **Delete** removes the session (download it first if you want to keep it).

Two tabs on the *same* session overwrite each other; the last save wins.

Interpretive decisions made while annotating are logged in
`judgement-calls.md`; conventions are in the `xaif-iat` skill.

## Layout

Three panels: the source text, the graph, and the inspector. **Auto layout**
arranges the graph like an IAT diagram, in three columns: logic (I, RA, CA,
MA) | links (YA) | locutions (L, TA). Locutions run down in text order, with
each TA just before the locution it leads to and reported speech right after
its reporter. Each YA sits level with the locution or TA that anchors it,
and each proposition or relation level with its YA, so an RA appears beside
the TA that argues it, between its premise and conclusion.

## Annotating

1. **Text.** Paste the passage with **Edit text**. Add speakers with
   **+ speaker** (double-click to rename) and click one to speak as them.
2. **Locutions.** Highlight a span and press **Add locution**. This creates
   L → YA (Asserting) → I, as OVA does; surrounding whitespace and final
   punctuation are trimmed. The L-node keeps the words exactly as said.
3. **Reconstruction.** Edit the I-node into its canonical form and tick the
   ATIP step-2 transformations on the YA (anaphora, passivization, …). MA
   nodes are only for rephrasing done by the speakers themselves.
4. **Analysis.** Each canonical statement gets subject, predicate, type
   (F/V/P), scope (s/p/u) and a note. A second-order statement is about a
   proposition: press ◎ next to its subject and click the I-node it is about
   (Esc cancels); it also gets a perspective (I/II/III) and an A/U marker,
   which replaces its predicate. Both keep type and scope, for α and β.
5. **Dialogue.** Link locutions with TAs, and anchor relations in them with
   YAs (Arguing → RA, Disagreeing → CA, Restating → MA). Connect by dragging
   from a node's bottom handle and dropping on another node (anywhere on it,
   or on an RA's side handle for a lever).

Choices are dropdowns in the inspector wherever there is a list (illocutionary
force, scheme names, speakers, types, levers), with **other…** for anything
else. Concepts are chips: click one used elsewhere in the file to tag it, or
type a new one and press Enter.
6. **Arguments.** An RA with one premise and one conclusion derives its form
   and substance; only the lever is chosen. Rules are tried top to bottom:

   | Form | Premise | Conclusion | Substance | Levers |
   | ---- | ------- | ---------- | --------- | ------ |
   | δ | about q: its subject is q, or it is a locution that says q | q itself (implicitly A), or about q and marked A/U | premise's perspective I/II/III | those for A or U |
   | — | same subject and predicate | | | none (premise restates conclusion) |
   | α | b is Y, with b = a | a is X | types, conclusion first (F/V/P) | by substance |
   | β | b is Y, with Y = X | a is X | scopes, conclusion first (s/p/u) | by substance |
   | γ | b is Y | a is X | i or d, from the lever | all γ |

   A locution's perspective comes from the speakers of the anchoring
   transition (arguer → I, addressee → II, anyone else → III) unless set on
   the L-node. A locution premise types only as δ. Terms match as strings (case, spacing and final punctuation
   ignored); proposition subjects match by node.

   A stated lever links into the RA's side port. CAs are left untyped:
   argue against something with an RA into a statement of the opposite,
   and add a CA from that to the original if you want the clash recorded.

## Storage

PTA data lives in an extra `pta` field on each node; lever values use
INCEpTION's keywords. A lever link is an edge with `role: "lever"`. Speakers
go in `participants`, and each locution's speaker and span in `locutions`
(`personID`, `start`, `end`); L-node text keeps IAT's `Forename Surname: `
prefix. The source text is saved as plain text (OVA's `{ txt }` HTML is read
on open). Node kinds the editor doesn't show (e.g. PA) and unknown fields
are written back unchanged.

## Warnings

Edges IAT doesn't allow; relations missing an input or output; RAs with
linked premises or more than one lever statement; dangling proposition
subjects; and, once there are locutions, unanchored RA/CA/MA nodes,
locutions with more than one incoming TA, and spans that no longer match the
text.
