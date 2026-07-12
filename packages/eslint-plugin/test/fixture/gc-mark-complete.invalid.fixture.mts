import type { GCMarkable, GCTrace, Value } from '#self';

export class MissingMark {
  value: Value | undefined;
}

export class MissingSuperBase implements GCMarkable {
  baseValue: Value | undefined;

  mark(trace: GCTrace): void {
    trace.strong('baseValue', this.baseValue, 'internal-slot');
  }
}

export class MissingSuper extends MissingSuperBase {
  ownValue: Value | undefined;

  override mark(trace: GCTrace): void {
    trace.strong('ownValue', this.ownValue, 'internal-slot');
  }
}

export class MentionsButDoesNotTrace implements GCMarkable {
  value: Value | undefined;

  mark(_trace: GCTrace): void {
    Boolean(this.value);
  }
}
