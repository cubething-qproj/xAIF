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
`examples/ra-inputs.json` is a catalogue of every way into an RA.

## Sessions

Work is autosaved to named sessions in localStorage. The URL hash names the
tab's session (`…/#k3x9a`), so different tabs can show different sessions
side by side, and back/forward moves between sessions you've switched to.

- The picker switches this tab to another saved session.
- **New** starts an empty session here; **New tab** starts one in another tab.
- **Open…** loads a file as a new session, leaving the current one alone.
- **Download xAIF** saves the session as a file: through the browser's
  save dialog where it has one (Chromium), where a name you choose becomes
  the session's name; otherwise as a download named after the session. File
  handling uses [browser-fs-access](https://github.com/GoogleChromeLabs/browser-fs-access).
- **Delete** removes the session (download it first if you want to keep it).

Two tabs on the *same* session overwrite each other; the last change wins.

Interpretive decisions made while annotating are logged in
`judgement-calls.md`; conventions are in the `xaif-iat` skill.

## Layout

Three panels: the source text, the graph, and the inspector. **Auto layout**
arranges the graph like an IAT diagram, in three columns: logic (I, RA, CA,
MA) | links (YA) | locutions (L, TA). Locutions run down in text order, with
each TA just before the locution it leads to and reported speech right after
its reporter. Each YA sits in the row of the locution or TA that anchors
it, and each proposition or relation in the row of its YA, so an RA appears
beside the TA that argues it. Rows span all three columns and are as tall as
their tallest column, so the columns stay level with each other; this
favours readability over compactness.

Selecting a node rings it in orange, gives its neighbours a lighter ring,
draws its edges bold and fades everything else; selecting an edge does the
same for the edge and its two ends.

Every node has typed ports, hollow for incoming and filled for outgoing,
each on the side facing what it connects to: dialogue runs down the
locution column (TA ports top and bottom), anchoring runs sideways through
the links column (YA ports left and right), and inference runs down the
logic column (premise in at the top, conclusion out at the bottom; RAs also
take a lever and an undercut on the left). Hover over a port to see what it
accepts; a port only takes the node kinds IAT allows there.

## Annotating

1. **Text.** Paste the passage with **Edit text**. Add speakers with
   **+ speaker** (double-click to rename) and click one to speak as them.
2. **Locutions.** Highlight a span and press **Add locution**. This creates
   L → YA (Asserting) → I, as OVA does; surrounding whitespace and final
   punctuation are trimmed. The L-node keeps the words exactly as said.
   Selecting a locution puts a handle at each end of its span; drag one to
   resize the span, and the L-node's words follow (its I-node doesn't).
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
   from a port and dropping on another node: on a port, or anywhere on the
   node to use whichever port fits. A lever must be dropped on the RA's
   lever port.

Choices are dropdowns in the inspector wherever there is a list (illocutionary
force, scheme names, speakers, types, levers), with **other…** for anything
else. Concepts are chips: click one used elsewhere in the file to tag it, or
type a new one and press Enter.
6. **Arguments.** An RA takes exactly one premise (an I or L node) and gives
   one conclusion (an I node), and derives its form and substance from them;
   only the lever is chosen. Rules are tried top to bottom:

   | Code | Premise → RA | RA → conclusion | Substance from |
   | ---- | ------------ | --------------- | -------------- |
   | δ | I whose subject is ◎ q, or L that anchors q (via a YA) | I q itself (A implied), or I whose subject is ◎ q, marked A/U | premise I's perspective; for an L, the TA's speakers |
   | — | I with the conclusion's subject *and* predicate, or an L that doesn't anchor q | I | none: no form |
   | α | I with the conclusion's subject (same words, or same ◎ node) | I | types F/V/P, conclusion first |
   | β | I with the conclusion's predicate | I | scopes s/p/u, conclusion first |
   | γ | I sharing neither | I | the lever: none → d, else i |

   For δ, only levers for the conclusion's A or U are offered; for γ, every γ
   lever. A locution's perspective is arguer → I, addressee → II, anyone
   else → III, read off the speakers of the TA that anchors the RA, unless
   set on the L-node. Terms match as strings (case, spacing and final
   punctuation ignored).

   Two more inputs don't affect the type: a **lever statement** (I → the
   RA's side port) and an **undercut** (I → CA → RA).
   `examples/ra-inputs.json` has every row, one RA each, labelled with the
   code it should derive (`pnpm test` checks the labels).

   CAs are left untyped: argue against something with an RA into a
   statement of the opposite, and add a CA from that to the original if you
   want the clash recorded.

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
