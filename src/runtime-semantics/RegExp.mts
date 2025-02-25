// @ts-ignore
import unicodeCaseFoldingCommon from '@unicode/unicode-15.0.0/Case_Folding/C/symbols.js';
// @ts-ignore
import unicodeCaseFoldingSimple from '@unicode/unicode-15.0.0/Case_Folding/S/symbols.js';
import { UndefinedValue, Value } from '../value.mjs';
import { Assert, isNonNegativeInteger } from '../abstract-ops/all.mjs';
import { CharacterValue } from '../static-semantics/all.mjs';
import { isLineTerminator, isWhitespace } from '../parser/Lexer.mjs';
import { OutOfRange } from '../helpers.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';
import {
  UnicodeMatchProperty,
  UnicodeMatchPropertyValue,
  UnicodeGeneralCategoryValues,
  BinaryUnicodeProperties,
  NonbinaryUnicodeProperties,
  getUnicodePropertyValueSet,
} from './all.mjs';

/** https://tc39.es/ecma262/#pattern-matchstate */
export class MatchState {
  readonly Input;
  readonly EndIndex;
  readonly Captures;

  constructor(input: number[], endIndex: number, captures: (CaptureRange | UndefinedValue)[]) {
    this.Input = input;
    this.EndIndex = endIndex;
    this.Captures = captures;
  }
}

/** https://tc39.es/ecma262/#pattern-matchresult */
export type MatchResult = MatchState | 'failure';

/** https://tc39.es/ecma262/#pattern-matchercontinuation */
type MatcherContinuation = (m: MatchState) => MatchResult;

/** https://tc39.es/ecma262/#pattern-matcher */
type Matcher = (x: MatchState, c: MatcherContinuation) => MatchResult;

const FORWARD = +1;
const BACKWARD = -1;

export const FAILURE = 'failure';

type Direction = 1 | -1;

/** https://tc39.es/ecma262/#sec-regexp-records */
export class RegExpRecord {
  readonly IgnoreCase: boolean;
  readonly Multiline: boolean;
  readonly DotAll: boolean;
  readonly Unicode: boolean;
  readonly CapturingGroupsCount: number;

  constructor(IgnoreCase: boolean, Multiline: boolean, DotAll: boolean, Unicode: boolean, CapturingGroupsCount: number) {
    this.IgnoreCase = IgnoreCase;
    this.Multiline = Multiline;
    this.DotAll = DotAll;
    this.Unicode = Unicode;
    this.CapturingGroupsCount = CapturingGroupsCount;
  }
}

function isContinuation(v: unknown): v is MatcherContinuation {
  return typeof v === 'function' && v.length === 1;
}

abstract class CharSet {
  abstract has(c: number): boolean;
  abstract isConcrete(): this is ConcreteCharSet;
  some(cb: (a: number) => boolean) {
    for (let i = 0; i <= 0x10FFFF; i++) {
      if (this.has(i) && cb(i)) {
        return true;
      }
    }
    return false;
  }
  union(other: CharSet): CharSet {
    if (other === CharSet.EmptyCharSet.instance) {
      return this;
    }
    if (other === CharSet.AllCharactersCharSet.instance) {
      return other;
    }
    const concrete = new Set<number>();
    const virtuals = new Set<CharSet>();
    const add = (cs: CharSet) => {
      if (cs instanceof CharSet.UnionCharSet) {
        cs.virtuals.forEach((v) => {
          virtuals.add(v);
        });
        cs.concrete.forEach((c) => {
          concrete.add(c);
        });
      } else if (cs instanceof CharSet.ConcreteCharSet) {
        cs.concrete.forEach((c) => {
          concrete.add(c);
        });
      } else {
        virtuals.add(cs);
      }
    };
    add(this);
    add(other);
    if (virtuals.size === 0) {
      if (concrete.size === 0) {
        return CharSet.EmptyCharSet.instance;
      }
      return new CharSet.ConcreteCharSet(concrete);
    }
    return new CharSet.UnionCharSet(concrete, virtuals);
  }
  except(other: CharSet): CharSet {
    if (other === CharSet.EmptyCharSet.instance) {
      return this;
    }
    if (other === CharSet.AllCharactersCharSet.instance) {
      return CharSet.empty();
    }
    return new CharSet.ComplementCharSet(this, other);
  }
  static empty(): CharSet {
    return CharSet.EmptyCharSet.instance;
  }
  static all(): CharSet {
    return CharSet.AllCharactersCharSet.instance;
  }
  static from(items: Iterable<number>): CharSet {
    const concrete = new Set(items);
    if (concrete.size === 0) {
      return CharSet.EmptyCharSet.instance;
    }
    return new CharSet.ConcreteCharSet(concrete);
  }
  static of(...items: number[]): CharSet {
    if (items.length === 0) {
      return CharSet.EmptyCharSet.instance;
    }
    return new CharSet.ConcreteCharSet(items);
  }
  static virtual(has: (c: number) => boolean, some?: (cb: (a: number) => boolean) => boolean): CharSet {
    return new CharSet.VirtualCharSet(has, some);
  }

  private static EmptyCharSet = class EmptyCharSet extends CharSet {
    static readonly instance = new EmptyCharSet();
    override has(_c: number): boolean {
      return false;
    }
    override some(_cb: (a: number) => boolean): boolean {
      return false;
    }
    override union(other: CharSet): CharSet {
      return other;
    }
    override except(_other: CharSet): CharSet {
      return this;
    }
    override isConcrete() { return true; }
    get size() { return 0; }
    first(): never {
      Assert(false);
    }
  };

  private static AllCharactersCharSet = class AllCharactersCharSet extends CharSet {
    static readonly instance = new AllCharactersCharSet();
    override has(_c: number): boolean {
      return true;
    }
    override union(_other: CharSet): CharSet {
        return this;
    }
    override isConcrete() { return false; }
  };

  private static ConcreteCharSet = class ConcreteCharSet extends CharSet {
    concrete;
    constructor(items: Iterable<number>) {
      super();
      this.concrete = items instanceof Set ? items : new Set(items);
    }
    override has(c: number) {
      return this.concrete.has(c);
    }
    override some(cb: (a: number) => boolean) {
      for (const a of this.concrete) {
        if (cb(a)) {
          return true;
        }
      }
      return false;
    }
    override except(other: CharSet): CharSet {
      if (other === CharSet.EmptyCharSet.instance) {
        return this;
      }
      if (other === CharSet.AllCharactersCharSet.instance) {
        return CharSet.EmptyCharSet.instance;
      }
      const concrete = new Set<number>();
      for (const a of this.concrete) {
        if (!other.has(a)) {
          concrete.add(a);
        }
      }
      if (concrete.size === 0) {
        return CharSet.EmptyCharSet.instance;
      }
      return new ConcreteCharSet(concrete);
    }
    override isConcrete() { return true; }
    get size() {
      return this.concrete.size;
    }
    first() {
      Assert(this.concrete.size >= 1);
      return this.concrete.values().next().value;
    }
  };

  private static UnionCharSet = class UnionCharSet extends CharSet {
    concrete: ReadonlySet<number>;
    virtuals: ReadonlySet<CharSet>;

    constructor(concrete: Iterable<number>, virtuals: Iterable<CharSet>) {
      super();
      this.concrete = concrete instanceof Set ? concrete : new Set(concrete);
      this.virtuals = virtuals instanceof Set ? virtuals : new Set(virtuals);
    }

    override has(c: number) {
      if (this.concrete.has(c)) {
        return true;
      }
      for (const v of this.virtuals) {
        if (v.has(c)) {
          return true;
        }
      }
      return false;
    }

    override some(cb: (a: number) => boolean) {
      for (const a of this.concrete) {
        if (cb(a)) {
          return true;
        }
      }
      for (const v of this.virtuals) {
        if (v.some(cb)) {
          return true;
        }
      }
      return false;
    }

    override isConcrete() { return false; }
  };

  private static VirtualCharSet = class VirtualCharSet extends CharSet {
    private _hasfn;
    private _somefn;
    private _includedCache: Set<number> | undefined;
    private _excludedCache: Set<number> | undefined;
    private _nextCodePoint = 0;
    constructor(has: (ch: number) => boolean, some?: (cb: (a: number) => boolean) => boolean) {
      super();
      this._hasfn = has;
      this._somefn = some;
    }
    override has(c: number) {
      if (this._includedCache?.has(c)) {
        // We've already tested and found this value and it was included, so indicate it was present.
        return true;
      }
      if (this._excludedCache?.has(c)) {
        // We've already tested and found this value is excluded, so indicate it was not present.
        return false;
      }
      if (c === this._nextCodePoint) {
        // This is the next code point we haven't cached yet, so increment the counter before we cache the result below.
        this._nextCodePoint++;
      }
      if (this._hasfn(c)) {
        this._includedCache ??= new Set();
        this._includedCache.add(c);
        return true;
      } else {
        this._excludedCache ??= new Set();
        this._excludedCache.add(c);
        return false;
      }
    }
    override some(cb: (a: number) => boolean) {
      if (this._somefn) {
        return this._somefn(cb);
      }

      if (this._nextCodePoint > 0x10FFFF) {
        // We've enumerated every possible code point so we can just iterate over the cache.
        if (this._includedCache) {
          for (const a of this._includedCache) {
            if (cb(a)) {
              return true;
            }
          }
        }
        return false;
      }

      return super.some(cb);
    }
    override isConcrete() { return false; }
  };

  private static ComplementCharSet = class ComplementCharSet extends CharSet {
    first;
    second;
    constructor(first: CharSet, second: CharSet) {
      super();
      this.first = first;
      this.second = second;
    }
    override has(ch: number) {
      return this.first.has(ch) && !this.second.has(ch);
    }
    override some(cb: (a: number) => boolean) {
      return this.first.some(a => !this.second.has(a) && cb(a));
    }
    override isConcrete() { return false; }
  };
}

interface ConcreteCharSet extends CharSet {
  get size(): number;
  first(): number;
  isConcrete(): true;
}

/** https://tc39.es/ecma262/#pattern-capturerange */
class CaptureRange {
  StartIndex;
  EndIndex;
  constructor(startIndex: number, endIndex: number) {
    Assert(startIndex <= endIndex);
    this.StartIndex = startIndex;
    this.EndIndex = endIndex;
  }
}

/** https://tc39.es/ecma262/#sec-pattern */
//   Pattern :: Disjunction
export function CompilePattern(Pattern: ParseNode.RegExp.Pattern, rer: RegExpRecord) {
  // The descriptions below use the following variables:
  //   * Input is a List consisting of all of the characters, in order, of the String being matched
  //     by the regular expression pattern. Each character is either a code unit or a code point,
  //     depending upon the kind of pattern involved. The notation Input[n] means the nth character
  //     of Input, where n can range between 0 (inclusive) and InputLength (exclusive).
  //   * InputLength is the number of characters in Input.
  //   * NcapturingParens is the total number of left-capturing parentheses (i.e. the total number of
  //     Atom :: `(` GroupSpecifier Disjunction `)` Parse Nodes) in the pattern. A left-capturing parenthesis
  //     is any `(` pattern character that is matched by the `(` terminal of the Atom :: `(` GroupSpecifier Disjunction `)`
  //     production.
  //   * DotAll is true if the RegExp object's [[OriginalFlags]] internal slot contains "s" and otherwise is false.
  //   * IgnoreCase is true if the RegExp object's [[OriginalFlags]] internal slot contains "i" and otherwise is false.
  //   * Multiline is true if the RegExp object's [[OriginalFlags]] internal slot contains "m" and otherwise is false.
  //   * Unicode is true if the RegExp object's [[OriginalFlags]] internal slot contains "u" and otherwise is false.

  {
    // 1. Let m be CompileSubpattern of Disjunction with arguments rer and FORWARD.
    const m = CompileSubpattern(Pattern.Disjunction, rer, FORWARD);
    // 2. Return a new Abstract Closure with parameters (Input, index) that captures rer and m and performs the following steps when called:
    return (Input: number[], index: number) => {
      // a. Assert: Input is a List of characters.
      // b. Assert: index is a non-negative integer which is ≤ the length of str.
      Assert(isNonNegativeInteger(index) && index <= Input.length);
      // c. Let c be a new MatcherContinuation with parameters (y) that captures nothing and performs the following steps when called:
      const c: MatcherContinuation = (y) => {
        // i. Assert: y is a MatchState.
        Assert(y instanceof MatchState);
        // ii. Return y.
        return y;
      };
      // d. Let cap be a List of rer.[[CapturingGroupCount]] undefined values, indexed 1 through rer.[[CapturingGroupCount]].
      const cap = Array.from({ length: rer.CapturingGroupsCount + 1 }, () => Value.undefined);
      // e. Let x be the MatchState { [[Input]]: Input, [[EndIndex]]: index, [[Captures]]: cap }.
      const x = new MatchState(Input, index, cap);
      // f. Return m(x, c).
      return m(x, c);
    };
  }

  /** https://tc39.es/ecma262/#sec-compilesubpattern */
  function CompileSubpattern(node: ParseNode.RegExp.Disjunction | ParseNode.RegExp.Alternative | ParseNode.RegExp.Term | ParseNode.RegExp.Assertion, rer: RegExpRecord, direction: Direction): Matcher {
    const type = node.type;
    switch (type) {
      case 'Disjunction':
        return CompileSubpattern_Disjunction(node, rer, direction);
      case 'Alternative':
        return CompileSubpattern_Alternative(node, rer, direction);
      case 'Term':
        return CompileSubpattern_Term(node, rer, direction);
      case 'Assertion':
        return CompileSubpattern_Assertion(node, rer, direction);
      default:
        throw new OutOfRange('CompileSubpattern', type);
    }
  }

  /** https://tc39.es/ecma262/#sec-disjunction */
  //   Disjunction ::
  //     Alternative
  //     Alternative `|` Disjunction
  function CompileSubpattern_Disjunction({ Alternative, Disjunction }: ParseNode.RegExp.Disjunction, rer: RegExpRecord, direction: Direction): Matcher {
    if (!Disjunction) {
      // 1. Evaluate Alternative with argument direction to obtain a Matcher m.
      const m = CompileSubpattern(Alternative, rer, direction);
      // 2. Return m.
      return m;
    }
    // 1. Let m1 be CompileSubpattern of Alternative with arguments rer and direction.
    const m1 = CompileSubpattern(Alternative, rer, direction);
    // 2. Let m2 be CompileSubpattern of Alternative with arguments rer and direction.
    const m2 = CompileSubpattern(Disjunction, rer, direction);
    // 3. Return MatchTwoAlternatives(m1, m2).
    return MatchTwoAlternatives(m1, m2);
  }

  /** https://tc39.es/ecma262/#sec-alternative */
  //   Alternative ::
  //     [empty]
  //     Alternative Term
  function CompileSubpattern_Alternative({ Alternative, Term }: ParseNode.RegExp.Alternative, rer: RegExpRecord, direction: Direction): Matcher {
    if (!Alternative && !Term) {
      // 1. Return EmptyMatcher().
      return EmptyMacher();
    }
    // 1. Evaluate Alternative with argument direction to obtain a Matcher m1.
    const m1 = CompileSubpattern(Alternative!, rer, direction);
    // 2. Evaluate Term with argument direction to obtain a Matcher m2.
    const m2 = CompileSubpattern(Term!, rer, direction);
    // 3. Return MatchSequence(m1, m2, direction).
    return MatchSequence(m1, m2, direction);
  }

  /** https://tc39.es/ecma262/#sec-term */
  //   Term ::
  //     Atom
  //     Atom Quantifier
  function CompileSubpattern_Term(Term: ParseNode.RegExp.Term_Atom, rer: RegExpRecord, direction: Direction): Matcher {
    const { Atom, Quantifier } = Term;
    if (!Quantifier) {
      // 1. Return CompileAtom of Atom with arguments rer and direction.
      return CompileAtom(Atom, rer, direction);
    }
    // 1. Let m be CompileAtom of Atom with arguments rer and direction.
    const m = CompileAtom(Atom, rer, direction);
    // 2. Let q be CompileQuantifier of Quantifier.
    const q = CompileQuantifier(Quantifier);
    // 3. Assert: q.[[Min]] <= q.[[Max]].
    Assert(q.Min <= q.Max);
    // 4. Let parenIndex be CountLeftCapturingParensBefore(Term).
    const parenIndex = CountLeftCapturingParensBefore(Term);
    // 5. Let parenCount be CountLeftCapturingParensWithin(Atom).
    const parenCount = CountLeftCapturingParensWithin(Atom);
    // 6. Return a new Matcher with parameters (x, c) that captures m, q, parenIndex, and parenCount and performs the following steps when called:
    return (x, c) => {
      // a. Assert: x is a MatchState.
      Assert(x instanceof MatchState);
      // b. Assert: c is a MatcherContinuation.
      Assert(isContinuation(c));
      // c. Call RepeatMatcher(m, q.[[Min]], q.[[Max]], q.[[Greedy]], x, c, parenIndex, parenCount) and return its result.
      return RepeatMatcher(m, q.Min, q.Max, q.Greedy, x, c, parenIndex, parenCount);
    };
  }

  /** https://tc39.es/ecma262/#sec-term */
  //   Term ::
  //     Assertion
  function CompileSubpattern_Assertion(Assertion: ParseNode.RegExp.Assertion, rer: RegExpRecord, _direction: Direction) {
    // 1. Return CompileAssertion of Assertion with argument rer.
    return CompileAssertion(Assertion, rer);
  }

  /** https://tc39.es/ecma262/#sec-assertion */
  //   Assertion ::
  //     `^`
  //     `$`
  //     `\` `b`
  //     `\` `B`
  //     `(` `?` `=` Disjunction `)`
  //     `(` `?` `!` Disjunction `)`
  //     `(` `?` `<=` Disjunction `)`
  //     `(` `?` `<!` Disjunction `)`
  function CompileAssertion({ subtype, Disjunction }: ParseNode.RegExp.Assertion, rer: RegExpRecord): Matcher {
    switch (subtype) {
      case '^':
        // 1. Return a new Matcher with parameters (x, c) that captures rer and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a MatchState.
          Assert(x instanceof MatchState);
          // b. Assert: c is a MatcherContinuation.
          Assert(isContinuation(c));
          // c. Let Input be x.[[Input]].
          const Input = x.Input;
          // d. Let e be x.[[EndIndex]].
          const e = x.EndIndex;
          // e. If e = 0, or if rer.[[Multiline]] is true and the character Input[e - 1] is one of LineTerminator, then
          if (e === 0 || (rer.Multiline && isLineTerminator(String.fromCodePoint(Input[e - 1])))) {
            // i. Return c(x).
            return c(x);
          }
          // e. Return FAILURE.
          return FAILURE;
        };
      case '$':
        // 1. Return a new Matcher with parameters (x, c) that captures rer and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a MatchState.
          Assert(x instanceof MatchState);
          // b. Assert: c is a MatcherContinuation.
          Assert(isContinuation(c));
          // c. Let Input be x.[[Input]].
          const Input = x.Input;
          // d. Let e be x.[[EndIndex]].
          const e = x.EndIndex;
          // e. Let InputLength be the number of elements of Input.
          const InputLength = Input.length;
          // f. If e = InputLength, or if rer.Multiline is true and the character Input[e] is one of LineTerminator, then
          if (e === InputLength || (rer.Multiline && isLineTerminator(String.fromCodePoint(Input[e])))) {
            // i. Return c(x).
            return c(x);
          }
          // e. Return FAILURE.
          return FAILURE;
        };
      case 'b':
        // 1. Return a new Matcher with parameters (x, c) that captures rer and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a MatchState.
          Assert(x instanceof MatchState);
          // b. Assert: c is a MatcherContinuation.
          Assert(isContinuation(c));
          // c. Let Input be x.[[Input]].
          const Input = x.Input;
          // d. Let e be x.[[EndIndex]].
          const e = x.EndIndex;
          // e. Let a be IsWordChar(e - 1).
          const a = IsWordChar(rer, Input, e - 1);
          // e. Let b be IsWordChar(e).
          const b = IsWordChar(rer, Input, e);
          // f. If a is true and b is false, or if a is false and b is true, then
          if ((a && !b) || (!a && b)) {
            // i. Return c(x).
            return c(x);
          }
          // g. Return FAILURE.
          return FAILURE;
        };
      case 'B':
        // 1. Return a new Matcher with parameters (x, c) that captures rer and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a MatchState.
          Assert(x instanceof MatchState);
          // b. Assert: c is a MatcherContinuation.
          Assert(isContinuation(c));
          // c. Let Input be x.[[Input]].
          const Input = x.Input;
          // d. Let e be x.[[EndIndex]].
          const e = x.EndIndex;
          // e. Let a be IsWordChar(e - 1).
          const a = IsWordChar(rer, Input, e - 1);
          // f. Let b be IsWordChar(e).
          const b = IsWordChar(rer, Input, e);
          // f. If a is true and b is true, or if a is false and b is false, then
          if ((a && b) || (!a && !b)) {
            // i. Return c(x).
            return c(x);
          }
          // g. Return FAILURE.
          return FAILURE;
        };
      case '?=': {
        // 1. Let m be CompileSubpattern of Disjunction with arguments rer and FORWARD.
        const m = CompileSubpattern(Disjunction, rer, FORWARD);
        // 2. Return a new Matcher with parameters (x, c) that captures m and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a MatchState.
          Assert(x instanceof MatchState);
          // b. Assert: c is a MatcherContinuation.
          Assert(isContinuation(c));
          // c. Let d be a new MatcherContinuation with parameters (y) that captures nothing and performs the following steps when called:
          const d: MatcherContinuation = (y) => {
            // i. Assert: y is a MatchState.
            Assert(y instanceof MatchState);
            // ii. Return y.
            return y;
          };
          // d. Let r be m(x, d).
          const r = m(x, d);
          // e. If r is FAILURE, return FAILURE.
          if (r === FAILURE) {
            return FAILURE;
          }
          // f. Assert: r is a MatchState.
          Assert(r instanceof MatchState);
          // g. Let cap be r.[[Captures]].
          const cap = r.Captures;
          // h. Let Input be x.[[Input]].
          const Input = x.Input;
          // i. Let xe be x.[[EndIndex]].
          const xe = x.EndIndex;
          // j. Let z be the MatchState { [[Input]]: Input, [[EndIndex]]: xe, [[Captures]]: cap }.
          const z = new MatchState(Input, xe, cap);
          // k. Return c(z).
          return c(z);
        };
      }
      case '?!': {
        // 1. Let m be CompileSubpattern of Disjunction with arguments rer and FORWARD.
        const m = CompileSubpattern(Disjunction, rer, FORWARD);
        // 2. Return a new Matcher with parameters (x, c) that captures m and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a MatchState.
          Assert(x instanceof MatchState);
          // b. Assert: c is a MatcherContinuation.
          Assert(isContinuation(c));
          // c. Let d be a new MatcherContinuation with parameters (y) that captures nothing and performs the following steps when called:
          const d: MatcherContinuation = (y) => {
            // i. Assert: y is a MatchState.
            Assert(y instanceof MatchState);
            // ii. Return y.
            return y;
          };
          // d. Let r be m(x, d).
          const r = m(x, d);
          // e. If r is not FAILURE, return FAILURE.
          if (r !== FAILURE) {
            return FAILURE;
          }
          // f. Return c(x).
          return c(x);
        };
      }
      case '?<=': {
        // 1. Let m be CompileSubpattern of Disjunction with arguments rer and BACKWARD.
        const m = CompileSubpattern(Disjunction, rer, BACKWARD);
        // 2. Return a new Matcher with parameters (x, c) that captures m and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a MatchState.
          Assert(x instanceof MatchState);
          // b. Assert: c is a MatcherContinuation.
          Assert(isContinuation(c));
          // c. Let d be a new MatcherContinuation with parameters (y) that captures nothing and performs the following steps when called:
          const d: MatcherContinuation = (y) => {
            // i. Assert: y is a MatchState.
            Assert(y instanceof MatchState);
            // ii. Return y.
            return y;
          };
          // d. Let r be m(x, d).
          const r = m(x, d);
          // e. If r is FAILURE, return FAILURE.
          if (r === FAILURE) {
            return FAILURE;
          }
          // f. Assert: r is a MatchState.
          Assert(r instanceof MatchState);
          // g. Let cap be y.[[Captures]].
          const cap = r.Captures;
          // h: Let Input be x.[[Input]].
          const Input = x.Input;
          // i. Let xe be x.[[EndIndex]].
          const xe = x.EndIndex;
          // j. Let z be the MatchState { [[Input]]: Input, [[EndIndex]]: xe, [[Captures]]: cap }.
          const z = new MatchState(Input, xe, cap);
          // k. Return c(z).
          return c(z);
        };
      }
      case '?<!': {
        // 1. Let m be CompileSubpattern of Disjunction with arguments rer and BACKWARD.
        const m = CompileSubpattern(Disjunction, rer, BACKWARD);
        // 2. Return a new Matcher with parameters (x, c) that captures m and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a MatchState.
          Assert(x instanceof MatchState);
          // b. Assert: c is a MatcherContinuation.
          Assert(isContinuation(c));
          // c. Let d be a new MatcherContinuation with parameters (y) that captures nothing and performs the following steps when called:
          const d: MatcherContinuation = (y) => {
            // i. Assert: y is a MatchState.
            Assert(y instanceof MatchState);
            // ii. Return y.
            return y;
          };
          // d. Let r be m(x, d).
          const r = m(x, d);
          // e. If r is not FAILURE, return FAILURE.
          if (r !== FAILURE) {
            return FAILURE;
          }
          // f. Return c(x).
          return c(x);
        };
      }
      default:
        throw new OutOfRange('CompileAssertion', subtype);
    }
  }

  /** https://tc39.es/ecma262/#sec-quantifier */
  //   Quantifier ::
  //     QuantifierPrefix
  //     QuantifierPrefix `?`
  function CompileQuantifier({ QuantifierPrefix, greedy }: ParseNode.RegExp.Quantifier): { Min: number, Max: number, Greedy: boolean } {
    switch (QuantifierPrefix) {
      case '*':
        return { Min: 0, Max: Infinity, Greedy: greedy };
      case '+':
        return { Min: 1, Max: Infinity, Greedy: greedy };
      case '?':
        return { Min: 0, Max: 1, Greedy: greedy };
      default:
        break;
    }
    const { DecimalDigits_a, DecimalDigits_b } = QuantifierPrefix;
    return { Min: DecimalDigits_a, Max: DecimalDigits_b || DecimalDigits_a, Greedy: greedy };
  }

  /** https://tc39.es/ecma262/#sec-atom */
  //   Atom ::
  //     PatternCharacter
  //     `.`
  //     `\` AtomEscape
  //     CharacterClass
  //     `(` GroupSpecifier Disjunction `)`
  //     `(` `?` RegularExpressionFlags `:` Disjunction `)`
  //     `(` `?` RegularExpressionFlags `-` RegularExpressionFlags `:` Disjunction `)`
  function CompileAtom(Atom: ParseNode.RegExp.Atom, rer: RegExpRecord, direction: Direction): Matcher {
    switch (true) {
      case 'PatternCharacter' in Atom: {
        // 1. Let ch be the character matched by PatternCharacter.
        const ch = Atom.PatternCharacter.codePointAt(0)!;
        // 2. Let A be a one-element CharSet containing the character ch.
        const A = CharSet.of(ch);
        // 3. Return CharacterSetMatcher(rer, A, false, direction).
        return CharacterSetMatcher(rer, A, false, direction);
      }
      case 'subtype' in Atom: {
        // 1. Let A be the set of all characters.
        let A = AllCharacters(rer);
        // 1. If DotAll is not true, then
        if (!rer.DotAll) {
          // a. Remove from A all characters corresponding to a code point on the right-hand side of the LineTerminator production.
          A = A.except(CharSet.virtual((c) => isLineTerminator(String.fromCodePoint(c))));
        }
        // 3. Return CharacterSetMatcher(rer, A, false, direction).
        return CharacterSetMatcher(rer, A, false, direction);
      }
      case Atom.type === 'AtomEscape':
        return CompileAtom_AtomEscape(Atom, direction, rer);

      case 'CharacterClass' in Atom: {
        // 1. Let cc be CompileCharacterClass of CharacterClass with argument rer.
        const cc = CompileCharacterClass(Atom.CharacterClass, rer);
        // 2. Let cs be cc.[[CharSet]]
        const cs = cc.CharSet;
        // 3. Return CharacterSetMatcher(rer, cs, cc.[[Invert], direction).
        return CharacterSetMatcher(rer, cs, cc.Invert, direction);
      }
      case 'capturing' in Atom && Atom.capturing: {
        // 1. Let m be CompileSubpattern of Disjunction with arguments rer and direction.
        const m = CompileSubpattern(Atom.Disjunction, rer, direction);
        // 2. Let parenIndex be CountLeftCapturingParensBefore(Atom).
        const parenIndex = CountLeftCapturingParensBefore(Atom);
        // 3. Return a new Matcher with parameters (x, c) that captures direction, m, and parenIndex and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a MatchState.
          Assert(x instanceof MatchState);
          // b. Assert: c is a MatcherContinuation.
          Assert(isContinuation(c));
          // c. Let d be a new MatcherContinuation with parameters (y) that captures x, c, direction, and parenIndex and performs the following steps when called:
          const d: MatcherContinuation = (y) => {
            // i. Assert: y is a MatchState.
            Assert(y instanceof MatchState);
            // ii. Let cap be a copy of y.[[Captures]].
            const cap = [...y.Captures];
            // iii. Let Input be x.[[Input]].
            const Input = x.Input;
            // iv. Let xe be x.[[EndIndex]].
            const xe = x.EndIndex;
            // v. Let ye be y.[[EndIndex]].
            const ye = y.EndIndex;
            let s;
            // vi. If direction is FORWARD, then
            if (direction === FORWARD) {
              // 1. Assert: xe ≤ ye.
              Assert(xe <= ye);
              // 2. Let r be the CaptureRange { [[StartIndex]]: xe, [[EndIndex]]: ye }.
              s = new CaptureRange(xe, ye);
            } else { // vii. Else,
              // 1. Assert: direction is BACKWARD.
              Assert(direction === BACKWARD);
              // 2. Assert: ye ≤ xe.
              Assert(ye <= xe);
              // 3. Let r be the CaptureRange { [[StartIndex]]: ye, [[EndIndex]]: xe }.
              s = new CaptureRange(ye, xe);
            }
            // viii. Set cap[parenIndex + 1] to r.
            cap[parenIndex + 1] = s;
            // ix. Let z be the MatchState { [[Input]]: Input, [[EndIndex]]: ye, [[Captures]]: cap }.
            const z = new MatchState(Input, ye, cap);
            // ix. Return c(z).
            return c(z);
          };
          // d. Return m(x, d).
          return m(x, d);
        };
      }
      case 'capturing' in Atom && !Atom.capturing: {
        // *1. Let addModifiers be the source text matched by the first RegularExpressionFlags.
        const addModifiers = Atom.RegularExpressionFlags_a ?? '';
        // *2. Let removeModifiers be the source text matched by the second RegularExpressionFlags.
        const removeModifiers = Atom.RegularExpressionFlags_b ?? '';
        // *3. Let modifiedRer be UpdateModifiers(modifiers, CodePointsToString(addModifiers), CodePointsToString(removeModifiers)).
        const modifiedRer = UpdateModifiers(rer, addModifiers, removeModifiers);
        // *4. Return CompileSubpattern of Disjunction with arguments modifiedRer and direction.
        return CompileSubpattern(Atom.Disjunction, modifiedRer, direction);
      }
      default:
        throw new OutOfRange('CompileAtom', Atom);
    }
  }

  /** https://tc39.es/ecma262/#sec-atomescape */
  // AtomEscape ::
  //   DecimalEscape
  //   CharacterEscape
  //   CharacterClassEscape
  //   `k` GroupName
  function CompileAtom_AtomEscape(AtomEscape: ParseNode.RegExp.AtomEscape, direction: Direction, rer: RegExpRecord): Matcher {
    switch (true) {
      case !!AtomEscape.DecimalEscape: {
        // 1. Let n be the CapturingGroupNumber of DecimalEscape.
        const n = CapturingGroupNumber(AtomEscape.DecimalEscape);
        // 2. Assert: n ≤ rer.[[CapturingGroupsCount]].
        Assert(n <= rer.CapturingGroupsCount);
        // 3. Return BackreferenceMatcher(rer, n, direction).
        return BackreferenceMatcher(rer, n, direction);
      }
      case !!AtomEscape.CharacterEscape: {
        // 1. Let cv be the CharacterValue of CharacterEscape.
        // 2. Let ch be the character whose character value is cv.
        const ch = CharacterValue(AtomEscape.CharacterEscape);
        // 3. Let A be a one-element CharSet containing the character ch.
        const A = CharSet.of(ch);
        // 4. Return CharacterSetMatcher(rer, A, false, direction).
        return CharacterSetMatcher(rer, A, false, direction);
      }
      case !!AtomEscape.CharacterClassEscape: {
        // 1. Let cs be CompileToCharset of CharacterClassEscape with argument rer.
        const cs = CompileToCharSet(AtomEscape.CharacterClassEscape, rer);
        // 2. Return CharacterSetMatcher(rer, cs, false, direction).
        return CharacterSetMatcher(rer, cs, false, direction);
      }
      case !!AtomEscape.GroupName: {
        // 1. Let matchingGroupSpecifiers be GroupSpecifiersThatMatch(GroupName).
        // 2. Assert: matchingGroupSpecifiers contains a single GroupSpecifier.
        // 3. Let groupSpecifier be the sole element of matchingGroupSpecifiers.
        // 4. Let parenIndex be CountLeftCapturingParensBefore(groupSpecifier).
        const parenIndex = Pattern.groupSpecifiers.get(AtomEscape.GroupName);
        Assert(parenIndex !== undefined);
        // 5. Return BackreferenceMatcher(rer, parenIndex, direction).
        return BackreferenceMatcher(rer, parenIndex + 1, direction);
      }
      default:
        throw new OutOfRange('CompileAtom_AtomEscape', AtomEscape);
    }
  }

  /** https://tc39.es/ecma262/#sec-decimalescape */
  // DecimalEscape ::
  //   NonZeroDigit DecimalDigits?
  function CapturingGroupNumber(DecimalEscape: ParseNode.RegExp.DecimalEscape) {
    return DecimalEscape.value;
  }

  /** https://tc39.es/ecma262/#sec-characterclass */
  //  CharacterClass ::
  //    `[` ClassRanges `]`
  //    `[` `^` ClassRanges `]`
  function CompileCharacterClass({ invert, ClassRanges }: ParseNode.RegExp.CharacterClass, rer: RegExpRecord) {
    if (invert) {
      // 1. Let A be CompileToCharSet of ClassContents with argument rer
      const A = CompileToCharSet_ClassContents(ClassRanges, rer);
      // 2. NOTE: Reserved for future UnicodeSets support.
      // 3. Return the Record { [[CharSet]]: A, [[Invert]]: true }.
      return { CharSet: A, Invert: true };
    }
    // 1. Let A be CompileToCharSet of ClassContents with argument rer
    const A = CompileToCharSet_ClassContents(ClassRanges, rer);
    // 2. Return the Record { [[CharSet]]: A, [[Invert]]: false }.
    return { CharSet: A, Invert: false };
  }

  /** https://tc39.es/ecma262/#sec-compiletocharset */
  function CompileToCharSet(node: ParseNode.RegExp.ClassAtom, rer: RegExpRecord): CharSet {
    switch (node.type) {
      case 'CharacterClassEscape':
        return CompileToCharSet_CharacterClassEscape(node, rer);
      case 'ClassAtom':
        return CompileToCharSet_ClassAtom(node);
      case 'ClassEscape':
        return CompileToCharSet_ClassEscape(node);
      default:
        throw new OutOfRange('CompileToCharSet', node);
    }
  }

  /** https://tc39.es/ecma262/#sec-compiletocharset */
  function CompileToCharSet_ClassContents(nodes: readonly ParseNode.RegExp.ClassRange[], rer: RegExpRecord) {
    // NOTE: This will need to be updated to support UnicodeSets
    let A: CharSet = CharSet.empty();
    for (const range of nodes) {
      if (Array.isArray(range)) {
        const B = CompileToCharSet(range[0], rer);
        const C = CompileToCharSet(range[1], rer);
        Assert(B.isConcrete() && C.isConcrete());
        const D = CharacterRange(B, C);
        A = A.union(D);
      } else {
        A = A.union(CompileToCharSet(range, rer));
      }
    }
    return A;
  }

  /** https://tc39.es/ecma262/#sec-characterclassescape */
  // CharacterClassEscape ::
  //   `d`
  //   `D`
  //   `s`
  //   `S`
  //   `w`
  //   `W`
  //   `p{` UnicodePropertyValueExpression `}`
  //   `P{` UnicodePropertyValueExpression `}`
  function CompileToCharSet_CharacterClassEscape(node: ParseNode.RegExp.CharacterClassEscape, rer: RegExpRecord): CharSet {
    switch (node.value) {
      case 'd':
        // 1. Return the ten-element CharSet containing the characters 0, 1, 2, 3, 4, 5, 6, 7, 8, and 9.
        return CharSet.from(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((c) => c.codePointAt(0)!));
      case 'D': {
        // 1. Let S be the CharSet returned by CharacterClassEscape :: d.
        const S = CompileToCharSet_CharacterClassEscape({ type: 'CharacterClassEscape', value: 'd' }, rer);
        // 2. Return CharacterComplement(rer, S).
        return CharacterComplement(rer, S);
      }
      case 's':
        // 1. Return the CharSet of all characters corresponding to a code point on the right-hand side of the WhiteSpace or LineTerminator productions.
        return CharSet.virtual((c) => {
          const s = String.fromCodePoint(c);
          return isWhitespace(s) || isLineTerminator(s);
        });
      case 'S': {
        // 1. Let S be the CharSet returned by CharacterClassEscape :: s.
        const S = CompileToCharSet_CharacterClassEscape({ type: 'CharacterClassEscape', value: 's' }, rer);
        // 1. Return CharacterComplement(rer, S).
        return CharacterComplement(rer, S);
      }
      case 'w':
        // 1. Return MaybeSimpleCasefolding(rer, WordCharacters(rer)).
        return MaybeSimpleCaseFolding(rer, WordCharacters(rer));
      case 'W': {
        // 1. Let S be the CharSet returned by CharacterClassEscape :: `w`.
        const S = CompileToCharSet_CharacterClassEscape({ type: 'CharacterClassEscape', value: 'w' }, rer);
        // 2. Return CharacterComplement(rer, S).
        return CharacterComplement(rer, S);
      }
      case 'p':
        // 1. Return CompileToCharSet of UnicodePropertyValueExpression with argument rer.
        return CompileToCharSet_UnicodePropertyValueExpression(node.UnicodePropertyValueExpression!, rer);
      case 'P': {
        // 1. Let S be CompileToCharSet of UnicodePropertyValueExpression with argument rer.
        const S = CompileToCharSet_UnicodePropertyValueExpression(node.UnicodePropertyValueExpression!, rer);
        // 2. Assert: S contains only single code points.
        // 3. Return CharacterComplement(rer, S);
        return CharacterComplement(rer, S);
      }
      default:
        throw new OutOfRange('CompileToCharSet_CharacterClassEscape', node);
    }
  }

  // UnicodePropertyValueExpression ::
  //   UnicodePropertyName `=` UnicodePropertyValue
  //   LoneUnicodePropertyNameOrValue
  function CompileToCharSet_UnicodePropertyValueExpression(UnicodePropertyValueExpression: ParseNode.RegExp.UnicodePropertyValueExpression, rer: RegExpRecord): CharSet {
    if (UnicodePropertyValueExpression.LoneUnicodePropertyNameOrValue) {
      // 1. Let s be the source text matched by LoneUnicodePropertyNameOrValue.
      const s = UnicodePropertyValueExpression.LoneUnicodePropertyNameOrValue;
      // 2. If UnicodeMatchPropertyValue(General_Category, s) is a Unicode property value or property value alias for the General_Category (gc) property listed in PropertyValueAliases.txt, then
      if (UnicodeMatchPropertyValue('General_Category', s) in UnicodeGeneralCategoryValues) {
        // a. Return the CharSet containing all Unicode code points whose character database definition includes the property “General_Category” with value s.
        // @ts-expect-error -- 'string' is not a subtype of 'keyof typeof UnicodeGeneralCategoryValues'
        return CharSet.from(getUnicodePropertyValueSet('General_Category', UnicodeGeneralCategoryValues[s]));
      }
      // 3. Let p be UnicodeMatchProperty(rer, s).
      const p = UnicodeMatchProperty(rer, s);
      // 4. Assert: p is a binary Unicode property or binary property alias listed in the “Property name and aliases” column of Table 68.
      Assert(p in BinaryUnicodeProperties);
      // 5. Let A be the CharSet containing all CharSetElements whose character database database definition includes the property p with value “True”.
      const A = CharSet.from(getUnicodePropertyValueSet(p));
      // 6. Return MaybeSimpleCaseFolding(rer, A);
      return MaybeSimpleCaseFolding(rer, A);
    }
    // 1. Let ps be the source text matched by UnicodePropertyName.
    const ps = UnicodePropertyValueExpression.UnicodePropertyName!;
    // 2. Let p be UnicodeMatchProperty(rer, ps).
    const p = UnicodeMatchProperty(rer, ps);
    // 3. Assert: p is a Unicode property name or property alias listed in the “Property name and aliases” column of Table 67.
    Assert(p in NonbinaryUnicodeProperties);
    // 4. Let vs be the source text matched by UnicodePropertyValue.
    const vs = UnicodePropertyValueExpression.UnicodePropertyValue;
    // 5. Let v be UnicodeMatchPropertyValue(p, vs).
    const v = UnicodeMatchPropertyValue(p, vs);
    // 6. Let A be the CharSet containing all Unicode code points whose character database definition includes the property p with value v.
    const A = CharSet.from(getUnicodePropertyValueSet(p, v));
    // 7. Return MaybeSimpleCaseFolding(rer, A).
    return MaybeSimpleCaseFolding(rer, A);
  }

  /** https://tc39.es/ecma262/#sec-runtime-semantics-characterrange-abstract-operation */
  function CharacterRange(A: ConcreteCharSet, B: ConcreteCharSet) {
    // 1. Assert: A and B each contain exactly one character.
    Assert(A.size === 1 && B.size === 1);
    // 2. Let a be the one character in CharSet A.
    const a = A.first();
    // 3. Let b be the one character in CharSet B.
    const b = B.first();
    // 4. Let i be the character value of character a.
    const i = a;
    // 5. Let j be the character value of character b.
    const j = b;
    // 6. Assert: i ≤ j.
    Assert(i <= j);
    // 7. Return the CharSet containing all characters with a character value in the inclusive interval from i to j.
    const set = new Set<number>();
    for (let k = i; k <= j; k += 1) {
      set.add(k);
    }
    return CharSet.from(set);
  }

  /** https://tc39.es/ecma262/#sec-classatom */
  // ClassAtom ::
  //   `-`
  //   ClassAtomNoDash
  // ClassAtomNoDash ::
  //   SourceCharacter
  //   `\` ClassEscape
  function CompileToCharSet_ClassAtom(ClassAtom: ParseNode.RegExp.ClassAtom): CharSet {
    switch (true) {
      case 'SourceCharacter' in ClassAtom && !!ClassAtom.SourceCharacter:
        // 1. Return the CharSet containing the character matched by SourceCharacter.
        return CharSet.of(ClassAtom.SourceCharacter.codePointAt(0)!);
      case ClassAtom.value === '-':
        // 1. Return the CharSet containing the single character - U+002D (HYPHEN-MINUS).
        return CharSet.of(0x002D);
      default:
        throw new OutOfRange('CompileToCharSet_ClassAtom', ClassAtom);
    }
  }

  /** https://tc39.es/ecma262/#sec-classescape */
  // ClassEscape ::
  //   `b`
  //   `-`
  //   CharacterEscape
  //   CharacterClassEscape
  function CompileToCharSet_ClassEscape(ClassEscape: ParseNode.RegExp.ClassEscape): CharSet {
    switch (true) {
      case ClassEscape.value === 'b':
      case ClassEscape.value === '-':
      case !!ClassEscape.CharacterEscape: {
        // 1. Let cv be the CharacterValue of this ClassEscape.
        const cv = CharacterValue(ClassEscape);
        // 2. Let c be the character whose character value is cv.
        const c = cv;
        // 3. Return the CharSet containing the single character c.
        return CharSet.of(c);
      }
      default:
        throw new OutOfRange('CompileToCharSet_ClassEscape', ClassEscape);
    }
  }
}

/** https://tc39.es/ecma262/#sec-countleftcapturingparenswithin */
function CountLeftCapturingParensWithin(Atom: ParseNode.RegExp.Atom | ParseNode.RegExp.Term_Atom) {
  return 'enclosedCapturingParentheses' in Atom ? Atom.enclosedCapturingParentheses : 0;
}

/** https://tc39.es/ecma262/#sec-countleftcapturingparensbefore */
function CountLeftCapturingParensBefore(Atom: ParseNode.RegExp.Atom | ParseNode.RegExp.Term_Atom) {
  return 'capturingParenthesesBefore' in Atom ? Atom.capturingParenthesesBefore : 0;
}

/** https://tc39.es/ecma262/#sec-runtime-semantics-repeatmatcher-abstract-operation */
function RepeatMatcher(m: Matcher, min: number, max: number, greedy: boolean, x: MatchState, c: MatcherContinuation, parenIndex: number, parenCount: number): MatchResult {
  // 1. If max is zero, return c(x).
  if (max === 0) {
    return c(x);
  }
  // 2. Let d be a new MatcherContinuation with parameters (y) that captures m, min, max, greedy, x, c, parenIndex, and parenCount and performs the following steps when called:
  const d: MatcherContinuation = (y) => {
    // a. Assert: y is a MatchState.
    Assert(y instanceof MatchState);
    // b. If min = 0 and and y.[[EndIndex]] = x.[[EndIndex], return FAILURE.
    if (min === 0 && y.EndIndex === x.EndIndex) {
      return FAILURE;
    }
    // c. If min = 0, let min2 be 0; otherwise let min2 be min - 1.
    let min2;
    if (min === 0) {
      min2 = 0;
    } else {
      min2 = min - 1;
    }
    // d. If max is ∞, let max2 be ∞; otherwise let max2 be max - 1.
    let max2;
    if (max === Infinity) {
      max2 = Infinity;
    } else {
      max2 = max - 1;
    }
    // e. Return RepeatMatcher(m, min2, max2, greedy, y, c, parenIndex, parenCount).
    return RepeatMatcher(m, min2, max2, greedy, y, c, parenIndex, parenCount);
  };
  // 3. Let cap be a copy of x.[[Captures]].
  const cap = [...x.Captures];
  // 4. For each integer k in the inclusive interval from parenIndex + 1 to parenIndex + parenCount, set cap[k] to undefined.
  for (let k = parenIndex + 1; k <= parenIndex + parenCount; k += 1) {
    cap[k] = Value.undefined;
  }
  // 5. Let Input be x.[[Input]].
  const Input = x.Input;
  // 6. Let e be x.[[EndIndex]].
  const e = x.EndIndex;
  // 7. Let xr be the MatchState { [[Input]]: Input, [[EndIndex]]: e, [[Captures]]: cap }.
  const xr = new MatchState(Input, e, cap);
  // 8. If min != 0, return m(xr, d).
  if (min !== 0) {
    return m(xr, d);
  }
  // 9. If greedy is false, then
  if (greedy === false) {
    // a. Let z be c(x).
    const z = c(x);
    // b. If z is not FAILURE, return z.
    if (z !== FAILURE) {
      return z;
    }
    // c. Return m(xr, d).
    return m(xr, d);
  }
  // 10. Let z be m(xr, d).
  const z = m(xr, d);
  // 11. If z is not FAILURE, return z.
  if (z !== FAILURE) {
    return z;
  }
  // 12. Return c(x).
  return c(x);
}

/** https://tc39.es/ecma262/#sec-emptymatcher */
function EmptyMacher(): Matcher {
  // 1. Return a new Matcher with parameters (x, c) that captures nothing and performs the following steps when called:
  return (x, c) => {
    // 1. Assert: x is a MatchState.
    Assert(x instanceof MatchState);
    // 2. Assert: c is a MatcherContinuation.
    Assert(isContinuation(c));
    // 3. Call c(x) and return its result.
    return c(x);
  };
}

/** https://tc39.es/ecma262/#sec-matchtwoalternatives */
function MatchTwoAlternatives(m1: Matcher, m2: Matcher): Matcher {
  // 3. Return a new Matcher with parameters (x, c) that captures m1 and m2 and performs the following steps when called:
  return (x, c) => {
    // a. Assert: x is a MatchState.
    Assert(x instanceof MatchState);
    // b. Assert: c is a MatcherContinuation.
    Assert(isContinuation(c));
    // c. Call m1(x, c) and let r be its result.
    const r = m1(x, c);
    // d. If r is not failure, return r.
    if (r !== 'failure') {
      return r;
    }
    // e. Call m2(x, c) and return its result.
    return m2(x, c);
  };
}

/** https://tc39.es/ecma262/#sec-matchsequence */
function MatchSequence(m1: Matcher, m2: Matcher, direction: Direction): Matcher {
  // 3. If direction is FORWARD, then
  if (direction === FORWARD) {
    // a. Return a new Matcher with parameters (x, c) that captures m1 and m2 and performs the following steps when called:
    return (x, c) => {
      // i. Assert: x is a MatchState.
      Assert(x instanceof MatchState);
      // ii. Assert: c is a MatcherContinuation.
      Assert(isContinuation(c));
      // iii. Let d be a new MatcherContinuation with parameters (y) that captures c and m2 and performs the following steps when called:
      const d: MatcherContinuation = (y) => {
        // 1. Assert: y is a MathcState.
        Assert(y instanceof MatchState);
        // 2. Return m2(y, c).
        return m2(y, c);
      };
      // iv. Return m1(x, d).
      return m1(x, d);
    };
  } else { // 4. Else,
    // a. Assert: direction is BACKWARD.
    Assert(direction === BACKWARD);
    // b. Return a new Matcher with parameters (x, c) that captures m1 and m2 and performs the following steps when called:
    return (x, c) => {
      // i. Assert: x is a MatchState.
      Assert(x instanceof MatchState);
      // ii. Assert: c is a MatcherContinuation.
      Assert(isContinuation(c));
      // iii. Let d be a new MatcherContinuation with parameters (y) that captures c and m1 and performs the following steps when called:
      const d: MatcherContinuation = (y) => {
        // 1. Assert: y is a MatchState.
        Assert(y instanceof MatchState);
        // 2. Return m1(y, c).
        return m1(y, c);
      };
      // iv. Return m2(x, d).
      return m2(x, d);
    };
  }
}

/** https://tc39.es/ecma262/#sec-runtime-semantics-iswordchar-abstract-operation */
function IsWordChar(rer: RegExpRecord, Input: number[], e: number) {
  // 1. Let InputLength be the number of elements in Input.
  const InputLength = Input.length;
  // 2. If e = -1 or e = InputLength, return false.
  if (e === -1 || e === InputLength) {
    return false;
  }
  // 2. Let c be the character Input[e].
  const c = Input[e];
  // 3. If WordCharacters(rer) contains c, return true.
  if (WordCharacters(rer).has(c)) {
    return true;
  }
  // 4. Return false.
  return false;
}

/** https://tc39.es/ecma262/#sec-runtime-semantics-wordcharacters-abstract-operation */
function WordCharacters(rer: RegExpRecord) {
  // 1. Let basicWordChars be the CharSet containing every character in the ASCII word characters.
  // 2. Let extraWordChars be the CharSet containing all characters c such that c is not in basicWordChars but Canonicalize(rer, c) is in basicWordChars.
  // 3. Assert: extraWordChars is empty unless rer.[[Unicode]] is true and rer.[[IgnoreCase]] is true.
  // 4. Return the union of basicWordChars and extraWordChars
  // Return A.
  const basicWordChars = CharSet.from([
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '_',
  ].map((c) => c.codePointAt(0)!));
  let extraWordChars: CharSet;
  if (rer.Unicode && rer.IgnoreCase) {
    extraWordChars = CharSet.virtual((c) => !basicWordChars.has(c) && basicWordChars.has(Canonicalize(rer, c)));
  } else {
    extraWordChars = CharSet.empty();
  }
  return basicWordChars.union(extraWordChars);
}

/** https://tc39.es/ecma262/#sec-allcharacters */
function AllCharacters(_rer: RegExpRecord) {
  // NOTE: _rer is reserved for future support for UnicodeSets
  return CharSet.all();
}

/** https://tc39.es/ecma262/#sec-maybesimplecasefolding */
function MaybeSimpleCaseFolding(_rer: RegExpRecord, S: CharSet) {
  // NOTE: _rer is reserved for future support for UnicodeSets
  return S;
}

function CharacterComplement(rer: RegExpRecord, S: CharSet) {
  // 1. Let A be AllCharacters(rer).
  const A = AllCharacters(rer);
  // 2. Return the CharSet containing the CharSetElements of A which are not also CharSetElements of S.
  return A.except(S);
}

/** https://tc39.es/proposal-regexp-modifiers/#sec-updatemodifiers */
function UpdateModifiers(rer: RegExpRecord, addModifiers: string, removeModifiers: string) {
  let { DotAll, IgnoreCase, Multiline } = rer;
  if (addModifiers.includes('s')) {
    DotAll = true;
  }
  if (addModifiers.includes('i')) {
    IgnoreCase = true;
  }
  if (addModifiers.includes('m')) {
    Multiline = true;
  }
  if (removeModifiers.includes('s')) {
    DotAll = false;
  }
  if (removeModifiers.includes('i')) {
    IgnoreCase = false;
  }
  if (removeModifiers.includes('m')) {
    Multiline = false;
  }
  return new RegExpRecord(IgnoreCase, Multiline, DotAll, rer.Unicode, rer.CapturingGroupsCount);
}

/** https://tc39.es/ecma262/#sec-runtime-semantics-charactersetmatcher-abstract-operation */
function CharacterSetMatcher(rer: RegExpRecord, A: CharSet, invert: boolean, direction: Direction): Matcher {
  // 1. Return a new Matcher with parameters (x, c) that captures rer, A, invert, and direction and performs the following steps when called:
  return (x, c) => {
    // a. Assert: x is a MatchState.
    Assert(x instanceof MatchState);
    // b. Assert: c is a MatcherContinuation.
    Assert(isContinuation(c));
    // c. Let Input be x.[[Input]].
    const Input = x.Input;
    // d. Let e be x.[[EndIndex]].
    const e = x.EndIndex;
    let f;
    // e. If direction is FORWARD, let f be e + 1.
    if (direction === FORWARD) {
      f = e + 1;
    }
    else { // f. Else, let f be e - 1;
      f = e - 1;
    }
    // g. Let InputLength be the number of elements in Input.
    const InputLength = Input.length;
    // h. If f < 0 or f > InputLength, return FAILURE.
    if (f < 0 || f > InputLength) {
      return FAILURE;
    }
    // i. Let index be min(e, f).
    const index = Math.min(e, f);
    // j. Let ch be the character Input[index].
    const ch = Input[index];
    // k. Let cc be Canonicalize(rer, ch).
    const cc = Canonicalize(rer, ch);
    // l. If there exists a CharSetElement in A containing exactly one character a such that Canonicalize(rer, a) is cc, let found be true. Otherwise, let found be false.
    const found = A.some(a => Canonicalize(rer, a) === cc);
    // m. If invert is false and found is false, return FAILURE.
    if (invert === false && found === false) {
      return FAILURE;
    }
    // n. If invert is true and found is true, return FAILURE.
    if (invert === true && found === true) {
      return FAILURE;
    }
    // o. Let cap be x.[[Captures]].
    const cap = x.Captures;
    // p. Let y be the MatchState { [[Input]]: Input, [[EndIndex]]: f, [[Captures]]: cap }.
    const y = new MatchState(Input, f, cap);
    // q. Return c(y).
    return c(y);
  };
}

/** https://tc39.es/ecma262/#sec-backreference-matcher */
function BackreferenceMatcher(rer: RegExpRecord, n: number, direction: Direction): Matcher {
  // 1. Assert: n ≥ 1.
  // 2. Return a new Matcher with parameters (x, c) that captures rer, n, and direction and performs the following steps when called:
  return (x, c) => {
    // a. Assert: x is a MatchState.
    Assert(x instanceof MatchState);
    // b. Assert: c is a MatcherContinuation.
    Assert(isContinuation(c));
    // c. Let Input be x.[[Input]].
    const Input = x.Input;
    // d. Let cap be x.[[Captures]].
    const cap = x.Captures;
    // e. Let s be cap[n].
    const s = cap[n];
    // f. If s is undefined, return c(x).
    if (s instanceof UndefinedValue) {
      return c(x);
    }
    // g. Let e be x.[[EndIndex]].
    const e = x.EndIndex;
    // h. Let rs be r.[[StartIndex]].
    const rs = s.StartIndex;
    // i. Let re be r.[[EndIndex]].
    const re = s.EndIndex;
    // j. Let len be re - rs.
    const len = re - rs;
    let f;
    // k. If direction is FORWARD, let f be e + len.
    if (direction === FORWARD) {
      f = e + len;
    } else { // l. Else, let f be e - len.
      f = e - len;
    }
    // m. Let InputLength be the number of elements in Input.
    const InputLength = Input.length;
    // n. If f < 0 or f > InputLength, return FAILURE.
    if (f < 0 || f > InputLength) {
      return FAILURE;
    }
    // o. Let g be min(e, f).
    const g = Math.min(e, f);
    // p. If there exists an integer i in the interval from 0 (inclusive) to len (exclusive) such that Canonicalize(rer, Input[rs + i]) is not Canonicalize(rer, Input[g + i]), return FAILURE.
    for (let i = 0; i < len; i += 1) {
      if (Canonicalize(rer, Input[rs + i]) !== Canonicalize(rer, Input[g + i])) {
        return FAILURE;
      }
    }
    // l. Let y be the MatchState { [[Input]]: Input, [[EndIndex]]: f, [[Captures]]: cap }.
    const y = new MatchState(Input, f, cap);
    // m. Return c(y).
    return c(y);
  };
}

/** https://tc39.es/ecma262/#sec-runtime-semantics-canonicalize-ch */
function Canonicalize(rer: RegExpRecord, ch: number) {
  // 1. If IgnoreCase is false, return ch.
  if (rer.IgnoreCase === false) {
    return ch;
  }
  // 2. If Unicode is true, then
  if (rer.Unicode === true) {
    const s = String.fromCodePoint(ch);
    // a. If the file CaseFolding.txt of the Unicode Character Database provides a simple or common case folding mapping for ch, return the result of applying that mapping to ch.
    if (unicodeCaseFoldingSimple.has(s)) {
      return unicodeCaseFoldingSimple.get(s).codePointAt(0);
    }
    if (unicodeCaseFoldingCommon.has(s)) {
      return unicodeCaseFoldingCommon.get(s).codePointAt(0);
    }
    // b. Return ch.
    return ch;
  } else { // 3. Else
    // a. Assert: ch is a UTF-16 code unit.
    // b. Let s be the String value consisting of the single code unit ch.
    const s = String.fromCodePoint(ch);
    // c. Let u be the same result produced as if by performing the algorithm for String.prototype.toUpperCase using s as the this value.
    const u = s.toUpperCase();
    // d. Assert: Type(u) is String.
    Assert(typeof u === 'string');
    // e. If u does not consist of a single code unit, return ch.
    if (u.length !== 1) {
      return ch;
    }
    // f. Let cu be u's single code unit element.
    const cu = u.codePointAt(0)!;
    // g. If the numeric value of ch ≥ 128 and the numeric value of cu < 128, return ch.
    if (ch >= 128 && cu < 128) {
      return ch;
    }
    // h. Return cu.
    return cu;
  }
}
