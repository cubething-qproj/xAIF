import { describe, expect, it } from 'vitest';
import { Doc, argumentType, canConnect, lint, type ArgEdge, type ArgNode } from './xaif';
import { LEVERS, NOVEL, deriveCode, leverOptions, ptaOf, typeOf, type Analysis } from './pta';
import downloading from '../../examples/downloading.json';
import einstein from '../../examples/einstein.json';
import raInputs from '../../examples/ra-inputs.json';
import layers from '../../../nlp/inception/pta-layers.json';

const example = (): any => structuredClone(downloading);
const resave = (doc: Doc, nodes = doc.nodes, edges = doc.edges) => doc.save(nodes, edges, doc.text, doc.participants);

describe('Doc', () => {
  it('shows every IAT node kind and hides others', () => {
    const src = example();
    src.AIF.nodes.push({ nodeID: 99, type: 'PA', text: 'Default Preference' });
    const doc = Doc.load(src);
    expect(new Set(doc.nodes.map((n) => n.kind))).toEqual(new Set(['L', 'I', 'YA', 'TA', 'RA', 'CA']));
    expect(doc.hiddenCount).toBe(1);
    expect(resave(doc).AIF.nodes.find((n) => n.nodeID === 99)).toEqual(src.AIF.nodes.at(-1));
  });

  it('round-trips everything it does not edit', () => {
    const src = example();
    const out = resave(Doc.load(src));
    const byId = <T extends { nodeID?: unknown; edgeID?: unknown }>(xs: T[]) =>
      [...xs].sort((a, b) => Number(a.nodeID ?? a.edgeID) - Number(b.nodeID ?? b.edgeID));
    expect(byId(out.AIF.nodes)).toEqual(byId(src.AIF.nodes));
    expect(byId(out.AIF.edges)).toEqual(byId(src.AIF.edges));
    expect(byId(out.AIF.locutions as any[])).toEqual(byId(src.AIF.locutions));
    expect(out.AIF.participants).toEqual(src.AIF.participants);
    expect(out.text).toBe(src.text);
  });

  it('strips speaker prefixes on load and writes them back from the speaker', () => {
    const doc = Doc.load(example());
    const l1 = doc.nodes.find((n) => n.id === '1')!;
    expect(l1).toMatchObject({ text: 'Unauthorized downloading is not theft', speaker: '1', span: { start: 0, end: 37 } });
    const renamed = doc.participants.map((p) => (p.id === '1' ? { ...p, surname: 'King' } : p));
    const out = doc.save(doc.nodes, doc.edges, doc.text, renamed);
    expect(out.AIF.nodes.find((n) => n.nodeID === 1)?.text).toBe('Ada King: Unauthorized downloading is not theft');
  });

  it("reads spans from OVA's HTML text", () => {
    const doc = Doc.load({
      AIF: { nodes: [{ nodeID: 5, type: 'L', text: 'cats are cute' }], edges: [] },
      text: { txt: 'Well, <span class="highlighted" id="node5">cats are cute</span> &amp; nice<br>yes' },
    });
    expect(doc.text).toBe('Well, cats are cute & nice\nyes');
    expect(doc.nodes[0].span).toEqual({ start: 6, end: 19 });
  });

  it('keeps positions and numeric IDs for new nodes', () => {
    const doc = Doc.load(example());
    const id = doc.freshId([]);
    const nodes = [...doc.nodes, { id, kind: 'I' as const, text: 'new', position: { x: 10.4, y: 20 } }];
    const reloaded = Doc.load(resave(doc, nodes));
    expect(reloaded.nodes.find((n) => n.id === id)?.position).toEqual({ x: 10, y: 20 });
    expect(resave(reloaded).AIF.nodes.every((n) => typeof n.nodeID === 'number')).toBe(true);
  });

  it('drops locutions, scheme fulfilments, cleared PTA data and lever roles of edited items', () => {
    const src = example();
    src.AIF.schemefulfillments = [{ nodeID: 9, schemeID: 72 }];
    src.AIF.edges.push({ edgeID: 99, fromID: 8, toID: 7, role: 'lever' });
    const doc = Doc.load(src);
    expect(doc.edges.find((e) => e.id === '99')?.role).toBe('lever');
    const out = resave(
      doc,
      doc.nodes.filter((n) => n.id !== '9' && n.id !== '12').map((n) => (n.id === '3' ? { ...n, pta: { subject: ' ' } } : n)),
      doc.edges.filter((e) => ![e.from, e.to].some((x) => x === '9' || x === '12')).map(({ role: _, ...e }) => e),
    );
    expect(out.AIF.schemefulfillments).toEqual([]);
    expect((out.AIF.locutions as any[]).map((l) => l.nodeID)).toEqual([1, 2]);
    expect(out.AIF.nodes.find((n) => n.nodeID === 3)).not.toHaveProperty('pta');
    expect(out.AIF.edges.find((e) => e.edgeID === 99)).not.toHaveProperty('role');
  });

  it('writes an RA as its derived PTA code', () => {
    const doc = Doc.load(example());
    const nodes = doc.nodes.map((n) => (n.id === '7' ? { ...n, text: 'Default Inference', pta: { lever: 'DEFINITION' } } : n));
    expect(resave(doc, nodes).AIF.nodes.find((n) => n.nodeID === 7)?.text).toBe('α VF Def');
  });

  it('rejects documents without AIF nodes and edges', () => {
    expect(() => Doc.load({ nodes: [] })).toThrow();
  });
});

describe('structure', () => {
  it('follows IAT on which kinds connect', () => {
    expect(canConnect('L', 'YA')).toBe(true);
    expect(canConnect('YA', 'RA')).toBe(true);
    expect(canConnect('TA', 'YA')).toBe(true);
    expect(canConnect('I', 'I')).toBe(false);
    expect(canConnect('L', 'I')).toBe(false);
    expect(canConnect('I', 'YA')).toBe(false);
  });

  it('finds nothing wrong with the examples', () => {
    for (const src of [downloading, einstein]) {
      const doc = Doc.load(structuredClone(src));
      expect(lint(doc.nodes, doc.edges, doc.text)).toEqual([]);
    }
  });

  it('flags unanchored relations, doubled transitions and stale spans once there are locutions', () => {
    const doc = Doc.load(example());
    const edges = doc.edges.filter((e) => e.id !== '31');
    const extra: ArgEdge[] = [...edges, { id: '98', from: '14', to: '2' }];
    const ids = (ws: { id: string }[]) => ws.map((w) => w.id).sort();
    expect(ids(lint(doc.nodes, edges, doc.text))).toEqual(['11', '7']);
    expect(ids(lint(doc.nodes, extra, doc.text))).toContain('2');
    expect(ids(lint(doc.nodes, doc.edges, 'changed'))).toEqual(['1', '12', '2']);
  });

  it('flags a relation without a conclusion', () => {
    const nodes: ArgNode[] = [
      { id: '1', kind: 'I', text: '' },
      { id: '2', kind: 'RA', text: '' },
    ];
    expect(lint(nodes, [{ id: '3', from: '1', to: '2' }]).map((w) => w.id)).toEqual(['2']);
  });

  it('counts neither undercuts nor lever statements as premises', () => {
    const doc = Doc.load(example());
    const edges: ArgEdge[] = [...doc.edges, { id: '99', from: '8', to: '7', role: 'lever' }];
    expect(argumentType('7', doc.nodes, edges)?.symbol).toBe('Cr');
  });
});

describe('delta from locutions', () => {
  it('types reported speech as expert opinion, perspective from the speakers', () => {
    const doc = Doc.load(structuredClone(einstein));
    expect(argumentType('10', doc.nodes, doc.edges)).toMatchObject({ form: 'δ', substance: 'III', symbol: 'Exp', acceptability: 'A' });
  });

  it('lets a manual perspective on the locution win', () => {
    const doc = Doc.load(structuredClone(einstein));
    const nodes = doc.nodes.map((n) => (n.id === '4' ? { ...n, pta: { perspective: 'II' as const } } : n));
    expect(argumentType('10', nodes, doc.edges)).toMatchObject({ form: 'δ', substance: 'II' });
  });
});

describe('ra-inputs example', () => {
  // Every way into an RA, one RA each, labelled with the code it should derive.
  it('lints clean and every RA types as its label says', () => {
    const src: any = structuredClone(raInputs);
    const doc = Doc.load(src);
    expect(lint(doc.nodes, doc.edges, doc.text)).toEqual([]);
    const saved = resave(doc).AIF.nodes.filter((n) => n.type === 'RA');
    expect(saved.map((n) => n.text)).toEqual(src.AIF.nodes.filter((n: any) => n.type === 'RA').map((n: any) => n.text));
  });
});

describe('PTA data', () => {
  it('uses the INCEpTION lever values', () => {
    const connector = (layers as any[]).find((l) => l.name === 'webanno.custom.Connector');
    const tags = connector.features.find((f: any) => f.name === 'lever').tag_set.tags.map((t: any) => t.tag_name);
    expect([...new Set(LEVERS.map((l) => l.keyword)), NOVEL].sort()).toEqual([...tags].sort());
  });

  it('keeps only valid fields for the node kind', () => {
    expect(ptaOf('RA', { lever: 'CAUSE', concepts: ['being', ''], bogus: 1 })).toEqual({ lever: 'CAUSE', concepts: ['being'] });
    expect(ptaOf('YA', { transformations: ['anaphora', 'telepathy'] })).toEqual({ transformations: ['anaphora'] });
    expect(ptaOf('MA', { transformations: ['anaphora'] })).toBeUndefined();
    expect(ptaOf('L', { perspective: 'III', subject: 'x' })).toEqual({ perspective: 'III' });
    expect(ptaOf('I', { kind: 'X', note: '' })).toBeUndefined();
    expect(ptaOf('I', { subjectNode: 37 })).toEqual({ subjectNode: '37' });
  });
});

describe('deriveCode', () => {
  const st = (analysis: Analysis, id = '') => ({ id, analysis });

  it('reads alpha from a shared subject and its substance from statement types', () => {
    const doc = Doc.load(example());
    const [c, p] = ['3', '4'].map((id) => doc.nodes.find((n) => n.id === id)!);
    expect(deriveCode(st(c.pta as Analysis), st(p.pta as Analysis))).toEqual({ form: 'α', substance: 'VF' });
  });

  it('reads beta from a shared predicate and its substance from subject scopes', () => {
    const c = st({ subject: 'Cycling on the grass', predicate: 'is prohibited', scope: 's' });
    const p = st({ subject: 'all activities on the grass', predicate: 'is  prohibited.', scope: 'u' });
    expect(deriveCode(c, p)).toEqual({ form: 'β', substance: 'su' });
  });

  it('reads beta for different propositions with the same predicate', () => {
    const c = st({ subjectNode: '37', predicate: 'is true', scope: 's' });
    const p = st({ subjectNode: '38', predicate: 'is true', scope: 's' });
    expect(deriveCode(c, p)).toEqual({ form: 'β', substance: 'ss' });
  });

  it('reads delta when the conclusion is the proposition the premise is about (implicitly acceptable)', () => {
    const p = st({ subjectNode: '37', predicate: 'was said by Eurostat', perspective: 'III' });
    expect(deriveCode(st({}, '37'), p)).toEqual({ form: 'δ', substance: 'III', acceptability: 'A' });
  });

  it('reads delta when the conclusion marks that proposition A or U', () => {
    const c = st({ subjectNode: '37', acceptability: 'U' });
    const p = st({ subjectNode: '37', predicate: 'is held by people who confuse names with things', perspective: 'II' });
    expect(deriveCode(c, p)).toEqual({ form: 'δ', substance: 'II', acceptability: 'U' });
    expect(deriveCode(c, st({ subject: 'these gentlemen', predicate: 'think so' }))).toEqual({ form: 'γ' });
  });

  it('reads alpha for a shared proposition subject without A/U', () => {
    const c = st({ subjectNode: '37', predicate: 'is false', kind: 'V' });
    const p = st({ subjectNode: '37', predicate: 'is self-contradictory', kind: 'V' });
    expect(deriveCode(c, p)).toEqual({ form: 'α', substance: 'VV' });
  });

  it('reads gamma when nothing is shared, and nothing from incomplete analyses', () => {
    const c = st({ subject: 'evil', predicate: 'will never beat good' });
    const p = st({ subject: 'defeating evil', predicate: 'is easier than defeating good' });
    expect(deriveCode(c, p)).toEqual({ form: 'γ' });
    expect(deriveCode(c, st({ subject: 'evil' }))).toBeNull();
  });

  it('offers only delta levers that support the acceptability', () => {
    expect(leverOptions({ form: 'δ', substance: 'II', acceptability: 'U' }).map((l) => l.symbol)).toEqual(['H', 'Cse']);
    expect(leverOptions({ form: 'δ', substance: 'II', acceptability: 'A' }).map((l) => l.symbol)).toEqual(['B', 'Car', 'Cce']);
  });

  it("settles gamma's substance from the lever", () => {
    expect(typeOf({ form: 'γ' }, 'INTEGRATIVE')).toMatchObject({ substance: 'i', symbol: 'Int' });
    expect(typeOf({ form: 'γ' }, 'none')).toMatchObject({ substance: 'd', symbol: 'Non' });
  });
});
