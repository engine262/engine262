import { surroundingAgent } from '../engine.mjs';
import * as messages from '../messages.mjs';
import { LanguageParser } from './LanguageParser.mjs';
import { Token } from './tokens.mjs';
import { Scope } from './Scope.mjs';

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
    this.earlyErrors = [];
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

    let lineStart = this.source.lastIndexOf('\n', startIndex - 1);
    if (lineStart === -1) {
      lineStart = 0;
    }
    let lineEnd = this.source.indexOf('\n', endIndex);
    if (lineEnd === -1) {
      lineEnd = this.source.length - 1;
    }

    const e = new SyntaxError(messages[template](...templateArgs));
    e.decoration = `${this.source.slice(lineStart, lineEnd)}
${' '.repeat(startIndex - lineStart)}${'^'.repeat(Math.max(endIndex - startIndex, 1))}`;
    return e;
  }

  raiseEarly(template, context, ...templateArgs) {
    this.earlyErrors.push(this.createSyntaxError(context, template, templateArgs));
  }

  raise(template, context, ...templateArgs) {
    const e = this.createSyntaxError(context, template, templateArgs);
    throw e;
  }

  unexpected(...args) {
    return this.raise('UnexpectedToken', ...args);
  }
}
