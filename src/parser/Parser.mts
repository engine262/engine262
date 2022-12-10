import { FEATURES, surroundingAgent } from '../engine.mjs';
import * as messages from '../messages.mjs';
import { LanguageParser } from './LanguageParser.mjs';
import { Token } from './tokens.mjs';
import { Scope } from './Scope.mjs';
import { isLineTerminator, LexerToken } from './Lexer.mjs';
import type { ParserState } from './BaseParser.mjs';

export class ParserSyntaxError extends SyntaxError {
  position?: number;
  decoration?: string;
}

export interface ParserOptions {
  source: string;
  specifier?: string;
  json?: boolean;
}

export class Parser extends LanguageParser {
  readonly specifier: string | undefined;
  earlyErrors: Set<ParserSyntaxError>;
  readonly state: ParserState;
  readonly scope: Scope;
  readonly source: string;
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
    this.scope = new Scope(this);
  }

  isStrictMode() {
    return this.state.strict;
  }

  feature(name: FEATURES) {
    // eslint-disable-next-line @engine262/valid-feature
    return surroundingAgent.feature(name);
  }

  startNode(inheritStart: ParseNode | undefined = undefined): ParseNode {
    this.peek();
    const node: ParseNode = {
      type: undefined!,
      location: {
        startIndex: inheritStart ? inheritStart.location.startIndex : this.peekToken!.startIndex,
        endIndex: -1,
        start: inheritStart ? { ...inheritStart.location.start } : {
          line: this.peekToken!.line,
          column: this.peekToken!.column,
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

  markNodeStart(node: ParseNode) {
    node.location.startIndex = this.peekToken!.startIndex;
    node.location.start = {
      line: this.peekToken!.line,
      column: this.peekToken!.column,
    };
  }

  finishNode(node: ParseNode, type: string) {
    node.type = type;
    node.location.endIndex = this.currentToken!.endIndex;
    node.location.end.line = this.currentToken!.line;
    node.location.end.column = this.currentToken!.column;
    return node;
  }

  private createSyntaxError(context: number | ParseNode | LexerToken = this.peek(), template: messages.MessageTemplate, templateArgs: any[]) {
    if (template === 'UnexpectedToken' && typeof context !== 'number' && context.type === Token.EOS) {
      template = 'UnexpectedEOS';
    }

    let startIndex: number;
    let endIndex: number;
    let line!: number;
    let column: number | undefined;
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
    } else if (context.type === Token.EOS) {
      line = this.line;
      startIndex = context.startIndex;
      while (isLineTerminator(this.source[startIndex - 1])) {
        line -= 1;
        startIndex -= 1;
      }
      endIndex = startIndex + 1;
    } else {
      const location = 'location' in context ? context.location : context;
      ({ startIndex, endIndex } = location);
      if ('start' in location) {
        column = location.start.column;
        line = location.start.line;
      }
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

    const e = new ParserSyntaxError((messages[template] as any)(...templateArgs));
    e.decoration = `\
${this.specifier ? `${this.specifier}:${line}:${column}\n` : ''}${this.source.slice(lineStart, lineEnd)}
${' '.repeat(startIndex - lineStart)}${'^'.repeat(Math.max(endIndex - startIndex, 1))}`;
    return e;
  }

  override raiseEarly<T extends messages.MessageTemplate>(template: T, context?: number | ParseNode, ...templateArgs: Parameters<typeof messages[T]>): ParserSyntaxError {
    const e = this.createSyntaxError(context, template, templateArgs);
    this.earlyErrors.add(e);
    return e;
  }

  raise<T extends messages.MessageTemplate>(template: T, context?: number | ParseNode, ...templateArgs: Parameters<typeof messages[T]>): never {
    const e = this.createSyntaxError(context, template, templateArgs);
    throw e;
  }

  unexpected(context?: ParseNode | number): never {
    return this.raise('UnexpectedToken', context);
  }
}
export interface Position {
  line: number;
  column: number;
}
export interface Location {
  startIndex: number;
  endIndex: number;
  start: Position;
  end: Position;
}

export interface ParseNode {
  type: string;
  location: Location;
  strict: boolean;
  sourceText(): string;
  // TODO(TS): ParseNode should be a union of all Nodes.
  [key: string]: any;
}
