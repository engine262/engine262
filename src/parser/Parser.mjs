import { surroundingAgent } from '../engine.mjs';
import { LanguageParser } from './LanguageParser.mjs';

// Distinct scopes:
//   - function    (allows control flow and new.target)
//   - function    (allows new.target)
//   - method      (allows super property and new.target)
//   - constructor (allows super call and new.target)
/* eslint-disable key-spacing */
export const ScopeBits = {
  RETURN:     0b000001,
  AWAIT:      0b000010,
  YIELD:      0b000100,
  NEW_TARGET: 0b001000,
  SUPER_CALL: 0b010000,
  SUPER_PROP: 0b100000,
};
/* eslint-enable key-spacing */

export class Parser extends LanguageParser {
  constructor(source) {
    super(source);
    this.source = source;
    this.state = {
      strict: false,
      scopeBits: 0,
    };
  }

  feature(name) {
    return surroundingAgent.feature(name);
  }

  isStrictMode() {
    return this.state.strict;
  }

  isReturnScope() {
    return (this.state.scopeBits & ScopeBits.RETURN) !== 0;
  }

  isAwaitScope() {
    return (this.state.scopeBits & ScopeBits.AWAIT) !== 0;
  }

  isYieldScope() {
    return (this.state.scopeBits & ScopeBits.YIELD) !== 0;
  }

  isNewTargetScope() {
    return (this.state.scopeBits & ScopeBits.NEW_TARGET) !== 0;
  }

  isSuperCallScope() {
    return (this.state.scopeBits & ScopeBits.SUPER_CALL) !== 0;
  }

  isSuperPropertyScope() {
    return (this.state.scopeBits & ScopeBits.SUPER_PROP) !== 0;
  }

  scope(scope, f) {
    const old = this.state.scopeBits;
    if (scope.return === true) {
      this.state.scopeBits |= ScopeBits.RETURN;
    } else if (scope.return === false) {
      this.state.scopeBits &= ~ScopeBits.RETURN;
    }
    if (scope.await === true) {
      this.state.scopeBits |= ScopeBits.AWAIT;
    } else if (scope.await === false) {
      this.state.scopeBits &= ~ScopeBits.AWAIT;
    }
    if (scope.yield === true) {
      this.state.scopeBits |= ScopeBits.YIELD;
    } else if (scope.yield === false) {
      this.state.scopeBits &= ~ScopeBits.YIELD;
    }
    if (scope.newTarget === true) {
      this.state.scopeBits |= ScopeBits.NEW_TARGET;
    } else if (scope.newTarget === false) {
      this.state.scopeBits &= ~ScopeBits.NEW_TARGET;
    }
    if (scope.superCall === true) {
      this.state.scopeBits |= ScopeBits.SUPER_CALL;
    } else if (scope.superCall === false) {
      this.state.scopeBits &= ~ScopeBits.SUPER_CALL;
    }
    if (scope.superProperty === true) {
      this.state.scopeBits |= ScopeBits.SUPER_PROP;
    } else if (scope.superProperty === false) {
      this.state.scopeBits &= ~ScopeBits.SUPER_PROP;
    }
    const r = f();
    this.state.scopeBits = old;
    return r;
  }

  startNode() {
    const node = {
      type: undefined,
      location: {
        startIndex: this.position,
        endIndex: this.position,
        start: {
          line: this.line,
          column: this.column,
        },
      },
      strict: this.state.strict,
      sourceText: () => this.source.slice(node.location.startIndex, node.location.endIndex),
    };
    return node;
  }

  finishNode(node, type) {
    node.type = type;
    node.location.endIndex = this.position + 1;
    node.location.end = {
      line: this.line,
      column: this.column,
    };
    node.strict = this.state.strict;
    return node;
  }

  report(template, index = this.index) {
    const startIndex = index;
    const endIndex = this.position;
    let lineEnd = this.source.indexOf('\n', startIndex);
    if (lineEnd === -1) {
      lineEnd = this.source.length;
    }
    let lineStart = index;
    while (lineStart >= 0 && this.source[lineStart - 1] !== '\n') {
      lineStart -= 1;
    }

    const e = new SyntaxError(template);
    e.stack = `${this.source.slice(lineStart, lineEnd)}
${' '.repeat(index - lineStart)}${'^'.repeat(Math.max(endIndex - startIndex, 1))}
${e.name}: ${e.message}
    at <anonymous>:${this.line}:${index - lineStart}
${e.stack.slice(e.stack.indexOf('\n') + 1)}
`;
    throw e;
  }

  unexpected(v) {
    if (v === undefined) {
      v = this.peek();
    }
    this.report('UnexpectedToken');
  }
}
