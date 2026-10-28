/**
 * Loading and saving xAIF with the dialogue layer as the primary layer.
 *
 * The editor shows the node kinds of Inference Anchoring Theory (IAT): the
 * dialogue (L-nodes for what was said, TA transitions between them), the
 * propositions (I-nodes for what was asserted, RA/CA/MA relations between
 * them) and the YA illocutionary connections that anchor one in the other.
 * The source text, speakers (`participants`) and locution spans
 * (`locutions[].start/end`) are edited too. Any other node kind (e.g. PA),
 * edges touching it, and every unknown field are kept aside and written back
 * unchanged. Node positions live in the `OVA` block, as OVA3 stores them.
 *
 * Extensions to xAIF: nodes carry PTA data in a `pta` field (see `pta.ts`);
 * an edge into an RA node may carry `role: "lever"`, marking a stated lever
 * rather than a premise; an RA node's text is written as its PTA code (e.g.
 * `α VF Cr`) whenever its type can be derived; the source text is always
 * saved as plain text, with spans kept in `locutions`.
 */

import {
  deriveCode,
  formatCode,
  ptaOf,
  typeOf,
  type Analysis,
  type Connector,
  type Perspective,
  type Pta,
  type PtaCode,
} from './pta';

export const NODE_KINDS = ['L', 'I', 'TA', 'YA', 'RA', 'CA', 'MA'] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

/** Scheme kinds: the S-nodes, which relate other nodes. */
export type SchemeKind = Exclude<NodeKind, 'L' | 'I'>;

export const DEFAULT_TEXT: Record<SchemeKind, string> = {
  RA: 'Default Inference',
  CA: 'Default Conflict',
  MA: 'Default Rephrase',
  YA: 'Default Illocuting',
  TA: 'Default Transition',
};

/** Scheme names offered per kind (IAT quick start guide, 2023); any other name can be typed. */
export const SCHEMES: Record<Exclude<SchemeKind, 'RA'>, string[]> = {
  YA: [
    'Asserting',
    'Pure Questioning',
    'Assertive Questioning',
    'Rhetorical Questioning',
    'Challenging',
    'Agreeing',
    'Disagreeing',
    'Restating',
    'Arguing',
    'Default Illocuting',
  ],
  TA: ['Default Transition'],
  CA: ['Default Conflict', 'Conflict from Propositional Negation', 'Conflict from Bias'],
  MA: ['Default Rephrase', 'Specialisation', 'Generalisation', 'Instantiation'],
};

/**
 * Which node kinds an edge may lead to from each kind, following IAT:
 * locutions anchor YAs and are joined by TAs; YAs anchor propositions,
 * reported locutions and relations; relations join propositions (a locution
 * can be a source-based premise or an attacked report) and can target other
 * relations (undercut).
 */
const CONNECTS: Record<NodeKind, readonly NodeKind[]> = {
  L: ['YA', 'TA', 'RA', 'CA'],
  I: ['RA', 'CA', 'MA'],
  TA: ['L', 'YA'],
  YA: ['I', 'L', 'RA', 'CA', 'MA'],
  RA: ['I', 'RA', 'CA'],
  CA: ['I', 'L', 'RA', 'CA', 'MA'],
  MA: ['I'],
};

type Id = string | number;
type Json = Record<string, unknown>;

/** An xAIF node as stored; unknown fields (timestamps etc.) are preserved. */
export interface XNode extends Json {
  nodeID: Id;
  type: string;
  text: string;
}

export interface XEdge extends Json {
  edgeID: Id;
  fromID: Id;
  toID: Id;
}

/** A whole xAIF document. Only `AIF.nodes` and `AIF.edges` are required. */
export interface Xaif extends Json {
  AIF: Json & { nodes: XNode[]; edges: XEdge[] };
}

/** A speaker. IDs are strings in the editor and written back in the file's ID style. */
export interface Participant {
  id: string;
  firstname: string;
  surname: string;
}

/** A node as the editor sees it. */
export interface ArgNode {
  id: string;
  kind: NodeKind;
  /** For an L-node, the locution without its `Speaker: ` prefix. */
  text: string;
  /** PTA data for the node's kind (see `pta.ts`). */
  pta?: Pta;
  /** An L-node's speaker (participant ID). */
  speaker?: string;
  /** An L-node's span in the source text, as character offsets. */
  span?: { start: number; end: number };
  position?: { x: number; y: number };
}

export interface ArgEdge {
  id: string;
  from: string;
  to: string;
  /** Set on an edge into an RA that links a stated lever instead of a premise. */
  role?: 'lever';
}

/**
 * A loaded document: the editable graph, text and speakers, plus everything
 * needed to write the rest back. Build one with {@link Doc.load} or
 * {@link Doc.empty}.
 */
export class Doc {
  private constructor(
    /** The original document, used as the base when saving. */
    private readonly source: Xaif,
    /** Nodes and edges of kinds the editor doesn't show, kept verbatim. */
    private readonly hidden: { nodes: XNode[]; edges: XEdge[] },
    /** Original records of shown items, to keep unknown fields. */
    private readonly raw: Map<string, Json>,
    /** Whether the file used numeric IDs, so new IDs match. */
    private readonly numericIds: boolean,
    public readonly nodes: ArgNode[],
    public readonly edges: ArgEdge[],
    public readonly text: string,
    public readonly participants: Participant[],
  ) {}

  static empty(): Doc {
    return Doc.load({ AIF: { nodes: [], edges: [], schemefulfillments: [], locutions: [], participants: [] }, text: '' });
  }

  /** Splits a document into the editable graph and the preserved remainder. */
  static load(json: unknown): Doc {
    const source = structuredClone(json) as Xaif;
    if (!source?.AIF || !Array.isArray(source.AIF.nodes) || !Array.isArray(source.AIF.edges)) {
      throw new Error('not an xAIF document: missing AIF.nodes or AIF.edges');
    }
    const list = (v: unknown): Json[] => (Array.isArray(v) ? v : []);
    const positions = readPositions(source);
    const raw = new Map<string, Json>();
    const participants = list(source.AIF.participants).map((p) => {
      raw.set(`p${p.participantID}`, p);
      return { id: String(p.participantID), firstname: String(p.firstname ?? ''), surname: String(p.surname ?? '') };
    });
    const locutions = new Map(list(source.AIF.locutions).map((l) => [String(l.nodeID), l]));
    const { text, spans } = readText(source.text);
    const shown = new Set<string>();
    const nodes: ArgNode[] = [];
    const hiddenNodes: XNode[] = [];
    for (const n of source.AIF.nodes) {
      const id = String(n.nodeID);
      if (!isNodeKind(n.type)) {
        hiddenNodes.push(n);
        continue;
      }
      shown.add(id);
      raw.set(`n${id}`, n);
      const node: ArgNode = { id, kind: n.type, text: n.text ?? '', pta: ptaOf(n.type, n.pta), position: positions.get(id) };
      if (n.type === 'L') {
        const loc = locutions.get(id);
        const speaker = participants.find((p) => loc && String(loc.personID) === p.id);
        const prefix = speaker && `${nameOf(speaker)}:`;
        if (prefix && node.text.startsWith(prefix)) node.text = node.text.slice(prefix.length).trim();
        node.speaker = speaker?.id;
        const span = typeof loc?.start === 'number' && typeof loc?.end === 'number' ? { start: loc.start, end: loc.end } : spans.get(id);
        if (span) node.span = span;
        if (loc) raw.set(`l${id}`, loc);
      }
      nodes.push(node);
    }
    const edges: ArgEdge[] = [];
    const hiddenEdges: XEdge[] = [];
    for (const e of source.AIF.edges) {
      const [from, to] = [String(e.fromID), String(e.toID)];
      if (!(shown.has(from) && shown.has(to))) {
        hiddenEdges.push(e);
        continue;
      }
      raw.set(`e${e.edgeID}`, e);
      edges.push({ id: String(e.edgeID), from, to, ...(e.role === 'lever' && { role: 'lever' as const }) });
    }
    const allIds = [...source.AIF.nodes.map((n) => n.nodeID), ...source.AIF.edges.map((e) => e.edgeID)];
    const numericIds = allIds.length === 0 || allIds.every((id) => typeof id === 'number');
    return new Doc(source, { nodes: hiddenNodes, edges: hiddenEdges }, raw, numericIds, nodes, edges, text, participants);
  }

  /** Number of preserved nodes of kinds the editor doesn't show. */
  get hiddenCount(): number {
    return this.hidden.nodes.length;
  }

  /**
   * A numeric-looking ID above every node and edge ID in the document and
   * in `taken`. {@link Doc.save} writes it as a number if the file did.
   */
  freshId(taken: Iterable<string>): string {
    const used = [
      ...this.hidden.nodes.map((n) => n.nodeID),
      ...this.hidden.edges.map((e) => e.edgeID),
      ...[...this.raw.keys()].filter((k) => /^[ne]/.test(k)).map((k) => k.slice(1)),
      ...taken,
    ];
    const max = Math.max(0, ...used.map(Number).filter(Number.isFinite));
    return String(max + 1);
  }

  /** Writes the edited graph, text and speakers back into a copy of the source document. */
  save(nodes: ArgNode[], edges: ArgEdge[], text: string, participants: Participant[]): Xaif {
    const out = structuredClone(this.source);
    const id = (s: string): Id => (this.numericIds && /^\d+$/.test(s) ? Number(s) : s);
    const speaker = new Map(participants.map((p) => [p.id, p]));
    out.text = text;
    out.AIF.participants = participants.map((p) => ({
      ...this.raw.get(`p${p.id}`),
      participantID: id(p.id),
      firstname: p.firstname,
      surname: p.surname,
    }));
    out.AIF.locutions = nodes
      .filter((n) => n.kind === 'L')
      .map((n) => {
        const { start: _s, end: _e, ...rest } = this.raw.get(`l${n.id}`) ?? {};
        return { ...rest, nodeID: id(n.id), ...(n.speaker && { personID: id(n.speaker) }), ...n.span };
      });
    out.AIF.nodes = [
      ...this.hidden.nodes,
      ...nodes.map((n) => {
        const { pta: _old, ...rest } = this.raw.get(`n${n.id}`) ?? {};
        const pta = ptaOf(n.kind, n.pta);
        const type = n.kind === 'RA' ? argumentType(n.id, nodes, edges) : null;
        const who = n.kind === 'L' && n.speaker ? speaker.get(n.speaker) : undefined;
        const text = type ? formatCode(type) : who ? `${nameOf(who)}: ${n.text}` : n.text;
        return { ...rest, nodeID: id(n.id), type: n.kind, text, ...(pta && { pta }) };
      }),
    ];
    out.AIF.edges = [
      ...this.hidden.edges,
      ...edges.map((e) => {
        const { role: _old, ...rest } = this.raw.get(`e${e.id}`) ?? {};
        return { ...rest, edgeID: id(e.id), fromID: id(e.from), toID: id(e.to), ...(e.role && { role: e.role }) };
      }),
    ];
    const live = new Set(out.AIF.nodes.map((n) => String(n.nodeID)));
    if (Array.isArray(out.AIF.schemefulfillments)) {
      out.AIF.schemefulfillments = out.AIF.schemefulfillments.filter((s: Json) => live.has(String(s.nodeID)));
    }
    writePositions(out, nodes, new Set(this.hidden.nodes.map((n) => String(n.nodeID))), id);
    return out;
  }
}

/** A speaker's display name, as IAT prefixes it to locutions: `Forename Surname`. */
export function nameOf(p: Participant): string {
  return [p.firstname, p.surname].filter(Boolean).join(' ');
}

/** Whether IAT allows an edge from one node kind to another (see {@link CONNECTS}). */
export function canConnect(from: NodeKind, to: NodeKind): boolean {
  return CONNECTS[from].includes(to);
}

/**
 * The statements a relation takes as premises, gives as conclusions, and
 * links as its stated lever. Premises may be locutions (source-based delta
 * arguments); YA anchors are not premises.
 */
export function roles(
  id: string,
  nodes: ArgNode[],
  edges: ArgEdge[],
): { premises: ArgNode[]; conclusions: ArgNode[]; levers: ArgNode[] } {
  const node = new Map(nodes.map((n) => [n.id, n]));
  const statements = (es: ArgEdge[], end: 'from' | 'to', kinds: NodeKind[]) =>
    es.map((e) => node.get(e[end])).filter((n): n is ArgNode => !!n && kinds.includes(n.kind));
  const into = edges.filter((e) => e.to === id);
  return {
    premises: statements(into.filter((e) => !e.role), 'from', ['I', 'L']),
    conclusions: statements(edges.filter((e) => e.from === id), 'to', ['I', 'L']),
    levers: statements(into.filter((e) => e.role === 'lever'), 'from', ['I']),
  };
}

/** The propositions a locution anchors through YA nodes: what its speaker said. */
export function says(id: string, nodes: ArgNode[], edges: ArgEdge[]): string[] {
  const kind = new Map(nodes.map((n) => [n.id, n.kind]));
  const yas = edges.filter((e) => e.from === id && kind.get(e.to) === 'YA').map((e) => e.to);
  return edges.filter((e) => yas.includes(e.from) && kind.get(e.to) === 'I').map((e) => e.to);
}

/**
 * The perspective of a locution used as a premise of an RA, from the
 * speakers: the arguer is the speaker of the locution reached by the TA that
 * anchors the RA (through a YA), the addressees are the speakers of that
 * TA's antecedent locutions. A manual perspective on the locution wins.
 * Undefined when neither is available.
 */
export function perspectiveOf(locution: ArgNode, ra: string, nodes: ArgNode[], edges: ArgEdge[]): Perspective | undefined {
  const manual = (locution.pta as Analysis | undefined)?.perspective;
  if (manual) return manual;
  const node = new Map(nodes.map((n) => [n.id, n]));
  const yas = edges.filter((e) => e.to === ra && node.get(e.from)?.kind === 'YA').map((e) => e.from);
  const ta = edges.find((e) => yas.includes(e.to) && node.get(e.from)?.kind === 'TA')?.from;
  if (!ta) return undefined;
  const speakers = (es: ArgEdge[], end: 'from' | 'to') =>
    es.map((e) => node.get(e[end])).filter((n) => n?.kind === 'L').map((n) => n!.speaker);
  const [arguer] = speakers(edges.filter((e) => e.from === ta), 'to');
  const addressees = speakers(edges.filter((e) => e.to === ta), 'from');
  if (!arguer || !locution.speaker) return undefined;
  return locution.speaker === arguer ? 'I' : addressees.includes(locution.speaker) ? 'II' : 'III';
}

/**
 * An RA node's PTA type: form and substance derived from its one premise and
 * conclusion, completed with its chosen lever. Null if it doesn't have
 * exactly one of each, or their analyses don't settle the form. A locution
 * premise counts as saying the propositions it anchors.
 */
export function argumentType(id: string, nodes: ArgNode[], edges: ArgEdge[]): ReturnType<typeof typeOf> | null {
  const { premises, conclusions } = roles(id, nodes, edges);
  const [premise, conclusion] = [premises[0], conclusions[0]];
  if (premises.length !== 1 || conclusions.length !== 1 || conclusion.kind !== 'I') return null;
  const analysis = (n: ArgNode) => n.pta as Analysis | undefined;
  const code: PtaCode | null = deriveCode(
    { id: conclusion.id, analysis: analysis(conclusion) },
    premise.kind === 'L'
      ? { id: premise.id, analysis: { perspective: perspectiveOf(premise, id, nodes, edges) }, says: says(premise.id, nodes, edges) }
      : { id: premise.id, analysis: analysis(premise) },
  );
  const lever = (nodes.find((n) => n.id === id)?.pta as Connector | undefined)?.lever;
  return code && typeOf(code, lever);
}

/**
 * Structural warnings: edges IAT doesn't allow; relations missing an input
 * or output; RA nodes with linked premises, which ATIP can't type as one
 * argument, or more than one stated lever; dangling proposition subjects;
 * and, once the file has locutions, RA/CA/MA nodes not anchored by a YA,
 * locutions with more than one incoming TA, and spans that no longer match
 * the text.
 */
export function lint(nodes: ArgNode[], edges: ArgEdge[], text = ''): { id: string; message: string }[] {
  const node = new Map(nodes.map((n) => [n.id, n]));
  const kind = (id: string) => node.get(id)?.kind;
  const into = (id: string, k?: NodeKind) => edges.filter((e) => e.to === id && (!k || kind(e.from) === k));
  const outOf = (id: string) => edges.filter((e) => e.from === id);
  const dialogue = nodes.some((n) => n.kind === 'L');
  type Warning = { id: string; message: string } | false | undefined;
  const warnings: Warning[] = [
    ...edges
      .filter((e) => kind(e.from) && kind(e.to) && !canConnect(kind(e.from)!, kind(e.to)!))
      .map((e) => ({ id: e.from, message: `edge ${e.id}: IAT doesn't link ${kind(e.from)} → ${kind(e.to)}` })),
    ...nodes.map((n) => {
      const ref = n.kind === 'I' ? (n.pta as Analysis | undefined)?.subjectNode : undefined;
      return !!ref && kind(ref) !== 'I' && { id: n.id, message: `I ${n.id}: subject proposition ${ref} is missing` };
    }),
    ...nodes.flatMap((n) => {
      if (n.kind === 'L' || n.kind === 'I') {
        const spanText = n.span && text.slice(n.span.start, n.span.end);
        return [
          n.kind === 'L' && dialogue && into(n.id, 'TA').length > 1 && { id: n.id, message: `L ${n.id} has more than one incoming TA` },
          spanText !== undefined && spanText !== n.text && { id: n.id, message: `L ${n.id}: span no longer matches the text` },
        ];
      }
      const ins = into(n.id).filter((e) => kind(e.from) !== 'YA' || n.kind === 'YA').length;
      // A TA's one consequent is its successor locution; the YAs it anchors don't count.
      const outs = outOf(n.id).filter((e) => n.kind !== 'TA' || kind(e.to) === 'L').length;
      const { premises, levers } = roles(n.id, nodes, edges);
      const relation = n.kind === 'RA' || n.kind === 'CA' || n.kind === 'MA';
      return [
        ins === 0 && { id: n.id, message: `${n.kind} ${n.id} has no incoming node` },
        (relation || n.kind === 'TA') && outs !== 1 && { id: n.id, message: `${n.kind} ${n.id} has ${outs} outgoing nodes (expected 1)` },
        n.kind === 'YA' && outs === 0 && { id: n.id, message: `YA ${n.id} anchors nothing` },
        n.kind === 'RA' &&
          premises.length > 1 && { id: n.id, message: `RA ${n.id} has ${premises.length} linked premises; ATIP types one at a time` },
        levers.length > 1 && { id: n.id, message: `RA ${n.id} has ${levers.length} lever statements (expected at most 1)` },
        relation && dialogue && into(n.id, 'YA').length === 0 && { id: n.id, message: `${n.kind} ${n.id} isn't anchored by a YA` },
      ];
    }),
  ];
  return warnings.filter((w): w is { id: string; message: string } => !!w);
}

function isNodeKind(type: string): type is NodeKind {
  return (NODE_KINDS as readonly string[]).includes(type);
}

/**
 * Reads the source text, which xAIF stores either as a plain string or as
 * OVA's `{ txt }` HTML with `<span class="highlighted" id="node{ID}">`
 * locution spans. Returns plain text and the spans found in the HTML.
 */
function readText(value: unknown): { text: string; spans: Map<string, { start: number; end: number }> } {
  const spans = new Map<string, { start: number; end: number }>();
  const html = typeof value === 'string' ? null : (value as Json | undefined)?.txt;
  if (typeof html !== 'string') return { text: typeof value === 'string' ? value : '', spans };
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };
  const open: { id?: string; start: number }[] = [];
  let text = '';
  for (const [, tag, entity, chars] of html.matchAll(/(<[^>]*>)|&(\w+|#\d+);|([^<&]+|[<&])/g)) {
    if (chars !== undefined) text += chars;
    else if (entity !== undefined) text += entities[entity] ?? `&${entity};`;
    else if (/^<br\b/i.test(tag)) text += '\n';
    else if (/^<span\b/i.test(tag)) open.push({ id: tag.match(/\bid="(?:node)?([^"]+)"/)?.[1], start: text.length });
    else if (/^<\/span/i.test(tag)) {
      const span = open.pop();
      if (span?.id) spans.set(span.id, { start: span.start, end: text.length });
    }
  }
  return { text, spans };
}

/** The OVA block, which some files spell `ova`. */
function ovaKey(doc: Xaif): 'OVA' | 'ova' | undefined {
  return (['OVA', 'ova'] as const).find((k) => doc[k] && typeof doc[k] === 'object' && !Array.isArray(doc[k]));
}

/** Reads node positions from the OVA block. Hidden nodes sit at 0,0 and are skipped. */
function readPositions(doc: Xaif): Map<string, { x: number; y: number }> {
  const key = ovaKey(doc);
  const ovaNodes = key ? (doc[key] as Json).nodes : undefined;
  if (!Array.isArray(ovaNodes)) return new Map();
  return new Map(
    ovaNodes
      .map((n: Json) => [String(n.nodeID), { x: Number(n.x), y: Number(n.y) }, n.visible] as const)
      .filter(([, p, visible]) => visible !== false && Number.isFinite(p.x) && Number.isFinite(p.y))
      .map(([id, p]) => [id, p]),
  );
}

/**
 * Rewrites the OVA block's entries for shown nodes from the editor's nodes and
 * the saved edges, keeping entries that touch preserved (`hidden`) nodes.
 * Creates the block if missing.
 */
function writePositions(doc: Xaif, nodes: ArgNode[], hidden: Set<string>, id: (s: string) => Id) {
  const key = ovaKey(doc) ?? 'OVA';
  const ova = (doc[key] ??= { firstname: '', surname: '', url: '', nodes: [], edges: [] }) as Json;
  const list = (v: unknown): Json[] => (Array.isArray(v) ? v : []);
  const old = new Map(list(ova.nodes).map((n) => [String(n.nodeID), n]));
  const isHidden = (v: unknown) => hidden.has(String(v));
  ova.nodes = [
    ...list(ova.nodes).filter((n) => isHidden(n.nodeID)),
    ...nodes.map((n) => ({
      ...old.get(n.id),
      nodeID: id(n.id),
      visible: true,
      x: Math.round(n.position?.x ?? 0),
      y: Math.round(n.position?.y ?? 0),
    })),
  ];
  ova.edges = [
    ...list(ova.edges).filter((e) => isHidden(e.fromID) || isHidden(e.toID)),
    ...doc.AIF.edges
      .filter((e) => !isHidden(e.fromID) && !isHidden(e.toID))
      .map((e) => ({ fromID: e.fromID, toID: e.toID, visible: true })),
  ];
}
