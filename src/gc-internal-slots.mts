import type { GCTrace, GCTraceTarget } from './gc.mts';
import { registerFinalizationRegistryTracer } from './intrinsics/FinalizationRegistry.mts';
import { registerMapTracer } from './intrinsics/Map.mts';
import { registerSetTracer } from './intrinsics/Set.mts';
import { registerWeakMapTracer } from './intrinsics/WeakMap.mts';
import { registerWeakRefTracer } from './intrinsics/WeakRef.mts';
import { registerWeakSetTracer } from './intrinsics/WeakSet.mts';
import type { ObjectValue } from './value.mts';

export interface InternalSlotTraceContext {
  readonly owner: ObjectValue;
  readonly value: GCTraceTarget;
  readonly trace: GCTrace;
}

export type InternalSlotTracer = (context: InternalSlotTraceContext) => void;
type InternalSlotTracerInitializer = () => void;

const internalSlotTracers = new Map<string, InternalSlotTracer>();
const internalSlotTracerInitializers = new Set<InternalSlotTracerInitializer>();
const initializedInternalSlotTracerInitializers = new WeakSet<InternalSlotTracerInitializer>();

export function registerInternalSlotTracer(slot: string, tracer: InternalSlotTracer): void {
  if (internalSlotTracers.has(slot)) {
    throw new Error(`Internal slot tracer already registered for ${slot}`);
  }
  internalSlotTracers.set(slot, tracer);
}

export function registerInternalSlotTracerInitializer(initializer: InternalSlotTracerInitializer): void {
  internalSlotTracerInitializers.add(initializer);
}

function registerInternalSlotTracers(): void {
  for (const initializer of internalSlotTracerInitializers) {
    if (initializedInternalSlotTracerInitializers.has(initializer)) continue;
    initializer();
    initializedInternalSlotTracerInitializers.add(initializer);
  }
}

export function traceInternalSlot(
  owner: ObjectValue,
  slot: string,
  value: GCTraceTarget,
  trace: GCTrace,
): void {
  registerInternalSlotTracers();
  const tracer = internalSlotTracers.get(slot);
  if (tracer) {
    tracer({ owner, value, trace });
  } else {
    traceStrongInternalSlot(slot, value, trace);
  }
}

export function traceStrongInternalSlot(slot: string, value: GCTraceTarget, trace: GCTrace): void {
  trace.strong(`[[${slot}]]`, value, 'internal-slot');
}
registerInternalSlotTracerInitializer(registerMapTracer);
registerInternalSlotTracerInitializer(registerSetTracer);
registerInternalSlotTracerInitializer(registerWeakMapTracer);
registerInternalSlotTracerInitializer(registerWeakRefTracer);
registerInternalSlotTracerInitializer(registerWeakSetTracer);
registerInternalSlotTracerInitializer(registerFinalizationRegistryTracer);
