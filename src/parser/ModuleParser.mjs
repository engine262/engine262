import { IsStringWellFormedUnicode, StringValue } from '../static-semantics/all.mjs';
import { Token, isKeywordRaw } from './tokens.mjs';
import { StatementParser } from './StatementParser.mjs';
import { FunctionKind } from './FunctionParser.mjs';

export class ModuleParser extends StatementParser {
  // ImportDeclaration :
  //   `import` ImportClause FromClause `;`
  //   `import` ModuleSpecifier `;`
  parseImportDeclaration() {
    if (this.testAhead(Token.PERIOD) || this.testAhead(Token.LPAREN)) {
      // `import` `(`
      // `import` `.`
      return this.parseExpressionStatement();
    }
    const node = this.startNode();
    this.next();
    if (this.test(Token.STRING)) {
      node.ModuleSpecifier = this.parsePrimaryExpression();
    } else {
      node.ImportClause = this.parseImportClause();
      this.scope.declare(node.ImportClause, 'import');
      node.FromClause = this.parseFromClause();
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
  parseImportClause() {
    const node = this.startNode();
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
  parseImportedDefaultBinding() {
    const node = this.startNode();
    node.ImportedBinding = this.parseBindingIdentifier();
    return this.finishNode(node, 'ImportedDefaultBinding');
  }

  // NameSpaceImport :
  //   `*` `as` ImportedBinding
  parseNameSpaceImport() {
    const node = this.startNode();
    this.expect(Token.MUL);
    this.expect('as');
    node.ImportedBinding = this.parseBindingIdentifier();
    return this.finishNode(node, 'NameSpaceImport');
  }

  // NamedImports :
  //   `{` `}`
  //   `{` ImportsList `}`
  //   `{` ImportsList `,` `}`
  parseNamedImports() {
    const node = this.startNode();
    node.ImportsList = [];
    while (!this.eat(Token.RBRACE)) {
      node.ImportsList.push(this.parseImportSpecifier());
      if (this.eat(Token.RBRACE)) {
        break;
      }
      this.expect(Token.COMMA);
    }
    return this.finishNode(node, 'NamedImports');
  }

  // ImportSpecifier :
  //   ImportedBinding
  //   IdentifierName `as` ImportedBinding
  //   ModuleExportName `as` ImportedBinding
  parseImportSpecifier() {
    const node = this.startNode();
    if (this.feature('arbitrary-module-namespace-names') && this.test(Token.STRING)) {
      node.ModuleExportName = this.parseModuleExportName();
      this.expect('as');
      node.ImportedBinding = this.parseBindingIdentifier();
    } else {
      const name = this.parseIdentifierName();
      if (this.eat('as')) {
        node.IdentifierName = name;
        node.ImportedBinding = this.parseBindingIdentifier();
      } else {
        node.ImportedBinding = name;
        node.ImportedBinding.type = 'BindingIdentifier';
        if (isKeywordRaw(node.ImportedBinding.name)) {
          this.raiseEarly('UnexpectedToken', node.ImportedBinding);
        }
        if (node.ImportedBinding.name === 'eval' || node.ImportedBinding.name === 'arguments') {
          this.raiseEarly('UnexpectedToken', node.ImportedBinding);
        }
      }
    }
    return this.finishNode(node, 'ImportSpecifier');
  }

  // ExportDeclaration :
  //   `export` ExportFromClause FromClause `;`
  //   `export` NamedExports `;`
  //   `export` VariableStatement
  //   `export` Declaration
  //   `export` `default` HoistableDeclaration
  //   `export` `default` ClassDeclaration
  //   `export` `default` AssignmentExpression `;`
  //
  // ExportFromClause :
  //   `*`
  //   `*` as IdentifierName
  //   `*` as ModuleExportName
  //   NamedExports
  parseExportDeclaration() {
    const node = this.startNode();
    this.expect(Token.EXPORT);
    node.default = this.eat(Token.DEFAULT);
    if (node.default) {
      switch (this.peek().type) {
        case Token.FUNCTION:
          node.HoistableDeclaration = this.scope.with({ default: true }, () => this.parseFunctionDeclaration(FunctionKind.NORMAL));
          break;
        case Token.CLASS:
          node.ClassDeclaration = this.scope.with({ default: true }, () => this.parseClassDeclaration());
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
        case Token.CLASS:
          node.Declaration = this.parseClassDeclaration();
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
          const inner = this.startNode();
          this.next();
          if (this.eat('as')) {
            if (this.feature('arbitrary-module-namespace-names') && this.test(Token.STRING)) {
              inner.ModuleExportName = this.parseModuleExportName();
              this.scope.declare(inner.ModuleExportName, 'export');
            } else {
              inner.IdentifierName = this.parseIdentifierName();
              this.scope.declare(inner.IdentifierName, 'export');
            }
          }
          node.ExportFromClause = this.finishNode(inner, 'ExportFromClause');
          node.FromClause = this.parseFromClause();
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
  parseNamedExports() {
    const node = this.startNode();
    this.expect(Token.LBRACE);
    node.ExportsList = [];
    while (!this.eat(Token.RBRACE)) {
      node.ExportsList.push(this.parseExportSpecifier());
      if (this.eat(Token.RBRACE)) {
        break;
      }
      this.expect(Token.COMMA);
    }
    return this.finishNode(node, 'NamedExports');
  }

  // ExportSpecifier :
  //   IdentifierName
  //   IdentifierName `as` IdentifierName
  //   IdentifierName `as` ModuleExportName
  //   ModuleExportName
  //   ModuleExportName `as` ModuleExportName
  //   ModuleExportName `as` IdentifierName
  parseExportSpecifier() {
    const node = this.startNode();
    const parseName = () => {
      if (this.feature('arbitrary-module-namespace-names') && this.test(Token.STRING)) {
        return this.parseModuleExportName();
      }
      return this.parseIdentifierName();
    };
    node.localName = parseName();
    if (this.eat('as')) {
      node.exportName = parseName();
    } else {
      node.exportName = node.localName;
    }
    this.scope.declare(node.exportName, 'export');
    return this.finishNode(node, 'ExportSpecifier');
  }

  // ModuleExportName : StringLiteral
  parseModuleExportName() {
    const literal = this.parseStringLiteral();
    if (!IsStringWellFormedUnicode(StringValue(literal))) {
      this.raiseEarly('ModuleExportNameInvalidUnicode', literal);
    }
    return literal;
  }

  // FromClause :
  //   `from` ModuleSpecifier
  parseFromClause() {
    this.expect('from');
    return this.parseStringLiteral();
  }
}
