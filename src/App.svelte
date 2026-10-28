<!--
  xAIF editor in three columns: the source text (highlight spans into
  locutions), the IAT graph, and the inspector. Holds the loaded {@link Doc},
  the text, the speakers and the flow's nodes and edges; saving writes them
  back into the document. Work is autosaved to a session in localStorage;
  the URL hash names the tab's session, so tabs can show different sessions
  and switching between saved files is quick (see `sessions.ts`).
-->
<script lang="ts">
  import { setContext } from 'svelte';
  import {
    Background,
    Controls,
    Panel,
    SvelteFlow,
    type Connection,
    type Edge,
    type OnConnectEnd,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import INode from './lib/INode.svelte';
  import LNode from './lib/LNode.svelte';
  import FloatingEdge from './lib/FloatingEdge.svelte';
  import TextPanel from './lib/TextPanel.svelte';
  import SchemeNode from './lib/SchemeNode.svelte';
  import Toolbar from './lib/Toolbar.svelte';
  import Inspector from './lib/Inspector.svelte';
  import {
    LEVER_HANDLE,
    MARKER,
    argEdges,
    argNodes,
    flowEdge,
    flowNode,
    layout,
    leverEdge,
    type FlowNode,
    type NodeData,
  } from './lib/flow';
  import {
    DEFAULT_TEXT,
    Doc,
    argumentType,
    canConnect,
    lint,
    nameOf,
    roles,
    type NodeKind,
    type Participant,
  } from './lib/xaif';
  import { ptaOf, type Connector } from './lib/pta';
  import { files } from './lib/files';
  import { sessions, type SessionInfo } from './lib/sessions';

  const nodeTypes = { inode: INode, lnode: LNode, scheme: SchemeNode };
  const edgeTypes = { floating: FloatingEdge };

  let doc = $state.raw(Doc.empty());
  let fileName = $state('untitled.json');
  /** This tab's session ID, also in the URL hash. */
  let session = $state('');
  let sessionList = $state.raw<SessionInfo[]>([]);
  /** Files on disk that sessions were opened from or saved as, so Save writes back. Per tab, not persisted. */
  const handles = new Map<string, FileSystemFileHandle>();
  let nodes = $state.raw<FlowNode[]>([]);
  let edges = $state.raw<Edge[]>([]);
  let text = $state('');
  let participants = $state.raw<Participant[]>([]);
  let toolbar: Toolbar | undefined = $state();
  /** ID of the statement whose proposition subject is being picked, if any. */
  let picking = $state<string | null>(null);

  const selected = $derived(nodes.find((n) => n.selected));
  const warnings = $derived(lint(argNodes(nodes), argEdges(edges), text));
  /** Every concept tagged on an RA, offered as chips in the inspector. */
  const concepts = $derived([
    ...new Set(nodes.flatMap((n) => (n.data.kind === 'RA' ? ((n.data.pta as Connector | undefined)?.concepts ?? []) : []))),
  ]);
  const selectedRoles = $derived(
    selected ? roles(selected.id, argNodes(nodes), argEdges(edges)) : { premises: [], conclusions: [], levers: [] },
  );
  /** Each RA's derived type, recomputed as statements and links change. */
  const types = $derived.by(() => {
    const [ns, es] = [argNodes(nodes), argEdges(edges)];
    return new Map(ns.filter((n) => n.kind === 'RA').map((n) => [n.id, argumentType(n.id, ns, es)]));
  });
  setContext('argumentType', (id: string) => types.get(id) ?? null);
  const textOf = (id: string) => nodes.find((n) => n.id === id && n.data.kind === 'I')?.data.text;
  setContext('nodeText', textOf);
  setContext('speakerName', (id: string) => {
    const p = participants.find((p) => p.id === id);
    return p && nameOf(p);
  });

  /**
   * In pick mode, a click on another I-node makes it the picking statement's
   * subject, replacing a text subject; any click ends pick mode
   * and reselects the picking statement.
   */
  function pickSubject(target: FlowNode) {
    const from = picking;
    if (!from) return;
    picking = null;
    const statement = nodes.find((n) => n.id === from);
    if (statement && target.id !== from && target.data.kind === 'I') {
      const pta = { ...statement.data.pta, subject: undefined, subjectNode: target.id };
      update(from, { ...statement.data, pta: ptaOf('I', pta) });
    }
    setTimeout(() => select(from));
  }

  function open(next: Doc, name: string) {
    doc = next;
    fileName = name;
    text = next.text;
    participants = next.participants;
    const n = next.nodes.map(flowNode);
    const e = next.edges.map(flowEdge);
    const positioned = next.nodes.every((x) => x.position);
    nodes = positioned ? n : layout(n, e);
    edges = e;
    toolbar?.refit();
    // The first layout guesses node sizes; redo it once they're measured.
    if (!positioned)
      setTimeout(() => {
        nodes = layout(nodes, edges);
        toolbar?.refit();
      }, 50);
  }

  function serialize() {
    return doc.save(argNodes(nodes), argEdges(edges), text, participants);
  }

  /**
   * Binds this tab to a session: loads it if saved, else starts it empty,
   * and puts its ID in the URL. A session that can't be read is left alone
   * and a new one started instead, so autosave never overwrites it.
   */
  function enter(id: string) {
    const saved = sessions.load(id);
    let next = Doc.empty();
    try {
      if (saved) next = Doc.load(saved.json);
    } catch (err) {
      alert(`Could not read session “${saved?.name}”: ${err instanceof Error ? err.message : err}`);
      return enter(sessions.newId());
    }
    session = id;
    history.replaceState(null, '', `#${id}`);
    open(next, saved?.name ?? 'untitled.json');
    sessionList = sessions.list();
  }

  /** Switches this tab to a session; going through the hash keeps back/forward working. */
  function switchTo(id: string) {
    location.hash = id;
  }

  /** Opens a file as a new session, leaving the current one untouched; remembers its handle for Save. */
  async function openFile(file: File, handle?: FileSystemFileHandle) {
    try {
      const json = JSON.parse(await file.text());
      Doc.load(json);
      const id = sessions.newId();
      sessions.save(id, { name: file.name, json });
      if (handle) handles.set(id, handle);
      switchTo(id);
    } catch (err) {
      alert(`Could not open ${file.name}: ${err instanceof Error ? err.message : err}`);
    }
  }

  /** Asks for a file and opens it as a new session. */
  async function pickFile() {
    const picked = await files.open().catch((err) => void alert(`Could not open: ${err}`));
    if (picked) await openFile(picked.file, picked.handle);
  }

  /** Writes back to the session's file if it has one, else saves as. */
  async function save() {
    const handle = handles.get(session);
    if (!handle) return saveAs();
    await files.save(fileName, serialize(), handle).catch((err) => alert(`Could not save ${handle.name}: ${err}`));
  }

  /**
   * Asks where to save (native dialog), writes there, and makes that file
   * the session's name and Save target. Without native dialogs there's no
   * way to ask, so it asks for a name and downloads.
   */
  async function saveAs() {
    const id = session;
    if (!files.supported()) {
      const name = prompt('Save as', fileName)?.trim();
      if (!name) return;
      fileName = name.endsWith('.json') ? name : `${name}.json`;
    }
    const handle = await files.save(fileName, serialize()).catch((err) => void alert(`Could not save: ${err}`));
    if (!handle) return;
    handles.set(id, handle);
    fileName = handle.name;
  }

  function deleteSession() {
    if (!confirm(`Delete session “${fileName}”? Its autosaved work is lost unless you saved the file.`)) return;
    sessions.remove(session);
    switchTo(sessions.list()[0]?.id ?? sessions.newId());
  }

  const takenIds = () => [...nodes.map((n) => n.id), ...edges.map((e) => e.id)];

  function add(kind: NodeKind, position: { x: number; y: number }) {
    const text = kind === 'I' ? 'New statement' : kind === 'L' ? 'New locution' : DEFAULT_TEXT[kind];
    const node = { ...flowNode({ id: doc.freshId(takenIds()), kind, text, position }), selected: true };
    nodes = [...nodes.map((n) => ({ ...n, selected: false })), node];
  }

  /**
   * Adds a locution for a span of the text, as OVA does: L → YA (Asserting)
   * → I, the proposition starting as the locution's words, ready to be
   * reconstructed. Placed in a new row below the existing ones; the new
   * proposition is selected.
   */
  function addLocution(span: { start: number; end: number }, speaker: string | undefined) {
    const taken = takenIds();
    const fresh = () => {
      const id = doc.freshId(taken);
      taken.push(id);
      return id;
    };
    const [l, ya, i] = [fresh(), fresh(), fresh()];
    const words = text.slice(span.start, span.end);
    const y = Math.max(-120, ...nodes.map((n) => n.position.y + (n.measured?.height ?? 70))) + 50;
    const added = [
      flowNode({ id: l, kind: 'L', text: words, speaker, span, position: { x: 480, y } }),
      flowNode({ id: ya, kind: 'YA', text: 'Asserting', position: { x: 290, y: y + 10 } }),
      { ...flowNode({ id: i, kind: 'I', text: words, position: { x: 0, y } }), selected: true },
    ];
    nodes = [...nodes.map((n) => ({ ...n, selected: false })), ...added];
    edges = [...edges, flowEdge({ id: fresh(), from: l, to: ya }), flowEdge({ id: fresh(), from: ya, to: i })];
  }

  /**
   * Takes edited text, keeping each locution's span where its words still
   * are, else moving it to the first occurrence of its words, else dropping
   * it.
   */
  function setText(next: string) {
    nodes = nodes.map((n) => {
      if (n.data.kind !== 'L' || !n.data.span) return n;
      const { start, end } = n.data.span;
      if (next.slice(start, end) === n.data.text) return n;
      const at = next.indexOf(n.data.text);
      const span = at < 0 ? undefined : { start: at, end: at + n.data.text.length };
      return { ...n, data: { ...n.data, span } };
    });
    text = next;
  }

  function update(id: string, data: NodeData) {
    nodes = nodes.map((n) => (n.id === id ? { ...n, data } : n));
  }

  function select(id: string) {
    nodes = nodes.map((n) => ({ ...n, selected: n.id === id }));
  }

  /**
   * Rejects self-loops, duplicates and I → I edges. The lever port takes
   * one I-node only.
   */
  function isValidConnection(c: Connection | Edge) {
    const kind = (id: string) => nodes.find((n) => n.id === id)?.data.kind;
    const [from, to] = [kind(c.source), kind(c.target)];
    const lever = c.targetHandle === LEVER_HANDLE;
    return (
      !!from &&
      !!to &&
      c.source !== c.target &&
      canConnect(from, to) &&
      !edges.some((e) => e.source === c.source && e.target === c.target) &&
      (!lever || (from === 'I' && !edges.some((e) => e.target === c.target && e.targetHandle === LEVER_HANDLE)))
    );
  }

  /**
   * Lets a connection be dropped anywhere on a node, not just on its handle,
   * as in OVA: if the drag ended over a node without connecting, connect to
   * that node's main port (its input if dragged from an output, and back).
   */
  const connectOnDrop: OnConnectEnd = (event, state) => {
    if (state.isValid || !state.fromNode || !state.fromHandle) return;
    const point = 'changedTouches' in event ? event.changedTouches[0] : event;
    const target = document.elementFromPoint(point.clientX, point.clientY)?.closest<HTMLElement>('.svelte-flow__node')?.dataset.id;
    if (!target) return;
    const [from, to] = state.fromHandle.type === 'source' ? [state.fromNode.id, target] : [target, state.fromNode.id];
    const connection = { source: from, target: to, sourceHandle: null, targetHandle: null };
    if (isValidConnection(connection)) connect(connection);
  };

  /**
   * Adds an edge for a connection, with an ID in the document's ID space and
   * lever styling where it applies. Both handle drops (`onbeforeconnect`,
   * which then returns false so Svelte Flow doesn't add its own copy) and
   * body drops ({@link connectOnDrop}) go through here.
   */
  function connect(c: Connection) {
    const edge: Edge = { id: doc.freshId(takenIds()), source: c.source, target: c.target, type: 'floating', markerEnd: MARKER };
    edges = [...edges, c.targetHandle === LEVER_HANDLE ? leverEdge(edge) : edge];
  }

  sessions.migrate();
  enter(location.hash.slice(1) || sessions.list()[0]?.id || sessions.newId());

  $effect(() => {
    const [id, snapshot] = [session, { name: fileName, json: serialize() }];
    const timer = setTimeout(() => {
      sessions.save(id, snapshot);
      sessionList = sessions.list();
    }, 300);
    return () => clearTimeout(timer);
  });
</script>

<svelte:window
  onkeydown={(e) => e.key === 'Escape' && (picking = null)}
  onhashchange={() => {
    const id = location.hash.slice(1);
    if (id && id !== session) enter(id);
  }}
  onstorage={() => (sessionList = sessions.list())}
/>

<main class:picking>
  <TextPanel
    {text}
    {participants}
    locutions={argNodes(nodes).filter((n) => n.kind === 'L')}
    selected={selected?.id}
    ontext={setText}
    onparticipants={(p) => (participants = p)}
    onadd={addLocution}
    onselect={select}
  />
  <SvelteFlow
    bind:nodes
    bind:edges
    {nodeTypes}
    {edgeTypes}
    {isValidConnection}
    onbeforeconnect={(c) => {
      connect(c);
      return false;
    }}
    onconnectend={connectOnDrop}
    defaultEdgeOptions={{ type: 'floating', markerEnd: MARKER }}
    deleteKey={['Backspace', 'Delete']}
    onnodeclick={({ node }) => pickSubject(node)}
    onpaneclick={() => (picking = null)}
    fitView
  >
    {#if picking}
      <Panel position="top-center">
        <div class="banner">Click the proposition statement {picking} is about · Esc cancels</div>
      </Panel>
    {/if}
    <Background />
    <Controls />
    <Toolbar
      bind:this={toolbar}
      {session}
      list={sessionList}
      onswitch={switchTo}
      onopen={pickFile}
      onsave={save}
      onsaveas={saveAs}
      onnew={() => switchTo(sessions.newId())}
      onnewtab={() => window.open(`${location.pathname}#${sessions.newId()}`, '_blank')}
      ondelete={deleteSession}
      onadd={add}
      onlayout={() => (nodes = layout(nodes, edges))}
    />
  </SvelteFlow>
  <Inspector
    node={selected}
    roles={selectedRoles}
    type={selected ? (types.get(selected.id) ?? null) : null}
    {warnings}
    hiddenCount={doc.hiddenCount}
    {participants}
    {concepts}
    picking={!!picking}
    {textOf}
    onchange={update}
    onselect={select}
    onpick={(id) => (picking = picking === id ? null : id)}
  />
</main>

<style>
  main {
    display: grid;
    grid-template-columns: 340px 1fr 300px;
    height: 100vh;
  }
  main.picking :global(.svelte-flow__node) {
    cursor: crosshair;
  }
  .banner {
    margin-top: 48px;
    padding: 6px 10px;
    background: #fde68a;
    border: 1px solid #d97706;
    border-radius: 6px;
    font-size: 13px;
  }
</style>
