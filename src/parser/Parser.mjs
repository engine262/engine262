import { surroundingAgent } from '../engine.mjs';
import * as messages from '../messages.mjs';
import { LanguageParser } from './LanguageParser.mjs';
import { Token } from './tokens.mjs';
import { Scope } from './Scope.mjs';
import { isLineTerminator } from './Lexer.mjs';

export { Token };
export {
  isLineTerminator,
  isWhitespace,
  isDecimalDigit,
  isHexDigit,
} from './Lexer.mjs';

export class Parser extends LanguageParser {
  constructor(source) {
    super(source);
    this.source = source;
    this.earlyErrors = new Set();
    this.state = {
      hasTopLevelAwait: false,
      strict: false,
    };
    this.scope = new Scope(this);
  }

  isStrictMode() {
    return this.state.strict;
  }

  feature(name) {
    return surroundingAgent.feature(name);
  }

  startNode() {
    this.peek();
    const node = {
      type: undefined,
      location: {
        startIndex: this.peekToken.startIndex,
        endIndex: -1,
        start: {
          line: this.peekToken.line,
          column: this.peekToken.column,
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
    return node;
  }

  createSyntaxError(context = this.peek(), template, templateArgs) {
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
      endIndex = context + 1;
    } else {
      if (context.location) {
        context = context.location;
      }
      startIndex = context.startIndex;
      endIndex = context.endIndex;
    }

    /*
     * Source looks like:
     *
     *  const a = 1;
     *  const b 'string string string'; // a string
     *  const c = 3;                  |            |
     *  |       |                     |            |
     *  |       | startIndex          | endIndex   |
     *  | lineStart                                | lineEnd
     *
     * Exception looks like:
     *
     *  const b 'string string string'; // a string
     *          ^^^^^^^^^^^^^^^^^^^^^^
     *  SyntaxError: unexpected token
     */

    let lineStart = startIndex;
    while (!isLineTerminator(this.source[lineStart - 1]) && this.source[lineStart - 1] !== undefined) {
      lineStart -= 1;
    }

    let lineEnd = startIndex;
    while (!isLineTerminator(this.source[lineEnd]) && this.source[lineEnd] !== undefined) {
      lineEnd += 1;
    }

    const e = new SyntaxError(messages[template](...templateArgs));
    e.decoration = `${this.source.slice(lineStart, lineEnd)}
${' '.repeat(startIndex - lineStart)}${'^'.repeat(Math.max(endIndex - startIndex, 1))}`;
    return e;
  }

  raiseEarly(template, context, ...templateArgs) {
    const e = this.createSyntaxError(context, template, templateArgs);
    this.earlyErrors.add(e);
    return e;
  }

  raise(template, context, ...templateArgs) {
    const e = this.createSyntaxError(context, template, templateArgs);
    throw e;
  }

  unexpected(...args) {
    return this.raise('UnexpectedToken', ...args);
  }
}
