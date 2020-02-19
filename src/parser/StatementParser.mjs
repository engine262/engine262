import { Token, isAutomaticSemicolon } from './tokens.mjs';
import { ExpressionParser } from './ExpressionParser.mjs';
import { FunctionKind } from './FunctionParser.mjs';

export class StatementParser extends ExpressionParser {
  semicolon() {
    if (this.eat(Token.SEMICOLON)) {
      return;
    }
    if (this.hasLineTerminatorBeforeNext() || isAutomaticSemicolon(this.lookahead.type)) {
      return;
    }
    this.unexpected();
  }

  // StatementList :
  //   StatementListItem
  //   StatementList StatementListItem
  parseStatementList(endToken) {
    const statementList = [];
    const directives = [];
    let pastDirectives = false;

    while (!this.eat(endToken)) {
      const stmt = this.parseStatementListItem();
      statementList.push(stmt);
      if (!pastDirectives
          && stmt.type === 'ExpressionStatement'
          && stmt.Expression.type === 'StringLiteral') {
        directives.push(stmt.Expression.value);
        if (stmt.Expression.value === 'use strict') {
          this.state.strict = true;
        }
      } else {
        pastDirectives = true;
      }
    }
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
    switch (this.lookahead.type) {
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
    switch (this.lookahead.type) {
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
      const node = this.startNode();
      node.BindingIdentifier = this.parseBindingIdentifier();
      node.Initializer = this.test(Token.ASSIGN) ? this.parseInitializer() : null;
      bindingList.push(this.finishNode(node, 'LexicalBinding'));
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
    switch (this.lookahead.type) {
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
      // LabelledStatement
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
    } else {
      node.Statement_b = null;
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
    this.semicolon();
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
    const node = this.startNode();
    this.expect(Token.FOR);
    this.expect(Token.LPAREN);
    const startsWithLet = this.test(Token.LET);
    if (startsWithLet || this.test(Token.CONST)) {
      node.LexicalDeclaration = this.parseLexicalDeclaration();
      node.VariableDeclarationList = null;
    } else {
      node.LexicalDeclaration = null;
    }
    if (this.eat(Token.VAR)) {
      node.LeftHandSideExpression = null;
      const VariableDeclarationList = this.parseVariableDeclarationList();
      if (VariableDeclarationList.length === 1 && this.eat(Token.IN)) {
        node.VariableDeclarationList = null;
        node.ForBinding = VariableDeclarationList[0];
        node.ForBinding.type = 'ForBinding';
        node.Expression = this.parseExpression();
        this.expect(Token.RPAREN);
        node.Statement = this.parseStatement();
        return this.finishNode(node, 'ForInStatement');
      } else {
        node.ForBinding = null;
        node.Expression = null;
      }
      node.VariableDeclarationList = VariableDeclarationList;
      this.expect(Token.SEMICOLON);
    } else if (!this.test(Token.SEMICOLON)) {
      throw new Error();
    }

    if (!this.test(Token.SEMICOLON)) {
      node.Expression_b = this.parseExpression();
    } else {
      node.Expression_b = null;
    }
    this.expect(Token.SEMICOLON);
    if (!this.test(Token.RPAREN)) {
      node.Expression_c = this.parseExpression();
    } else {
      node.Expression_c = null;
    }
    this.expect(Token.RPAREN);
    node.Statement = this.parseStatement();
    return this.finishNode(node, 'ForStatement');
  }

  // SwitchStatement :
  //   `switch` `(` Expression `)` CaseBlock
  parseSwitchStatement() {
    const node = this.startNode();
    this.expect(Token.SWITCH);
    this.expect(Token.LPAREN);
    node.Expression = this.parseExpression();
    this.expect(Token.RPAREN);
    node.CaseBlock = this.parseCaseBlock();
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
    node.CaseClauses_a = null;
    node.DefaultClause = null;
    node.CaseClauses_b = null;
    while (!this.eat(Token.RBRACE)) {
      const inner = this.startNode();
      if (this.eat(Token.CASE)) {
        let selected;
        if (node.DefaultClause !== null) {
          if (node.CaseClauses_b === null) {
            node.CaseClauses_b = [];
          }
          selected = node.CaseClauses_b;
        } else {
          if (node.CaseClauses_a === null) {
            node.CaseClauses_a = [];
          }
          selected = node.CaseClauses_a;
        }
        inner.Expression = this.parseExpression();
        this.expect(Token.COLON);
        inner.StatementList = null;
        while (!(this.test(Token.CASE) || this.test(Token.DEFAULT) || this.test(Token.RBRACE))) {
          if (inner.StatementList === null) {
            inner.StatementList = [];
          }
          inner.StatementList.push(this.parseStatementListItem());
        }
        selected.push(this.finishNode(inner, 'CaseClause'));
      } else if (node.DefaultClause === null && this.eat(Token.DEFAULT)) {
        this.expect(Token.COLON);
        inner.StatementList = null;
        while (!(this.test(Token.CASE) || this.test(Token.DEFAULT) || this.test(Token.RBRACE))) {
          if (inner.StatementList === null) {
            inner.StatementList = [];
          }
          inner.StatementList.push(this.parseStatementListItem());
        }
        node.DefaultClause = this.finishNode(inner, 'DefaultClause');
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
    } else if (this.hasLineTerminatorBeforeNext()) {
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
    } else if (this.hasLineTerminatorBeforeNext()) {
      node.Expression = null;
      this.semicolon();
    } else {
      node.Expression = this.parseExpression();
      this.semicolon();
    }
    return this.finishNode(node, 'ReturnStatement');
  }

  // ThrowStatement :
  //   `throw` [no LineTerminator here] Expression `;`
  parseThrowStatement() {
    const node = this.startNode();
    this.expect(Token.THROW);
    if (this.hasLineTerminatorBeforeNext()) {
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
      const clause = this.startNode();
      if (this.eat(Token.LPAREN)) {
        clause.CatchParameter = this.parseBindingIdentifier();
        this.expect(Token.RPAREN);
      } else {
        clause.CatchParameter = null;
      }
      clause.Block = this.parseBlock();
      node.Catch = this.finishNode(clause, 'Catch');
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

  // ExpressionStatement :
  //   [lookahead != `{`, `function`, `async` [no LineTerminator here] `function`, `class`, `let` `[` ] Expression `;`
  parseExpressionStatement() {
    const node = this.startNode();
    node.Expression = this.parseExpression();
    this.semicolon();
    return this.finishNode(node, 'ExpressionStatement');
  }

  // ImportDeclaration :
  //   `import` ImportClause FromClause `;`
  //   `import` ModuleSpecifier `;`
  //
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
  // FromClause :
  //   `from` ModuleSpecifier
  //
  // ImportedBinding :
  //   BindingIdentifier
  parseImportDeclaration() {
    const node = this.startNode();
    this.expect(Token.IMPORT);
    if (this.test(Token.STRING)) {
      node.ModuleSpecifier = this.parsePrimaryExpression();
      return this.finishNode(node, 'ImportDeclaration');
    }
    if (this.test(Token.IDENTIFIER)) {
      node.ImportedDefaultBinding = this.parseBindingIdentifier();
    } else {
      node.ImportedDefaultBinding = null;
    }
    if (node.ImportedDefaultBinding === null || this.eat(Token.COMMA)) {
      if (this.eat(Token.MUL)) {
        this.expect(Token.AS);
        node.NameSpaceImport = this.parseBindingIdentifier();
        node.NamedImports = null;
      } else if (this.eat(Token.LBRACE)) {
        node.NameSpaceImport = null;
        node.NamedImports = [];
        while (!this.eat(Token.RBRACE)) {
          const inner = this.startNode();
          const name = this.parseBindingIdentifier();
          if (this.eat(Token.AS)) {
            inner.IdentifierName = name;
            inner.ImportedBinding = this.parseBindingIdentifier();
            node.NamedImports.push(this.finishNode(inner, 'ImportSpecifier'));
          } else {
            node.NamedImports.push(name);
          }
          if (this.eat(Token.RBRACE)) {
            break;
          }
          this.expect(Token.COMMA);
        }
      }
    }
    this.expect(Token.FROM);
    node.FromClause = this.parsePrimaryExpression();
    this.semicolon();
    return this.finishNode(node, 'ImportDeclaration');
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
      switch (this.lookahead.type) {
        case Token.FUNCTION:
          node.HoistableDeclaration = this.parseFunctionExpression(FunctionKind.NORMAL);
          break;
        case Token.ASYNC:
          node.HoistableDeclaration = this.parseFunctionExpression(FunctionKind.ASYNC);
          break;
        case Token.CLASS:
          node.ClassDeclaration = this.parseClassExpression();
          break;
        default:
          node.AssignmentExpression = this.parseAssignmentExpression();
          this.semicolon();
          break;
      }
    } else {
      switch (this.lookahead.type) {
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
          break;
        case Token.VAR:
          node.VariableStatement = this.parseVariableStatement();
          break;
        case Token.LBRACE:
          node.NamedExports = [];
          while (!this.eat(Token.RBRACE)) {
            const inner = this.startNode();
            const name = this.parseIdentifierName();
            if (this.eat(Token.AS)) {
              inner.IdentifierName_a = name;
              inner.IdentifierName_b = this.parseIdentifierName();
              node.NamedExports.push(this.finishNode(node, 'NamedSpecifier'));
            } else {
              node.NamedExports.push(name);
            }
            if (this.eat(Token.RBRACE)) {
              break;
            }
            this.expect(Token.COMMA);
          }
          if (this.test(Token.FROM)) {
            node.FromClause = this.parseFromClause();
          }
          this.semicolon();
          break;
        case Token.MUL: {
          const inner = this.startNode();
          if (this.eat(Token.AS)) {
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
}
