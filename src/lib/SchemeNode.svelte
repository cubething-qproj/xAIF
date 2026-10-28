<!--
  A scheme node (RA, CA, MA, YA or TA). An RA shows the form and substance
  derived from its premise and conclusion, and a lever slot offering only
  the levers that fit them; a side port takes a stated lever. A YA shows its
  illocutionary force and the transformations that reconstruct its
  locution's content. Other kinds show a scheme name if not the default.
-->
<script lang="ts">
  import { getContext } from 'svelte';
  import { Handle, Position, useSvelteFlow, type NodeProps } from '@xyflow/svelte';
  import { LEVER_HANDLE, type FlowNode } from './flow';
  import { DEFAULT_TEXT, type argumentType } from './xaif';
  import { NOVEL, leverOptions, ptaOf, type Connector, type Reconstruction } from './pta';

  let { id, data, selected }: NodeProps<FlowNode> = $props();
  const { updateNodeData } = useSvelteFlow();
  /** Looks up an RA's derived type; provided by the app. */
  const typeFor = getContext<(id: string) => ReturnType<typeof argumentType>>('argumentType');

  /** Port labels: [incoming, outgoing]. */
  const PORTS = { RA: ['premise', 'conclusion'], CA: ['attacker', 'attacks'], MA: ['original', 'rephrase'] } as const;
  const ports = $derived(data.kind === 'RA' || data.kind === 'CA' || data.kind === 'MA' ? PORTS[data.kind] : null);
  const type = $derived(data.kind === 'RA' ? typeFor(id) : null);
  const connector = $derived(data.kind === 'RA' ? ((data.pta ?? {}) as Connector) : {});
  const levers = $derived(type ? leverOptions(type) : []);
  const transformations = $derived(data.kind === 'YA' ? ((data.pta as Reconstruction | undefined)?.transformations ?? []) : []);

  function setLever(lever: string) {
    updateNodeData(id, { pta: ptaOf('RA', { ...connector, lever: lever || undefined }) });
  }
</script>

<div class="scheme {data.kind}" class:selected>
  {#if ports}<span class="port out">{ports[1]}</span>{/if}
  <Handle type="target" position={Position.Top} />
  {#if data.kind === 'RA'}
    <Handle id={LEVER_HANDLE} type="target" position={Position.Left} />
    <span class="port side">lever</span>
  {/if}
  <div class="head"><b>{data.kind}</b> <span class="id">{id}</span></div>
  {#if data.kind === 'RA'}
    {#if type}
      <div class="runes nodrag">
        <span class="rune" title="form (derived)">{type.form}</span>
        <span class="rune" title="substance (derived)">{type.substance ?? '·'}</span>
        <select value={connector.lever ?? ''} onchange={(e) => setLever(e.currentTarget.value)} title="lever">
          <option value="">·</option>
          {#each levers as l (l.keyword)}<option value={l.keyword} title={l.lever}>{l.symbol}</option>{/each}
          <option value={NOVEL}>novel</option>
        </select>
      </div>
    {:else}
      {#if data.text !== DEFAULT_TEXT.RA}<div class="foreign">{data.text}</div>{/if}
      <div class="muted" title="needs one premise and one conclusion whose subjects and predicates are set">untyped</div>
    {/if}
  {:else if data.kind === 'YA'}
    <div class="force">{data.text}</div>
    {#if transformations.length}<div class="tags">{transformations.join(', ')}</div>{/if}
  {:else if data.kind !== 'I' && data.kind !== 'L' && data.text !== DEFAULT_TEXT[data.kind]}
    <div class="foreign">{data.text}</div>
  {/if}
  <Handle type="source" position={Position.Bottom} />
  {#if ports}<span class="port in">{ports[0]}</span>{/if}
</div>

<style>
  .scheme {
    position: relative;
    min-width: 90px;
    padding: 5px 8px;
    border: 1.5px solid;
    border-radius: 14px;
    font-size: 12px;
    text-align: center;
  }
  .RA {
    background: #ecfdf5;
    border-color: #059669;
  }
  .CA {
    background: #fef2f2;
    border-color: #dc2626;
  }
  .MA {
    background: #fffbeb;
    border-color: #d97706;
  }
  .YA {
    background: #fefce8;
    border-color: #ca8a04;
  }
  .TA {
    background: #faf5ff;
    border-color: #9333ea;
  }
  .force {
    color: #713f12;
  }
  .selected {
    box-shadow: 0 0 0 3px #cbd5e1;
  }
  .id {
    color: #64748b;
    font-size: 10px;
  }
  .foreign,
  .tags {
    font-style: italic;
    color: #475569;
  }
  .tags {
    max-width: 160px;
    font-size: 10px;
  }
  .muted {
    color: #94a3b8;
  }
  .runes {
    display: flex;
    gap: 3px;
    justify-content: center;
    margin-top: 4px;
  }
  .rune,
  .runes select {
    font: inherit;
    font-weight: 600;
    padding: 1px 4px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    background: white;
  }
  .rune {
    background: #f1f5f9;
  }
  .port {
    position: absolute;
    left: calc(50% + 8px);
    font-size: 9px;
    color: #64748b;
    white-space: nowrap;
    pointer-events: none;
  }
  .port.out {
    bottom: -14px;
  }
  .port.in {
    top: -14px;
  }
  .port.side {
    left: auto;
    right: calc(100% + 8px);
    top: calc(50% - 14px);
  }
</style>
