
interface record {}
declare function record(value: object, context: ClassDecoratorContext): void;
declare function callable(): (value: object, context: ClassDecoratorContext) => void;

@callable()
@record
export class DecoratedRecord {
  readonly A: string;

  B?: number;

  constructor(o: Pick<DecoratedRecord, 'A' | 'B'>) {
    if (new.target !== DecoratedRecord) {
      throw new TypeError('DecoratedRecord is final');
    }
    this.A = o.A;
    this.B = o.B;
  }

  method(): string {
    return this.A;
  }
}

export class ProtocolRecord implements record {
  readonly Value: string;

  constructor(o: Pick<ProtocolRecord, 'Value'>) {
    if (new.target !== ProtocolRecord) {
      throw new TypeError('ProtocolRecord is final');
    }
    this.Value = o.Value;
  }
}
