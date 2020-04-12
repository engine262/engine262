// import { surroundingAgent } from '../engine.mjs';
import { LanguageParser } from './LanguageParser.mjs';

export const ScopeBits = {
  RETURN: 0b0001,
  AWAIT: 0b0010,
  YIELD: 0b0100,
  SUPER: 0b1000,
};

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
    return false;
    // return surroundingAgent.feature(name);
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

  isSuperScope() {
    return (this.state.scopeBits & ScopeBits.SUPER) !== 0;
  }

  scope(scope, f) {
    const old = this.state.scopeBits;
    Object.entries(ScopeBits).forEach(([name, value]) => {
      const e = scope[name.toLowerCase()];
      if (e === true) {
        this.state.scopeBits |= value;
      } else if (e === false) {
        this.state.scopeBits &= ~value;
      }
    });
    const r = f();
    this.state.scopeBits = old;
    return r;
  }

  startNode() {
    const node = {
      type: undefined,
      /*
      location: {
        startIndex: this.position,
        endIndex: this.position,
        start: Object.freeze({
          line: this.line,
          column: this.column,
        }),
      },
      sourceText: () => this.source.slice(node.location.startIndex, node.location.endIndex),
      */
      strict: this.state.strict,
    };
    return node;
  }

  finishNode(node, type) {
    node.type = type;
    /*
    node.location.endIndex = this.position + 1;
    node.location.end = Object.freeze({
      line: this.line,
      column: this.column,
    });
    Object.freeze(node.location);
    node.strict = this.state.strict;
    */
    return Object.freeze(node);
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
