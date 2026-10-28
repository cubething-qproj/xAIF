<!--
  An L-node: a locution, exactly as said, with its speaker. Edit both in the
  inspector; locutions are usually made by highlighting the source text.
-->
<script lang="ts">
  import { getContext } from 'svelte';
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { FlowNode } from './flow';

  let { id, data, selected }: NodeProps<FlowNode> = $props();
  /** Looks up a speaker's name; provided by the app. */
  const speakerName = getContext<(id: string) => string | undefined>('speakerName');
</script>

<div class="lnode" class:selected>
  <Handle type="target" position={Position.Top} />
  <span class="id">{id}</span>
  <div class="text">
    {#if data.speaker}<b>{speakerName(data.speaker) ?? 'Unknown Speaker'}:</b>{/if}
    {data.text}
  </div>
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .lnode {
    width: 220px;
    padding: 8px 10px;
    background: #ecfeff;
    border: 1.5px solid #0891b2;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.35;
  }
  .selected {
    box-shadow: 0 0 0 3px #67e8f9;
  }
  .id {
    float: right;
    margin-left: 6px;
    color: #0891b2;
    font-size: 10px;
  }
  .text {
    white-space: pre-wrap;
  }
</style>
