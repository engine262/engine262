import { OutOfRange } from '../helpers.mjs';

export const Flag = {
  __proto__: null,
};
[
  'return',
  'await',
  'yield',
  'parameters', // disallows yield, await
  'newTarget',
  'importMeta',
  'superCall',
  'superProperty',
  'in',
  'default',
].forEach((name, i) => {
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
      if (node.BindingIdentifier) {
        return getDeclarations(node.BindingIdentifier);
      }
      return getDeclarations(node.BindingPattern);
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
        d.push(...getDeclarations(node.NamedImpots));
      }
      return d;
    }
    case 'ObjectBindingPattern':
      return getDeclarations(node.BindingPropertyList);
    case 'ArrayBindingPattern':
      return getDeclarations(node.BindingElementList);
    case 'BindingElement':
      return getDeclarations(node.BindingPattern);
    case 'BindingProperty':
      return getDeclarations(node.BindingElement);
    case 'BindingIdentifier':
      return [{ name: node.name, node }];
    case 'Elision':
      return [];
    default:
      throw new OutOfRange('getDeclarations', node);
  }
}

export class Scope {
  constructor(parser) {
    this.parser = parser;
    this.scopeStack = [];
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
      });
    }

    const oldStrict = this.parser.state.strict;
    if (flags.strict === true) {
      this.parser.state.strict = true;
    } else if (flags.strict === false) {
      this.parser.state.strict = false;
    }

    const r = f();

    if (flags.lexical || flags.variable) {
      this.scopeStack.pop();
    }

    this.parser.state.strict = oldStrict;
    this.flags = oldFlags;

    return r;
  }

  lexicalScope() {
    for (let i = this.scopeStack.length - 1; i >= 0; i -= 1) {
      const scope = this.scopeStack[i];
      if (scope.flags.lexical) {
        return scope;
      }
    }
    throw new RangeError();
  }

  variableScope() {
    for (let i = this.scopeStack.length - 1; i >= 0; i -= 1) {
      const scope = this.scopeStack[i];
      if (scope.flags.variable) {
        return scope;
      }
    }
    throw new RangeError();
  }

  declare(node, type) {
    const declarations = getDeclarations(node);
    declarations.forEach((d) => {
      switch (type) {
        case 'lexical':
        case 'import': {
          if (d.name === 'let') {
            this.parser.raiseEarly('LetInLexicalBinding', d.node);
          }
          const scope = this.lexicalScope();
          if (scope.lexicals.has(d.name) || scope.variables.has(d.name) || scope.functions.has(d.name)) {
            this.parser.raiseEarly('AlreadyDeclared', d.node, d.name);
          }
          scope.lexicals.add(d.name);
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
          break;
        }
        case 'parameter': {
          const scope = this.lexicalScope();
          if (this.parser.isStrictMode() && scope.lexicals.has(d.name)) {
            this.parser.raiseEarly('AlreadyDeclared', d.node, d.name);
          }
          scope.lexicals.add(d.name);
          break;
        }
        case 'variable':
          for (let i = this.scopeStack.length - 1; i >= 0; i -= 1) {
            const scope = this.scopeStack[i];
            scope.variables.add(d.name);
            if (scope.lexicals.has(d.name) || (!scope.flags.variableFunctions && scope.functions.has(d.name))) {
              this.parser.raiseEarly('AlreadyDeclared', d.node, d.name);
            }
            if (scope.flags.variable) {
              break;
            }
          }
          break;
        default:
          throw new RangeError(type);
      }
    });
  }
}
