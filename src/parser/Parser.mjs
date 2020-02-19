import { Token } from './tokens.mjs';
import { StatementParser } from './StatementParser.mjs';

export class Parser extends StatementParser {
  constructor(options = {}, source) {
    super(options, source);
    this.source = source;
    this.options = options;
    this.state = {
      strict: options.sourceType === 'module',
      scopeBits: 0,
    };
  }

  static parseScript(source, options) {
    return new Parser(options, source).parseScript();
  }

  static parseModule(source, options) {
    return new Parser({ ...options, sourceType: 'module' }, source).parseModule();
  }

  // Script : ScriptBody
  parseScript() {
    const script = this.startNode();
    script.ScriptBody = this.parseScriptBody();
    return this.finishNode(script, 'Script');
  }

  // ScriptBody : StatementList
  parseScriptBody() {
    return this.parseStatementList(Token.EOS);
  }

  // Module : ModuleBody
  parseModule() {
    const module = this.startNode();
    module.ModuleBody = this.parseModuleBody();
    return this.finishNode(module, 'Module');
  }

  // ModuleBody : ModuleItemList
  parseModuleBody() {
    return this.parseStatementList(Token.EOS);
  }

  startNode() {
    const node = {
      type: undefined,
      location: {
        startIndex: this.position,
        endIndex: this.position,
        start: Object.freeze({
          line: this.line,
          column: this.column,
        }),
      },
      strict: this.state.strict,
      sourceText() {
        return this.source.slice(this.location.startIndex, this.location.endIndex);
      },
    };
    return node;
  }

  finishNode(node, type) {
    node.type = type;
    node.location.endIndex = this.position + 1;
    node.location.end = Object.freeze({
      line: this.line,
      column: this.column,
    });
    Object.freeze(node.location);
    node.strict = this.state.strict;
    return Object.freeze(node);
  }

  error(...args) {
    const e = new SyntaxError(...args);
    e.position = this.position;
    throw e;
  }
}
