import { surroundingAgent } from '../engine.mjs';
import * as messages from '../messages.mjs';
import { LanguageParser } from './LanguageParser.mjs';
import { Token } from './tokens.mjs';

// Distinct scopes:
//   - function    (allows control flow and new.target)
//   - function    (allows new.target)
//   - method      (allows super property and new.target)
//   - constructor (allows super call and new.target)
/* eslint-disable key-spacing */
export const ScopeBits = {
  RETURN:     0b0000001,
  AWAIT:      0b0000010,
  YIELD:      0b0000100,
  NEW_TARGET: 0b0001000,
  SUPER_CALL: 0b0010000,
  SUPER_PROP: 0b0100000,
  IN:         0b1000000,
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
    this.next(); // feed lexer to first token
  }

  feature(name) {
    return surroundingAgent.feature(name);
  }

  isStrictMode() {
    return this.state.strict;
  }

  isInScope() {
    return (this.state.scopeBits & ScopeBits.IN) !== 0;
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
    const oldBits = this.state.scopeBits;
    if (scope.in === true) {
      this.state.scopeBits |= ScopeBits.IN;
    } else if (scope.in === false) {
      this.state.scopeBits &= ~ScopeBits.IN;
    }
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
    const oldStrict = this.state.strict;
    if (scope.strict === true) {
      this.state.strict = true;
    } else if (scope.strict === false) {
      this.state.strict = false;
    }
    const r = f();
    this.state.scopeBits = oldBits;
    this.state.strict = oldStrict;
    return r;
  }

  startNode() {
    const node = {
      type: undefined,
      location: {
        startIndex: this.lookahead.startIndex,
        endIndex: -1,
        start: {
          line: this.lookahead.line,
          column: this.lookahead.column,
        },
        end: {
          line: -1,
          column: -1,
        },
      },
      strict: this.state.strict,
      sourceText: () => this.source.slice(node.location.startIndex, node.location.endIndex),
    };
    return node;
  }

  finishNode(node, type) {
    node.type = type;
    node.location.endIndex = this.currentToken.endIndex;
    node.location.end.line = this.currentToken.line;
    node.location.end.column = this.currentToken.column;
    node.strict = this.state.strict;
    return node;
  }

  report(template, context = this.lookahead) {
    if (template === 'UnexpectedToken') {
      switch (context.type) {
        case Token.AWAIT:
          template = 'AwaitNotInAsyncFunction';
          break;
        case Token.YIELD:
          template = 'YieldNotInGenerator';
          break;
        case Token.IDENTIFIER:
          if (context.value === 'await') {
            template = 'AwaitNotInAsyncFunction';
          } else if (context.value === 'yield') {
            template = 'YieldNotInGenerator';
          }
          break;
        case Token.EOS:
          template = 'UnexpectedEOS';
          break;
        default:
          break;
      }
    }

    let startIndex;
    let endIndex;
    if (typeof context === 'number') {
      startIndex = context;
      endIndex = context;
    } else {
      if (context.location) {
        context = context.location;
      }
      startIndex = context.startIndex;
      endIndex = context.endIndex;
    }
    startIndex = Math.min(this.source.length - 1, startIndex);
    endIndex = Math.min(this.source.length - 1, endIndex);
    let lineEnd = this.source.indexOf('\n', startIndex);
    if (lineEnd === -1) {
      lineEnd = this.source.length;
    }
    let lineStart = startIndex;
    while (lineStart > 0 && this.source[lineStart - 1] !== '\n') {
      lineStart -= 1;
    }

    const e = new SyntaxError(messages[template]());
    e.decoration = `${this.source.slice(lineStart, lineEnd)}
${' '.repeat(startIndex - lineStart)}${'^'.repeat(Math.max(endIndex - startIndex, 1))}`;
    throw e;
  }

  unexpected(...args) {
    return this.report('UnexpectedToken', ...args);
  }
}
