// @ts-nocheck
import unicodeCaseFoldingCommon from '@unicode/unicode-15.0.0/Case_Folding/C/symbols.js';
import unicodeCaseFoldingSimple from '@unicode/unicode-15.0.0/Case_Folding/S/symbols.js';
import { JSStringValue, UndefinedValue, Value } from '../value.mjs';
import { Assert, isNonNegativeInteger } from '../abstract-ops/all.mjs';
import { CharacterValue, StringToCodePoints } from '../static-semantics/all.mjs';
import { X } from '../completion.mjs';
import { isLineTerminator, isWhitespace, isDecimalDigit } from '../parser/Lexer.mjs';
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
class MatchState {
  endIndex;
  captures;
  constructor(endIndex: number, captures: (Range | UndefinedValue)[]) {
    this.endIndex = endIndex;
    this.captures = captures;
  }
}

/** https://tc39.es/ecma262/#pattern-matchresult */
type MatchResult = MatchState | 'failure';

/** https://tc39.es/ecma262/#pattern-matchercontinuation */
type MatcherContinuation = (m: MatchState) => MatchResult;

/** https://tc39.es/ecma262/#pattern-matcher */
type Matcher = (x: MatchState, c: MatcherContinuation) => MatchResult;

const FORWARD = +1;
const BACKWARD = -1;

type Direction = 1 | -1;

export { MatchState as RegExpState };

/** https://tc39.es/proposal-regexp-modifiers/#sec-modifiers-records */
export class ModifiersRecord {
  readonly DotAll: boolean;
  readonly IgnoreCase: boolean;
  readonly Multiline: boolean;
  constructor(DotAll: boolean, IgnoreCase: boolean, Multiline: boolean) {
    this.DotAll = DotAll;
    this.IgnoreCase = IgnoreCase;
    this.Multiline = Multiline;
  }
}

function isContinuation(v: unknown): v is MatcherContinuation {
  return typeof v === 'function' && v.length === 1;
}

abstract class CharSet {
  abstract has(c: number): boolean;
  union(other: CharSet) {
    const concrete = new Set<number>();
    const fns = new Set<(ch: number) => boolean>();
    const add = (cs: CharSet) => {
      if (cs instanceof UnionCharSet) {
        cs.fns.forEach((fn) => {
          fns.add(fn);
        });
        cs.concrete.forEach((c) => {
          concrete.add(c);
        });
      } else if (cs instanceof VirtualCharSet) {
        fns.add(cs.fn);
      } else {
        Assert(cs instanceof ConcreteCharSet);
        cs.concrete.forEach((c) => {
          concrete.add(c);
        });
      }
    };
    add(this);
    add(other);
    return new UnionCharSet(concrete, fns);
  }
}

class UnionCharSet extends CharSet {
  concrete;
  fns;
  constructor(concrete: Set<number>, fns: Set<(ch: number) => boolean>) {
    super();

    this.concrete = concrete;
    this.fns = fns;
  }

  has(c: number) {
    if (this.concrete.has(c)) {
      return true;
    }
    for (const fn of this.fns) {
      if (fn(c)) {
        return true;
      }
    }
    return false;
  }
}

class ConcreteCharSet extends CharSet {
  concrete;
  constructor(items: Iterable<number>) {
    super();
    this.concrete = items instanceof Set ? items : new Set(items);
  }

  has(c: number) {
    return this.concrete.has(c);
  }

  get size() {
    return this.concrete.size;
  }

  first() {
    Assert(this.concrete.size >= 1);
    return this.concrete.values().next().value;
  }
}

class VirtualCharSet extends CharSet {
  fn;
  constructor(fn: (ch: number) => boolean) {
    super();
    this.fn = fn;
  }

  has(c: number) {
    return this.fn(c);
  }
}

class Range {
  startIndex;
  endIndex;
  constructor(startIndex: number, endIndex: number) {
    Assert(startIndex <= endIndex);
    this.startIndex = startIndex;
    this.endIndex = endIndex;
  }
}

/** https://tc39.es/ecma262/#sec-pattern */
//   Pattern :: Disjunction
export function CompilePattern(Pattern: ParseNode.RegExp.Pattern, flags: string) {
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
  let Input: number[];
  let InputLength: number;
  const NcapturingParens = Pattern.capturingGroups.length;
  const DotAll = flags.includes('s');
  const IgnoreCase = flags.includes('i');
  const Multiline = flags.includes('m');
  const Unicode = flags.includes('u');

  {
    // *1. Let modifiers be the Modifiers Record { [[DotAll]]: DotAll, [[IgnoreCase]]: IgnoreCase, [[Multiline]]: Multiline }.
    const modifiers = new ModifiersRecord(DotAll, IgnoreCase, Multiline);
    // 1. Evaluate Disjunction with +1 as its direction argument to obtain a Matcher m.
    const m = CompileSubpattern(Pattern.Disjunction, FORWARD, modifiers);
    // 2. Return a new abstract closure with parameters (str, index) that captures m and performs the following steps when called:
    return (str: JSStringValue, index: number) => {
      // a. Assert: Type(str) is String.
      Assert(str instanceof JSStringValue);
      // b. Assert: index is a non-negative integer which is ≤ the length of str.
      Assert(isNonNegativeInteger(index) && index <= str.stringValue().length);
      // c. If Unicode is true, let Input be a List consisting of the sequence of code points of ! StringToCodePoints(str).
      //    Otherwise, let Input be a List consisting of the sequence of code units that are the elements of str.
      //    Input will be used throughout the algorithms in 21.2.2. Each element of Input is considered to be a character.
      if (Unicode) {
        Input = X(StringToCodePoints(str.stringValue()));
      } else {
        Input = str.stringValue().split('').map((c) => c.charCodeAt(0));
      }
      // d. Let InputLength be the number of characters contained in Input. This variable will be used throughout the algorithms in 21.2.2.
      InputLength = Input.length;
      // e. Let listIndex be the index into Input of the character that was obtained from element index of str.
      const listIndex = index;
      // f. Let c be a new Continuation with parameters (y) that captures nothing and performs the following steps when called:
      const c: MatcherContinuation = (y) => {
        // i. Assert: y is a State.
        Assert(y instanceof MatchState);
        // ii. Return y.
        return y;
      };
      // g. Let cap be a List of NcapturingParens undefined values, indexed 1 through NcapturingParens.
      const cap = Array.from({ length: NcapturingParens + 1 }, () => Value.undefined);
      // h. Let x be the State (listIndex, cap).
      const x = new MatchState(listIndex, cap);
      // i. Call m(x, c) and return its result.
      return m(x, c);
    };
  }

  /** https://tc39.es/ecma262/#sec-compilesubpattern */
  function CompileSubpattern(node: ParseNode.RegExp.Disjunction | ParseNode.RegExp.Alternative | ParseNode.RegExp.Term | ParseNode.RegExp.Assertion, direction: Direction, modifiers: ModifiersRecord): Matcher {
    switch (node.type) {
      case 'Disjunction':
        return CompileSubpattern_Disjunction(node, direction, modifiers);
      case 'Alternative':
        return CompileSubpattern_Alternative(node, direction, modifiers);
      case 'Term':
        return CompileSubpattern_Term(node, direction, modifiers);
      case 'Assertion':
        return CompileSubpattern_Assertion(node, direction, modifiers);
      default:
        throw new OutOfRange('CompileSubpattern', subtype);
    }
  }

  /** https://tc39.es/ecma262/#sec-disjunction */
  //   Disjunction ::
  //     Alternative
  //     Alternative `|` Disjunction
  function CompileSubpattern_Disjunction({ Alternative, Disjunction }: ParseNode.RegExp.Disjunction, direction: Direction, modifiers: ModifiersRecord): Matcher {
    if (!Disjunction) {
      // 1. Evaluate Alternative with argument direction to obtain a Matcher m.
      const m = CompileSubpattern(Alternative, direction, modifiers);
      // 2. Return m.
      return m;
    }
    // 1. Evaluate Alternative with argument direction to obtain a Matcher m1.
    const m1 = CompileSubpattern(Alternative, direction, modifiers);
    // 2. Evaluate Disjunction with argument direction to obtain a Matcher m2.
    const m2 = CompileSubpattern(Disjunction, direction, modifiers);
    // 3. Return a new Matcher with parameters (x, c) that captures m1 and m2 and performs the following steps when called:
    return (x, c) => {
      // a. Assert: x is a State.
      Assert(x instanceof MatchState);
      // b. Assert: c is a Continuation.
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

  /** https://tc39.es/ecma262/#sec-alternative */
  //   Alternative ::
  //     [empty]
  //     Alternative Term
  function CompileSubpattern_Alternative({ Alternative, Term }: ParseNode.RegExp.Alternative, direction: Direction, modifiers: ModifiersRecord): Matcher {
    if (!Alternative && !Term) {
      // 1. Return a new Matcher with parameters (x, c) that captures nothing and performs the following steps when called:
      return (x, c) => {
        // 1. Assert: x is a State.
        Assert(x instanceof MatchState);
        // 2. Assert: c is a Continuation.
        Assert(isContinuation(c));
        // 3. Call c(x) and return its result.
        return c(x);
      };
    }
    // 1. Evaluate Alternative with argument direction to obtain a Matcher m1.
    const m1 = CompileSubpattern(Alternative!, direction, modifiers);
    // 2. Evaluate Term with argument direction to obtain a Matcher m2.
    const m2 = CompileSubpattern(Term!, direction, modifiers);
    // 3. If direction is equal to +1, then
    if (direction === FORWARD) {
      // a. Return a new Matcher with parameters (x, c) that captures m1 and m2 and performs the following steps when called:
      return (x, c) => {
        // i. Assert: x is a State.
        Assert(x instanceof MatchState);
        // ii. Assert: c is a Continuation.
        Assert(isContinuation(c));
        // iii. Let d be a new Continuation with parameters (y) that captures c and m2 and performs the following steps when called:
        const d: MatcherContinuation = (y) => {
          // 1. Assert: y is a State.
          Assert(y instanceof MatchState);
          // 2. Call m2(y, c) and return its result.
          return m2(y, c);
        };
        // iv. Call m1(x, d) and return its result.
        return m1(x, d);
      };
    } else { // 4. Else,
      // a. Assert: direction is equal to -1.
      Assert(direction === BACKWARD);
      // b. Return a new Matcher with parameters (x, c) that captures m1 and m2 and performs the following steps when called:
      return (x, c) => {
        // i. Assert: x is a State.
        Assert(x instanceof MatchState);
        // ii. Assert: c is a Continuation.
        Assert(isContinuation(c));
        // iii. Let d be a new Continuation with parameters (y) that captures c and m1 and performs the following steps when called:
        const d: MatcherContinuation = (y) => {
          // 1. Assert: y is a State.
          Assert(y instanceof MatchState);
          // 2. Call m1(y, c) and return its result.
          return m1(y, c);
        };
        // iv. Call m2(x, d) and return its result.
        return m2(x, d);
      };
    }
  }

  /** https://tc39.es/ecma262/#sec-term */
  //   Term ::
  //     Atom
  //     Atom Quantifier
  function CompileSubpattern_Term(Term: ParseNode.RegExp.Term_Atom, direction: Direction, modifiers: ModifiersRecord): Matcher {
    const { Atom, Quantifier } = Term;
    if (!Quantifier) {
      // 1. Return the Matcher that is the result of evaluating Atom with argument direction.
      return CompileAtom(Atom, direction, modifiers);
    }
    // 1. Evaluate Atom with argument direction to obtain a Matcher m.
    const m = CompileAtom(Atom, direction, modifiers);
    // 2. Evaluate Quantifier to obtain the three results: an integer min, an integer (or ∞) max, and Boolean greedy.
    const [min, max, greedy] = CompileQuantifier(Quantifier);
    // 3. Assert: If max is finite, then max is not less than min.
    Assert(!Number.isFinite(max) || (max >= min));
    // 4. Let parenIndex be the number of left-capturing parentheses in the entire regular expression that occur to the
    //    left of this Term. This is the total number of Atom :: `(` GroupSpecifier Disjunction `)` Parse Nodes prior to
    //    or enclosing this Term.
    const parenIndex = Term.capturingParenthesesBefore;
    // 5. Let parenCount be the number of left-capturing parentheses in Atom. This is the total number of
    //    Atom :: `(` GroupSpecifier Disjunction `)` Parse Nodes enclosed by Atom.
    const parenCount = 'enclosedCapturingParentheses' in Atom ? Atom.enclosedCapturingParentheses : 0;
    // 6. Return a new Matcher with parameters (x, c) that captures m, min, max, greedy, parenIndex, and parenCount and performs the following steps when called:
    return (x, c) => {
      // a. Assert: x is a State.
      Assert(x instanceof MatchState);
      // b. Assert: c is a Continuation.
      Assert(isContinuation(c));
      // c. Call RepeatMatcher(m, min, max, greedy, x, c, parenIndex, parenCount) and return its result.
      return RepeatMatcher(m, min, max, greedy, x, c, parenIndex, parenCount);
    };
  }

  /** https://tc39.es/ecma262/#sec-term */
  //   Term ::
  //     Assertion
  function CompileSubpattern_Assertion(Assertion: ParseNode.RegExp.Assertion, _direction: Direction, modifiers: ModifiersRecord) {
    // 1. Return CompileAssertion of Assertion with argument modifiers.
    return CompileAssertion(Assertion, modifiers);
  }

  /** https://tc39.es/ecma262/#sec-runtime-semantics-repeatmatcher-abstract-operation */
  function RepeatMatcher(m: Matcher, min: number, max: number, greedy: boolean, x: MatchState, c: MatcherContinuation, parenIndex: number, parenCount: number): MatchResult {
    // 1. If max is zero, return c(x).
    if (max === 0) {
      return c(x);
    }
    // 2. Let d be a new Continuation with parameters (y) that captures m, min, max, greedy, x, c, parenIndex, and parenCount and performs the following steps when called:
    const d: MatcherContinuation = (y) => {
      // a. Assert: y is a State.
      Assert(y instanceof MatchState);
      // b. If min is zero and y's endIndex is equal to x's endIndex, return failure.
      if (min === 0 && y.endIndex === x.endIndex) {
        return 'failure';
      }
      // c. If min is zero, let min2 be zero; otherwise let min2 be min - 1.
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
      // e. Call RepeatMatcher(m, min2, max2, greedy, y, c, parenIndex, parenCount) and return its result.
      return RepeatMatcher(m, min2, max2, greedy, y, c, parenIndex, parenCount);
    };
    // 3. Let cap be a copy of x's captures List.
    const cap = [...x.captures];
    // 4. For each integer k that satisfies parenIndex < k and k ≤ parenIndex + parenCount, set cap[k] to undefined.
    for (let k = parenIndex + 1; k <= parenIndex + parenCount; k += 1) {
      cap[k] = Value.undefined;
    }
    // 5. Let e be x's endIndex.
    const e = x.endIndex;
    // 6. Let xr be the State (e, cap).
    const xr = new MatchState(e, cap);
    // 7. If min is not zero, return m(xr, d).
    if (min !== 0) {
      return m(xr, d);
    }
    // 8. If greedy is false, then
    if (greedy === false) {
      // a. Call c(x) and let z be its result.
      const z = c(x);
      // b. If z is not failure, return z.
      if (z !== 'failure') {
        return z;
      }
      // c. Call m(xr, d) and return its result.
      return m(xr, d);
    }
    // 9. Call m(xr, d) and let z be its result.
    const z = m(xr, d);
    // 10. If z is not failure, return z.
    if (z !== 'failure') {
      return z;
    }
    // 11. Call c(x) and return its result.
    return c(x);
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
  function CompileAssertion({ subtype, Disjunction }: ParseNode.RegExp.Assertion, modifiers: ModifiersRecord): Matcher {
    switch (subtype) {
      case '^':
        // 1. Return a new Matcher with parameters (x, c) that captures nothing and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a State.
          Assert(x instanceof MatchState);
          // b. Assert: c is a Continuation.
          Assert(isContinuation(c));
          // c. Let e be x's endIndex.
          const e = x.endIndex;
          // d. If e is zero, or if Multiline is true and the character Input[e - 1] is one of LineTerminator, then
          if (e === 0 || (modifiers.Multiline && isLineTerminator(String.fromCodePoint(Input[e - 1])))) {
            // i. Call c(x) and return its result.
            return c(x);
          }
          // e. Return failure.
          return 'failure';
        };
      case '$':
        // 1. Return a new Matcher with parameters (x, c) that captures nothing and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a State.
          Assert(x instanceof MatchState);
          // b. Assert: c is a Continuation.
          Assert(isContinuation(c));
          // c. Let e be x's endIndex.
          const e = x.endIndex;
          // d. If e is equal to InputLength, or if Multiline is true and the character Input[e] is one of LineTerminator, then
          if (e === InputLength || (modifiers.Multiline && isLineTerminator(String.fromCodePoint(Input[e])))) {
            // i. Call c(x) and return its result.
            return c(x);
          }
          // e. Return failure.
          return 'failure';
        };
      case 'b':
        // 1. Return a new Matcher with parameters (x, c) that captures nothing and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a State.
          Assert(x instanceof MatchState);
          // b. Assert: c is a Continuation.
          Assert(isContinuation(c));
          // c. Let e be x's endIndex.
          const e = x.endIndex;
          // d. Call IsWordChar(e - 1) and let a be the Boolean result.
          const a = IsWordChar(e - 1, modifiers);
          // e. Call IsWordChar(e) and let b be the Boolean result.
          const b = IsWordChar(e, modifiers);
          // f. If a is true and b is false, or if a is false and b is true, then
          if ((a && !b) || (!a && b)) {
            // i. Call c(x) and return its result.
            return c(x);
          }
          // g. Return failure.
          return 'failure';
        };
      case 'B':
        // 1. Return a new Matcher with parameters (x, c) that captures nothing and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a State.
          Assert(x instanceof MatchState);
          // b. Assert: c is a Continuation.
          Assert(isContinuation(c));
          // c. Let e be x's endIndex.
          const e = x.endIndex;
          // d. Call IsWordChar(e - 1) and let a be the Boolean result.
          const a = IsWordChar(e - 1, modifiers);
          // e. Call IsWordChar(e) and let b be the Boolean result.
          const b = IsWordChar(e, modifiers);
          // f. If a is true and b is true, or if a is false and b is false, then
          if ((a && b) || (!a && !b)) {
            // i. Call c(x) and return its result.
            return c(x);
          }
          // g. Return failure.
          return 'failure';
        };
      case '?=': {
        // 1. Evaluate Disjunction with +1 as its direction argument to obtain a Matcher m.
        const m = CompileSubpattern(Disjunction!, FORWARD, modifiers);
        // 2. Return a new Matcher with parameters (x, c) that captures m and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a State.
          Assert(x instanceof MatchState);
          // b. Assert: c is a Continuation.
          Assert(isContinuation(c));
          // c. Let d be a new Continuation with parameters (y) that captures nothing and performs the following steps when called:
          const d: MatcherContinuation = (y) => {
            // i. Assert: y is a State.
            Assert(y instanceof MatchState);
            // ii. Return y.
            return y;
          };
          // d. Call m(x, d) and let r be its result.
          const r = m(x, d);
          // e. If r is failure, return failure.
          if (r === 'failure') {
            return 'failure';
          }
          // f. Let y be r's State.
          const y = r;
          // g. Let cap be y's captures List.
          const cap = y.captures;
          // h. Let xe be x's endIndex.
          const xe = x.endIndex;
          // i. Let z be the State (xe, cap).
          const z = new MatchState(xe, cap);
          // j. Call c(z) and return its result.
          return c(z);
        };
      }
      case '?!': {
        // 1. Evaluate Disjunction with +1 as its direction argument to obtain a Matcher m.
        const m = CompileSubpattern(Disjunction!, FORWARD, modifiers);
        // 2. Return a new Matcher with parameters (x, c) that captures m and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a State.
          Assert(x instanceof MatchState);
          // b. Assert: c is a Continuation.
          Assert(isContinuation(c));
          // c. Let d be a new Continuation with parameters (y) that captures nothing and performs the following steps when called:
          const d: MatcherContinuation = (y) => {
            // i. Assert: y is a State.
            Assert(y instanceof MatchState);
            // ii. Return y.
            return y;
          };
          // d. Call m(x, d) and let r be its result.
          const r = m(x, d);
          // e. If r is not failure, return failure.
          if (r !== 'failure') {
            return 'failure';
          }
          // f. Call c(x) and return its result.
          return c(x);
        };
      }
      case '?<=': {
        // 1. Evaluate Disjunction with -1 as its direction argument to obtain a Matcher m.
        const m = CompileSubpattern(Disjunction!, BACKWARD, modifiers);
        // 2. Return a new Matcher with parameters (x, c) that captures m and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a State.
          Assert(x instanceof MatchState);
          // b. Assert: c is a Continuation.
          Assert(isContinuation(c));
          // c. Let d be a new Continuation with parameters (y) that captures nothing and performs the following steps when called:
          const d: MatcherContinuation = (y) => {
            // i. Assert: y is a State.
            Assert(y instanceof MatchState);
            // ii. Return y.
            return y;
          };
          // d. Call m(x, d) and let r be its result.
          const r = m(x, d);
          // e. If r is failure, return failure.
          if (r === 'failure') {
            return 'failure';
          }
          // f. Let y be r's State.
          const y = r;
          // g. Let cap be y's captures List.
          const cap = y.captures;
          // h. Let xe be x's endIndex.
          const xe = x.endIndex;
          // i. Let z be the State (xe, cap).
          const z = new MatchState(xe, cap);
          // j. Call c(z) and return its result.
          return c(z);
        };
      }
      case '?<!': {
        // 1. Evaluate Disjunction with -1 as its direction argument to obtain a Matcher m.
        const m = CompileSubpattern(Disjunction!, BACKWARD, modifiers);
        // 2. Return a new Matcher with parameters (x, c) that captures m and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a State.
          Assert(x instanceof MatchState);
          // b. Assert: c is a Continuation.
          Assert(isContinuation(c));
          // c. Let d be a new Continuation with parameters (y) that captures nothing and performs the following steps when called:
          const d: MatcherContinuation = (y) => {
            // i. Assert: y is a State.
            Assert(y instanceof MatchState);
            // ii. Return y.
            return y;
          };
          // d. Call m(x, d) and let r be its result.
          const r = m(x, d);
          // e. If r is not failure, return failure.
          if (r !== 'failure') {
            return 'failure';
          }
          // f. Call c(x) and return its result.
          return c(x);
        };
      }
      default:
        throw new OutOfRange('CompileAssertion', subtype);
    }
  }

  /** https://tc39.es/ecma262/#sec-runtime-semantics-wordcharacters-abstract-operation */
  function GetWordCharacters(modifiers: ModifiersRecord) {
    // 1. Let A be a set of characters containing the sixty-three characters:
    //   a b c d e f g h i j k l m n o p q r s t u v w x y z
    //   A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
    //   0 1 2 3 4 5 6 7 8 9 _
    // 2. Let U be an empty set.
    // 3. For each character c not in set A where Canonicalize(c) is in A, add c to U.
    // 4. Assert: Unless Unicode and IgnoreCase are both true, U is empty.
    // 5. Add the characters in set U to set A.
    // Return A.
    const A = new ConcreteCharSet([
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '_',
    ].map((c) => c.codePointAt(0)!));
    if (Unicode && IgnoreCase) {
      return new VirtualCharSet((c) => {
        if (A.has(c)) {
          return true;
        }
        if (A.has(Canonicalize(c, modifiers))) {
          return true;
        }
        return false;
      });
    }
    return A;
  }

  /** https://tc39.es/ecma262/#sec-runtime-semantics-iswordchar-abstract-operation */
  function IsWordChar(e: number, modifiers: ModifiersRecord) {
    // 1. If e is -1 or e is InputLength, return false.
    if (e === -1 || e === InputLength) {
      return false;
    }
    // 2. Let c be the character Input[e].
    const c = Input[e];
    // 3. Let wordChars be the result of ! WordCharacters().
    const wordChars = X(GetWordCharacters(modifiers));
    // 4. If c is in wordChars, return true.
    if (wordChars.has(c)) {
      return true;
    }
    // 5. Return false.
    return false;
  }

  /** https://tc39.es/ecma262/#sec-quantifier */
  //   Quantifier ::
  //     QuantifierPrefix
  //     QuantifierPrefix `?`
  function CompileQuantifier({ QuantifierPrefix, greedy }: ParseNode.RegExp.Quantifier): [min: number, max: number, greedy: boolean] {
    switch (QuantifierPrefix) {
      case '*':
        return [0, Infinity, greedy];
      case '+':
        return [1, Infinity, greedy];
      case '?':
        return [0, 1, greedy];
      default:
        break;
    }
    const { DecimalDigits_a, DecimalDigits_b } = QuantifierPrefix;
    return [DecimalDigits_a, DecimalDigits_b || DecimalDigits_a, greedy];
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
  function CompileAtom(Atom: ParseNode.RegExp.Atom, direction: Direction, modifiers: ModifiersRecord): Matcher {
    switch (true) {
      case 'PatternCharacter' in Atom && !!Atom.PatternCharacter: {
        // 1. Let ch be the character matched by PatternCharacter.
        const ch = Atom.PatternCharacter.codePointAt(0)!;
        // 2. Let A be a one-element CharSet containing the character ch.
        const A = new ConcreteCharSet([Canonicalize(ch, modifiers)]);
        // 3. Call CharacterSetMatcher(A, false, direction) and return its Matcher result.
        return CharacterSetMatcher(A, false, direction, modifiers);
      }
      case 'subtype' in Atom && Atom.subtype === '.': {
        let A;
        // 1. If DotAll is true, then
        if (modifiers.DotAll) {
          // a. Let A be the set of all characters.
          A = new VirtualCharSet((_c) => true);
        } else {
          // 2. Otherwise, let A be the set of all characters except LineTerminator.
          A = new VirtualCharSet((c) => !isLineTerminator(String.fromCodePoint(c)));
        }
        // 3. Call CharacterSetMatcher(A, false, direction) and return its Matcher result.
        return CharacterSetMatcher(A, false, direction, modifiers);
      }
      case Atom.type === 'AtomEscape':
        return CompileAtom_AtomEscape(Atom, direction, modifiers);

      case 'CharacterClass' in Atom && !!Atom.CharacterClass: {
        // 1. Evaluate CharacterClass to obtain a CharSet A and a Boolean invert.
        const { A, invert } = CompileCharacterClass(Atom.CharacterClass, modifiers);
        // 2. Call CharacterSetMatcher(A, invert, direction) and return its Matcher result.
        return CharacterSetMatcher(A, invert, direction, modifiers);
      }
      case 'capturing' in Atom && Atom.capturing && !!Atom.Disjunction: {
        // 1. Evaluate Disjunction with argument direction to obtain a Matcher m.
        const m = CompileSubpattern(Atom.Disjunction, direction, modifiers);
        // 2. Let parenIndex be the number of left-capturing parentheses in the entire regular expression
        //    that occur to the left of this Atom. This is the total number of Atom :: `(` GroupSpecifier Disjunction `)`
        //    Parse Nodes prior to or enclosing this Atom.
        const parenIndex = Atom.capturingParenthesesBefore;
        // 3. Return a new Matcher with parameters (x, c) that captures direction, m, and parenIndex and performs the following steps when called:
        return (x, c) => {
          // a. Assert: x is a State.
          Assert(x instanceof MatchState);
          // b. Assert: c is a Continuation.
          Assert(isContinuation(c));
          // c. Let d be a new Continuation with parameters (y) that captures x, c, direction, and parenIndex and performs the following steps when called:
          const d: MatcherContinuation = (y) => {
            // i. Assert: y is a State.
            Assert(y instanceof MatchState);
            // ii. Let cap be a copy of y's captures List.
            const cap = [...y.captures];
            // iii. Let xe be x's endIndex.
            const xe = x.endIndex;
            // iv. Let ye be y's endIndex.
            const ye = y.endIndex;
            let s;
            // v. If direction is equal to +1, then
            if (direction === +1) {
              // 1. Assert: xe ≤ ye.
              Assert(xe <= ye);
              // 2. Let r be the Range (xe, ye).
              s = new Range(xe, ye);
            } else { // vi. Else,
              // 1. Assert: direction is equal to -1.
              Assert(direction === -1);
              // 2. Assert: ye ≤ xe.
              Assert(ye <= xe);
              // 3. Let r be the Range (ye, xe).
              s = new Range(ye, xe);
            }
            // vii. Set cap[parenIndex + 1] to s.
            cap[parenIndex + 1] = s;
            // viii. Let z be the State (ye, cap).
            const z = new MatchState(ye, cap);
            // ix. Call c(z) and return its result.
            return c(z);
          };
          // d. Call m(x, d) and return its result.
          return m(x, d);
        };
      }
      case 'Disjunction' in Atom && !!Atom.Disjunction: {
        // *1. Let addModifiers be the source text matched by the first RegularExpressionFlags.
        const addModifiers = Atom.RegularExpressionFlags_a ?? '';
        // *2. Let removeModifiers be the source text matched by the second RegularExpressionFlags.
        const removeModifiers = Atom.RegularExpressionFlags_b ?? '';
        // *3. Let newModifiers be UpdateModifiers(modifiers, CodePointsToString(addModifiers), CodePointsToString(removeModifiers)).
        const newModifiers = UpdateModifiers(modifiers, addModifiers, removeModifiers);
        // *4. Return CompileSubpattern of Disjunction with arguments direction and newModifiers.
        return CompileSubpattern(Atom.Disjunction, direction, newModifiers);
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
  function CompileAtom_AtomEscape(AtomEscape: ParseNode.RegExp.AtomEscape, direction: Direction, modifiers: ModifiersRecord): Matcher {
    switch (true) {
      case !!AtomEscape.DecimalEscape: {
        // 1. Evaluate DecimalEscape to obtain an integer n.
        const n = CapturingGroupNumber(AtomEscape.DecimalEscape);
        // 2. Assert: n ≤ NcapturingParens.
        Assert(n <= NcapturingParens);
        // 3. Call BackreferenceMatcher(n, direction) and return its Matcher result.
        return BackreferenceMatcher(n, direction, modifiers);
      }
      case !!AtomEscape.CharacterEscape: {
        // 1. Evaluate CharacterEscape to obtain a character ch.
        const ch = CharacterValue(AtomEscape.CharacterEscape);
        // 2. Let A be a one-element CharSet containing the character ch.
        const A = new ConcreteCharSet([Canonicalize(ch, modifiers)]);
        // 3. Call CharacterSetMatcher(A, false, direction) and return its Matcher result.
        return CharacterSetMatcher(A, false, direction, modifiers);
      }
      case !!AtomEscape.CharacterClassEscape: {
        // 1. Evaluate CharacterClassEscape to obtain a CharSet A.
        const A = CompileToCharSet(AtomEscape.CharacterClassEscape, modifiers);
        // 2. Call CharacterSetMatcher(A, false, direction) and return its Matcher result.
        return CharacterSetMatcher(A, false, direction, modifiers);
      }
      case !!AtomEscape.GroupName: {
        // 1. Search the enclosing Pattern for an instance of a GroupSpecifier for a RegExpIdentifierName which has a StringValue equal to the StringValue of the RegExpIdentifierName contained in GroupName.
        // 2. Assert: A unique such GroupSpecifier is found.
        // 3. Let parenIndex be the number of left-capturing parentheses in the entire regular expression that occur to the left of the located GroupSpecifier. This is the total number of Atom :: `(` GroupSpecifier Disjunction `)` Parse Nodes prior to or enclosing the located GroupSpecifier.
        const parenIndex = Pattern.groupSpecifiers.get(AtomEscape.GroupName);
        Assert(parenIndex !== undefined);
        // 4. Call BackreferenceMatcher(parenIndex, direction) and return its Matcher result.
        return BackreferenceMatcher(parenIndex + 1, direction, modifiers);
      }
      default:
        throw new OutOfRange('CompileAtom_AtomEscape', AtomEscape);
    }
  }

  /** https://tc39.es/proposal-regexp-modifiers/#sec-updatemodifiers */
  function UpdateModifiers(modifiers: ModifiersRecord, addModifiers: string, removeModifiers: string) {
    let { DotAll, IgnoreCase, Multiline } = modifiers;
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
    return new ModifiersRecord(DotAll, IgnoreCase, Multiline);
  }

  /** https://tc39.es/ecma262/#sec-runtime-semantics-charactersetmatcher-abstract-operation */
  function CharacterSetMatcher(A: CharSet, invert: boolean, direction: Direction, modifiers: ModifiersRecord): Matcher {
    // 1. Return a new Matcher with parameters (x, c) that captures A, invert, and direction and performs the following steps when called:
    return (x, c) => {
      // a. Assert: x is a State.
      Assert(x instanceof MatchState);
      // b. Assert: c is a Continuation.
      Assert(isContinuation(c));
      // c. Let e be x's endIndex.
      const e = x.endIndex;
      // d. Let f be e + direction.
      const f = e + direction;
      // e. If f < 0 or f > InputLength, return failure.
      if (f < 0 || f > InputLength) {
        return 'failure';
      }
      // f. Let index be min(e, f).
      const index = Math.min(e, f);
      // g. Let ch be the character Input[index].
      const ch = Input[index];
      // h. Let cc be Canonicalize(ch).
      const cc = Canonicalize(ch, modifiers);
      // i. If invert is false, then
      if (invert === false) {
        // i. If there does not exist a member a of set A such that Canonicalize(a) is cc, return failure.
        if (!A.has(cc)) {
          return 'failure';
        }
      } else { // j. Else
        // i. Assert: invert is true.
        Assert(invert === true);
        // ii. If there exists a member a of set A such that Canonicalize(a) is cc, return failure.
        if (A.has(cc)) {
          return 'failure';
        }
      }
      // k. Let cap be x's captures List.
      const cap = x.captures;
      // Let y be the State (f, cap).
      const y = new MatchState(f, cap);
      // Call c(y) and return its result.
      return c(y);
    };
  }

  /** https://tc39.es/ecma262/#sec-runtime-semantics-canonicalize-ch */
  function Canonicalize(ch: number, modifiers: ModifiersRecord) {
    // 1. If IgnoreCase is false, return ch.
    if (modifiers.IgnoreCase === false) {
      return ch;
    }
    // 2. If Unicode is true, then
    if (Unicode === true) {
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

  /** https://tc39.es/ecma262/#sec-backreference-matcher */
  function BackreferenceMatcher(n: number, direction: Direction, modifiers: ModifiersRecord): Matcher {
    // 1. Return a new Matcher with parameters (x, c) that captures n and direction and performs the following steps when called:
    return (x, c) => {
      // a. Assert: x is a State.
      Assert(x instanceof MatchState);
      // b. Assert: c is a Continuation.
      Assert(isContinuation(c));
      // c. Let cap be x's captures List.
      const cap = x.captures;
      // d. Let s be cap[n].
      const s = cap[n];
      // e. If s is undefined, return c(x).
      if (s instanceof UndefinedValue) {
        return c(x);
      }
      // f. Let e be x's endIndex.
      const e = x.endIndex;
      // g. Let rs be r's startIndex.
      const rs = s.startIndex;
      // h. Let re be r's endIndex.
      const re = s.endIndex;
      // i. Let len be the number of elements in re - rs.
      const len = re - rs;
      // h. Let f be e + direction × len.
      const f = e + direction * len;
      // i. If f < 0 or f > InputLength, return failure.
      if (f < 0 || f > InputLength) {
        return 'failure';
      }
      // j. Let g be min(e, f).
      const g = Math.min(e, f);
      // k. If there exists an integer i between 0 (inclusive) and len (exclusive) such that Canonicalize(s[i]) is not the same character value as Canonicalize(Input[g + i]), return failure.
      for (let i = 0; i < len; i += 1) {
        if (Canonicalize(Input[s.startIndex + i], modifiers) !== Canonicalize(Input[g + i], modifiers)) {
          return 'failure';
        }
      }
      // l. Let y be the State (f, cap).
      const y = new MatchState(f, cap);
      // m. Call c(y) and return its result.
      return c(y);
    };
  }

  /** https://tc39.es/ecma262/#sec-decimalescape */
  // DecimalEscape ::
  //   NonZeroDigit DecimalDigits?
  function CapturingGroupNumber(DecimalEscape: ParseNode.RegExp.DecimalEscape) {
    return DecimalEscape.value;
  }

  function CompileToCharSet(node: ParseNode.RegExp.ClassAtom, modifiers: ModifiersRecord): CharSet {
    switch (node.type) {
      case 'CharacterClassEscape':
        return CompileToCharSet_CharacterClassEscape(node, modifiers);
      case 'ClassAtom':
        return CompileToCharSet_ClassAtom(node, modifiers);
      case 'ClassEscape':
        return CompileToCharSet_ClassEscape(node, modifiers);
      default:
        throw new OutOfRange('CompileToCharSet', node);
    }
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
  function CompileToCharSet_CharacterClassEscape(node: ParseNode.RegExp.CharacterClassEscape, modifiers: ModifiersRecord): CharSet {
    switch (node.value) {
      case 'd':
        // 1. Return the ten-element set of characters containing the characters 0 through 9 inclusive.
        return new ConcreteCharSet(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((c) => c.codePointAt(0)!));
      case 'D':
        // 1. Return the set of all characters not included in the set returned by CharacterClassEscape :: `d`.
        return new VirtualCharSet((c) => !isDecimalDigit(String.fromCodePoint(c)));
      case 's':
        // 1. Return the set of characters containing the characters that are on the right-hand side of the WhiteSpace or LineTerminator productions.
        return new VirtualCharSet((c) => {
          const s = String.fromCodePoint(c);
          return isWhitespace(s) || isLineTerminator(s);
        });
      case 'S':
        // 1. Return the set of all characters not included in the set returned by CharacterClassEscape :: `s`.
        return new VirtualCharSet((c) => {
          const s = String.fromCodePoint(c);
          return !isWhitespace(s) && !isLineTerminator(s);
        });
      case 'w':
        // 1. Return the set of all characters returned by WordCharacters().
        return GetWordCharacters(modifiers);
      case 'W': {
        // 1. Return the set of all characters not included in the set returned by CharacterClassEscape :: `w`.
        const s = GetWordCharacters(modifiers);
        return new VirtualCharSet((c) => !s.has(c));
      }
      case 'p':
        // 1. Return the CharSet containing all Unicode code points included in the CharSet returned by UnicodePropertyValueExpression.
        return CompileToCharSet_UnicodePropertyValueExpression(node.UnicodePropertyValueExpression!);
      case 'P': {
        // 1. Return the CharSet containing all Unicode code points not included in the CharSet returned by UnicodePropertyValueExpression.
        const s = CompileToCharSet_UnicodePropertyValueExpression(node.UnicodePropertyValueExpression!);
        return new VirtualCharSet((c) => !s.has(c));
      }
      default:
        throw new OutOfRange('CompileToCharSet_CharacterClassEscape', node);
    }
  }

  // UnicodePropertyValueExpression ::
  //   UnicodePropertyName `=` UnicodePropertyValue
  //   LoneUnicodePropertyNameOrValue
  function CompileToCharSet_UnicodePropertyValueExpression(UnicodePropertyValueExpression: ParseNode.RegExp.UnicodePropertyValueExpression): CharSet {
    if (UnicodePropertyValueExpression.LoneUnicodePropertyNameOrValue) {
      // 1. Let s be SourceText of LoneUnicodePropertyNameOrValue.
      const s = UnicodePropertyValueExpression.LoneUnicodePropertyNameOrValue;
      // 2. If ! UnicodeMatchPropertyValue(General_Category, s) is identical to a List of Unicode code points that is the name of a Unicode general category or general category alias listed in the “Property value and aliases” column of Table 57, then
      if (X(UnicodeMatchPropertyValue('General_Category', s) in UnicodeGeneralCategoryValues)) {
        // a. Return the CharSet containing all Unicode code points whose character database definition includes the property “General_Category” with value s.
        // @ts-expect-error -- 'string' is not a subtype of 'keyof typeof UnicodeGeneralCategoryValues'
        return new ConcreteCharSet(getUnicodePropertyValueSet('General_Category', UnicodeGeneralCategoryValues[s]));
      }
      // 3. Let p be ! UnicodeMatchProperty(s).
      const p = X(UnicodeMatchProperty(s));
      // 4. Assert: p is a binary Unicode property or binary property alias listed in the “Property name and aliases” column of Table 56.
      Assert(p in BinaryUnicodeProperties);
      // 5. Return the CharSet containing all Unicode code points whose character database definition includes the property p with value “True”.
      return new ConcreteCharSet(getUnicodePropertyValueSet(p));
    }
    // 1. Let ps be SourceText of UnicodePropertyName.
    const ps = UnicodePropertyValueExpression.UnicodePropertyName!;
    // 2. Let p be ! UnicodeMatchProperty(ps).
    const p = X(UnicodeMatchProperty(ps));
    // 3. Assert: p is a Unicode property name or property alias listed in the “Property name and aliases” column of Table 55.
    Assert(p in NonbinaryUnicodeProperties);
    // 4. Let vs be SourceText of UnicodePropertyValue.
    const vs = UnicodePropertyValueExpression.UnicodePropertyValue;
    // 5. Let v be ! UnicodeMatchPropertyValue(p, vs).
    const v = X(UnicodeMatchPropertyValue(p, vs));
    // 6. Return the CharSet containing all Unicode code points whose character database definition includes the property p with value v.
    return new ConcreteCharSet(getUnicodePropertyValueSet(p, v));
  }

  /** https://tc39.es/ecma262/#sec-characterclass */
  //  CharacterClass ::
  //    `[` ClassRanges `]`
  //    `[` `^` ClassRanges `]`
  function CompileCharacterClass({ invert, ClassRanges }: ParseNode.RegExp.CharacterClass, modifiers: ModifiersRecord) {
    let A: CharSet = new ConcreteCharSet([]);
    for (const range of ClassRanges) {
      if (Array.isArray(range)) {
        const B = CompileToCharSet(range[0], modifiers);
        const C = CompileToCharSet(range[1], modifiers);
        Assert(B instanceof ConcreteCharSet && C instanceof ConcreteCharSet);
        const D = CharacterRange(B, C, modifiers);
        A = A.union(D);
      } else {
        A = A.union(CompileToCharSet(range, modifiers));
      }
    }
    return { A, invert };
  }

  /** https://tc39.es/ecma262/#sec-runtime-semantics-characterrange-abstract-operation */
  function CharacterRange(A: ConcreteCharSet, B: ConcreteCharSet, modifiers: ModifiersRecord) {
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
    // 7. Return the set containing all characters numbered i through j, inclusive.
    const set = new Set<number>();
    for (let k = i; k <= j; k += 1) {
      set.add(Canonicalize(k, modifiers)); // TODO: should this really be using canonicalize?
    }
    return new ConcreteCharSet(set);
  }

  /** https://tc39.es/ecma262/#sec-classatom */
  // ClassAtom ::
  //   `-`
  //   ClassAtomNoDash
  // ClassAtomNoDash ::
  //   SourceCharacter
  //   `\` ClassEscape
  function CompileToCharSet_ClassAtom(ClassAtom: ParseNode.RegExp.ClassAtom, modifiers: ModifiersRecord): CharSet {
    switch (true) {
      case 'SourceCharacter' in ClassAtom && !!ClassAtom.SourceCharacter:
        // 1. Return the CharSet containing the character matched by SourceCharacter.
        return new ConcreteCharSet([Canonicalize(ClassAtom.SourceCharacter.codePointAt(0)!, modifiers)]);
      case ClassAtom.value === '-':
        // 1. Return the CharSet containing the single character - U+002D (HYPHEN-MINUS).
        return new ConcreteCharSet([0x002D]);
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
  function CompileToCharSet_ClassEscape(ClassEscape: ParseNode.RegExp.ClassEscape, modifiers: ModifiersRecord): CharSet {
    switch (true) {
      case ClassEscape.value === 'b':
      case ClassEscape.value === '-':
      case !!ClassEscape.CharacterEscape: {
        // 1. Let cv be the CharacterValue of this ClassEscape.
        const cv = CharacterValue(ClassEscape);
        // 2. Let c be the character whose character value is cv.
        const c = cv;
        // 3. Return the CharSet containing the single character c.
        return new ConcreteCharSet([Canonicalize(c, modifiers)]);
      }
      default:
        throw new OutOfRange('CompileToCharSet_ClassEscape', ClassEscape);
    }
  }
}
