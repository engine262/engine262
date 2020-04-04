import {
  Assert,
  IsNonNegativeInteger,
} from '../abstract-ops/all.mjs';
import { X } from '../completion.mjs';
import {
  Type,
  Value,
} from '../value.mjs';
import {
  isLineTerminator,
  isStrWhiteSpaceChar,
} from '../grammar/util.mjs';
import {
  caseFoldingMapping,
} from '../unicode/caseFoldingMapping-gen.mjs';

// 21.2.2.1 #sec-notation
export function getMatcher(parsedRegex, flags) {
  const {
    pattern,
    capturingParens,
    groupSpecifiers,
  } = parsedRegex;
  const DotAll = flags.includes('s');
  const IgnoreCase = flags.includes('i');
  const Multiline = flags.includes('m');
  const Unicode = flags.includes('u');

  const NcapturingParens = capturingParens.length;
  const internalRegExpFlags = `${Unicode ? 'u' : ''}${IgnoreCase ? 'i' : ''}`;

  return function patternMatcher(str, mainIndex) {
    // 21.2.2.2 #sec-pattern

    const mainM = Evaluate_Disjunction(pattern.Disjunction, 1);
    Assert(Type(str) === 'String');
    Assert(X(IsNonNegativeInteger(mainIndex)) === Value.true && mainIndex.numberValue() <= str.stringValue().length);

    // c. If Unicode is true, let Input be a List consisting of the sequence of code points of ! UTF16DecodeString(str).
    //    Otherwise, let Input be a List consisting of the sequence of code units that are the elements of str.
    const Input = Unicode ? Array.from(str.stringValue()) : str.stringValue().split('');

    const InputLength = Input.length;

    // d. Let listIndex be the index into Input of the character that was obtained from element index of str.
    let listIndex = 0;
    let seenChars = 0;
    for (const char of Input) {
      seenChars += char.length;
      if (seenChars > mainIndex.numberValue()) {
        break;
      }
      listIndex += 1;
    }

    function mainC(y) {
      AssertState(y);
      return y;
    }
    const mainCap = new Array(NcapturingParens + 1).fill(Value.undefined);
    const mainX = new State(listIndex, mainCap);
    return mainM(mainX, mainC);

    // 21.2.2.3 #sec-disjunction
    function Evaluate_Disjunction(Disjunction, direction) {
      if (Disjunction.Alternatives.length === 1) {
        const m = Evaluate_Alternative(Disjunction.Alternatives[0], direction);
        return m;
      } else {
        const M = Disjunction.Alternatives.map((Alternative) => Evaluate_Alternative(Alternative, direction));
        return function disjunctionAlternativeDisjunctionMatcher(x, c) {
          AssertState(x);
          AssertContinuation(c);
          for (const m of M) {
            const r = m(x, c);
            if (r !== MatchResultFailure) {
              return r;
            }
          }
          return MatchResultFailure;
        };
      }
    }

    // 21.2.2.4 #sec-alternative
    function Evaluate_Alternative(Alternative, direction) {
      if (Alternative.Terms.length === 0) {
        return function alternativeEmptyMatcher(x, c) {
          AssertState(x);
          AssertContinuation(c);
          return c(x);
        };
      }

      if (Alternative.Terms.length === 1) {
        return Evaluate_Term(Alternative.Terms[0], direction);
      } else {
        const M = Alternative.Terms.map((Term) => Evaluate_Term(Term, direction));
        if (direction === 1) {
          return function alternativePositiveDirectionMatcher(x, c) {
            AssertState(x);
            AssertContinuation(c);
            const d = M.slice(1).reduceRight((prev, cur) => function alternativePositiveContinuation(y) {
              AssertState(y);
              return cur(y, prev);
            }, c);
            return M[0](x, d);
          };
        } else {
          Assert(direction === -1);
          return function alternativeNegativeDirectionMatcher(x, c) {
            AssertState(x);
            AssertContinuation(c);
            const d = M.slice(0, -1).reduce((prev, cur) => function alternativeNegativeContinuation(y) {
              AssertState(y);
              return cur(y, prev);
            }, c);
            return M[M.length - 1](x, d);
          };
        }
      }
    }

    // 21.2.2.5 #sec-term
    function Evaluate_Term(Term, direction) {
      if (Term.subtype === 'Assertion') {
        return Evaluate_Assertion(Term.Assertion);
      }

      if (Term.subtype === 'Atom') {
        return Evaluate_Atom(Term.Atom, direction);
      }

      if (Term.subtype === 'AtomQuantifier') {
        const m = Evaluate_Atom(Term.Atom, direction);
        const { min, max, greedy } = Evaluate_Quantifier(Term.Quantifier);
        Assert(!Number.isFinite(max) || max >= min);
        const parenIndex = Term.capturingParensBefore;
        const parenCount = Term.Atom.enclosedCapturingParens;
        return function termAtomQuantifierMatcher(x, c) {
          AssertState(x);
          AssertContinuation(c);
          return RepeatMatcher(m, min, max, greedy, x, c, parenIndex, parenCount);
        };
      }

      throw new Error('unreachable');
    }

    // 21.2.2.5.1 #sec-runtime-semantics-repeatmatcher-abstract-operation
    function RepeatMatcher(m, min, max, greedy, x, c, parenIndex, parenCount) {
      if (max === 0) {
        return c(x);
      }

      const d = function repeatMatcherContinuation(y) {
        AssertState(y);
        if (min === 0 && y.endIndex === x.endIndex) {
          return MatchResultFailure;
        }
        const min2 = min === 0 ? 0 : min - 1;
        const max2 = max === Infinity ? Infinity : max - 1;
        return RepeatMatcher(m, min2, max2, greedy, y, c, parenIndex, parenCount);
      };

      const cap = x.captures.slice();
      for (let k = parenIndex + 1; k <= parenIndex + parenCount; k += 1) {
        cap[k] = Value.undefined;
      }
      const e = x.endIndex;
      const xr = new State(e, cap);
      if (min !== 0) {
        return m(xr, d);
      }
      if (greedy === false) {
        const z = c(x);
        if (z !== MatchResultFailure) {
          return z;
        }
        return m(xr, d);
      }
      const z = m(xr, d);
      if (z !== MatchResultFailure) {
        return z;
      }
      return c(x);
    }

    // 21.2.2.6 #sec-assertion
    function Evaluate_Assertion(Assertion) {
      if (Assertion.subtype === '^') {
        return function assertionStartMatcher(x, c) {
          AssertState(x);
          AssertContinuation(c);
          const e = x.endIndex;
          if (e === 0 || (Multiline === true && isLineTerminator(Input[e - 1]))) {
            return c(x);
          }
          return MatchResultFailure;
        };
      }

      if (Assertion.subtype === '$') {
        return function assertionEndMatcher(x, c) {
          AssertState(x);
          AssertContinuation(c);
          const e = x.endIndex;
          if (e === InputLength || (Multiline === true && isLineTerminator(Input[e]))) {
            return c(x);
          }
          return MatchResultFailure;
        };
      }

      if (Assertion.subtype === '\\b') {
        return function assertionWordBoundaryMatcher(x, c) {
          AssertState(x);
          AssertContinuation(c);
          const e = x.endIndex;
          const a = IsWordChar(e - 1);
          const b = IsWordChar(e);
          if ((a === true && b === false) || (a === false && b === true)) {
            return c(x);
          }
          return MatchResultFailure;
        };
      }

      if (Assertion.subtype === '\\B') {
        return function assertionNonWordBoundaryMatcher(x, c) {
          AssertState(x);
          AssertContinuation(c);
          const e = x.endIndex;
          const a = IsWordChar(e - 1);
          const b = IsWordChar(e);
          if ((a === true && b === true) || (a === false && b === false)) {
            return c(x);
          }
          return MatchResultFailure;
        };
      }

      if (Assertion.subtype === '(?=') {
        const m = Evaluate_Disjunction(Assertion.Disjunction, 1);
        return function assertionPositiveLookaheadMatcher(x, c) {
          AssertState(x);
          AssertContinuation(c);
          const d = function assertionPositiveLookaheadContinuation(y) {
            AssertState(y);
            return y;
          };
          const r = m(x, d);
          if (r === MatchResultFailure) {
            return MatchResultFailure;
          }
          const y = r;
          const cap = y.captures;
          const xe = x.endIndex;
          const z = new State(xe, cap);
          return c(z);
        };
      }

      if (Assertion.subtype === '(?!') {
        const m = Evaluate_Disjunction(Assertion.Disjunction, 1);
        return function assertionNegativeLookaheadMatcher(x, c) {
          AssertState(x);
          AssertContinuation(c);
          const d = function assertionNegativeLookaheadContinuation(y) {
            AssertState(y);
            return y;
          };
          const r = m(x, d);
          if (r !== MatchResultFailure) {
            return MatchResultFailure;
          }
          return c(x);
        };
      }

      if (Assertion.subtype === '(?<=') {
        const m = Evaluate_Disjunction(Assertion.Disjunction, -1);
        return function assertionPositiveLookbehindMatcher(x, c) {
          AssertState(x);
          AssertContinuation(c);
          const d = function assertionPositiveLookbehindContinuation(y) {
            AssertState(y);
            return y;
          };
          const r = m(x, d);
          if (r === MatchResultFailure) {
            return MatchResultFailure;
          }
          const y = r;
          const cap = y.captures;
          const xe = x.endIndex;
          const z = new State(xe, cap);
          return c(z);
        };
      }

      if (Assertion.subtype === '(?<!') {
        const m = Evaluate_Disjunction(Assertion.Disjunction, -1);
        return function assertionNegativeLookbehindMatcher(x, c) {
          AssertState(x);
          AssertContinuation(c);
          const d = function assertionNegativeLookbehindContinuation(y) {
            AssertState(y);
            return y;
          };
          const r = m(x, d);
          if (r !== MatchResultFailure) {
            return MatchResultFailure;
          }
          return c(x);
        };
      }

      throw new Error('unreachable');
    }

    // 21.2.2.6.1 #sec-runtime-semantics-wordcharacters-abstract-operation
    function WordCharacters() {
      const wordChar = new RegExp('^\\w$', internalRegExpFlags);
      return function testWordCharacters(cc) {
        return wordChar.test(cc);
      };
    }

    // 21.2.2.6.2 #sec-runtime-semantics-iswordchar-abstract-operation
    function IsWordChar(e) {
      if (e === -1 || e === InputLength) {
        return false;
      }
      const c = Input[e];
      const wordChars = X(WordCharacters());
      if (wordChars(c)) {
        return true;
      }
      return false;
    }

    // 21.2.2.7 #sec-quantifier
    function Evaluate_Quantifier(Quantifier) {
      if (Quantifier.greedy) {
        const { min, max } = Evaluate_QuantifierPrefix(Quantifier.QuantifierPrefix);
        return { min, max, greedy: true };
      } else {
        const { min, max } = Evaluate_QuantifierPrefix(Quantifier.QuantifierPrefix);
        return { min, max, greedy: false };
      }
    }

    function Evaluate_QuantifierPrefix(QuantifierPrefix) {
      if (QuantifierPrefix.subtype === '*') {
        return { min: 0, max: Infinity };
      }

      if (QuantifierPrefix.subtype === '+') {
        return { min: 1, max: Infinity };
      }

      if (QuantifierPrefix.subtype === '?') {
        return { min: 0, max: 1 };
      }

      if (QuantifierPrefix.subtype === 'fixed') {
        const i = QuantifierPrefix.value;
        return { min: i, max: i };
      }

      if (QuantifierPrefix.subtype === 'start') {
        const i = QuantifierPrefix.start;
        return { min: i, max: Infinity };
      }

      if (QuantifierPrefix.subtype === 'range') {
        const i = QuantifierPrefix.start;
        const j = QuantifierPrefix.end;
        return { min: i, max: j };
      }

      throw new Error('unreachable');
    }

    // 21.2.2.8 #sec-atom
    function Evaluate_Atom(Atom, direction) {
      if (Atom.subtype === 'PatternCharacter') {
        const ch = Atom.PatternCharacter;
        const A = singleCharSet(ch);
        return CharacterSetMatcher(A, false, direction);
      }

      if (Atom.subtype === '.') {
        let A;
        if (DotAll === true) {
          A = allCharSet();
        } else {
          A = noLineTerminatorCharSet();
        }
        return CharacterSetMatcher(A, false, direction);
      }

      if (Atom.subtype === '\\') {
        return Evaluate_AtomEscape(Atom.AtomEscape, direction);
      }

      if (Atom.subtype === 'CharacterClass') {
        const { A, invert } = Evaluate_CharacterClass(Atom.CharacterClass);
        return CharacterSetMatcher(A, invert, direction);
      }

      if (Atom.subtype === '(') {
        const m = Evaluate_Disjunction(Atom.Disjunction, direction);
        const parenIndex = Atom.capturingParensBefore;
        return function atomCapturingParensMatcher(x, c) {
          AssertState(x);
          AssertContinuation(c);
          const d = function atomCapturingParensContinuation(y) {
            AssertState(y);
            const cap = y.captures.slice();
            const xe = x.endIndex;
            const ye = y.endIndex;
            let s;
            if (direction === 1) {
              Assert(xe <= ye);
              s = Input.slice(xe, ye);
            } else {
              Assert(direction === -1);
              Assert(ye <= xe);
              s = Input.slice(ye, xe);
            }
            cap[parenIndex + 1] = s;
            const z = new State(ye, cap);
            return c(z);
          };
          return m(x, d);
        };
      }

      if (Atom.subtype === '(?:') {
        return Evaluate_Disjunction(Atom.Disjunction, direction);
      }

      throw new Error('unreachable');
    }

    // 21.2.2.8.1 #sec-runtime-semantics-charactersetmatcher-abstract-operation
    function CharacterSetMatcher(A, invert, direction) {
      return function characterSetMatcher(x, c) {
        AssertState(x);
        AssertContinuation(c);
        const e = x.endIndex;
        const f = e + direction;
        if (f < 0 || f > InputLength) {
          return MatchResultFailure;
        }
        const index = Math.min(e, f);
        const ch = Input[index];
        const cc = Canonicalize(ch);
        if (invert === false) {
          if (!A(cc)) {
            return MatchResultFailure;
          }
        } else {
          Assert(invert === true);
          if (A(cc)) {
            return MatchResultFailure;
          }
        }
        const cap = x.captures;
        const y = new State(f, cap);
        return c(y);
      };
    }

    // 21.2.2.8.2 #sec-runtime-semantics-canonicalize-ch
    function Canonicalize(ch) {
      if (IgnoreCase === false) {
        return ch;
      }

      if (Unicode === true) {
        if (caseFoldingMapping[ch]) {
          return caseFoldingMapping[ch];
        }
        return ch;
      } else {
        // Assert: ch is a UTF-16 code unit.
        Assert(ch.length === 1);
        const s = ch;
        const u = s.toUpperCase();
        if (u.length !== 1) {
          return ch;
        }
        const cu = u;
        if (ch.codePointAt(0) >= 128 && cu.codePointAt(0) < 128) {
          return ch;
        }
        return cu;
      }
    }

    // 21.2.2.9 #sec-atomescape
    function Evaluate_AtomEscape(AtomEscape, direction) {
      if (AtomEscape.subtype === 'DecimalEscape') {
        const n = Evaluate_DecimalEscape(AtomEscape.DecimalEscape);
        Assert(n <= NcapturingParens);
        return BackreferenceMatcher(n, direction);
      }

      if (AtomEscape.subtype === 'CharacterEscape') {
        const ch = Evaluate_CharacterEscape(AtomEscape.CharacterEscape);
        const A = singleCharSet(ch);
        return CharacterSetMatcher(A, false, direction);
      }

      if (AtomEscape.subtype === 'CharacterClassEscape') {
        const A = Evaluate_CharacterClassEscape(AtomEscape.CharacterClassEscape);
        return CharacterSetMatcher(A, false, direction);
      }

      if (AtomEscape.subtype === 'k') {
        const groupSpecifierParens = groupSpecifiers.get(AtomEscape.GroupName);
        Assert(typeof groupSpecifierParens === 'number');
        const parenIndex = groupSpecifierParens;
        return BackreferenceMatcher(parenIndex, direction);
      }

      throw new Error('unreachable');
    }

    // 21.2.2.9.1 #sec-backreference-matcher
    function BackreferenceMatcher(n, direction) {
      return function backreferenceMatcher(x, c) {
        AssertState(x);
        AssertContinuation(c);
        const cap = x.captures;
        const s = cap[n];
        if (s === Value.undefined) {
          return c(x);
        }
        const e = x.endIndex;
        const len = s.length;
        const f = e + direction * len;
        if (f < 0 || f > InputLength) {
          return MatchResultFailure;
        }
        const g = Math.min(e, f);
        for (let i = 0; i < len; i += 1) {
          if (Canonicalize(s[i]) !== Canonicalize(Input[g + i])) {
            return MatchResultFailure;
          }
        }
        const y = new State(f, cap);
        return c(y);
      };
    }

    // 21.2.2.10 #sec-characterescape
    function Evaluate_CharacterEscape(CharacterEscape) {
      return CharacterEscape.CharacterValue;
    }

    // 21.2.2.11 #sec-decimalescape
    function Evaluate_DecimalEscape(DecimalEscape) {
      return DecimalEscape.CapturingGroupNumber;
    }

    // 21.2.2.12 #sec-characterclassescape
    function Evaluate_CharacterClassEscape(CharacterClassEscape) {
      if (CharacterClassEscape.subtype === 'd') {
        return numberCharSet();
      }

      if (CharacterClassEscape.subtype === 'D') {
        return invertCharSet(numberCharSet());
      }

      if (CharacterClassEscape.subtype === 's') {
        return whitespaceCharSet();
      }

      if (CharacterClassEscape.subtype === 'S') {
        return invertCharSet(whitespaceCharSet());
      }

      if (CharacterClassEscape.subtype === 'w') {
        return WordCharacters();
      }

      if (CharacterClassEscape.subtype === 'W') {
        return invertCharSet(WordCharacters());
      }

      if (CharacterClassEscape.subtype === 'p{') {
        return Evaluate_UnicodePropertyValueExpression(CharacterClassEscape.UnicodePropertyValueExpression);
      }

      if (CharacterClassEscape.subtype === 'P{') {
        return invertCharSet(Evaluate_UnicodePropertyValueExpression(CharacterClassEscape.UnicodePropertyValueExpression));
      }

      throw new Error('unreachable');
    }

    function Evaluate_UnicodePropertyValueExpression(UnicodePropertyValueExpression) {
      let value;
      if (UnicodePropertyValueExpression.subtype === 'UnicodePropertyNameAndValue') {
        value = `${UnicodePropertyValueExpression.UnicodePropertyName}=${UnicodePropertyValueExpression.UnicodePropertyValue}`;
      } else if (UnicodePropertyValueExpression.subtype === 'LoneUnicodePropertyNameOrValue') {
        value = UnicodePropertyValueExpression.LoneUnicodePropertyNameOrValue;
      }

      const regexp = new RegExp(`^\\p{${value}}$`, internalRegExpFlags);
      return function testUnicodePropertyValue(cc) {
        return regexp.test(cc);
      };
    }

    // 21.2.2.13 #sec-characterclass
    function Evaluate_CharacterClass(CharacterClass) {
      if (!CharacterClass.invert) {
        const A = Evaluate_ClassRanges(CharacterClass.ClassRanges);
        return { A, invert: false };
      } else {
        const A = Evaluate_ClassRanges(CharacterClass.ClassRanges);
        return { A, invert: true };
      }
    }

    // 21.2.2.14 #sec-classranges
    function Evaluate_ClassRanges(ClassRanges) {
      if (ClassRanges.length === 0) {
        return emptyCharSet();
      }

      const charSets = ClassRanges.map((range) => {
        if (Array.isArray(range)) {
          if (range.length === 2) {
            const classAtom1 = getClassAtom(range[0]);
            const classAtom2 = getClassAtom(range[1]);
            return CharacterRange(classAtom1, classAtom2);
          }
        } else {
          return classRangeAtomCharSet(range);
        }
        throw new Error('unreachable');
      });

      return combinedCharSet(charSets);
    }

    // 21.2.2.15.1 #sec-runtime-semantics-characterrange-abstract-operation
    function CharacterRange(A, B) {
      // 1. Assert: A and B each contain exactly one character.
      Assert(typeof A === 'number' && typeof B === 'number');
      const i = A;
      const j = B;
      Assert(i <= j);
      const set = new Set();
      for (let codePoint = A; codePoint <= B; codePoint += 1) {
        set.add(Canonicalize(String.fromCodePoint(codePoint)));
      }
      return function testCharacterRange(cc) {
        return set.has(cc);
      };
    }

    // 21.2.2.19 #sec-classescape
    function Evaluate_ClassEscape(ClassEscape) {
      if (ClassEscape.subtype === 'b') {
        return '\b'.charCodeAt(0);
      }

      if (ClassEscape.subtype === '-') {
        return '-'.charCodeAt(0);
      }

      if (ClassEscape.subtype === 'CharacterEscape') {
        return Evaluate_CharacterEscape(ClassEscape.CharacterEscape);
      }

      if (ClassEscape.subtype === 'CharacterClassEscape') {
        return Evaluate_CharacterClassEscape(ClassEscape.CharacterClassEscape);
      }

      throw new Error('unreachable');
    }

    function singleCharSet(char) {
      char = Canonicalize(String.fromCodePoint(char));
      return function testSingleCharSet(cc) {
        return char === cc;
      };
    }

    function allCharSet() {
      return function testAllCharSet() {
        return true;
      };
    }

    function noLineTerminatorCharSet() {
      return function testNoLineTerminatorCharSet(cc) {
        return !isLineTerminator(cc);
      };
    }

    function numberCharSet() {
      return function testNumberCharSet(cc) {
        return /[0-9]/.test(cc);
      };
    }

    function whitespaceCharSet() {
      return function testWhitespaceCharSet(cc) {
        return isStrWhiteSpaceChar(cc);
      };
    }

    function emptyCharSet() {
      return function testEmptyCharSet() {
        return false;
      };
    }

    function invertCharSet(charSet) {
      return function testInvertCharSet(cc) {
        return !charSet(cc);
      };
    }

    function combinedCharSet(charSets) {
      return function testCombinedCharSet(cc) {
        return charSets.some((charSet) => charSet(cc));
      };
    }

    function classRangeAtomCharSet(classRange) {
      const classAtom = getClassAtom(classRange);
      if (typeof classAtom === 'function') {
        return classAtom;
      }
      return singleCharSet(classAtom);
    }

    function getClassAtom(ClassAtom) {
      if (ClassAtom.subtype === 'character') {
        return ClassAtom.character;
      } else {
        return Evaluate_ClassEscape(ClassAtom.ClassEscape);
      }
    }
  };
}

class MatchResult {}

export class State extends MatchResult {
  constructor(endIndex, captures) {
    super();
    this.endIndex = endIndex;
    this.captures = captures;
  }
}

export const MatchResultFailure = new MatchResult();

function AssertState(x) {
  Assert(x instanceof State);
}

function AssertContinuation(c) {
  Assert(typeof c === 'function' && c.length === 1);
}
