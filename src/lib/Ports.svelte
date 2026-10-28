<!--
  A node's typed ports ({@link PORTS}) as handles: hollow for incoming,
  filled for outgoing. Hovering one names what it connects to.
-->
<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { PORTS } from './flow';
  import type { NodeKind } from './xaif';

  let { kind }: { kind: NodeKind } = $props();

  const along = (position: Position, offset?: number) =>
    offset === undefined ? '' : position === Position.Left || position === Position.Right ? `top: ${offset}%` : `left: ${offset}%`;
</script>

{#each PORTS[kind] as p (p.id)}
  <Handle
    id={p.id}
    type={p.type}
    position={p.position}
    class="port-{p.type} port-{p.id}"
    style={along(p.position, p.offset)}
    title="{p.type === 'target' ? 'in' : 'out'}: {p.label} ({p.kinds.join(', ')})"
  />
{/each}
