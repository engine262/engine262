import { surroundingAgent } from '../host-defined/engine.mts';
import * as messages from '../messages.mts';
import { LanguageParser } from './LanguageParser.mts';
import { isLineTerminator, type Locatable } from './Lexer.mts';
import type {
  Location,
  ParseNode,
  ParseNodesByType,
  Position,
} from './ParseNode.mts';
import { Scope } from './Scope.mts';
import { Token } from './tokens.mts';

export interface ParserOptions {
  readonly source: string;
  readonly specifier?: string;
  readonly json?: boolean;
}

export class Parser extends LanguageParser {
  protected readonly source: string;

  protected readonly specifier?: string;

  readonly earlyErrors: Set<SyntaxError>;

  readonly state: {
    hasTopLevelAwait: boolean;
    strict: boolean;
    json: boolean;
  };

  readonly scope = new Scope(this);

  constructor({ source, specifier, json = false }: ParserOptions) {
    super();
    this.source = source;
    this.specifier = specifier;
    this.earlyErrors = new Set();
    this.state = {
      hasTopLevelAwait: false,
      strict: false,
      json,
    };
  }

  isStrictMode() {
    return this.state.strict;
  }

  feature(name: string) {
    // eslint-disable-next-line @engine262/valid-feature
    return surroundingAgent.feature(name);
  }

  startNode<T extends ParseNode>(inheritStart?: ParseNode.BaseParseNode): ParseNode.Unfinished<T>;

  startNode(inheritStart?: ParseNode.BaseParseNode): ParseNode.Unfinished {
    this.peek();
    const node: ParseNode.BaseParseNode = {
      type: undefined!,
      parent: undefined,
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

  markNodeStart(node: ParseNode.Unfinished) {
    node.location.startIndex = this.peekToken.startIndex;
    node.location.start = {
      line: this.peekToken.line,
      column: this.peekToken.column,
    };
  }

  finishNode<T extends ParseNode.Unfinished, K extends T['type'] & ParseNode['type']>(node: T, type: K): ParseNodesByType[K];

  finishNode(node: ParseNode.Unfinished, type: ParseNode['type']) {
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
