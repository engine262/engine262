import { IsStringWellFormedUnicode, StringValue } from '../static-semantics/all.mts';
import type { Mutable } from '../helpers.mts';
import { Token, isKeywordRaw } from './tokens.mts';
import { StatementParser } from './StatementParser.mts';
import { FunctionKind } from './FunctionParser.mts';
import type { ParseNode } from './ParseNode.mts';

export abstract class ModuleParser extends StatementParser {
  // ImportDeclaration :
  //   `import` ImportClause FromClause WithClause? `;`
  //   `import` ModuleSpecifier WithClause? `;`
  parseImportDeclaration(): ParseNode.ImportDeclaration | ParseNode.ExpressionStatement | ParseNode.LabelledStatement {
    if (this.testAhead(Token.PERIOD) || this.testAhead(Token.LPAREN)) {
      // `import` `(`
      // `import` `.`
      return this.parseExpressionStatement();
    }
    const node = this.startNode<ParseNode.ImportDeclaration>();
    this.next();
    if (this.test(Token.STRING)) {
      node.ModuleSpecifier = this.parsePrimaryExpression();
    } else {
      if (this.test('defer') && this.testAhead(Token.MUL)) {
        this.next(); // defer
        node.Phase = 'defer';
        const importClause = this.startNode<ParseNode.ImportClause>();
        importClause.NameSpaceImport = this.parseNameSpaceImport();
        node.ImportClause = this.finishNode(importClause, 'ImportClause');
      } else {
        node.Phase = 'evaluation';
        node.ImportClause = this.parseImportClause();
      }
      this.scope.declare(node.ImportClause, 'import');
      node.FromClause = this.parseFromClause();
    }
    if (this.test(Token.WITH)) {
      node.WithClause = this.parseWithClause();
    }
    this.semicolon();
    return this.finishNode(node, 'ImportDeclaration');
  }

  // ImportClause :
  //   ImportedDefaultBinding
  //   NameSpaceImport
  //   NamedImports
  //   ImportedDefaultBinding `,` NameSpaceImport
  //   ImportedDefaultBinding `,` NamedImports
  //
  // ImportedBinding :
  //   BindingIdentifier
  parseImportClause(): ParseNode.ImportClause {
    const node = this.startNode<ParseNode.ImportClause>();
    if (this.test(Token.IDENTIFIER)) {
      node.ImportedDefaultBinding = this.parseImportedDefaultBinding();
      if (!this.eat(Token.COMMA)) {
        return this.finishNode(node, 'ImportClause');
      }
    }
    if (this.test(Token.MUL)) {
      node.NameSpaceImport = this.parseNameSpaceImport();
    } else if (this.eat(Token.LBRACE)) {
      node.NamedImports = this.parseNamedImports();
    } else {
      this.unexpected();
    }
    return this.finishNode(node, 'ImportClause');
  }

  // ImportedDefaultBinding :
  //   ImportedBinding
  parseImportedDefaultBinding(): ParseNode.ImportedDefaultBinding {
    const node = this.startNode<ParseNode.ImportedDefaultBinding>();
    node.ImportedBinding = this.parseBindingIdentifier();
    return this.finishNode(node, 'ImportedDefaultBinding');
  }

  // NameSpaceImport :
  //   `*` `as` ImportedBinding
  parseNameSpaceImport(): ParseNode.NameSpaceImport {
    const node = this.startNode<ParseNode.NameSpaceImport>();
    this.expect(Token.MUL);
    this.expect('as');
    node.ImportedBinding = this.parseBindingIdentifier();
    return this.finishNode(node, 'NameSpaceImport');
  }

  // NamedImports :
  //   `{` `}`
  //   `{` ImportsList `}`
  //   `{` ImportsList `,` `}`
  parseNamedImports(): ParseNode.NamedImports {
    const node = this.startNode<ParseNode.NamedImports>();
    const ImportsList: Mutable<ParseNode.ImportsList> = [];
    node.ImportsList = ImportsList;
    while (!this.eat(Token.RBRACE)) {
      ImportsList.push(this.parseImportSpecifier());
      if (this.eat(Token.RBRACE)) {
        break;
      }
      this.expect(Token.COMMA);
    }
    return this.finishNode(node, 'NamedImports');
  }

  // ImportSpecifier :
  //   ImportedBinding
  //   ModuleExportName `as` ImportedBinding
  parseImportSpecifier(): ParseNode.ImportSpecifier {
    const node = this.startNode<ParseNode.ImportSpecifier>();
    const name = this.parseModuleExportName();
    if (name.type === 'StringLiteral' || this.test('as')) {
      this.expect('as');
      node.ModuleExportName = name;
      node.ImportedBinding = this.parseBindingIdentifier();
    } else {
      node.ImportedBinding = this.repurpose(name, 'BindingIdentifier');
      if (isKeywordRaw(node.ImportedBinding.name)) {
        this.raiseEarly('UnexpectedToken', node.ImportedBinding);
      }
      if (node.ImportedBinding.name === 'eval' || node.ImportedBinding.name === 'arguments') {
        this.raiseEarly('UnexpectedToken', node.ImportedBinding);
      }
    }
    return this.finishNode(node, 'ImportSpecifier');
  }

  // ExportDeclaration :
  //   `export` ExportFromClause FromClause `;`
  //   `export` NamedExports `;`
  //   `export` VariableStatement
  //   `export` Declaration
  //   DecoratorList? `export` Declaration
  //   `export` `default` HoistableDeclaration
  //   DecoratorList? `export` `default` ClassDeclaration
  //   `export` `default` AssignmentExpression `;`
  //
  // ExportFromClause :
  //   `*`
  //   `*` as ModuleExportName
  //   NamedExports
  parseExportDeclaration(decoratorsBeforeExportKeyword: null | readonly ParseNode.Decorator[]): ParseNode.ExportDeclaration {
    const node = this.startNode<ParseNode.ExportDeclaration>();
    node.Decorators = decoratorsBeforeExportKeyword;
    this.expect(Token.EXPORT);
    node.default = this.eat(Token.DEFAULT);
    if (node.default) {
      switch (this.peek().type) {
        case Token.FUNCTION:
          node.HoistableDeclaration = this.scope.with({ default: true }, () => this.parseFunctionDeclaration(FunctionKind.NORMAL));
          break;
        case Token.AT: {
          const decorators = this.parseDecorators();
          node.ClassDeclaration = this.scope.with({ default: true }, () => this.parseClassDeclaration(decorators));
          break;
        }
        case Token.CLASS:
          node.ClassDeclaration = this.scope.with({ default: true }, () => this.parseClassDeclaration(null));
          break;
        default:
          if (this.test('async') && this.testAhead(Token.FUNCTION) && !this.peekAhead().hadLineTerminatorBefore) {
            node.HoistableDeclaration = this.scope.with({ default: true }, () => this.parseFunctionDeclaration(FunctionKind.ASYNC));
          } else {
            node.AssignmentExpression = this.parseAssignmentExpression();
            this.semicolon();
          }
          break;
      }
      if (this.scope.exports.has('default')) {
        this.raiseEarly('AlreadyDeclared', node, 'default');
      } else {
        this.scope.exports.add('default');
      }
    } else {
      switch (this.peek().type) {
        case Token.CONST:
          node.Declaration = this.parseLexicalDeclaration();
          this.scope.declare(node.Declaration, 'export');
          break;
        case Token.AT:
        case Token.CLASS:
          node.Declaration = this.parseClassDeclaration(null);
          this.scope.declare(node.Declaration, 'export');
          break;
        case Token.FUNCTION:
          node.Declaration = this.parseHoistableDeclaration();
          this.scope.declare(node.Declaration, 'export');
          break;
        case Token.VAR:
          node.VariableStatement = this.parseVariableStatement();
          this.scope.declare(node.VariableStatement, 'export');
          break;
        case Token.LBRACE: {
          const NamedExports = this.parseNamedExports();
          if (this.test('from')) {
            node.ExportFromClause = NamedExports;
            node.FromClause = this.parseFromClause();
            if (this.test(Token.WITH)) {
              node.WithClause = this.parseWithClause();
            }
          } else {
            NamedExports.ExportsList.forEach((n) => {
              if (n.localName.type === 'StringLiteral') {
                this.raiseEarly('UnexpectedToken', n.localName);
              }
            });
            node.NamedExports = NamedExports;
            this.scope.checkUndefinedExports(node.NamedExports);
          }
          this.semicolon();
          break;
        }
        case Token.MUL: {
          const inner = this.startNode<ParseNode.ExportFromClause>();
          this.next();
          if (this.eat('as')) {
            inner.ModuleExportName = this.parseModuleExportName();
            this.scope.declare(inner.ModuleExportName, 'export');
          }
          node.ExportFromClause = this.finishNode(inner, 'ExportFromClause');
          node.FromClause = this.parseFromClause();
          if (this.test(Token.WITH)) {
            node.WithClause = this.parseWithClause();
          }
          this.semicolon();
          break;
        }
        default:
          if (this.test('let')) {
            node.Declaration = this.parseLexicalDeclaration();
            this.scope.declare(node.Declaration, 'export');
          } else if (this.test('async') && this.testAhead(Token.FUNCTION) && !this.peekAhead().hadLineTerminatorBefore) {
            node.Declaration = this.parseHoistableDeclaration();
            this.scope.declare(node.Declaration, 'export');
          } else {
            this.unexpected();
          }
      }
    }
    return this.finishNode(node, 'ExportDeclaration');
  }

  // NamedExports :
  //   `{` `}`
  //   `{` ExportsList `}`
  //   `{` ExportsList `,` `}`
  parseNamedExports(): ParseNode.NamedExports {
    const node = this.startNode<ParseNode.NamedExports>();
    this.expect(Token.LBRACE);
    const ExportsList: Mutable<ParseNode.ExportsList> = [];
    node.ExportsList = ExportsList;
    while (!this.eat(Token.RBRACE)) {
      ExportsList.push(this.parseExportSpecifier());
      if (this.eat(Token.RBRACE)) {
        break;
      }
      this.expect(Token.COMMA);
    }
    return this.finishNode(node, 'NamedExports');
  }

  // ExportSpecifier :
  //   ModuleExportName
  //   ModuleExportName `as` ModuleExportName
  parseExportSpecifier(): ParseNode.ExportSpecifier {
    const node = this.startNode<ParseNode.ExportSpecifier>();
    node.localName = this.parseModuleExportName();
    if (this.eat('as')) {
      node.exportName = this.parseModuleExportName();
    } else {
      node.exportName = node.localName;
    }
    this.scope.declare(node.exportName, 'export');
    return this.finishNode(node, 'ExportSpecifier');
  }

  // ModuleExportName :
  //   IdentifierName
  //   StringLiteral
  parseModuleExportName(): ParseNode.ModuleExportName {
    if (this.test(Token.STRING)) {
      const literal = this.parseStringLiteral();
      if (!IsStringWellFormedUnicode(StringValue(literal))) {
        this.raiseEarly('ModuleExportNameInvalidUnicode', literal);
      }
      return literal;
    }
    return this.parseIdentifierName();
  }

  // FromClause :
  //   `from` ModuleSpecifier
  parseFromClause(): ParseNode.FromClause {
    this.expect('from');
    return this.parseStringLiteral();
  }

  // WithClause :
  //   `with` `{` `}`
  //   `with` `{` WithEntries `,`? `}`
  parseWithClause(): ParseNode.WithClause {
    const node = this.startNode<ParseNode.WithClause>();
    this.expect(Token.WITH);
    this.expect(Token.LBRACE);

    const seenKeys = new Set<string>();

    const WithEntries = [];
    while (!this.eat(Token.RBRACE)) {
      const entry = this.parseWithEntry();

      const key = StringValue(entry.AttributeKey).value;
      if (seenKeys.has(key)) {
        this.raiseEarly('DuplicateImportAttribute', entry, key);
      }
      seenKeys.add(key);

      WithEntries.push(entry);
      if (this.eat(Token.RBRACE)) {
        break;
      }
      this.expect(Token.COMMA);
    }
    node.WithEntries = WithEntries;

    return this.finishNode(node, 'WithClause');
  }

  parseWithEntry(): ParseNode.WithEntry {
    const node = this.startNode<ParseNode.WithEntry>();
    node.AttributeKey = this.test(Token.STRING) ? this.parseStringLiteral() : this.parseIdentifierName();
    this.expect(Token.COLON);
    node.AttributeValue = this.parseStringLiteral();
    return this.finishNode(node, 'WithEntry');
  }
}
