<!--
  An I-node: a proposition, with its analysis (subject, predicate, statement
  type and subject scope) below the text once set. Edit both in the inspector.
-->
<script lang="ts">
  import { getContext } from 'svelte';
  import type { NodeProps } from '@xyflow/svelte';
  import Ports from './Ports.svelte';
  import { snippet, type FlowNode, type Focus } from './flow';
  import { badgeOf, predicateOf, type Analysis } from './pta';

  let { id, data, selected }: NodeProps<FlowNode> = $props();
  /** What is selected, if anything; provided by the app. */
  const focus = getContext<() => Focus | null>('focus');
  /** Looks up another I-node's text; provided by the app. */
  const textOf = getContext<(id: string) => string | undefined>('nodeText');
  const a = $derived((data.pta ?? {}) as Analysis);
  const types = $derived(badgeOf(a));
  const predicate = $derived(predicateOf(a));
</script>

<div class="inode" class:selected class:linked={focus()?.ends.has(id)}>
  <Ports kind="I" />
  <span class="id">{id}</span>
  <div class="text">{data.text}</div>
  {#if a.subject || a.subjectNode || predicate || types}
    <div class="analysis">
      {#if a.subjectNode}
        <span class="term subject" title="subject: proposition {a.subjectNode}">⟨{a.subjectNode}⟩ {snippet(textOf(a.subjectNode))}</span>
      {:else if a.subject}<span class="term subject" title="subject">{a.subject}</span>{/if}
      {#if predicate}<span class="term predicate" title="predicate">{predicate}</span>{/if}
      {#if types}<span class="types" title="type · scope · perspective · acceptability">{types}</span>{/if}
    </div>
  {/if}
</div>

<style>
  .inode {
    width: 220px;
    padding: 8px 10px;
    background: #eef2ff;
    border: 1.5px solid #4f46e5;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.35;
  }
  .id {
    float: right;
    margin-left: 6px;
    color: #6366f1;
    font-size: 10px;
  }
  .text {
    white-space: pre-wrap;
  }
  .analysis {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: 6px;
    padding-top: 5px;
    border-top: 1px dashed #a5b4fc;
    font-size: 11px;
  }
  .term {
    padding: 0 4px;
    border-radius: 3px;
  }
  .subject {
    background: #dbeafe;
    color: #1e3a8a;
  }
  .predicate {
    background: #fce7f3;
    color: #831843;
  }
  .types {
    margin-left: auto;
    font-weight: 700;
    color: #4338ca;
  }
</style>
