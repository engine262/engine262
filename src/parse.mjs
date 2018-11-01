import acorn from 'acorn';

const Parser = acorn.Parser.extend((P) => class Parse262 extends P {
  constructor(options, source) {
    super({ ...options, ecmaVersion: 2019 }, source);
  }

  finishNode(node, type) {
    node.strict = this.strict;
    return super.finishNode(node, type);
  }
});

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

// Adapted from several different places in Acorn.
function parseFuncBody(sourceText, async, generator) {
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
  return body;
}

export function ParseAsFunctionBody(sourceText) {
  return parseFuncBody(sourceText, false, false);
}

export function ParseAsGeneratorBody(sourceText) {
  return parseFuncBody(sourceText, false, true);
}

export function ParseAsAsyncFunctionBody(sourceText) {
  return parseFuncBody(sourceText, true, false);
}

export function ParseAsAsyncGeneratorBody(sourceText) {
  return parseFuncBody(sourceText, true, true);
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

  return params;
}

export function ParseScript(sourceText, realm, hostDefined = {}) {
  let body;
  try {
    body = Parser.parse(sourceText, {
      sourceType: 'script',
    });
    deepFreeze(body);
  } catch (e) {
    body = [e];
  }

  if (Array.isArray(body)) {
    return body;
  }

  hostDefined.sourceText = sourceText;

  return {
    Realm: realm,
    Environment: undefined,
    ECMAScriptCode: body,
    HostDefined: hostDefined,
  };
}

export function ParseModule() {}
