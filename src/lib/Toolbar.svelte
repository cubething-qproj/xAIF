<!--
  Session, file and node controls, rendered inside the flow so it can place
  new nodes at the centre of the current view. The session picker switches
  this tab to another saved session; "New tab" opens a fresh session beside
  this one.
-->
<script lang="ts">
  import { Panel, useSvelteFlow } from '@xyflow/svelte';
  import { NODE_KINDS, type NodeKind } from './xaif';
  import type { SessionInfo } from './sessions';

  let {
    session,
    list,
    onswitch,
    onopen,
    onsave,
    onsaveas,
    onnew,
    onnewtab,
    ondelete,
    onadd,
    onlayout,
  }: {
    /** The current session's ID. */
    session: string;
    /** All saved sessions, most recent first. */
    list: SessionInfo[];
    onswitch: (id: string) => void;
    onopen: () => void;
    onsave: () => void;
    onsaveas: () => void;
    onnew: () => void;
    onnewtab: () => void;
    ondelete: () => void;
    onadd: (kind: NodeKind, position: { x: number; y: number }) => void;
    onlayout: () => void;
  } = $props();

  const { screenToFlowPosition, fitView } = useSvelteFlow();

  const when = (t: number) =>
    new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  function add(kind: NodeKind) {
    const jitter = () => (Math.random() - 0.5) * 60;
    const centre = screenToFlowPosition({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 });
    onadd(kind, { x: centre.x + jitter(), y: centre.y + jitter() });
  }

  /** Re-fits the view after the flow has rendered the new nodes. */
  export function refit() {
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }
</script>

<Panel position="top-left">
  <div class="bar">
    <select value={session} onchange={(e) => onswitch(e.currentTarget.value)} title="switch session in this tab">
      {#each list as s (s.id)}<option value={s.id}>{s.name} · {when(s.updated)}</option>{/each}
      {#if !list.some((s) => s.id === session)}<option value={session}>(unsaved)</option>{/if}
    </select>
    <button onclick={onnew} title="start a new session in this tab">New</button>
    <button onclick={onopen} title="open a file as a new session">Open…</button>
    <button onclick={onsave} title="save to this session's file (asks where the first time)">Save</button>
    <button onclick={onsaveas} title="save to a new file, which becomes this session's file">Save as…</button>
    <button onclick={onnewtab} title="open a new session in another tab">New tab</button>
    <button onclick={ondelete} title="delete this session">Delete</button>
    <span class="sep"></span>
    {#each NODE_KINDS as kind (kind)}<button onclick={() => add(kind)}>+ {kind}</button>{/each}
    <span class="sep"></span>
    <button onclick={onlayout}>Auto layout</button>
  </div>
</Panel>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    max-width: 900px;
    padding: 6px;
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13px;
  }
  select {
    max-width: 260px;
    font: inherit;
  }
  .sep {
    width: 1px;
    align-self: stretch;
    background: #cbd5e1;
    margin: 0 2px;
  }
</style>
