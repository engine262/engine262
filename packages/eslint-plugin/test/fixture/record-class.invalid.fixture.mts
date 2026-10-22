
interface record {}
declare function record(value: object, context: ClassDecoratorContext): void;
declare function other(value: object, context: ClassDecoratorContext): void;
declare function member(value: unknown, context: ClassMemberDecoratorContext): void;

class Base {}

@other
@record
export class InvalidRecord extends Base {
  @member
  readonly Initialized: string = '';

  protected Protected: string;

  #private: string;

  static {
    void 0;
  }

  @member
  method(): string {
    return this.#private;
  }

  constructor(o: { Initialized: string; Protected: string }) {
    super();
    this.Initialized = o.Initialized;
    this.Protected = o.Protected;
    this.#private = '';
  }
}

export class MissingCopy implements record {
  readonly A: string;

  declare readonly B: string;

  constructor(o: Pick<MissingCopy, 'A' | 'B'>) {
    if (new.target !== MissingCopy) {
      throw new TypeError('MissingCopy is final');
    }
    this.A = o.A;
  }
}

export class ExtraStatement implements record {
  readonly A: string;

  constructor(o: Pick<ExtraStatement, 'A'>) {
    if (new.target !== ExtraStatement) {
      throw new TypeError('ExtraStatement is final');
    }
    this.A = o.A;
    void o;
  }
}
