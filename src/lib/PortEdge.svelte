<!--
  An edge between two typed ports, drawn as a curve leaving and entering
  each port square to its side. Edges touching the focus (the selected node,
  or the selected edge itself) are drawn bold; while anything is focused,
  the rest are faded so the focused connections stand out of a tangle.
  Lever links are dashed.
-->
<script lang="ts">
  import { getContext } from 'svelte';
  import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/svelte';
  import { LEVER_HANDLE, type Focus } from './flow';

  let {
    id,
    source,
    target,
    targetHandleId,
    selected,
    markerEnd,
    label,
    interactionWidth,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  }: EdgeProps = $props();
  /** What is selected, if anything; provided by the app. */
  const focus = getContext<() => Focus | null>('focus');

  const path = $derived(getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }));
  const focused = $derived(selected || focus()?.node === source || focus()?.node === target);
  const lever = $derived(targetHandleId === LEVER_HANDLE);
</script>

<BaseEdge
  {id}
  path={path[0]}
  labelX={path[1]}
  labelY={path[2]}
  label={lever ? 'lever' : label}
  {markerEnd}
  {interactionWidth}
  class={['edge', { focused, faded: !!focus() && !focused, lever }]}
/>
