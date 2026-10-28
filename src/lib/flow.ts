/**
 * Conversion between the editor's xAIF graph ({@link ArgNode}, {@link ArgEdge})
 * and Svelte Flow's nodes and edges, plus automatic layout.
 *
 * All edges are drawn as floating straight lines between node borders. Nodes
 * keep a top (incoming) and bottom (outgoing) handle for dragging new
 * connections; a lever statement's edge lands on an RA's side handle
 * (`lever`) instead, and that handle is what marks the edge's role.
 *
 * Layout follows IAT diagrams once the file has locutions, in three columns:
 * logic (I, RA, CA, MA), links (YA) and locutions (L, TA). See
 * {@link laneLayout}. Without locutions, the graph is laid out top-to-bottom,
 * premises above their conclusions.
 */

import { Graph, layout as dagreLayout } from '@dagrejs/dagre';
import { MarkerType, type Edge, type Node } from '@xyflow/svelte';
import type { Pta } from './pta';
import type { ArgEdge, ArgNode, NodeKind } from './xaif';

export type NodeData = Pick<ArgNode, 'kind' | 'text' | 'pta' | 'speaker' | 'span'>;
export type FlowNode = Node<NodeData>;

export const MARKER = { type: MarkerType.ArrowClosed, width: 18, height: 18 };

/** Handle ID of the RA port that takes a lever statement. */
export const LEVER_HANDLE = 'lever';

/** Fallback sizes for layout before Svelte Flow has measured a node. */
const SIZE = { statement: { width: 220, height: 70 }, scheme: { width: 150, height: 50 } };

export function flowNode(n: ArgNode): FlowNode {
  const type = n.kind === 'I' ? 'inode' : n.kind === 'L' ? 'lnode' : 'scheme';
  const { id: _id, position, ...data } = n;
  return { id: n.id, type, position: position ?? { x: 0, y: 0 }, data };
}

export function flowEdge(e: ArgEdge): Edge {
  const edge: Edge = { id: e.id, source: e.from, target: e.to, type: 'floating', markerEnd: MARKER };
  return e.role === 'lever' ? leverEdge(edge) : edge;
}

/** Styles an edge as a lever link and attaches it to the RA's lever port. */
export function leverEdge(edge: Edge): Edge {
  return { ...edge, targetHandle: LEVER_HANDLE, label: 'lever', style: 'stroke-dasharray: 5 4; stroke: #059669' };
}

export function argNodes(nodes: FlowNode[]): ArgNode[] {
  return nodes.map((n) => ({ ...n.data, id: n.id, position: n.position }));
}

export function argEdges(edges: Edge[]): ArgEdge[] {
  return edges.map((e) => ({
    id: e.id,
    from: e.source,
    to: e.target,
    ...(e.targetHandle === LEVER_HANDLE && { role: 'lever' as const }),
  }));
}

/** Shortens a statement for display in a chip, e.g. a proposition subject. */
export function snippet(text: string | undefined, max = 40): string {
  if (text === undefined) return 'missing';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Lays the graph out: IAT columns if it has locutions, else top-to-bottom. */
export function layout(nodes: FlowNode[], edges: Edge[]): FlowNode[] {
  return nodes.some((n) => n.data.kind === 'L') ? laneLayout(nodes, edges) : treeLayout(nodes, edges);
}

function size(n: FlowNode): { width: number; height: number } {
  const fallback = n.data.kind === 'I' || n.data.kind === 'L' ? SIZE.statement : SIZE.scheme;
  return { width: n.measured?.width ?? fallback.width, height: n.measured?.height ?? fallback.height };
}

/** Top-to-bottom dagre layout, premises above their conclusions. */
function treeLayout(nodes: FlowNode[], edges: Edge[]): FlowNode[] {
  const g = new Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 70 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) => g.setNode(n.id, size(n)));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagreLayout(g);
  return nodes.map((n) => {
    const { x, y } = g.node(n.id);
    const { width, height } = size(n);
    return { ...n, position: { x: x - width / 2, y: y - height / 2 } };
  });
}

/**
 * IAT columns: logic | links | locutions.
 *
 * 1. The locution column is one sequence: locutions in text order, each
 *    reported locution (one without a span, anchored by a YA from another
 *    locution) right after its reporter, and each TA just before the
 *    locution it leads to.
 * 2. Each YA is level with its anchor (the L or TA it comes from).
 * 3. Each proposition and relation is level with the first YA that anchors
 *    it, so an RA sits beside the TA that argues it.
 * 4. Anything unanchored sits at the average height of its neighbours, or
 *    below everything; then overlaps within a column are pushed down.
 */
function laneLayout(nodes: FlowNode[], edges: Edge[]): FlowNode[] {
  const WIDTH = SIZE.statement.width;
  const COLUMN = { logic: 0, links: WIDTH + 70, locutions: 2 * WIDTH + 140 };
  const columnOf = (k: NodeKind) => (k === 'L' || k === 'TA' ? COLUMN.locutions : k === 'YA' ? COLUMN.links : COLUMN.logic);
  const GAP = 30;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const kind = (id: string) => byId.get(id)?.data.kind;
  const targets = (id: string) => edges.filter((e) => e.source === id).map((e) => e.target);
  const sources = (id: string) => edges.filter((e) => e.target === id).map((e) => e.source);
  const centreY = new Map<string, number>();

  // 1. The locution column.
  const spanned = nodes
    .filter((n) => n.data.kind === 'L')
    .sort((a, b) => (a.data.span?.start ?? Infinity) - (b.data.span?.start ?? Infinity) || a.position.y - b.position.y);
  const reported = (id: string) =>
    targets(id)
      .filter((ya) => kind(ya) === 'YA')
      .flatMap(targets)
      .filter((t) => kind(t) === 'L' && !byId.get(t)!.data.span);
  const sequence: string[] = [];
  const visit = (id: string) => {
    if (sequence.includes(id)) return;
    sequence.push(id);
    reported(id).forEach(visit);
  };
  spanned.forEach((l) => visit(l.id));
  for (const ta of nodes.filter((n) => n.data.kind === 'TA')) {
    const next = targets(ta.id).find((t) => kind(t) === 'L');
    const at = next ? sequence.indexOf(next) : -1;
    if (at >= 0) sequence.splice(at, 0, ta.id);
    else sequence.push(ta.id);
  }
  let cursor = 0;
  for (const id of sequence) {
    const h = size(byId.get(id)!).height;
    centreY.set(id, cursor + h / 2);
    cursor += h + GAP;
  }

  // 2. Links level with their anchors; 3. logic level with its first anchoring YA.
  for (const ya of nodes.filter((n) => n.data.kind === 'YA')) {
    const anchor = sources(ya.id).find((s) => kind(s) === 'L' || kind(s) === 'TA');
    if (anchor && centreY.has(anchor)) centreY.set(ya.id, centreY.get(anchor)!);
  }
  for (const n of nodes.filter((n) => columnOf(n.data.kind) === COLUMN.logic)) {
    const ys = sources(n.id)
      .filter((s) => kind(s) === 'YA')
      .map((s) => centreY.get(s))
      .filter((y): y is number => y !== undefined);
    if (ys.length) centreY.set(n.id, Math.min(...ys));
  }

  // 4. Unanchored nodes: average of placed neighbours (twice, so chains settle), else below.
  for (let pass = 0; pass < 2; pass++) {
    for (const n of nodes.filter((n) => !centreY.has(n.id))) {
      const ys = [...sources(n.id), ...targets(n.id)].map((i) => centreY.get(i)).filter((y): y is number => y !== undefined);
      if (ys.length) centreY.set(n.id, ys.reduce((a, b) => a + b, 0) / ys.length);
    }
  }
  const placed = nodes.map((n) => ({ n, x: columnOf(n.data.kind), cy: centreY.get(n.id) ?? Infinity, ...size(n) }));
  placed.sort((a, b) => a.cy - b.cy);
  const bottom = new Map<number, number>();
  for (const p of placed) {
    const floor = bottom.get(p.x) ?? -Infinity;
    if (p.cy === Infinity) p.cy = Math.max(cursor, floor + GAP) + p.height / 2;
    else if (p.cy - p.height / 2 < floor + 10) p.cy = floor + 10 + p.height / 2;
    bottom.set(p.x, p.cy + p.height / 2);
  }
  return placed.map(({ n, x, cy, width, height }) => ({ ...n, position: { x: x + (WIDTH - width) / 2, y: cy - height / 2 } }));
}
