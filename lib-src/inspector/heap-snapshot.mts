import type {
  Agent,
  ObjectReferenceGraphSnapshot,
  ReferenceEdge,
  ReferenceNode,
  ReferenceNodeId,
} from '#self';

const nodeFields = [
  'type',
  'name',
  'id',
  'self_size',
  'edge_count',
  'trace_node_id',
  'detachedness',
] as const;

const nodeTypes = [
  'hidden',
  'array',
  'string',
  'object',
  'code',
  'closure',
  'regexp',
  'number',
  'native',
  'synthetic',
  'concatenated string',
  'sliced string',
  'symbol',
  'bigint',
  'object shape',
] as const;

const edgeFields = ['type', 'name_or_index', 'to_node'] as const;
const edgeTypes = ['context', 'element', 'property', 'internal', 'hidden', 'shortcut', 'weak'] as const;
const minimumUnknownShallowSize = 1;

export interface V8HeapSnapshot {
  readonly snapshot: {
    readonly meta: {
      readonly node_fields: typeof nodeFields;
      readonly node_types: readonly [typeof nodeTypes];
      readonly edge_fields: typeof edgeFields;
      readonly edge_types: readonly [typeof edgeTypes];
      readonly trace_function_info_fields: readonly [];
      readonly trace_node_fields: readonly [];
      readonly sample_fields: readonly [];
      readonly location_fields: readonly [];
    };
    readonly node_count: number;
    readonly edge_count: number;
    readonly trace_function_count: 0;
  };
  readonly nodes: readonly number[];
  readonly edges: readonly number[];
  readonly trace_function_infos: readonly [];
  readonly trace_tree: readonly [];
  readonly samples: readonly [];
  readonly locations: readonly [];
  readonly strings: readonly string[];
}

interface GraphInput {
  readonly agent: Agent;
  readonly graph: ObjectReferenceGraphSnapshot;
  readonly heapObjectId: (id: ReferenceNodeId) => string;
}

interface AdapterEdge {
  readonly type: typeof edgeTypes[number];
  readonly name: string | number;
  readonly to: AdapterNode;
}

interface AdapterNode {
  readonly type: typeof nodeTypes[number];
  readonly name: string;
  readonly id: number;
  readonly selfSize: number;
  readonly edges: AdapterEdge[];
}

export function referenceGraphsToHeapSnapshot(graphs: readonly GraphInput[]): V8HeapSnapshot {
  const rootNode: AdapterNode = {
    type: 'synthetic',
    name: '(GC roots)',
    id: 2,
    selfSize: 0,
    edges: [],
  };
  const adapterNodes: AdapterNode[] = [rootNode];
  const graphNodes = new Map<string, AdapterNode>();

  for (const { agent, graph, heapObjectId } of graphs) {
    for (const node of graph.nodes) {
      const adapterNode: AdapterNode = {
        type: nodeType(node),
        name: nodeName(node),
        id: Number(heapObjectId(node.id)),
        selfSize: node.shallowSize ?? minimumUnknownShallowSize,
        edges: [],
      };
      graphNodes.set(graphNodeKey(agent, node.id), adapterNode);
      adapterNodes.push(adapterNode);
    }
  }

  let syntheticId = 4;
  for (const { agent, graph } of graphs) {
    for (const root of graph.roots) {
      const target = graphNodes.get(graphNodeKey(agent, root.to));
      if (!target) continue;
      const category: AdapterNode = {
        type: 'synthetic',
        name: `(${root.kind}: ${root.name})`,
        id: syntheticId,
        selfSize: 0,
        edges: [{ type: 'internal', name: root.name, to: target }],
      };
      syntheticId += 2;
      rootNode.edges.push({ type: 'shortcut', name: root.kind, to: category });
      adapterNodes.splice(1, 0, category);
    }
  }

  for (const { agent, graph } of graphs) {
    for (const edge of graph.edges) {
      const from = graphNodes.get(graphNodeKey(agent, edge.from));
      const to = graphNodes.get(graphNodeKey(agent, edge.to));
      if (!from || !to) continue;
      from.edges.push({
        type: edgeType(edge),
        name: edgeName(edge),
        to,
      });
    }
  }

  const strings: string[] = [];
  const stringIndices = new Map<string, number>();
  const stringIndex = (value: string) => {
    const existing = stringIndices.get(value);
    if (existing !== undefined) return existing;
    const index = strings.length;
    strings.push(value);
    stringIndices.set(value, index);
    return index;
  };
  const ordinals = new Map(adapterNodes.map((node, ordinal) => [node, ordinal]));
  const nodes: number[] = [];
  const edges: number[] = [];
  for (const node of adapterNodes) {
    nodes.push(
      nodeTypes.indexOf(node.type),
      stringIndex(node.name),
      node.id,
      node.selfSize,
      node.edges.length,
      0,
      0,
    );
    for (const edge of node.edges) {
      edges.push(
        edgeTypes.indexOf(edge.type),
        typeof edge.name === 'number' ? edge.name : stringIndex(edge.name),
        ordinals.get(edge.to)! * nodeFields.length,
      );
    }
  }

  return {
    snapshot: {
      meta: {
        node_fields: nodeFields,
        node_types: [nodeTypes],
        edge_fields: edgeFields,
        edge_types: [edgeTypes],
        trace_function_info_fields: [],
        trace_node_fields: [],
        sample_fields: [],
        location_fields: [],
      },
      node_count: adapterNodes.length,
      edge_count: edges.length / edgeFields.length,
      trace_function_count: 0,
    },
    nodes,
    edges,
    trace_function_infos: [],
    trace_tree: [],
    samples: [],
    locations: [],
    strings,
  };
}

export function* serializeHeapSnapshot(
  snapshot: V8HeapSnapshot,
  maximumChunkCharacters = 16 * 1024,
): Iterable<string> {
  let chunk = '';
  for (let token of heapSnapshotTokens(snapshot)) {
    while (token.length > maximumChunkCharacters) {
      const available = maximumChunkCharacters - chunk.length;
      chunk += token.slice(0, available);
      yield chunk;
      chunk = '';
      token = token.slice(available);
    }
    if (chunk.length + token.length > maximumChunkCharacters) {
      yield chunk;
      chunk = '';
    }
    chunk += token;
  }
  if (chunk) yield chunk;
}

function* heapSnapshotTokens(snapshot: V8HeapSnapshot): Iterable<string> {
  yield `{"snapshot":${JSON.stringify(snapshot.snapshot)},"nodes":[`;
  yield* arrayTokens(snapshot.nodes);
  yield '],"edges":[';
  yield* arrayTokens(snapshot.edges);
  yield '],"trace_function_infos":[],"trace_tree":[],"samples":[],"locations":[],"strings":[';
  yield* arrayTokens(snapshot.strings);
  yield ']}';
}

function* arrayTokens(values: readonly (number | string)[]): Iterable<string> {
  for (let index = 0; index < values.length; index += 1) {
    if (index > 0) yield ',';
    yield JSON.stringify(values[index]);
  }
}

function nodeType(node: ReferenceNode): typeof nodeTypes[number] {
  switch (node.kind) {
    case 'collection': return 'array';
    case 'function': return 'closure';
    case 'object': return 'object';
    case 'symbol': return 'symbol';
    case 'value': return /String/.test(node.name) ? 'string' : 'hidden';
    case 'agent':
    case 'realm':
    case 'execution-context':
    case 'environment':
    case 'module':
    case 'job':
    case 'callback':
    case 'evaluator':
    case 'record':
    case 'host':
      return 'native';
    default:
      return 'hidden';
  }
}

function nodeName(node: ReferenceNode): string {
  return node.kind === 'evaluator' && !node.name.startsWith('Evaluator / ')
    ? `Evaluator / ${node.name}`
    : node.name;
}

function edgeType(edge: ReferenceEdge): typeof edgeTypes[number] {
  if (edge.strength === 'weak') return 'weak';
  if (edge.strength === 'ephemeron') return edge.active ? 'internal' : 'weak';
  switch (edge.reason.kind) {
    case 'property': return 'property';
    case 'element': return 'element';
    case 'binding':
    case 'capture': return 'context';
    case 'internal-slot':
    case 'private-element':
    case 'job':
    case 'host': return 'internal';
    default: return 'internal';
  }
}

function edgeName(edge: ReferenceEdge): string | number {
  if (edge.strength === 'ephemeron') {
    return edge.active
      ? `WeakMap value conditioned by @${edge.condition}`
      : `WeakMap inactive value conditioned by @${edge.condition}`;
  }
  if (edge.reason.kind === 'element' && /^(?:0|[1-9]\d*)$/.test(edge.reason.name)) {
    return Number(edge.reason.name);
  }
  return edge.reason.name;
}

function graphNodeKey(agent: Agent, id: ReferenceNodeId): string {
  return `${agent.AgentRecord.Signifier}:${id}`;
}
