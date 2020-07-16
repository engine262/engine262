import { Token, isAutomaticSemicolon } from './tokens.mjs';
import { ExpressionParser } from './ExpressionParser.mjs';
import { FunctionKind } from './FunctionParser.mjs';

export class StatementParser extends ExpressionParser {
  semicolon() {
    if (this.eat(Token.SEMICOLON)) {
      return;
    }
    if (this.peek().hadLineTerminatorBefore || isAutomaticSemicolon(this.peek().type)) {
      return;
    }
    this.unexpected();
  }

  // StatementList :
  //   StatementListItem
  //   StatementList StatementListItem
  parseStatementList(endToken, directives) {
    const statementList = [];
    const oldStrict = this.state.strict;

    while (!this.eat(endToken)) {
      const stmt = this.parseStatementListItem();
      statementList.push(stmt);
      if (directives !== undefined
          && stmt.type === 'ExpressionStatement'
          && stmt.Expression.type === 'StringLiteral') {
        const directive = this.source.slice(
          stmt.Expression.location.startIndex + 1,
          stmt.Expression.location.endIndex - 1,
        );
        directives.push(directive);
        if (directive === 'use strict') {
          stmt.strict = true;
          stmt.Expression.strict = true;
          this.state.strict = true;
        }
      } else {
        directives = undefined;
      }
    }

    this.state.strict = oldStrict;

    return statementList;
  }

  // StatementListItem :
  //   Statement
  //   Declaration
  //
  // Declaration :
  //   HoistableDeclaration
  //   ClassDeclaration
  //   LexicalDeclaration
  parseStatementListItem() {
    switch (this.peek().type) {
      case Token.FUNCTION:
      case Token.ASYNC:
        return this.parseHoistableDeclaration();
      case Token.CLASS:
        return this.parseClassDeclaration();
      case Token.LET:
      case Token.CONST:
        return this.parseLexicalDeclaration();
      default:
        return this.parseStatement();
    }
  }

  // HoistableDeclaration :
  //   FunctionDeclaration
  //   GeneratorDeclaration
  //   AsyncFunctionDeclaration
  //   AsyncGeneratorDeclaration
  parseHoistableDeclaration() {
    switch (this.peek().type) {
      case Token.FUNCTION:
        return this.parseFunctionDeclaration(FunctionKind.NORMAL);
      case Token.ASYNC:
        return this.parseFunctionDeclaration(FunctionKind.ASYNC);
      default:
        throw new Error('unreachable');
    }
  }

  // ClassDeclaration :
  //   `class` BindingIdentifier ClassTail
  //   [+Default] `class` ClassTail
  parseClassDeclaration() {
    return this.parseClass(false);
  }

  // LexicalDeclaration : LetOrConst BindingList `;`
  parseLexicalDeclaration() {
    const node = this.startNode();
    const next = this.next();
    if (next.type !== Token.LET && next.type !== Token.CONST) {
      this.unexpected(next);
    }
    node.LetOrConst = next.type === Token.LET ? 'let' : 'const';
    node.BindingList = this.parseBindingList();
    this.semicolon();
    return this.finishNode(node, 'LexicalDeclaration');
  }

  // BindingList :
  //   LexicalBinding
  //   BindingList `,` LexicalBinding
  //
  // LexicalBinding :
  //   BindingIdentifier Initializer?
  //   BindingPattern Initializer
  parseBindingList() {
    const bindingList = [];
    do {
      const node = this.parseBindingElement();
      this.declare(node, 'lexical');
      node.type = 'LexicalBinding';
      bindingList.push(node);
    } while (this.eat(Token.COMMA));
    return bindingList;
  }

  // Initializer : `=` AssignmentExpression
  parseInitializer() {
    this.expect(Token.ASSIGN);
    return this.parseAssignmentExpression();
  }

  // FunctionDeclaration
  parseFunctionDeclaration(kind) {
    return this.parseFunction(false, kind);
  }

  // Statement :
  //   ...
  parseStatement() {
    switch (this.peek().type) {
      case Token.LBRACE:
        return this.parseBlockStatement();
      case Token.VAR:
        return this.parseVariableStatement();
      case Token.SEMICOLON: {
        const node = this.startNode();
        this.next();
        return this.finishNode(node, 'EmptyStatement');
      }
      case Token.IF:
        return this.parseIfStatement();
      case Token.DO:
        return this.parseDoWhileStatement();
      case Token.WHILE:
        return this.parseWhileStatement();
      case Token.FOR:
        return this.parseForStatement();
      case Token.SWITCH:
        return this.parseSwitchStatement();
      case Token.CONTINUE:
      case Token.BREAK:
        return this.parseBreakContinueStatement();
      case Token.RETURN:
        return this.parseReturnStatement();
      case Token.WITH:
        return this.parseWithStatement();
      case Token.THROW:
        return this.parseThrowStatement();
      case Token.TRY:
        return this.parseTryStatement();
      case Token.DEBUGGER:
        return this.parseDebuggerStatement();
      default:
        return this.parseExpressionStatement();
    }
  }

  // BlockStatement : Block
  parseBlockStatement() {
    return this.parseBlock();
  }

  // Block : `{` StatementList `}`
  parseBlock() {
    const node = this.startNode();
    this.expect(Token.LBRACE);
    node.StatementList = this.parseStatementList(Token.RBRACE);
    return this.finishNode(node, 'Block');
  }

  // VariableStatement : `var` VariableDeclarationList `;`
  parseVariableStatement() {
    const node = this.startNode();
    this.expect(Token.VAR);
    node.VariableDeclarationList = this.parseVariableDeclarationList();
    this.semicolon();
    return this.finishNode(node, 'VariableStatement');
  }

  // VariableDeclarationList :
  //   VariableDeclaration
  //   VariableDeclarationList `,` VariableDeclaration
  //
  // VariableDeclaration :
  //   BindingIdentifier Initializer?
  //   BindingPattern Initializer
  parseVariableDeclarationList() {
    const declarationList = [];
    do {
      const node = this.startNode();
      node.BindingIdentifier = this.parseBindingIdentifier();
      this.declare(node.BindingIdentifier, 'variable');
      node.Initializer = this.test(Token.ASSIGN) ? this.parseInitializer() : null;
      declarationList.push(this.finishNode(node, 'VariableDeclaration'));
    } while (this.eat(Token.COMMA));
    return declarationList;
  }

  // IfStatement :
  //  `if` `(` Expression `)` Statement `else` Statement
  //  `if` `(` Expression `)` Statement
  parseIfStatement() {
    const node = this.startNode();
    this.expect(Token.IF);
    this.expect(Token.LPAREN);
    node.Expression = this.parseExpression();
    this.expect(Token.RPAREN);
    node.Statement_a = this.parseStatement();
    if (this.eat(Token.ELSE)) {
      node.Statement_b = this.parseStatement();
    }
    return this.finishNode(node, 'IfStatement');
  }

  // `while` `(` Expression `)` Statement
  parseWhileStatement() {
    const node = this.startNode();
    this.expect(Token.WHILE);
    this.expect(Token.LPAREN);
    node.Expression = this.parseExpression();
    this.expect(Token.RPAREN);
    node.Statement = this.parseStatement();
    return this.finishNode(node, 'WhileStatement');
  }

  // `do` Statement `while` `(` Expression `)` `;`
  parseDoWhileStatement() {
    const node = this.startNode();
    this.expect(Token.DO);
    node.Statement = this.parseStatement();
    this.expect(Token.WHILE);
    this.expect(Token.LPAREN);
    node.Expression = this.parseExpression();
    this.expect(Token.RPAREN);
    // Semicolons are completely optional after a do-while, even without a newline
    this.eat(Token.SEMICOLON);
    return this.finishNode(node, 'DoWhileStatement');
  }

  // `for` `(` [lookahead != `let` `[`] Expression? `;` Expression? `;` Expression? `)` Statement
  // `for` `(` `var` VariableDeclarationList `;` Expression? `;` Expression? `)` Statement
  // `for` `(` LexicalDeclaration Expression? `;` Expression? `)` Statement
  // `for` `(` [lookahead != `let` `[`] LeftHandSideExpression `in` Expression `)` Statement
  // `for` `(` `var` ForBinding `in` Expression `)` Statement
  // `for` `(` ForDeclaration `in` Expression `)` Statement
  // `for` `(` [lookahead != `let`] LeftHandSideExpression `of` AssignmentExpression `)` Statement
  // `for` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
  // `for` `(` ForDeclaration `of` AssignmentExpression `)` Statement
  // `for` `await` `(` [lookahead != `let`] LeftHandSideExpression `of` AssignmentExpression `)` Statement
  // `for` `await` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
  // `for` `await` `(` ForDeclaration `of` AssignmentExpression `)` Statement
  //
  // ForDeclaration : LetOrConst ForBinding
  // ForBinding :
  //   BindingIdentifier
  //   BindingPattern
  parseForStatement() {
    return this.scope({ lexical: true }, () => {
      const node = this.startNode();
      this.expect(Token.FOR);
      const isAwait = this.isAwaitScope() && this.eat(Token.AWAIT);
      if (isAwait && !this.isReturnScope()) {
        this.state.hasTopLevelAwait = true;
      }
      this.expect(Token.LPAREN);
      if (isAwait && this.test(Token.SEMICOLON)) {
        this.unexpected();
      }
      if (this.eat(Token.SEMICOLON)) {
        if (!this.test(Token.SEMICOLON)) {
          node.Expression_b = this.parseExpression();
        }
        this.expect(Token.SEMICOLON);
        if (!this.test(Token.RPAREN)) {
          node.Expression_c = this.parseExpression();
        }
        this.expect(Token.RPAREN);
        node.Statement = this.parseStatement();
        return this.finishNode(node, 'ForStatement');
      }
      if (this.test(Token.LET) || this.test(Token.CONST)) {
        const inner = this.startNode();
        if (this.eat(Token.LET)) {
          inner.LetOrConst = 'let';
        } else {
          this.expect(Token.CONST);
          inner.LetOrConst = 'const';
        }
        const list = this.parseBindingList();
        if (list.length > 1 || this.test(Token.SEMICOLON)) {
          inner.BindingList = list;
          node.LexicalDeclaration = this.finishNode(inner, 'LexicalDeclaration');
          this.expect(Token.SEMICOLON);
          if (!this.test(Token.SEMICOLON)) {
            node.Expression_a = this.parseExpression();
          }
          this.expect(Token.SEMICOLON);
          if (!this.test(Token.RPAREN)) {
            node.Expression_b = this.parseExpression();
          }
          this.expect(Token.RPAREN);
          node.Statement = this.parseStatement();
          return this.finishNode(node, 'ForStatement');
        }
        inner.ForBinding = list[0];
        inner.ForBinding.type = 'ForBinding';
        node.ForDeclaration = this.finishNode(inner, 'ForDeclaration');
        if (!isAwait && this.eat(Token.IN)) {
          node.Expression = this.parseExpression();
          this.expect(Token.RPAREN);
          node.Statement = this.parseStatement();
          return this.finishNode(node, 'ForInStatement');
        }
        this.expect('of');
        node.AssignmentExpression = this.parseAssignmentExpression();
        this.expect(Token.RPAREN);
        node.Statement = this.parseStatement();
        return this.finishNode(node, isAwait ? 'ForAwaitStatement' : 'ForOfStatement');
      }
      if (this.eat(Token.VAR)) {
        if (isAwait) {
          node.ForBinding = this.parseBindingIdentifier();
          this.expect('of');
          node.AssignmentExpression = this.parseAssignmentExpression();
          this.expect(Token.RPAREN);
          node.Statement = this.parseStatement();
          return this.finishNode(node, 'ForAwaitStatement');
        }
        const list = this.parseVariableDeclarationList();
        if (list.length > 1 || this.test(Token.SEMICOLON)) {
          node.VariableDeclarationList = list;
          this.expect(Token.SEMICOLON);
          if (!this.test(Token.SEMICOLON)) {
            node.Expression_a = this.parseExpression();
          }
          this.expect(Token.SEMICOLON);
          if (!this.test(Token.RPAREN)) {
            node.Expression_b = this.parseExpression();
          }
          this.expect(Token.RPAREN);
          node.Statement = this.parseStatement();
          return this.finishNode(node, 'ForStatement');
        }
        this.expect(Token.IN);
        node.ForBinding = list[0];
        node.ForBinding.type = 'ForBinding';
        node.Expression = this.parseExpression();
        this.expect(Token.RPAREN);
        node.Statement = this.parseStatement();
        return this.finishNode(node, 'ForInStatement');
      }

      const expression = this.scope({ in: false }, () => this.parseExpression());
      if (!isAwait && this.eat(Token.IN)) {
        node.LeftHandSideExpression = this.validateAssignmentTarget(expression);
        node.Expression = this.parseExpression();
        this.expect(Token.RPAREN);
        node.Statement = this.parseStatement();
        return this.finishNode(node, 'ForInStatement');
      }
      if (this.eat('of')) {
        node.LeftHandSideExpression = this.validateAssignmentTarget(expression);
        node.AssignmentExpression = this.parseAssignmentExpression();
        this.expect(Token.RPAREN);
        node.Statement = this.parseStatement();
        return this.finishNode(node, isAwait ? 'ForAwaitStatement' : 'ForOfStatement');
      }

      node.Expression_a = expression;
      this.expect(Token.SEMICOLON);

      if (!this.test(Token.SEMICOLON)) {
        node.Expression_b = this.parseExpression();
      }
      this.expect(Token.SEMICOLON);

      if (!this.test(Token.RPAREN)) {
        node.Expression_c = this.parseExpression();
      }
      this.expect(Token.RPAREN);

      node.Statement = this.parseStatement();
      return this.finishNode(node, 'ForStatement');
    });
  }

  // SwitchStatement :
  //   `switch` `(` Expression `)` CaseBlock
  parseSwitchStatement() {
    const node = this.startNode();
    this.expect(Token.SWITCH);
    this.expect(Token.LPAREN);
    node.Expression = this.parseExpression();
    this.expect(Token.RPAREN);
    this.scope({ lexical: true }, () => {
      node.CaseBlock = this.parseCaseBlock();
    });
    return this.finishNode(node, 'SwitchStatement');
  }

  // CaseBlock :
  //   `{` CaseClauses? `}`
  //   `{` CaseClauses? DefaultClause CaseClauses? `}`
  // CaseClauses :
  //   CaseClause
  //   CaseClauses CauseClause
  // CaseClause :
  //   `case` Expression `:` StatementList?
  // DefaultClause :
  //   `default` `:` StatementList?
  parseCaseBlock() {
    const node = this.startNode();
    this.expect(Token.LBRACE);
    while (!this.eat(Token.RBRACE)) {
      switch (this.peek().type) {
        case Token.CASE:
        case Token.DEFAULT: {
          const inner = this.startNode();
          const t = this.next().type;
          if (t === Token.DEFAULT && node.DefaultClause) {
            this.unexpected();
          }
          if (t === Token.CASE) {
            inner.Expression = this.parseExpression();
          }
          this.expect(Token.COLON);
          while (!(this.test(Token.CASE) || this.test(Token.DEFAULT) || this.test(Token.RBRACE))) {
            if (!inner.StatementList) {
              inner.StatementList = [];
            }
            inner.StatementList.push(this.parseStatementListItem());
          }
          if (t === Token.DEFAULT) {
            node.DefaultClause = this.finishNode(inner, 'DefaultClause');
          } else {
            if (node.DefaultClause) {
              if (!node.CaseClauses_b) {
                node.CaseClauses_b = [];
              }
              node.CaseClauses_b.push(this.finishNode(inner, 'CaseClause'));
            } else {
              if (!node.CaseClauses_a) {
                node.CaseClauses_a = [];
              }
              node.CaseClauses_a.push(this.finishNode(inner, 'CaseClause'));
            }
          }
          break;
        }
        default:
          this.unexpected();
      }
    }
    return this.finishNode(node, 'CaseBlock');
  }

  // BreakStatement :
  //   `break` `;`
  //   `break` [no LineTerminator here] LabelIdentifier `;`
  //
  // ContinueStatement :
  //   `continue` `;`
  //   `continue` [no LineTerminator here] LabelIdentifier `;`
  parseBreakContinueStatement() {
    const node = this.startNode();
    const isBreak = this.eat(Token.BREAK);
    if (!isBreak) {
      this.expect(Token.CONTINUE);
    }
    if (this.eat(Token.SEMICOLON)) {
      node.LabelIdentifier = null;
    } else if (this.peek().hadLineTerminatorBefore) {
      node.LabelIdentifier = null;
      this.semicolon();
    } else {
      if (this.test(Token.IDENTIFIER)) {
        node.LabelIdentifier = this.parseLabelIdentifier();
      } else {
        node.LabelIdentifier = null;
      }
      this.semicolon();
    }
    return this.finishNode(node, isBreak ? 'BreakStatement' : 'ContinueStatement');
  }

  // ReturnStatement :
  //   `return` `;`
  //   `return` [no LineTerminator here] Expression `;`
  parseReturnStatement() {
    if (!this.isReturnScope()) {
      this.unexpected();
    }
    const node = this.startNode();
    this.expect(Token.RETURN);
    if (this.eat(Token.SEMICOLON)) {
      node.Expression = null;
    } else if (this.peek().hadLineTerminatorBefore) {
      node.Expression = null;
      this.semicolon();
    } else {
      node.Expression = this.parseExpression();
      this.semicolon();
    }
    return this.finishNode(node, 'ReturnStatement');
  }

  // WithStatement :
  //   `with` `(` Expression `)` Statement
  parseWithStatement() {
    if (this.isStrictMode()) {
      this.unexpected();
    }
    const node = this.startNode();
    this.expect(Token.WITH);
    this.expect(Token.LPAREN);
    node.Expression = this.parseExpression();
    this.expect(Token.RPAREN);
    node.Statement = this.parseStatement();
    return this.finishNode(node, 'WithStatement');
  }

  // ThrowStatement :
  //   `throw` [no LineTerminator here] Expression `;`
  parseThrowStatement() {
    const node = this.startNode();
    this.expect(Token.THROW);
    if (this.peek().hadLineTerminatorBefore) {
      this.report('NewlineAfterThrow');
    }
    node.Expression = this.parseExpression();
    this.semicolon();
    return this.finishNode(node, 'ThrowStatement');
  }

  // TryStatement :
  //   `try` Block Catch
  //   `try` Block Finally
  //   `try` Block Catch Finally
  //
  // Catch :
  //   `catch` `(` CatchParameter `)` Block
  //   `catch` Block
  //
  // Finally :
  //   `finally` Block
  //
  // CatchParameter :
  //   BindingIdentifier
  //   BindingPattern
  parseTryStatement() {
    const node = this.startNode();
    this.expect(Token.TRY);
    node.Block = this.parseBlock();
    if (this.eat(Token.CATCH)) {
      this.scope({ lexical: true }, () => {
        const clause = this.startNode();
        if (this.eat(Token.LPAREN)) {
          clause.CatchParameter = this.parseBindingIdentifier();
          this.declare(clause.CatchParameter, 'lexical');
          this.expect(Token.RPAREN);
        } else {
          clause.CatchParameter = null;
        }
        clause.Block = this.parseBlock();
        node.Catch = this.finishNode(clause, 'Catch');
      });
    } else {
      node.Catch = null;
    }
    if (this.eat(Token.FINALLY)) {
      node.Finally = this.parseBlock();
    } else {
      node.Finally = null;
    }
    if (!node.Catch && !node.Finally) {
      this.report('TryMissingCatchOrFinally');
    }
    return this.finishNode(node, 'TryStatement');
  }

  // DebuggerStatement : `debugger` `;`
  parseDebuggerStatement() {
    const node = this.startNode();
    this.expect(Token.DEBUGGER);
    this.semicolon();
    return this.finishNode(node, 'DebuggerStatement');
  }

  // ExpressionStatement :
  //   [lookahead != `{`, `function`, `async` [no LineTerminator here] `function`, `class`, `let` `[` ] Expression `;`
  parseExpressionStatement() {
    const node = this.startNode();
    const expression = this.parseExpression();
    if (expression.type === 'IdentifierReference' && this.eat(Token.COLON)) {
      expression.type = 'LabelIdentifier';
      node.LabelIdentifier = expression;
      if (this.test(Token.FUNCTION)) {
        node.LabelledItem = this.parseFunctionDeclaration();
      } else {
        node.LabelledItem = this.parseStatement();
      }
      return this.finishNode(node, 'LabelledStatement');
    }
    node.Expression = expression;
    this.semicolon();
    return this.finishNode(node, 'ExpressionStatement');
  }

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
  // ImportedDefaultBinding :
  //   ImportedBinding
  //
  // NameSpaceImport :
  //   `*` `as` ImportedBinding
  //
  // NamedImports :
  //   `{` `}`
  //   `{` ImportsList `}`
  //   `{` ImportsList `,` `}`
  //
  // ImportedBinding :
  //   BindingIdentifier
  parseImportClause() {
    const node = this.startNode();
    if (this.test(Token.IDENTIFIER)) {
      node.ImportedDefaultBinding = this.parseBindingIdentifier();
      this.declare(node.ImportedDefaultBinding, 'import');
      if (!this.eat(Token.COMMA)) {
        return this.finishNode(node, 'ImportClause');
      }
    }
    if (this.eat(Token.MUL)) {
      this.expect('as');
      node.NameSpaceImport = this.parseBindingIdentifier();
      this.declare(node.NameSpaceImport, 'import');
    } else if (this.eat(Token.LBRACE)) {
      node.NamedImports = [];
      while (!this.eat(Token.RBRACE)) {
        const inner = this.startNode();
        const name = this.parseBindingIdentifier();
        if (this.eat('as')) {
          inner.IdentifierName = name;
          inner.ImportedBinding = this.parseBindingIdentifier();
          this.declare(inner.ImportedBinding, 'import');
          node.NamedImports.push(this.finishNode(inner, 'ImportSpecifier'));
        } else {
          this.declare(name, 'import');
          node.NamedImports.push(name);
        }
        if (this.eat(Token.RBRACE)) {
          break;
        }
        this.expect(Token.COMMA);
      }
    } else {
      this.unexpected();
    }
    return this.finishNode(node, 'ImportClause');
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
  //   NamedExports
  parseExportDeclaration() {
    const node = this.startNode();
    this.expect(Token.EXPORT);
    node.default = this.eat(Token.DEFAULT);
    if (node.default) {
      switch (this.peek().type) {
        case Token.FUNCTION:
          node.HoistableDeclaration = this.scope({ default: true }, () => this.parseFunctionDeclaration(FunctionKind.NORMAL));
          break;
        case Token.ASYNC:
          node.HoistableDeclaration = this.scope({ default: true }, () => this.parseFunctionDeclaration(FunctionKind.ASYNC));
          break;
        case Token.CLASS:
          node.ClassDeclaration = this.scope({ default: true }, () => this.parseClassDeclaration());
          break;
        default:
          node.AssignmentExpression = this.parseAssignmentExpression();
          this.semicolon();
          break;
      }
    } else {
      switch (this.peek().type) {
        case Token.LET:
        case Token.CONST:
          node.Declaration = this.parseLexicalDeclaration();
          break;
        case Token.CLASS:
          node.Declaration = this.parseClassDeclaration();
          break;
        case Token.FUNCTION:
        case Token.ASYNC:
          node.Declaration = this.parseHoistableDeclaration();
          this.declare(node.Declaration, 'export');
          break;
        case Token.VAR:
          node.VariableStatement = this.parseVariableStatement();
          this.declare(node.VariableStatement, 'export');
          break;
        case Token.LBRACE:
          this.next();
          node.NamedExports = [];
          while (!this.eat(Token.RBRACE)) {
            const inner = this.startNode();
            const name = this.parseIdentifierName();
            if (this.eat('as')) {
              inner.IdentifierName_a = name;
              inner.IdentifierName_b = this.parseIdentifierName();
              this.declare(inner.IdentifierName_b, 'export');
              node.NamedExports.push(this.finishNode(node, 'NamedSpecifier'));
            } else {
              this.declare(name, 'export');
              node.NamedExports.push(name);
            }
            if (this.eat(Token.RBRACE)) {
              break;
            }
            this.expect(Token.COMMA);
          }
          if (this.test('from')) {
            node.FromClause = this.parseFromClause();
          }
          this.semicolon();
          break;
        case Token.MUL: {
          const inner = this.startNode();
          this.next();
          if (this.eat('as')) {
            inner.IdentifierName = this.parseIdentifierName();
          }
          node.FromClause = this.parseFromClause();
          this.semicolon();
          break;
        }
        default:
          this.unexpected();
      }
    }
    return this.finishNode(node, 'ExportDeclaration');
  }

  // FromClause :
  //   `from` ModuleSpecifier
  parseFromClause() {
    this.expect('from');
    return this.parseStringLiteral();
  }
}
