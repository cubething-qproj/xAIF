/**
 * Conversion between the editor's xAIF graph ({@link ArgNode}, {@link ArgEdge})
 * and Svelte Flow's nodes and edges, plus automatic layout.
 *
 * Every node has typed ports ({@link PORTS}): each handle accepts only the
 * node kinds that may connect there, and every edge is attached to the ports
 * that fit its two ends ({@link portsFor}). Ports sit on the side facing what
 * they connect to: dialogue runs down the locution column, anchoring runs
 * sideways through the links column, inference runs down the logic column.
 * A lever statement's edge lands on an RA's `lever` port, and that port is
 * what marks the edge's role.
 *
 * Layout follows IAT diagrams once the file has locutions, in three columns:
 * logic (I, RA, CA, MA), links (YA) and locutions (L, TA). See
 * {@link laneLayout}. Without locutions, the graph is laid out top-to-bottom,
 * premises above their conclusions.
 */

import { Graph, layout as dagreLayout } from '@dagrejs/dagre';
import { MarkerType, Position, type Edge, type Node } from '@xyflow/svelte';
import type { Pta } from './pta';
import type { ArgEdge, ArgNode, NodeKind } from './xaif';

export type NodeData = Pick<ArgNode, 'kind' | 'text' | 'pta' | 'speaker' | 'span'>;
export type FlowNode = Node<NodeData>;

export const MARKER = { type: MarkerType.ArrowClosed, width: 18, height: 18 };

/**
 * The current selection, for highlighting: the selected node, or the two
 * ends of the selected edge.
 */
export interface Focus {
  node?: string;
  ends: Set<string>;
}

/** Handle ID of the RA port that takes a lever statement. */
export const LEVER_HANDLE = 'lever';

/**
 * A connection point on a node: incoming (`target`) or outgoing (`source`),
 * the node kinds it accepts at the other end, and where it sits (`offset`
 * is the percentage along its side, for two ports on one side).
 */
export interface Port {
  id: string;
  type: 'source' | 'target';
  position: Position;
  offset?: number;
  kinds: readonly NodeKind[];
  label: string;
}

const port = (id: string, type: Port['type'], position: Position, kinds: NodeKind[], label: string, offset?: number): Port => ({
  id,
  type,
  position,
  kinds,
  label,
  ...(offset !== undefined && { offset }),
});
const { Top, Bottom, Left, Right } = Position;
const ANCHOR = port('anchor', 'target', Right, ['YA'], 'anchored by');

/**
 * Each kind's ports, in order of preference when an edge fits more than
 * one. Together they accept exactly the edges IAT allows (`canConnect`).
 */
export const PORTS: Record<NodeKind, Port[]> = {
  L: [
    port('ta-in', 'target', Top, ['TA'], 'from transition'),
    port('ta-out', 'source', Bottom, ['TA'], 'to transition'),
    port('reported', 'target', Left, ['YA', 'CA'], 'reported / attacked', 30),
    port('says', 'source', Left, ['YA', 'RA', 'CA'], 'anchors / premise', 70),
  ],
  TA: [
    port('in', 'target', Top, ['L'], 'from locution'),
    port('out', 'source', Bottom, ['L'], 'to locution'),
    port('anchors', 'source', Left, ['YA'], 'anchors'),
  ],
  YA: [
    port('in', 'target', Right, ['L', 'TA'], 'from locution / transition', 30),
    port('reports', 'source', Right, ['L'], 'reported locution', 70),
    port('out', 'source', Left, ['I', 'RA', 'CA', 'MA'], 'anchors'),
  ],
  I: [
    ANCHOR,
    port('in', 'target', Top, ['RA', 'CA', 'MA'], 'conclusion of'),
    port('out', 'source', Bottom, ['RA', 'CA', 'MA'], 'premise / lever of'),
  ],
  RA: [
    ANCHOR,
    port('premise', 'target', Top, ['I', 'L', 'RA'], 'premise'),
    port(LEVER_HANDLE, 'target', Left, ['I'], 'lever', 35),
    port('undercut', 'target', Left, ['CA'], 'undercut', 75),
    port('out', 'source', Bottom, ['I', 'RA', 'CA'], 'conclusion'),
  ],
  CA: [
    ANCHOR,
    port('in', 'target', Top, ['I', 'L', 'RA', 'CA'], 'attacker'),
    port('out', 'source', Bottom, ['I', 'L', 'RA', 'CA', 'MA'], 'attacks'),
  ],
  MA: [
    ANCHOR,
    port('in', 'target', Top, ['I', 'CA'], 'original'),
    port('out', 'source', Bottom, ['I'], 'rephrase'),
  ],
};

/**
 * The ports an edge from a `from` node to a `to` node attaches to, or null
 * if no ports fit. A lever edge must land on the lever port, and nothing
 * else may. Given handles are kept if they fit.
 */
export function portsFor(
  from: NodeKind,
  to: NodeKind,
  given: { source?: string | null; target?: string | null; lever?: boolean } = {},
): { sourceHandle: string; targetHandle: string } | null {
  const fits = (p: Port, type: Port['type'], other: NodeKind, id?: string | null) =>
    p.type === type && p.kinds.includes(other) && (!id || p.id === id);
  const lever = given.lever || given.target === LEVER_HANDLE;
  const source = PORTS[from].find((p) => fits(p, 'source', to, given.source));
  const target = PORTS[to].find((p) => fits(p, 'target', from, given.target) && (p.id === LEVER_HANDLE) === lever);
  return source && target ? { sourceHandle: source.id, targetHandle: target.id } : null;
}

/** Fallback sizes for layout before Svelte Flow has measured a node. */
const SIZE = { statement: { width: 220, height: 70 }, scheme: { width: 150, height: 50 } };

export function flowNode(n: ArgNode): FlowNode {
  const type = n.kind === 'I' ? 'inode' : n.kind === 'L' ? 'lnode' : 'scheme';
  const { id: _id, position, ...data } = n;
  return { id: n.id, type, position: position ?? { x: 0, y: 0 }, data };
}

/**
 * A Svelte Flow edge between the ports that fit its ends' kinds. An edge IAT
 * doesn't allow (which the linter reports) gets each node's default handle.
 */
export function flowEdge(e: ArgEdge, kindOf: (id: string) => NodeKind | undefined): Edge {
  const [from, to] = [kindOf(e.from), kindOf(e.to)];
  const handles = from && to ? portsFor(from, to, { lever: e.role === 'lever' }) : null;
  return { id: e.id, source: e.from, target: e.to, type: 'port', markerEnd: MARKER, ...handles };
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
 * IAT columns: logic | links | locutions, laid out in rows shared by all
 * three columns, so the columns stay level with each other however tall
 * any one of them gets (readability over compactness).
 *
 * 1. The locution column is one sequence, one row each: locutions in text
 *    order, each reported locution (one without a span, anchored by a YA
 *    from another locution) right after its reporter, and each TA just
 *    before the locution it leads to.
 * 2. Each YA joins its anchor's row (the L or TA it comes from).
 * 3. Each proposition and relation joins the row of the first YA that
 *    anchors it, so an RA sits beside the TA that argues it.
 * 4. Anything unanchored joins the row nearest its neighbours' average, or
 *    a final row.
 * 5. A row is as tall as its tallest column; within a row, each column's
 *    nodes are stacked (premises above what they lead to) and centred.
 */
function laneLayout(nodes: FlowNode[], edges: Edge[]): FlowNode[] {
  const WIDTH = SIZE.statement.width;
  const COLUMN = { logic: 0, links: WIDTH + 70, locutions: 2 * WIDTH + 140 };
  const columnOf = (k: NodeKind) => (k === 'L' || k === 'TA' ? COLUMN.locutions : k === 'YA' ? COLUMN.links : COLUMN.logic);
  const [GAP, ROW_GAP] = [20, 30];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const kind = (id: string) => byId.get(id)?.data.kind;
  const targets = (id: string) => edges.filter((e) => e.source === id).map((e) => e.target);
  const sources = (id: string) => edges.filter((e) => e.target === id).map((e) => e.source);
  const rowOf = new Map<string, number>();

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
  sequence.forEach((id, row) => rowOf.set(id, row));

  // 2. Links in their anchors' rows; 3. logic in its first anchoring YA's row.
  for (const ya of nodes.filter((n) => n.data.kind === 'YA')) {
    const anchor = sources(ya.id).find((s) => kind(s) === 'L' || kind(s) === 'TA');
    if (anchor && rowOf.has(anchor)) rowOf.set(ya.id, rowOf.get(anchor)!);
  }
  for (const n of nodes.filter((n) => columnOf(n.data.kind) === COLUMN.logic)) {
    const rows = sources(n.id)
      .filter((s) => kind(s) === 'YA')
      .map((s) => rowOf.get(s))
      .filter((r): r is number => r !== undefined);
    if (rows.length) rowOf.set(n.id, Math.min(...rows));
  }

  // 4. Unanchored nodes: nearest their placed neighbours (twice, so chains settle), else a final row.
  for (let pass = 0; pass < 2; pass++) {
    for (const n of nodes.filter((n) => !rowOf.has(n.id))) {
      const rows = [...sources(n.id), ...targets(n.id)].map((i) => rowOf.get(i)).filter((r): r is number => r !== undefined);
      if (rows.length) rowOf.set(n.id, Math.round(rows.reduce((a, b) => a + b, 0) / rows.length));
    }
  }
  const last = sequence.length;

  // 5. Rows: stack each column's cell, premises first, and centre it in the row.
  const depth = new Map<string, number>();
  const depthOf = (id: string, seen = new Set<string>()): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const ups = sources(id).filter((s) => columnOf(kind(s)!) === COLUMN.logic);
    const d = ups.length ? 1 + Math.max(...ups.map((s) => depthOf(s, seen))) : 0;
    depth.set(id, d);
    return d;
  };
  const cells = new Map<string, FlowNode[]>();
  for (const n of nodes) {
    const key = `${rowOf.get(n.id) ?? last}:${columnOf(n.data.kind)}`;
    cells.set(key, [...(cells.get(key) ?? []), n]);
  }
  const cellHeight = (ns: FlowNode[]) => ns.reduce((h, n) => h + size(n).height, 0) + GAP * (ns.length - 1);
  const rows = Math.max(last, ...rowOf.values()) + 1;
  const positions = new Map<string, { x: number; y: number }>();
  let top = 0;
  for (let row = 0; row < rows; row++) {
    const columns = Object.values(COLUMN).map((x) => {
      const ns = (cells.get(`${row}:${x}`) ?? []).sort((a, b) => depthOf(a.id) - depthOf(b.id) || a.position.y - b.position.y);
      return { x, ns, height: cellHeight(ns) };
    });
    const height = Math.max(0, ...columns.map((c) => c.height));
    if (!height) continue;
    for (const { x, ns, height: h } of columns) {
      let y = top + (height - h) / 2;
      for (const n of ns) {
        const { width, height: nh } = size(n);
        positions.set(n.id, { x: x + (WIDTH - width) / 2, y });
        y += nh + GAP;
      }
    }
    top += height + ROW_GAP;
  }
  return nodes.map((n) => ({ ...n, position: positions.get(n.id) ?? n.position }));
}
