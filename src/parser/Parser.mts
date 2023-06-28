import { surroundingAgent } from '../engine.mjs';
import * as messages from '../messages.mjs';
import { LanguageParser } from './LanguageParser.mjs';
import { Token } from './tokens.mjs';
import { Scope } from './Scope.mjs';
import { isLineTerminator, type Locatable } from './Lexer.mjs';
import type { Location, ParseNode, Position } from './ParseNode.mjs';

export class Parser extends LanguageParser {
  source: string;
  specifier: string;
  earlyErrors: Set<SyntaxError>;
  state: {
    hasTopLevelAwait: boolean;
    strict: boolean;
    json: boolean;
  };

  scope = new Scope(this);
  constructor({ source, specifier, json = false }: { source: string, specifier: string, json?: boolean }) {
    super();
    this.source = source;
    this.specifier = specifier;
    this.earlyErrors = new Set();
    this.state = {
      hasTopLevelAwait: false,
      strict: false,
      json,
    };
    this.scope = new Scope(this);
  }

  isStrictMode() {
    return this.state.strict;
  }

  feature(name: string) {
    // eslint-disable-next-line @engine262/valid-feature
    return surroundingAgent.feature(name);
  }

  startNode(inheritStart?: ParseNode): ParseNode;
  startNode<T extends ParseNode>(inheritStart?: ParseNode): ParseNode.Unfinished<T>;
  startNode(inheritStart: ParseNode | undefined = undefined): ParseNode.Unfinished<ParseNode> | ParseNode {
    this.peek();
    const node: ParseNode = {
      type: undefined!,
      location: {
        startIndex: inheritStart ? inheritStart.location.startIndex : this.peekToken.startIndex,
        endIndex: -1,
        start: inheritStart ? { ...inheritStart.location.start } : {
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

  markNodeStart(node: ParseNode.Unfinished<ParseNode> | ParseNode) {
    node.location.startIndex = this.peekToken.startIndex;
    node.location.start = {
      line: this.peekToken.line,
      column: this.peekToken.column,
    };
  }

  finishNode<T extends ParseNode.Unfinished<ParseNode>, K extends T['type']>(node: T, type: K): ParseNode.Finished<T, K>;
  finishNode<T extends ParseNode>(node: T, type: string): T;
  finishNode(node: ParseNode, type: string) {
    node.type = type;
    node.location.endIndex = this.currentToken.endIndex;
    node.location.end.line = this.currentToken.line;
    node.location.end.column = this.currentToken.column;
    return node;
  }

  createSyntaxError<K extends keyof typeof messages>(context: number | Locatable = this.peek(), template: K, templateArgs: Parameters<typeof messages[K]>): SyntaxError {
    if (template === 'UnexpectedToken' && typeof context !== 'number' && 'type' in context && context.type === Token.EOS) {
      return this.createSyntaxError(context, 'UnexpectedEOS', []);
    }

    let startIndex;
    let endIndex;
    let line;
    let column;
    if (typeof context === 'number') {
      line = this.line;
      if (context === this.source.length) {
        while (isLineTerminator(this.source[context - 1])) {
          line -= 1;
          context -= 1;
        }
      }
      startIndex = context;
      endIndex = context + 1;
    } else if ('type' in context && context.type === Token.EOS) {
      line = this.line;
      startIndex = context.startIndex;
      while (isLineTerminator(this.source[startIndex - 1])) {
        line -= 1;
        startIndex -= 1;
      }
      endIndex = startIndex + 1;
    } else {
      if ('location' in context && context.location) {
        context = context.location;
      }
      ({
        startIndex,
        endIndex,
        start: {
          line,
          column,
        } = context as Position, // NOTE: unsound cast
      } = context as Location); // NOTE: unsound cast
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

    if (column === undefined) {
      column = startIndex - lineStart + 1;
    }

    const message = messages[template] as (...args: Parameters<typeof messages[K]>) => string;
    const e = new SyntaxError(message(...templateArgs));
    e.decoration = `\
${this.specifier ? `${this.specifier}:${line}:${column}\n` : ''}${this.source.slice(lineStart, lineEnd)}
${' '.repeat(startIndex - lineStart)}${'^'.repeat(Math.max(endIndex - startIndex, 1))}`;
    return e;
  }

  raiseEarly<K extends keyof typeof messages>(template: K, context?: number | Locatable, ...templateArgs: Parameters<typeof messages[K]>) {
    const e = this.createSyntaxError(context, template, templateArgs);
    this.earlyErrors.add(e);
    return e;
  }

  raise<K extends keyof typeof messages>(template: K, context?: number | Locatable, ...templateArgs: Parameters<typeof messages[K]>): never {
    const e = this.createSyntaxError(context, template, templateArgs);
    throw e;
  }

  unexpected(...args: [(number | Locatable)?, ...Parameters<typeof messages['UnexpectedToken']>]) {
    return this.raise('UnexpectedToken', ...args);
  }
}

declare global {
  interface SyntaxError {
    decoration?: string;
  }
}
