<!--
  The source text, as in OVA's left panel. Highlighting a span offers to add
  it as a locution for the current speaker; spans already made into
  locutions are shaded in their speaker's colour and select their L-node
  when clicked. The selected locution's span has a handle at each end;
  dragging one resizes the span. Speakers are added and renamed here. "Edit text" switches
  to a plain textarea; the app relocates spans when the text changes.
-->
<script lang="ts">
  import { nameOf, type ArgNode, type Participant } from './xaif';

  let {
    text,
    participants,
    locutions,
    selected,
    ontext,
    onparticipants,
    onadd,
    onselect,
    onspan,
  }: {
    text: string;
    participants: Participant[];
    /** L-nodes; those with a span are shaded. */
    locutions: ArgNode[];
    selected: string | undefined;
    ontext: (text: string) => void;
    onparticipants: (participants: Participant[]) => void;
    /** Adds a locution for a span of the text, spoken by `speaker` if set. */
    onadd: (span: { start: number; end: number }, speaker: string | undefined) => void;
    onselect: (id: string) => void;
    /** Moves a locution's span. */
    onspan: (id: string, span: { start: number; end: number }) => void;
  } = $props();

  let editing = $state(false);
  let draft = $state('');
  let speaker = $state<string | undefined>();
  let pending = $state<{ start: number; end: number } | null>(null);
  let container: HTMLDivElement | undefined = $state();
  /** The span end being dragged, if any. */
  let dragging = $state<'start' | 'end' | null>(null);

  /** The selected locution's span, which gets resize handles. */
  const span = $derived(locutions.find((l) => l.id === selected)?.span);

  const colour = (id: string | undefined) => {
    const i = participants.findIndex((p) => p.id === id);
    return i < 0 ? 'hsl(200 15% 85%)' : `hsl(${(i * 137 + 190) % 360} 75% 84%)`;
  };

  /** The text cut at every span boundary, each piece listing the locutions covering it. */
  const segments = $derived.by(() => {
    const spans = locutions.filter((l) => l.span).map((l) => ({ id: l.id, speaker: l.speaker, ...l.span! }));
    const cuts = [...new Set([0, text.length, ...spans.flatMap((s) => [s.start, s.end])])]
      .filter((c) => c >= 0 && c <= text.length)
      .sort((a, b) => a - b);
    return cuts.slice(0, -1).map((start, i) => {
      const end = cuts[i + 1];
      return { start, end, covering: spans.filter((s) => s.start <= start && s.end >= end) };
    });
  });

  /** Offset of a DOM position within the rendered text. */
  function offsetOf(node: Node, offset: number): number {
    const range = document.createRange();
    range.setStart(container!, 0);
    range.setEnd(node, offset);
    return range.toString().length;
  }

  /** Offset in the text under a screen point, if it is over the text. */
  function offsetAt(x: number, y: number): number | null {
    const pos = document.caretPositionFromPoint?.(x, y);
    const range = pos ? null : document.caretRangeFromPoint?.(x, y);
    const [node, offset] = pos ? [pos.offsetNode, pos.offset] : range ? [range.startContainer, range.startOffset] : [null, 0];
    return node && container?.contains(node) ? offsetOf(node, offset) : null;
  }

  /** Trims a span as new locutions are trimmed: no surrounding whitespace or final punctuation. */
  function trim(start: number, end: number) {
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /[\s.,;:!?]/.test(text[end - 1])) end--;
    return { start, end };
  }

  /** Starts dragging one end of the selected span. */
  function grab(e: PointerEvent, which: 'start' | 'end') {
    e.preventDefault();
    e.stopPropagation();
    dragging = which;
  }

  /** Moves the dragged end to the text offset under the pointer, keeping the span non-empty. */
  function drag(e: PointerEvent) {
    if (!dragging || !span || !selected) return;
    const at = offsetAt(e.clientX, e.clientY);
    if (at === null) return;
    const next = trim(dragging === 'start' ? Math.min(at, span.end - 1) : span.start, dragging === 'end' ? Math.max(at, span.start + 1) : span.end);
    if (next.end > next.start && (next.start !== span.start || next.end !== span.end)) onspan(selected, next);
  }

  /**
   * On mouseup: a non-empty selection inside the text becomes the pending
   * span, trimmed of surrounding whitespace and final punctuation (IAT
   * excludes both from locutions); a plain click on a shaded span selects
   * its locution.
   */
  function onmouseup(e: MouseEvent) {
    if (dragging) return;
    const sel = window.getSelection();
    if (!sel || !container || !sel.anchorNode || !container.contains(sel.anchorNode) || !container.contains(sel.focusNode)) return;
    if (sel.isCollapsed) {
      pending = null;
      const covering = segments.find((s) => s.start === Number((e.target as HTMLElement).dataset.start))?.covering ?? [];
      if (covering.length) onselect(covering.at(-1)!.id);
      return;
    }
    const [from, to] = [offsetOf(sel.anchorNode, sel.anchorOffset), offsetOf(sel.focusNode!, sel.focusOffset)].sort((a, b) => a - b);
    const { start, end } = trim(from, to);
    pending = end > start ? { start, end } : null;
  }

  function add() {
    if (!pending) return;
    onadd(pending, speaker);
    pending = null;
    window.getSelection()?.removeAllRanges();
  }

  function addSpeaker() {
    const name = prompt('Speaker name (Forename Surname)')?.trim();
    if (!name) return;
    const [firstname, ...rest] = name.split(/\s+/);
    const id = String(Math.max(0, ...participants.map((p) => Number(p.id)).filter(Number.isFinite)) + 1);
    onparticipants([...participants, { id, firstname, surname: rest.join(' ') }]);
    speaker = id;
  }

  function rename(p: Participant) {
    const name = prompt('Rename speaker', nameOf(p))?.trim();
    if (!name) return;
    const [firstname, ...rest] = name.split(/\s+/);
    onparticipants(participants.map((q) => (q.id === p.id ? { ...q, firstname, surname: rest.join(' ') } : q)));
  }

  function toggleEdit() {
    if (editing) ontext(draft);
    else draft = text;
    editing = !editing;
    pending = null;
  }
</script>

<!-- Release after the click that ends the drag, so it doesn't also select a locution. -->
<svelte:window onpointermove={drag} onpointerup={() => dragging && setTimeout(() => (dragging = null))} />

<section class:dragging>
  <header>
    <div class="speakers">
      {#each participants as p (p.id)}
        <button
          class="speaker"
          class:current={speaker === p.id}
          style:background={colour(p.id)}
          title="click: speak as {nameOf(p)} · double-click: rename"
          onclick={() => (speaker = speaker === p.id ? undefined : p.id)}
          ondblclick={() => rename(p)}>{nameOf(p) || '(unnamed)'}</button
        >
      {/each}
      <button onclick={addSpeaker} title="add a speaker">+ speaker</button>
    </div>
    <button onclick={toggleEdit}>{editing ? 'Done editing' : 'Edit text'}</button>
  </header>

  {#if pending && !editing}
    <div class="pending">
      <span>“{text.slice(pending.start, pending.end)}”</span>
      <button onclick={add}>
        Add locution{speaker ? ` (${nameOf(participants.find((p) => p.id === speaker)!)})` : ''}
      </button>
      <button onclick={() => (pending = null)}>×</button>
    </div>
  {/if}

  {#if editing}
    <textarea bind:value={draft} placeholder="Paste the text to analyse"></textarea>
  {:else if text}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="text" bind:this={container} {onmouseup}>
      {#each segments as s (s.start)}{#if span && s.start === span.start}<span
            class="grip"
            title="drag to move the start of the span"
            onpointerdown={(e) => grab(e, 'start')}
          ></span>{/if}{#if span && s.start === span.end}<span
            class="grip"
            title="drag to move the end of the span"
            onpointerdown={(e) => grab(e, 'end')}
          ></span>{/if}<span
          data-start={s.start}
          class:hl={s.covering.length}
          class:sel={s.covering.some((c) => c.id === selected)}
          style:background={s.covering.length ? colour(s.covering.at(-1)!.speaker) : undefined}
          style:box-shadow={s.covering.length > 1 ? 'inset 0 -3px 0 #0891b2' : undefined}>{text.slice(s.start, s.end)}</span
        >{/each}{#if span && span.end === text.length}<span
          class="grip"
          title="drag to move the end of the span"
          onpointerdown={(e) => grab(e, 'end')}
        ></span>{/if}
    </div>
  {:else}
    <p class="muted">No text yet. Use “Edit text” to paste the passage you're analysing.</p>
  {/if}
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-right: 1px solid #cbd5e1;
    font-size: 13px;
  }
  header {
    display: flex;
    gap: 6px;
    align-items: flex-start;
    justify-content: space-between;
    padding: 8px;
    border-bottom: 1px solid #e2e8f0;
  }
  .speakers {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .speaker {
    border: 1px solid #94a3b8;
    border-radius: 10px;
    padding: 1px 8px;
  }
  .current {
    outline: 2px solid #0f172a;
  }
  .pending {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 6px 8px;
    background: #fef9c3;
    border-bottom: 1px solid #fde68a;
  }
  .pending span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-style: italic;
  }
  .text {
    flex: 1;
    overflow-y: auto;
    padding: 10px 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    font-size: 14px;
  }
  .hl {
    border-radius: 2px;
    cursor: pointer;
  }
  .sel {
    outline: 2px solid #0891b2;
  }
  .grip {
    display: inline-block;
    position: relative;
    width: 0;
    height: 1.2em;
    vertical-align: text-bottom;
    border-left: 3px solid #0891b2;
    margin: 0 -1.5px;
    cursor: ew-resize;
    touch-action: none;
  }
  .grip::before {
    content: '';
    position: absolute;
    top: -5px;
    left: -6px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #0891b2;
  }
  .dragging,
  .dragging .text {
    cursor: ew-resize;
    user-select: none;
  }
  textarea {
    flex: 1;
    margin: 8px;
    font: inherit;
    font-size: 14px;
    resize: none;
  }
  .muted {
    padding: 0 12px;
    color: #64748b;
  }
</style>
