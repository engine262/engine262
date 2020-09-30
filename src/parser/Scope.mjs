import { OutOfRange } from '../helpers.mjs';

export const Flag = {
  __proto__: null,
};
[
  'return',
  'await',
  'yield',
  'parameters',
  'newTarget',
  'importMeta',
  'superCall',
  'superProperty',
  'in',
  'default',
  'module',
].forEach((name, i) => {
  /* istanbul ignore next */
  if (i > 31) {
    throw new RangeError(name);
  }
  Flag[name] = 1 << i;
});

export function getDeclarations(node) {
  if (Array.isArray(node)) {
    return node.flatMap((n) => getDeclarations(n));
  }
  switch (node.type) {
    case 'LexicalBinding':
    case 'VariableDeclaration':
    case 'BindingRestElement':
    case 'BindingRestProperty':
    case 'ForBinding':
      if (node.BindingIdentifier) {
        return getDeclarations(node.BindingIdentifier);
      }
      if (node.BindingPattern) {
        return getDeclarations(node.BindingPattern);
      }
      return [];
    case 'SingleNameBinding':
      return getDeclarations(node.BindingIdentifier);
    case 'ImportClause': {
      const d = [];
      if (node.ImportedDefaultBinding) {
        d.push(...getDeclarations(node.ImportedDefaultBinding));
      }
      if (node.NameSpaceImport) {
        d.push(...getDeclarations(node.NameSpaceImport));
      }
      if (node.NamedImports) {
        d.push(...getDeclarations(node.NamedImports));
      }
      return d;
    }
    case 'ImportSpecifier':
      return getDeclarations(node.ImportedBinding);
    case 'ImportedDefaultBinding':
    case 'NameSpaceImport':
      return getDeclarations(node.ImportedBinding);
    case 'NamedImports':
      return getDeclarations(node.ImportsList);
    case 'ObjectBindingPattern': {
      const declarations = getDeclarations(node.BindingPropertyList);
      if (node.BindingRestProperty) {
        declarations.push(...getDeclarations(node.BindingRestProperty));
      }
      return declarations;
    }
    case 'ArrayBindingPattern': {
      const declarations = getDeclarations(node.BindingElementList);
      if (node.BindingRestElement) {
        declarations.push(...getDeclarations(node.BindingRestElement));
      }
      return declarations;
    }
    case 'BindingElement':
      return getDeclarations(node.BindingPattern);
    case 'BindingProperty':
      return getDeclarations(node.BindingElement);
    case 'BindingIdentifier':
    case 'IdentifierName':
    case 'LabelIdentifier':
      return [{ name: node.name, node }];
    case 'StringLiteral':
      return [{ name: node.value, node }];
    case 'Elision':
      return [];
    case 'ForDeclaration':
      return getDeclarations(node.ForBinding);
    case 'ExportSpecifier':
      return getDeclarations(node.exportName);
    case 'FunctionDeclaration':
    case 'GeneratorDeclaration':
    case 'AsyncFunctionDeclaration':
    case 'AsyncGeneratorDeclaration':
      return getDeclarations(node.BindingIdentifier);
    case 'LexicalDeclaration':
      return getDeclarations(node.BindingList);
    case 'VariableStatement':
      return getDeclarations(node.VariableDeclarationList);
    case 'ClassDeclaration':
      return getDeclarations(node.BindingIdentifier);
    default:
      throw new OutOfRange('getDeclarations', node);
  }
}

export class Scope {
  constructor(parser) {
    this.parser = parser;
    this.scopeStack = [];
    this.labels = [];
    this.arrowInfoStack = [];
    this.assignmentInfoStack = [];
    this.exports = new Set();
    this.undefinedExports = new Map();
    this.flags = 0;
  }

  hasReturn() {
    return (this.flags & Flag.return) !== 0;
  }

  hasAwait() {
    return (this.flags & Flag.await) !== 0;
  }

  hasYield() {
    return (this.flags & Flag.yield) !== 0;
  }

  hasNewTarget() {
    return (this.flags & Flag.newTarget) !== 0;
  }

  hasSuperCall() {
    return (this.flags & Flag.superCall) !== 0;
  }

  hasSuperProperty() {
    return (this.flags & Flag.superProperty) !== 0;
  }

  hasImportMeta() {
    return (this.flags & Flag.importMeta) !== 0;
  }

  hasIn() {
    return (this.flags & Flag.in) !== 0;
  }

  inParameters() {
    return (this.flags & Flag.parameters) !== 0;
  }

  isDefault() {
    return (this.flags & Flag.default) !== 0;
  }

  isModule() {
    return (this.flags & Flag.module) !== 0;
  }

  with(flags, f) {
    const oldFlags = this.flags;

    Object.entries(flags)
      .forEach(([k, v]) => {
        if (k in Flag) {
          if (v === true) {
            this.flags |= Flag[k];
          } else if (v === false) {
            this.flags &= ~Flag[k];
          }
        }
      });

    if (flags.lexical || flags.variable) {
      this.scopeStack.push({
        flags,
        lexicals: new Set(),
        variables: new Set(),
        functions: new Set(),
        parameters: new Set(),
      });
    }

    const oldLabels = this.labels;
    if (flags.label === 'boundary') {
      this.labels = [];
    } else if (flags.label) {
      this.labels.push({ type: flags.label });
    }

    const oldStrict = this.parser.state.strict;
    if (flags.strict === true) {
      this.parser.state.strict = true;
    } else if (flags.strict === false) {
      this.parser.state.strict = false;
    }

    const r = f();

    if (flags.label === 'boundary') {
      this.labels = oldLabels;
    } else if (flags.label) {
      this.labels.pop();
    }

    if (flags.lexical || flags.variable) {
      this.scopeStack.pop();
    }

    this.parser.state.strict = oldStrict;
    this.flags = oldFlags;

    return r;
  }

  pushArrowInfo(isAsync = false) {
    this.arrowInfoStack.push({
      isAsync,
      hasTrailingComma: false,
      yieldExpressions: [],
      awaitExpressions: [],
      awaitIdentifiers: [],
    });
  }

  popArrowInfo() {
    return this.arrowInfoStack.pop();
  }

  pushAssignmentInfo(type) {
    const parser = this.parser;
    this.assignmentInfoStack.push({
      type,
      coverInitializedNameErrors: [],
      clear() {
        this.coverInitializedNameErrors.forEach((e) => {
          parser.earlyErrors.delete(e);
        });
      },
    });
  }

  popAssignmentInfo() {
    return this.assignmentInfoStack.pop();
  }

  registerCoverInitializedName(CoverInitializedName) {
    const error = this.parser.raiseEarly('UnexpectedToken', CoverInitializedName);
    for (let i = this.assignmentInfoStack.length - 1; i >= 0; i -= 1) {
      const info = this.assignmentInfoStack[i];
      info.coverInitializedNameErrors.push(error);
      if (info.type !== 'assign') {
        break;
      }
    }
  }

  lexicalScope() {
    for (let i = this.scopeStack.length - 1; i >= 0; i -= 1) {
      const scope = this.scopeStack[i];
      if (scope.flags.lexical) {
        return scope;
      }
    }
    /* istanbul ignore next */
    throw new RangeError();
  }

  variableScope() {
    for (let i = this.scopeStack.length - 1; i >= 0; i -= 1) {
      const scope = this.scopeStack[i];
      if (scope.flags.variable) {
        return scope;
      }
    }
    /* istanbul ignore next */
    throw new RangeError();
  }

  declare(node, type) {
    const declarations = getDeclarations(node);
    declarations.forEach((d) => {
      switch (type) {
        case 'lexical':
        case 'import': {
          if (type === 'lexical' && d.name === 'let') {
            this.parser.raiseEarly('LetInLexicalBinding', d.node);
          }
          const scope = this.lexicalScope();
          if (scope.lexicals.has(d.name)
              || scope.variables.has(d.name)
              || scope.functions.has(d.name)
              || scope.parameters.has(d.name)) {
            this.parser.raiseEarly('AlreadyDeclared', d.node, d.name);
          }
          scope.lexicals.add(d.name);
          if (scope === this.scopeStack[0] && this.undefinedExports.has(d.name)) {
            this.undefinedExports.delete(d.name);
          }
          break;
        }
        case 'function': {
          const scope = this.lexicalScope();
          if (scope.lexicals.has(d.name)) {
            this.parser.raiseEarly('AlreadyDeclared', d.node, d.name);
          }
          if (scope.flags.variableFunctions) {
            scope.functions.add(d.name);
          } else {
            if (scope.variables.has(d.name)) {
              this.parser.raiseEarly('AlreadyDeclared', d.node, d.name);
            }
            scope.lexicals.add(d.name);
          }
          if (scope === this.scopeStack[0] && this.undefinedExports.has(d.name)) {
            this.undefinedExports.delete(d.name);
          }
          break;
        }
        case 'parameter':
          this.variableScope().parameters.add(d.name);
          break;
        case 'variable':
          for (let i = this.scopeStack.length - 1; i >= 0; i -= 1) {
            const scope = this.scopeStack[i];
            scope.variables.add(d.name);
            if (scope.lexicals.has(d.name) || (!scope.flags.variableFunctions && scope.functions.has(d.name))) {
              this.parser.raiseEarly('AlreadyDeclared', d.node, d.name);
            }
            if (i === 0 && this.undefinedExports.has(d.name)) {
              this.undefinedExports.delete(d.name);
            }
            if (scope.flags.variable) {
              break;
            }
          }
          break;
        case 'export':
          if (this.exports.has(d.name)) {
            this.parser.raiseEarly('AlreadyDeclared', d.node, d.name);
          } else {
            this.exports.add(d.name);
          }
          break;
        default:
          /* istanbul ignore next */
          throw new RangeError(type);
      }
    });
  }

  checkUndefinedExports(NamedExports) {
    const scope = this.variableScope();
    NamedExports.ExportsList.forEach((n) => {
      const name = n.localName.name || n.localName.value;
      if (!scope.lexicals.has(name) && !scope.variables.has(name)) {
        this.undefinedExports.set(name, n.localName);
      }
    });
  }
}
