<!--
  A straight edge between the borders of its two nodes, ignoring handles, so
  edges read cleanly in any direction (YA links run sideways, TAs downwards,
  inferences upwards). Handles still define where a connection is dragged
  from, and which port (premise or lever) it lands on.
-->
<script lang="ts">
  import { BaseEdge, getStraightPath, useInternalNode, type EdgeProps, type InternalNode } from '@xyflow/svelte';

  let { id, source, target, markerEnd, style, label, interactionWidth }: EdgeProps = $props();
  // An edge's endpoints never change; the editor replaces edges instead.
  // svelte-ignore state_referenced_locally
  const from = useInternalNode(source);
  // svelte-ignore state_referenced_locally
  const to = useInternalNode(target);

  /** Where the line from `a`'s centre towards `b`'s centre leaves `a`'s box. */
  function border(a: InternalNode, b: InternalNode): [number, number] {
    const centre = (n: InternalNode) => {
      const { x, y } = n.internals.positionAbsolute;
      return [x + (n.measured.width ?? 0) / 2, y + (n.measured.height ?? 0) / 2];
    };
    const [[ax, ay], [bx, by]] = [centre(a), centre(b)];
    const [dx, dy] = [bx - ax, by - ay];
    if (!dx && !dy) return [ax, ay];
    const scale = Math.min(
      (a.measured.width ?? 0) / 2 / Math.abs(dx || Number.EPSILON),
      (a.measured.height ?? 0) / 2 / Math.abs(dy || Number.EPSILON),
    );
    return [ax + dx * scale, ay + dy * scale];
  }

  const path = $derived.by(() => {
    if (!from.current || !to.current) return null;
    const [sourceX, sourceY] = border(from.current, to.current);
    const [targetX, targetY] = border(to.current, from.current);
    return getStraightPath({ sourceX, sourceY, targetX, targetY });
  });
</script>

{#if path}
  <BaseEdge {id} path={path[0]} labelX={path[1]} labelY={path[2]} {markerEnd} {style} {label} {interactionWidth} />
{/if}
