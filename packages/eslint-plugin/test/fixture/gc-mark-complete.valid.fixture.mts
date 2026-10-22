import type { GCMarkable, GCTrace, Value } from '#self';

export class ValidMarkable implements GCMarkable {
  value: Value | undefined;

  mark(trace: GCTrace): void {
    trace.strong('value', this.value, 'internal-slot');
  }
}

export class ValidDerivedMarkable extends ValidMarkable {
  values: Value[] = [];

  override mark(trace: GCTrace): void {
    super.mark(trace);
    trace.strong('values', this.values, 'element');
  }
}
