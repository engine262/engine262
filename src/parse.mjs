import acorn from 'acorn';
import { surroundingAgent } from './engine.mjs';
import { ExportEntryRecord, SourceTextModuleRecord } from './modules.mjs';
import { Value } from './value.mjs';
import {
  ModuleRequests_ModuleItemList,
  ImportEntries_ModuleItemList,
  ExportEntries_ModuleItemList,
  ImportedLocalNames,
} from './static-semantics/all.mjs';

const HasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
function deepFreeze(o) {
  Object.freeze(o);
  Object.getOwnPropertyNames(o).forEach((prop) => {
    if (HasOwnProperty(o, prop)
        && o[prop] !== null
        && (typeof o[prop] === 'object' || typeof o[prop] === 'function')
        && !Object.isFrozen(o[prop])) {
      deepFreeze(o[prop]);
    }
  });
  return o;
}

// Copied from acorn/src/scopeflags.js.
const SCOPE_FUNCTION = 2;
const SCOPE_ASYNC = 4;
const SCOPE_GENERATOR = 8;

function functionFlags(async, generator) {
  // eslint-disable-next-line no-bitwise
  return SCOPE_FUNCTION | (async ? SCOPE_ASYNC : 0) | (generator ? SCOPE_GENERATOR : 0);
}

const optionalChainToken = {};

const Parser = acorn.Parser.extend((P) => class Parse262 extends P {
  constructor(options = {}, source) {
    super({
      ...options,
      ecmaVersion: 2020,
      // adds needed ParenthesizedExpression production
      preserveParens: true,
      locations: true,
    }, source);
    if (options.strict === true) {
      this.strict = true;
    }
  }

  parse() {
    const body = super.parse();
    deepFreeze(body);
    return body;
  }

  finishNode(node, type) {
    node.strict = this.strict;
    const ret = super.finishNode(node, type);
    node.sourceText = () => this.input.slice(node.start, node.end);
    if (ret.type === 'MethodDefinition' && ret.static) {
      ret.start += 7; // don't include `static` in the source text
    }
    return ret;
  }

  getTokenFromCode(code) {
    if (code === 63 && surroundingAgent.feature('OptionalChaining')) {
      this.pos += 1;
      const next = this.input.charCodeAt(this.pos);
      if (next === 46) {
        const nextNext = this.input.charCodeAt(this.pos + 1);
        if (nextNext < 48 || nextNext > 57) {
          this.pos += 1;
          return this.finishToken(optionalChainToken);
        }
      }
      return this.finishToken(acorn.tokTypes.question);
    }
    return super.getTokenFromCode(code);
  }

  parseSubscripts(base, startPos, startLoc, noCalls) {
    if (noCalls) {
      return super.parseSubscripts(base, startPos, startLoc, noCalls);
    }

    const maybeAsyncArrow = base.type === 'Identifier'
      && base.name === 'async'
      && this.lastTokEnd === base.end
      && !this.canInsertSemicolon()
      && this.input.slice(base.start, base.end) === 'async';

    /**
     * Optional chains are hard okay?
     *
     *  a.b?.c
     *  @=>
     *  OptionalExpression a.b?.c
     *      MemberExpression a.b
     *      OptionalChain ?.c
     *
     *  a.b?.c.d.e
     *  @=>
     *  OptionalExpressoin a.b?.c.d.e
     *      MemberExpression a.b
     *      OptionalChain ?.c.d.e
     *          OptionalChain ?.c.d
     *              OptionalChain ?.c
     *              Identifier .d
     *          Identifier .e
     *
     *  a.b?.c.d
     *  @=>
     *  OptionalExpression a.b?.c.d
     *      MemberExpression a.b
     *      OptionalChain ?.c.d
     *          OptionalChain ?.c
     *          Identifier .d
     *
     *  a.b?.c.d?.e.f
     *  @=>
     *  OptionalExpression a.b?.c.d?.e.f
     *      OptionalExpression a.b?.c.d
     *          MemberExpression a.b
     *          OptionalChain ?.c.d
     *              OptionalChain ?.c
     *              Identifier .d
     *      OptionalChain ?.e.f
     *          OptionalChain ?.e
     *          Identifier .f
     */

    while (true) {
      if (this.eat(optionalChainToken)) {
        const node = this.startNodeAt(startPos, startLoc);
        node.object = base;
        node.chain = this.parseOptionalChain(startPos, startLoc);
        base = this.finishNode(node, 'OptionalExpression');
      } else {
        const element = this.parseSubscript(base, startPos, startLoc, noCalls, maybeAsyncArrow);
        if (element === base) {
          break;
        }
        base = element;
      }
    }
    return base;
  }

  parseOptionalChain(startPos, startLoc) {
    let base = this.startNodeAt(startPos, startLoc);
    if (this.eat(acorn.tokTypes.bracketL)) {
      base.property = this.parseExpression();
      this.expect(acorn.tokTypes.bracketR);
      base.computed = true;
      base = this.finishNode(base, 'OptionalChain');
    } else if (this.eat(acorn.tokTypes.parenL)) {
      base.arguments = this.parseExprList(acorn.tokTypes.parenR, this.options.ecmaVersion >= 8, false, undefined);
    } else {
      base.property = this.parseIdent(true);
      base.computed = false;
    }
    base.base = null;
    base = this.finishNode(base, 'OptionalChain');

    while (true) {
      const computed = this.eat(acorn.tokTypes.bracketL);
      if (computed || this.eat(acorn.tokTypes.dot)) {
        const node = this.startNodeAt(startPos, startLoc);
        node.base = base;
        node.property = computed ? this.parseExpression() : this.parseIdent(true);
        if (computed) {
          this.expect(acorn.tokTypes.bracketR);
        }
        node.computed = computed;
        base = this.finishNode(node, 'OptionalChain');
      } else if (this.eat(acorn.tokTypes.parenL)) {
        const node = this.startNodeAt(startPos, startLoc);
        node.base = base;
        node.arguments = this.parseExprList(acorn.tokTypes.parenR, this.options.ecmaVersion >= 8, false, undefined);
        base = this.finishNode(node, 'OptionalChain');
      } else if (this.eat(acorn.tokTypes.backQuote)) {
        this.raise(this.start, 'Cannot tag an optional chain');
      } else {
        break;
      }
    }

    return base;
  }

  // Adapted from several different places in Acorn.
  static parseFunctionBody(sourceText, async, generator) {
    const parser = new Parser({
      sourceType: 'script',
    }, sourceText);

    // Parser.prototype.parse()
    const node = parser.startNode();
    parser.nextToken();

    // Parser.prototype.parseFunction()
    parser.initFunction(node);
    parser.enterScope(functionFlags(async, generator));

    // Parser.prototype.parseBlock()
    const body = [];
    while (!parser.eat(acorn.tokTypes.eof)) {
      const stmt = parser.parseStatement(null);
      body.push(stmt);
    }

    // Parser.prototype.parseFunctionBody()
    parser.adaptDirectivePrologue(body);

    deepFreeze(body);

    return body;
  }
});

export function ParseAsFunctionBody(sourceText) {
  return Parser.parseFunctionBody(sourceText, false, false);
}

export function ParseAsGeneratorBody(sourceText) {
  return Parser.parseFunctionBody(sourceText, false, true);
}

export function ParseAsAsyncFunctionBody(sourceText) {
  return Parser.parseFunctionBody(sourceText, true, false);
}

export function ParseAsAsyncGeneratorBody(sourceText) {
  return Parser.parseFunctionBody(sourceText, true, true);
}

// Adapted from several different places in Acorn.
// `strict` refers to ContainsUseStrict of the corresponding function body.
export function ParseAsFormalParameters(sourceText, strict, enableAwait, enableYield) {
  // Adapted from different places in Acorn.
  const parser = new Parser({
    sourceType: 'script',
  }, sourceText);

  parser.strict = strict;

  // Parser.prototype.parse()
  const node = parser.startNode();
  parser.nextToken();

  // Parser.prototype.parseFunction()
  parser.initFunction(node);
  parser.enterScope(functionFlags(enableAwait, enableYield));

  // Parser.prototype.parseFunctionParams()
  const params = parser.parseBindingList(acorn.tokTypes.eof, false, true);
  parser.checkYieldAwaitInDefaultParams();

  // Parser.prototype.parseFunctionBody()
  const simple = parser.isSimpleParamList(params);
  if (strict && !simple) {
    parser.raiseRecoverable(node.start, 'Illegal \'use strict\' directive in function with non-simple parameter list');
  }
  parser.checkParams({ params }, !strict && simple);

  deepFreeze(params);

  return params;
}

export const emptyConstructorNode = Parser.parse('(class { constructor() {} })').body[0].expression.expression.body.body[0];
export const forwardingConstructorNode = Parser.parse('(class extends X { constructor(...args) { super(...args); } })').body[0].expression.expression.body.body[0];

function forwardError(fn) {
  try {
    return fn();
  } catch (e) {
    if (e.name === 'SyntaxError') {
      return [surroundingAgent.Throw('SyntaxError', e.message).Value];
    } else {
      throw e;
    }
  }
}

export function ParseScript(sourceText, realm, hostDefined = {}, strict) {
  const body = forwardError(() => Parser.parse(sourceText, {
    sourceType: 'script',
    strict,
  }));
  if (Array.isArray(body)) {
    return body;
  }

  return {
    Realm: realm,
    Environment: undefined,
    ECMAScriptCode: body,
    HostDefined: hostDefined,
  };
}

export function ParseModule(sourceText, realm, hostDefined = {}) {
  // Assert: sourceText is an ECMAScript source text (see clause 10).
  const body = forwardError(() => Parser.parse(sourceText, {
    sourceType: 'module',
  }));
  if (Array.isArray(body)) {
    return body;
  }

  const requestedModules = ModuleRequests_ModuleItemList(body.body);
  const importEntries = ImportEntries_ModuleItemList(body.body);
  const importedBoundNames = ImportedLocalNames(importEntries);
  const indirectExportEntries = [];
  const localExportEntries = [];
  const starExportEntries = [];
  const exportEntries = ExportEntries_ModuleItemList(body.body);
  for (const ee of exportEntries) {
    if (ee.ModuleRequest === Value.null) {
      if (!importedBoundNames.includes(ee.LocalName)) {
        localExportEntries.push(ee);
      } else {
        const ie = importEntries.find((e) => e.LocalName === ee.LocalName);
        if (ie.ImportName === new Value('*')) {
          // Assert: This is a re-export of an imported module namespace object.
          localExportEntries.push(ee);
        } else {
          indirectExportEntries.push(new ExportEntryRecord({
            ModuleRequest: ie.ModuleRequest,
            ImportName: ie.ImportName,
            LocalName: Value.null,
            ExportName: ee.ExportName,
          }));
        }
      }
    } else if (ee.ImportName === new Value('*')) {
      starExportEntries.push(ee);
    } else {
      indirectExportEntries.push(ee);
    }
  }
  return new SourceTextModuleRecord({
    Realm: realm,
    Environment: Value.undefined,
    Namespace: Value.undefined,
    Status: 'unlinked',
    EvaluationError: Value.undefined,
    HostDefined: hostDefined,
    ECMAScriptCode: body,
    RequestedModules: requestedModules,
    ImportEntries: importEntries,
    LocalExportEntries: localExportEntries,
    IndirectExportEntries: indirectExportEntries,
    StarExportEntries: starExportEntries,
    DFSIndex: Value.undefined,
    DFSAncestorIndex: Value.undefined,
  });
}
