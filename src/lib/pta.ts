/**
 * Periodic Table of Arguments (PTA 3.1) data for the editor, mirroring the
 * lab's INCEpTION schema (`misc/labs/nlp/inception/pta-layers.json`).
 *
 * Node kinds carry their own PTA data in an extra `pta` field on the xAIF
 * node:
 *
 * - I-node → {@link Analysis}: the canonical statement's subject, predicate,
 *   type, scope, perspective and acceptability (INCEpTION puts the terms on
 *   the connector; here they belong to the canonical statement).
 * - L-node → {@link Analysis} with only a perspective: a manual override for
 *   a locution used as a delta premise.
 * - YA node → {@link Reconstruction}: the ATIP step-2 transformations that
 *   turn what was said (L) into its canonical content (I). MA nodes are left
 *   for rephrasing done by the speakers themselves.
 * - RA node → {@link Connector}: the lever keyword, concepts and a note.
 *
 * Form and substance are not stored: {@link deriveCode} reads them off the
 * RA's canonical premise and conclusion (ATIP steps 3–4), and the lever
 * settles gamma's i/d. Source: ATIP v6 Table 7.
 */

export const FORMS = ['α', 'β', 'γ', 'δ'] as const;
export type Form = (typeof FORMS)[number];

/** One lever of the PTA: the substances it applies to and its type name. */
export interface Lever {
  form: Form;
  substances: string[];
  lever: string;
  /** INCEpTION's lever value: the capitalised keyword in {@link lever}, or `none`. */
  keyword: string;
  name: string;
  symbol: string;
}

/** A possibly partial PTA code, e.g. `α FF Cau`; later parts are only set if earlier ones are. */
export interface PtaCode {
  form: Form;
  substance?: string;
  symbol?: string;
  /** For delta: whether the conclusion is argued acceptable or unacceptable. */
  acceptability?: Acceptability;
}

const BETA_EQUAL = ['ss', 'pp', 'uu'];
const BETA_TO_GENERAL = ['ps', 'us', 'up'];
const BETA_TO_PARTICULAR = ['sp', 'su', 'pu'];

/** Substance values per form, conclusion first. */
export const SUBSTANCES: Record<Form, string[]> = {
  α: ['FF', 'FV', 'FP', 'VF', 'VV', 'VP', 'PF', 'PV', 'PP'],
  β: [...BETA_EQUAL, ...BETA_TO_GENERAL, ...BETA_TO_PARTICULAR],
  γ: ['i', 'd'],
  δ: ['I', 'II', 'III'],
};

const lv = (form: Form, substances: string[], lever: string, name: string, symbol: string): Lever => ({
  form,
  substances,
  lever,
  keyword: lever.match(/[A-Z]{2,}(?: [A-Z]{2,})*/)?.[0] ?? 'none',
  name,
  symbol,
});

/** INCEpTION's lever value for a lever the PTA doesn't list. */
export const NOVEL = 'novel';

/** All fifty PTA 3.1 levers. */
export const LEVERS: Lever[] = [
  lv('α', ['FF'], 'Y is a SIGN of X', 'argument from sign', 'Sig'),
  lv('α', ['FF'], 'Y is a CAUSE of X', 'argument from cause', 'Cau'),
  lv('α', ['FF'], 'Y is an EFFECT of X', 'argument from effect', 'Ef'),
  lv('α', ['FF'], 'Y is CORRELATED with X', 'argument from correlation', 'Cor'),
  lv('α', ['FF'], 'Y is a MOTIVE for X', 'argument from motive', 'Mot'),
  lv('α', ['FF'], 'Y EXCLUDES X', 'argument from incompatibility', 'Inc'),
  lv('α', ['VF'], 'Y is a CRITERION for X', 'argument from criterion', 'Cr'),
  lv('α', ['VF'], 'Y is the DEFINITION of X', 'argument from definition', 'Def'),
  lv('α', ['VF'], 'Y can be SUBSUMED under X', 'argument from subsumption', 'Su'),
  lv('α', ['VV'], 'Y is a NORM for X', 'argument from norm', 'Nor'),
  lv('α', ['VV'], 'Y is an INSTANTIATION of X', 'argument from instantiation', 'Ins'),
  lv('α', ['VV'], 'Y is a DISQUALIFIER of X', 'argument from disqualifier', 'Dis'),
  lv('α', ['PF'], 'Y is a PRAGMATIC MOTIVATION for X', 'pragmatic argument', 'Pra'),
  lv('α', ['PF'], 'Y is a PRIOR INVESTMENT in X', 'argument from waste', 'W'),
  lv('α', ['PF'], 'Y is the FEASIBILITY of X', 'argument from possibility', 'Pos'),
  lv('α', ['PV'], 'Y is a PRINCIPLED MOTIVATION for X', 'argument from principle', 'Pri'),
  lv('α', ['PV'], 'Y is an EVALUATIVE MOTIVATION for X', 'argument from evaluation', 'Ev'),
  lv('α', ['PP'], 'Y is a DEONTIC MOTIVATION for X', 'deontic argument', 'Deo'),
  lv('α', ['PP'], 'Y is a TELEOLOGIC MOTIVATION for X', 'teleologic argument', 'Tel'),
  lv('β', BETA_EQUAL, 'a is ANALOGOUS to b', 'argument from analogy', 'A'),
  lv('β', BETA_EQUAL, 'a is SIMILAR to b', 'argument from similarity', 'Sim'),
  lv('β', BETA_EQUAL, 'a is COMPARABLE to b', 'argument from comparison', 'Cpa'),
  lv('β', BETA_EQUAL, 'a is EQUAL to b', 'argument from equality', 'Eq'),
  lv('β', BETA_EQUAL, 'a is described METAPHORICALLY as b', 'metaphoric argument', 'Me'),
  lv('β', BETA_EQUAL, 'a is COMPOSED of b', 'argument from composition', 'Cpo'),
  lv('β', BETA_EQUAL, 'a is a PART of b', 'argument from division', 'Div'),
  lv('β', BETA_EQUAL, 'a RANKS BELOW b', 'argumentum a maiore', 'Ma'),
  lv('β', BETA_EQUAL, 'a RANKS ABOVE b', 'argumentum a minore', 'Mi'),
  lv('β', BETA_EQUAL, 'a OWES RECIPROCITY to b', 'argument from reciprocity', 'R'),
  lv('β', BETA_TO_GENERAL, 'b is an EXAMPLE of a', 'argument from example', 'Exa'),
  lv('β', BETA_TO_GENERAL, 'b is a SPECIES of a', 'argument from species', 'Sp'),
  lv('β', BETA_TO_PARTICULAR, 'a belongs to the TOTALITY of b', 'argument from totality', 'To'),
  lv('β', BETA_TO_PARTICULAR, 'a belongs to the GENUS of b', 'argument from genus', 'G'),
  lv('γ', ['i'], 'b is SYNONYMOUS to a and Y is SYNONYMOUS to X', 'argument from synonyms', 'Sy'),
  lv('γ', ['i'], 'b is the OPPOSITE of a and Y is the OPPOSITE of X', 'argument from opposites', 'Op'),
  lv('γ', ['i'], 'b is DERIVATIVE of a and Y is DERIVATIVE of X', 'argument from derivatives', 'Der'),
  lv('γ', ['i'], 'b is INTEGRATIVE of a and Y is INTEGRATIVE of X', 'argument from integratives', 'Int'),
  lv('γ', ['i'], 'b is the CONVERSE of a and Y is the CONVERSE of X', 'argument from converses', 'Cve'),
  lv('γ', ['d'], '—', 'non sequitur', 'Non'),
  lv('δ', ['I'], 'Z is ETHOTICALLY AUTHORITATIVE for A', 'ethotic argument', 'Eth'),
  lv('δ', ['II'], 'Z is CHARACTERALLY AUTHORITATIVE for U', 'argumentum ad hominem', 'H'),
  lv('δ', ['II'], 'Z is a NEGATIVE MOTIVATION for A', 'argumentum ad baculum', 'B'),
  lv('δ', ['II'], 'Z is an OFFERED REWARD for A', 'argumentum ad carotam', 'Car'),
  lv('δ', ['II'], 'Z COMMITS the addressee to A', 'argument from concession', 'Cce'),
  lv('δ', ['II'], 'Z is an UNDESIRABLE IMPLICATION supporting U', 'argumentum ad consequentiam', 'Cse'),
  lv('δ', ['III'], 'Z is EPISTEMICALLY AUTHORITATIVE for A', 'argument from expert opinion', 'Exp'),
  lv('δ', ['III'], 'Z is MORALLY AUTHORITATIVE for A', 'argument from moral authority', 'Mor'),
  lv('δ', ['III'], 'Z is TESTIMONIALLY AUTHORITATIVE for A', 'argument from testimony', 'Tes'),
  lv('δ', ['III'], 'Z is POPULARLY AUTHORITATIVE for A', 'argumentum ad populum', 'Pop'),
  lv('δ', ['III'], 'Z is a PRESUMPTION in favor of A', 'argumentum ad ignorantiam', 'Ig'),
];

/**
 * Levers available for a form and substance. Empty for the alpha substances
 * PTA 3.1 lists no lever for (FV, FP, VP); such arguments are `novel`.
 */
export function leversFor(form: Form, substance: string): Lever[] {
  return LEVERS.filter((l) => l.form === form && l.substances.includes(substance));
}

/** Renders a code as space-separated parts, e.g. `α FF Cau` or `β su`. */
export function formatCode(code: PtaCode): string {
  return [code.form, code.substance, code.symbol].filter(Boolean).join(' ');
}

export const KINDS = ['F', 'V', 'P'] as const;
export type StatementKind = (typeof KINDS)[number];
export const SCOPES = ['s', 'p', 'u'] as const;
export type Scope = (typeof SCOPES)[number];
export const PERSPECTIVES = ['I', 'II', 'III'] as const;
export type Perspective = (typeof PERSPECTIVES)[number];
export const ACCEPTABILITIES = ['A', 'U'] as const;
export type Acceptability = (typeof ACCEPTABILITIES)[number];

/**
 * A canonical statement's analysis: subject and predicate (ATIP step 2), type
 * (fact, value or policy; alpha substance) and subject scope (singular,
 * particular or universal; beta substance). The note mirrors INCEpTION's
 * Statement note.
 *
 * A first-order statement is about a thing. A second-order statement is
 * about a proposition: its subject is another I-node,
 * referenced by {@link subjectNode}. It may have the perspective of its
 * source (first, second or third person; delta substance, on a premise) and
 * an acceptability marker (on a delta conclusion), which then stands in for
 * its predicate (see {@link predicateOf}). Second-order statements keep their
 * type and scope, since they can also take part in alpha and beta arguments.
 */
export interface Analysis {
  subject?: string;
  /** ID of the I-node whose proposition is this statement's subject. */
  subjectNode?: string;
  predicate?: string;
  kind?: StatementKind;
  scope?: Scope;
  perspective?: Perspective;
  acceptability?: Acceptability;
  note?: string;
}

/** The step-2 transformations a YA node applies (INCEpTION tags without the role suffix). */
export const TRANSFORMATIONS = [
  'anaphora',
  'explication',
  'illocution substitution',
  'passivization',
  'activization',
  'nominalisation',
  'same term',
] as const;

/** What each transformation does, for labels (ATIP v6 step 2; the last two are the lab's own). */
export const TRANSFORMATION_INFO: Record<(typeof TRANSFORMATIONS)[number], string> = {
  anaphora: 'Replace pronouns and other references, so that one entity is always named with the same (most informative) words.',
  explication: 'Add implicit material to the propositional content.',
  'illocution substitution':
    'Turn another kind of speech act into an assertion, e.g. the rhetorical question "So why should you?" into "You should not…".',
  passivization: 'Change active voice to passive, to bring out a subject or predicate shared with the other statement.',
  activization: 'Change passive voice to active, to bring out a subject or predicate shared with the other statement.',
  nominalisation: 'Turn a clause into a noun phrase or back (e.g. "evil is defeated" ↔ "defeating evil") so a term matches.',
  'same term': 'Treat two different wordings as one term.',
};

/** A YA node's data: how what was said was reconstructed into its canonical content. */
export interface Reconstruction {
  transformations?: string[];
}

/** An RA node's data: INCEpTION's connector features that aren't derived. */
export interface Connector {
  /** A lever keyword from {@link LEVERS}, or {@link NOVEL}. */
  lever?: string;
  /** Lowercase `concept` or `concept/sense` tags. */
  concepts?: string[];
  note?: string;
}

export type Pta = Analysis | Reconstruction | Connector;

/**
 * Reads a node's `pta` data for its kind, keeping only valid non-empty
 * fields; undefined if nothing is left. CA, MA and TA nodes carry none.
 */
export function ptaOf(kind: string, value: unknown): Pta | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  const text = (x: unknown) => (typeof x === 'string' && x.trim() ? x : undefined);
  const tags = (x: unknown, allowed?: readonly string[]) => {
    const list = Array.isArray(x) ? x.filter((t): t is string => typeof t === 'string' && !!t.trim()) : [];
    const kept = allowed ? list.filter((t) => allowed.includes(t)) : list;
    return kept.length ? [...new Set(kept)] : undefined;
  };
  const fields: Record<string, unknown> =
    kind === 'I'
      ? {
          subject: text(v.subject),
          subjectNode: typeof v.subjectNode === 'number' ? String(v.subjectNode) : text(v.subjectNode),
          predicate: text(v.predicate),
          kind: KINDS.find((k) => k === v.kind),
          scope: SCOPES.find((s) => s === v.scope),
          perspective: PERSPECTIVES.find((p) => p === v.perspective),
          acceptability: ACCEPTABILITIES.find((a) => a === v.acceptability),
          note: text(v.note),
        }
      : kind === 'L'
        ? { perspective: PERSPECTIVES.find((p) => p === v.perspective) }
      : kind === 'YA'
        ? { transformations: tags(v.transformations, TRANSFORMATIONS) }
        : kind === 'RA'
          ? {
              lever: [...LEVERS.map((l) => l.keyword), NOVEL].find((k) => k === v.lever),
              concepts: tags(v.concepts),
              note: text(v.note),
            }
          : {};
  const kept = Object.fromEntries(Object.entries(fields).filter(([, x]) => x !== undefined));
  return Object.keys(kept).length ? kept : undefined;
}

/** A statement as {@link deriveCode} needs it. */
export interface Statement {
  id: string;
  analysis?: Analysis;
  /** For a locution used as a premise: the propositions it anchors, i.e. what its speaker said. */
  says?: string[];
}

/** A statement's type markers for display, e.g. `V u` or `F III A`. */
export function badgeOf(a: Analysis): string {
  return [a.kind, a.scope, a.perspective, a.acceptability].filter(Boolean).join(' ');
}

/** A statement's predicate: its acceptability marker if set (`[is acceptable]`), else its predicate text. */
export function predicateOf(a: Analysis): string | undefined {
  if (a.acceptability) return a.acceptability === 'A' ? '[is acceptable]' : '[is unacceptable]';
  return a.predicate;
}

/**
 * The form and substance that an argument's analysed statements imply
 * (ATIP steps 3–4). Text terms are compared literally, ignoring case, spacing
 * and final punctuation, so step 2 must already have made shared terms
 * identical; proposition subjects are compared by node.
 *
 * - δ (source-based): the premise is about a proposition q, either through
 *   its subject or because it is a locution that says q; and the conclusion
 *   is q itself (implicitly acceptable) or a statement about q with an A/U
 *   marker. Substance from the premise's perspective. A locution premise
 *   supports nothing else.
 * - same subject → α, substance from the statement types
 * - same predicate → β, substance from the subject scopes
 * - neither → γ; i or d follows from the lever (see {@link typeOf})
 *
 * Returns null if subjects or predicates are missing, or if the statements
 * share both (the premise restates the conclusion).
 */
export function deriveCode(conclusion: Statement, premise: Statement): PtaCode | null {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]$/, '');
  const subject = (a: Analysis) => (a.subjectNode ? `#${a.subjectNode}` : a.subject && norm(a.subject));
  const [c, p] = [conclusion.analysis ?? {}, premise.analysis ?? {}];
  const q = premise.says ?? (p.subjectNode ? [p.subjectNode] : []);
  if (q.includes(conclusion.id)) return { form: 'δ', substance: p.perspective, acceptability: 'A' };
  if (c.subjectNode && q.includes(c.subjectNode) && c.acceptability)
    return { form: 'δ', substance: p.perspective, acceptability: c.acceptability };
  if (premise.says) return null;
  const [cp, pp] = [predicateOf(c), predicateOf(p)];
  if (!subject(c) || !cp || !subject(p) || !pp) return null;
  const sameSubject = subject(c) === subject(p);
  const samePredicate = norm(cp) === norm(pp);
  const pair = (x?: string, y?: string) => (x && y ? x + y : undefined);
  if (sameSubject && samePredicate) return null;
  if (sameSubject) return { form: 'α', substance: pair(c.kind, p.kind) };
  if (samePredicate) return { form: 'β', substance: pair(c.scope, p.scope) };
  return { form: 'γ' };
}

/**
 * The levers to offer for a derived code: those of its form and substance,
 * or every gamma lever, since for gamma the lever decides the substance. For
 * delta, only levers supporting the conclusion's acceptability (each lever
 * ends in A or U).
 */
export function leverOptions(code: PtaCode): Lever[] {
  if (code.form === 'γ') return LEVERS.filter((l) => l.form === 'γ');
  const levers = code.substance ? leversFor(code.form, code.substance) : [];
  return code.acceptability ? levers.filter((l) => l.lever.endsWith(` ${code.acceptability}`)) : levers;
}

/**
 * The full type of an argument: its derived code completed with the chosen
 * lever. Settles gamma's substance (`d` for the non sequitur, else `i`) and
 * uses `novel` as the symbol for a novel lever. Ignores a lever that doesn't
 * fit the derived form and substance.
 */
export function typeOf(code: PtaCode, keyword?: string): PtaCode & { lever?: Lever } {
  if (keyword === NOVEL) return { ...code, symbol: NOVEL };
  const lever = leverOptions(code).find((l) => l.keyword === keyword);
  if (!lever) return code;
  return { ...code, substance: code.substance ?? lever.substances[0], symbol: lever.symbol, lever };
}
