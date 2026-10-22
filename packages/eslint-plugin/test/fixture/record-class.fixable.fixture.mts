
interface record {}

export class MissingGuardAndCopy implements record {
  readonly A: string;

  declare readonly B: string;

  constructor(o: Pick<MissingGuardAndCopy, 'A' | 'B'>) {
    this.A = o.A;
  }
}
