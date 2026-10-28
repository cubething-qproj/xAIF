<!--
  Side panel: edits the selected node and lists structural warnings.
  L-node: speaker, locution and a manual delta perspective. I-node: the
  statement and its analysis. YA: its force and the transformations that
  reconstruct its locution's content. RA: its premise, conclusion and lever
  statement, its derived type, concepts and note. Other scheme nodes: their
  scheme name. All PTA data goes through `ptaOf`, so cleared fields are
  dropped.
-->
<script lang="ts">
  import { snippet, type FlowNode, type NodeData } from './flow';
  import Choice from './Choice.svelte';
  import { DEFAULT_TEXT, SCHEMES, nameOf, type ArgNode, type Participant, type SchemeKind, type argumentType } from './xaif';
  import {
    ACCEPTABILITIES,
    KINDS,
    PERSPECTIVES,
    SCOPES,
    TRANSFORMATIONS,
    TRANSFORMATION_INFO,
    badgeOf,
    formatCode,
    predicateOf,
    ptaOf,
    type Analysis,
    type Connector,
    type Reconstruction,
  } from './pta';

  let {
    node,
    roles,
    type,
    warnings,
    hiddenCount,
    participants,
    concepts,
    picking,
    textOf,
    onchange,
    onselect,
    onpick,
  }: {
    node: FlowNode | undefined;
    /** The selected scheme node's premises, conclusions and lever statements. */
    roles: { premises: ArgNode[]; conclusions: ArgNode[]; levers: ArgNode[] };
    /** The selected RA's derived type, if any. */
    type: ReturnType<typeof argumentType>;
    warnings: { id: string; message: string }[];
    hiddenCount: number;
    participants: Participant[];
    /** Every concept tagged anywhere in the document, offered as chips. */
    concepts: string[];
    /** Whether the canvas is waiting for a proposition to be picked as a subject. */
    picking: boolean;
    textOf: (id: string) => string | undefined;
    onchange: (id: string, data: NodeData) => void;
    onselect: (id: string) => void;
    /** Starts picking the proposition that the given statement is about. */
    onpick: (id: string) => void;
  } = $props();

  /** Merges a patch into the node's PTA data. */
  function setPta(n: FlowNode, patch: Record<string, unknown>) {
    onchange(n.id, { ...n.data, pta: ptaOf(n.data.kind, { ...n.data.pta, ...patch }) });
  }

  const choice = (e: Event & { currentTarget: HTMLSelectElement }) => e.currentTarget.value || undefined;
</script>

{#snippet statement(label: string, s: ArgNode)}
  {@const a = (s.pta ?? {}) as Analysis}
  <div class="role">
    <div class="label">{label} <button class="link" onclick={() => onselect(s.id)}>{s.id}</button></div>
    <div>{s.text}</div>
    {#if a.subject || a.subjectNode || predicateOf(a)}
      <div class="terms">
        <span class="subject">{a.subjectNode ? `⟨${a.subjectNode}⟩ ${snippet(textOf(a.subjectNode), 30)}` : (a.subject ?? '?')}</span>
        <span class="predicate">{predicateOf(a) ?? '?'}</span>
        <b>{badgeOf(a)}</b>
      </div>
    {/if}
  </div>
{/snippet}

<aside>
  {#if node}
    <h3>{node.data.kind} <small>{node.id}</small></h3>
    {#if node.data.kind === 'I'}
      {@const a = (node.data.pta ?? {}) as Analysis}
      <textarea rows="4" value={node.data.text} oninput={(e) => onchange(node.id, { ...node.data, text: e.currentTarget.value })}
      ></textarea>
      <label for="subject">subject</label>
      <div class="pick">
        {#if a.subjectNode}
          <span class="subject ref" title="this statement is about proposition {a.subjectNode}">
            ⟨{a.subjectNode}⟩ {snippet(textOf(a.subjectNode))}
          </span>
          <button
            title="clear the proposition subject"
            onclick={() => setPta(node, { subjectNode: undefined, perspective: undefined, acceptability: undefined })}>×</button
          >
        {:else}
          <input id="subject" class="subject" value={a.subject ?? ''} oninput={(e) => setPta(node, { subject: e.currentTarget.value })} />
        {/if}
        <button
          class:active={picking}
          title="pick the proposition this statement is about (second-order statement)"
          onclick={() => onpick(node.id)}>◎</button
        >
      </div>
      <label>
        predicate
        {#if a.acceptability}
          <input class="predicate" value={predicateOf(a)} disabled title="set by the acceptability marker" />
        {:else}
          <input class="predicate" value={a.predicate ?? ''} oninput={(e) => setPta(node, { predicate: e.currentTarget.value })} />
        {/if}
      </label>
      <div class="row">
        <label title="fact, value or policy (alpha substance)">
          type
          <select value={a.kind ?? ''} onchange={(e) => setPta(node, { kind: choice(e) })}>
            <option value="">·</option>
            {#each KINDS as k (k)}<option value={k}>{k}</option>{/each}
          </select>
        </label>
        <label title="singular, particular or universal subject (beta substance)">
          scope
          <select value={a.scope ?? ''} onchange={(e) => setPta(node, { scope: choice(e) })}>
            <option value="">·</option>
            {#each SCOPES as s (s)}<option value={s}>{s}</option>{/each}
          </select>
        </label>
        {#if a.subjectNode}
          <label title="perspective of a source-based premise: first, second or third person (delta substance)">
            perspective
            <select value={a.perspective ?? ''} onchange={(e) => setPta(node, { perspective: choice(e) })}>
              <option value="">·</option>
              {#each PERSPECTIVES as p (p)}<option value={p}>{p}</option>{/each}
            </select>
          </label>
          <label title="acceptable or unacceptable: the predicate of a delta conclusion">
            A/U
            <select value={a.acceptability ?? ''} onchange={(e) => setPta(node, { acceptability: choice(e) })}>
              <option value="">·</option>
              {#each ACCEPTABILITIES as x (x)}<option value={x}>{x}</option>{/each}
            </select>
          </label>
        {/if}
      </div>
      <label>
        note
        <textarea rows="3" value={a.note ?? ''} oninput={(e) => setPta(node, { note: e.currentTarget.value })}></textarea>
      </label>
    {:else if node.data.kind === 'L'}
      {@const a = (node.data.pta ?? {}) as Analysis}
      <label>
        speaker
        <select value={node.data.speaker ?? ''} onchange={(e) => onchange(node.id, { ...node.data, speaker: choice(e) })}>
          <option value="">none</option>
          {#each participants as p (p.id)}<option value={p.id}>{nameOf(p)}</option>{/each}
        </select>
      </label>
      <label>
        locution, exactly as said
        <textarea rows="4" value={node.data.text} oninput={(e) => onchange(node.id, { ...node.data, text: e.currentTarget.value })}
        ></textarea>
      </label>
      <p class="muted">
        {node.data.span ? `Text span ${node.data.span.start}–${node.data.span.end}.` : 'Not linked to the text.'}
      </p>
      <label title="when this locution is the premise of a source-based (delta) argument: whose perspective it gives. Blank: read off the speakers of the anchoring transition.">
        perspective (delta premise)
        <select value={a.perspective ?? ''} onchange={(e) => setPta(node, { perspective: choice(e) })}>
          <option value="">from speakers</option>
          {#each PERSPECTIVES as p (p)}<option value={p}>{p}</option>{/each}
        </select>
      </label>
    {:else}
      {#if node.data.kind === 'RA' || node.data.kind === 'CA' || node.data.kind === 'MA'}
        <label>
          kind
          <select
            value={node.data.kind}
            onchange={(e) => {
              const kind = e.currentTarget.value as SchemeKind;
              onchange(node.id, { kind, text: DEFAULT_TEXT[kind] });
            }}
          >
            <option value="RA">RA: inference</option>
            <option value="CA">CA: conflict</option>
            <option value="MA">MA: rephrase</option>
          </select>
        </label>
      {/if}
      {#if node.data.kind !== 'RA'}
        <label>
          {node.data.kind === 'YA' ? 'illocutionary force' : 'scheme'}
          <Choice
            options={SCHEMES[node.data.kind]}
            value={node.data.text}
            onchange={(text) => onchange(node.id, { ...node.data, text })}
          />
        </label>
      {/if}
      {#if node.data.kind === 'YA'}
        {@const done = ((node.data.pta ?? {}) as Reconstruction).transformations ?? []}
        {#each roles.premises as s (s.id)}{@render statement('said', s)}{/each}
        {#each roles.conclusions as s (s.id)}{@render statement('content', s)}{/each}
        <fieldset>
          <legend>transformations (reconstruction)</legend>
          {#each TRANSFORMATIONS as t (t)}
            <label class="check" title={TRANSFORMATION_INFO[t]}>
              <input
                type="checkbox"
                checked={done.includes(t)}
                onchange={(e) =>
                  setPta(node, { transformations: e.currentTarget.checked ? [...done, t] : done.filter((x) => x !== t) })}
              />
              <span>{t}<small>{TRANSFORMATION_INFO[t]}</small></span>
            </label>
          {/each}
        </fieldset>
      {:else if node.data.kind === 'MA'}
        {#each roles.premises as s (s.id)}{@render statement('original', s)}{/each}
        {#each roles.conclusions as s (s.id)}{@render statement('rephrase', s)}{/each}
      {:else if node.data.kind === 'RA'}
        {@const c = (node.data.pta ?? {}) as Connector}
        {#each roles.conclusions as s (s.id)}{@render statement('conclusion', s)}{/each}
        {#each roles.premises as s (s.id)}{@render statement(s.kind === 'L' ? 'premise (locution)' : 'premise', s)}{/each}
        {#each roles.levers as s (s.id)}{@render statement('lever statement', s)}{/each}
        {#if type}
          <p>
            <b>{formatCode(type)}</b>
            {#if type.lever}<br />{type.lever.name}<br /><i>{type.lever.lever}</i>{/if}
          </p>
        {:else}
          <p class="muted">
            Untyped: needs one premise and one conclusion with subject and predicate set, or a source-based premise
            (a statement about the conclusion, or the locution that says it).
          </p>
        {/if}
        {@const mine = c.concepts ?? []}
        <label for="new-concept">concepts</label>
        <div class="chips">
          {#each [...new Set([...mine, ...concepts])].sort() as tag (tag)}
            <button class="chip" class:on={mine.includes(tag)} onclick={() =>
                setPta(node, { concepts: mine.includes(tag) ? mine.filter((t) => t !== tag) : [...mine, tag] })}
              >{tag}</button
            >
          {/each}
        </div>
        <input
          id="new-concept"
          placeholder="new concept, Enter to add (e.g. being/scotus)"
          onkeydown={(e) => {
            const tag = e.currentTarget.value.trim().toLowerCase();
            if (e.key !== 'Enter' || !tag) return;
            if (!mine.includes(tag)) setPta(node, { concepts: [...mine, tag] });
            e.currentTarget.value = '';
          }}
        />
        <label>
          note
          <textarea rows="3" value={c.note ?? ''} oninput={(e) => setPta(node, { note: e.currentTarget.value })}></textarea>
        </label>
      {/if}
    {/if}
  {:else}
    <p class="muted">
      Select a node or edge. Highlight text on the left to add a locution. Drag from a port (hover to see what it
      takes) onto another node to connect them; drop on an RA's lever port to link a stated lever. Backspace or Delete
      removes the selection.
    </p>
  {/if}

  <h4>Warnings</h4>
  {#if warnings.length}
    <ul>
      {#each warnings as w, i (i)}
        <li><button class="link" onclick={() => onselect(w.id)}>{w.message}</button></li>
      {/each}
    </ul>
  {:else}
    <p class="muted">None.</p>
  {/if}

  {#if hiddenCount}
    <p class="muted">{hiddenCount} nodes of other kinds (e.g. PA) are kept but not shown.</p>
  {/if}
</aside>

<style>
  aside {
    padding: 12px;
    border-left: 1px solid #cbd5e1;
    overflow-y: auto;
    font-size: 13px;
  }
  h3 small {
    color: #64748b;
    font-weight: normal;
  }
  textarea,
  input,
  select {
    width: 100%;
    box-sizing: border-box;
    font: inherit;
  }
  label {
    display: block;
    margin-bottom: 8px;
  }
  .pick {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  }
  .pick .ref {
    flex: 1;
    padding: 2px 4px;
  }
  .pick button {
    width: auto;
  }
  .active {
    background: #fde68a;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin: 3px 0 4px;
  }
  .chip {
    padding: 0 6px;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    background: white;
    font-size: 12px;
  }
  .chip.on {
    background: #dcfce7;
    border-color: #16a34a;
  }
  .row {
    display: flex;
    gap: 6px;
  }
  .row label {
    flex: 1;
  }
  fieldset {
    margin: 0 0 8px;
    border: 1px solid #e2e8f0;
  }
  .check {
    display: flex;
    gap: 6px;
    margin: 0;
  }
  .check {
    align-items: flex-start;
    margin-bottom: 4px;
  }
  .check input {
    width: auto;
    margin-top: 3px;
  }
  .check small {
    display: block;
    color: #64748b;
    font-size: 11px;
    line-height: 1.3;
  }
  .role {
    margin-bottom: 10px;
    padding: 6px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
  }
  .label {
    font-size: 11px;
    text-transform: uppercase;
    color: #64748b;
  }
  .terms {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: 4px;
    font-size: 12px;
  }
  .subject {
    background: #dbeafe;
  }
  .predicate {
    background: #fce7f3;
  }
  .muted {
    color: #64748b;
  }
  ul {
    padding-left: 16px;
  }
  .link {
    all: unset;
    cursor: pointer;
    color: #b45309;
  }
</style>
