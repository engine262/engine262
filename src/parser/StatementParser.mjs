import { Token, isAutomaticSemicolon } from './tokens.mjs';
import { ExpressionParser } from './ExpressionParser.mjs';

export class StatementParser extends ExpressionParser {
  semicolon() {
    const token = this.peek();
    if (token.type === Token.SEMICOLON) {
      this.next();
      return;
    }
    if (this.hasLineTerminatorBeforeNext() || isAutomaticSemicolon(token.type)) {
      return;
    }
    if (this.current() === Token.AWAIT) {
      this.error('Unexpected await outside async function');
    }
    this.error(`Unexpected token: ${token.name}`);
  }

  // StatementList :
  //   StatementListItem
  //   StatementList StatementListItem
  parseStatementList(endToken, directives = undefined) {
    const list = [];
    let parsedNonDirective = false;
    const savedStrict = this.state.strict;
    while (!this.eat(endToken)) {
      const statement = this.parseStatementListItem();
      if (!parsedNonDirective
          && directives !== undefined
          && statement.type === 'ExpressionStatement'
          && statement.expression.type === 'Literal'
          && typeof statement.expression.value === 'string') {
        list.push(statement);
        directives.push(statement.expression.value);
        if (statement.expression.value === 'use strict') {
          this.state.strict = true;
        }
        continue;
      }
      parsedNonDirective = true;
      list.push(statement);
    }
    this.state.strict = savedStrict;
    return list;
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
    const token = this.peek();
    switch (token.type) {
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
    const token = this.peek();
    switch (token.type) {
      case Token.FUNCTION:
        return this.parseFunctionDeclaration(StatementParser.FunctionKind.NORMAL);
      case Token.ASYNC:
        return this.parseFunctionDeclaration(StatementParser.FunctionKind.ASYNC);
      default:
        throw new Error('unreachable');
    }
  }

  // ClassDeclaration :
  //   `class` BindingIdentifier ClassTail
  //   [+Default] `class` ClassTail
  parseClassDeclaration() {
    this.expect(Token.CLASS);
    return this.parseClass(false);
  }

  // LexicalDeclaration : LetOrConst BindingList `;`
  parseLexicalDeclaration() {
    const node = this.parseLexical(true);
    this.semicolon();
    return node;
  }

  parseLexical(allowInitialization) {
    const node = this.startNode();
    const next = this.next();
    if (next.type !== Token.LET && next.type !== Token.CONST) {
      this.error(`Unexpected token: ${next.name}`);
    }
    node.kind = next.type === Token.LET ? 'let' : 'const';
    node.declarations = [];
    do {
      const declarator = this.startNode();
      declarator.id = this.parseBindingIdentifier();
      if (declarator.id.name === 'let') {
        this.error('`let` is disallowed as a lexically bound name');
      }
      if (allowInitialization && this.eat(Token.ASSIGN)) {
        declarator.init = this.parseAssignmentExpression();
      } else if (allowInitialization && next.type === Token.CONST) {
        this.error('`const` declarations must have Initializers');
      } else {
        declarator.init = null;
      }
      node.declarations.push(this.finishNode(declarator, 'VariableDeclarator'));
    } while (this.eat(Token.COMMA));
    return this.finishNode(node, 'VariableDeclaration');
  }

  // FunctionDeclaration
  parseFunctionDeclaration(kind) {
    return this.parseFunction(false, kind);
  }

  // Statement :
  //   ...
  parseStatement() {
    const token = this.peek();
    switch (token.type) {
      case Token.LBRACE:
        return this.parseBlockStatement();
      case Token.VAR:
        return this.parseVariableStatement();
      case Token.SEMICOLON: {
        const node = this.finishNode(this.startNode(), 'EmptyStatement');
        this.next();
        return node;
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
        if (this.isReturnScope()) { // [+Return]
          return this.parseReturnStatement();
        } else {
          return this.error('Illegal return outside function');
        }
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
  // Block : `{` StatementList `}`
  parseBlockStatement() {
    const node = this.startNode();
    this.expect(Token.LBRACE);
    node.Block = this.parseStatementList(Token.RBRACE);
    return this.finishNode(node, 'BlockStatement');
  }

  // VariableStatement : `var` VariableDeclarationList `;`
  parseVariableStatement() {
    const node = this.parseVariable(true);
    this.semicolon();
    return node;
  }

  parseVariable(allowInitialization) {
    const node = this.startNode();
    this.expect(Token.VAR);
    node.declarations = [];
    node.kind = 'var';
    do {
      const declarator = this.startNode();
      declarator.id = this.parseBindingIdentifier();
      if (allowInitialization && this.eat(Token.ASSIGN)) {
        declarator.init = this.parseAssignmentExpression();
      } else {
        declarator.init = null;
      }
      node.declarations.push(this.finishNode(declarator, 'VariableDeclarator'));
    } while (this.eat(Token.COMMA));
    return this.finishNode(node, 'VariableDeclaration');
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
    node.test = this.parseExpression();
    this.expect(Token.RPAREN);
    node.body = this.parseStatement();
    return this.finishNode(node, 'WhileStatement');
  }

  // `do` Statement `while` `(` Expression `)` `;`
  parseDoWhileStatement() {
    const node = this.startNode();
    this.expect(Token.DO);
    node.body = this.parseStatement();
    this.expect(Token.WHILE);
    this.expect(Token.LPAREN);
    node.test = this.parseExpression();
    this.expect(Token.RPAREN);
    return this.finishNode(node, 'DoWhileStatement');
  }

  parseForStatement() {
    const node = this.startNode();
    this.expect(Token.FOR);
    const isAsync = this.inAwaitScope && this.eat(Token.AWAIT);
    this.expect(Token.LPAREN);
    if (this.eat(Token.SEMICOLON)) {
      if (isAsync) {
        this.error('Unexpected token: SEMICOLON');
      }
      return this.parseFor(node);
    }
    {
      const peek = this.peek();
      let init;
      if (peek.type === Token.VAR) {
        init = this.parseVariable(false);
      } else if (peek.type === Token.CONST || peek.type === Token.LET) {
        init = this.parseLexical(false);
      }
      if (init) {
        const p = this.peek();
        if ((p.type === Token.IN || p.type === Token.OF) && init.declarations.length === 1) {
          return this.parseForIn(node, init, isAsync);
        }
        if (isAsync) {
          this.error('Unexpected token');
        }
        return this.parseFor(node, init);
      }
    }
    const init = this.parseExpression();
    const peek = this.peek();
    if (peek.type === Token.IN || peek.type === Token.OF) {
      return this.parseForIn(node, init, isAsync);
    }
    if (isAsync) {
      this.error('Unexpected token');
    }
    return this.parseFor(node, init);
  }

  parseFor(node, init) {
    node.init = init;
    this.expect(Token.SEMICOLON);
    node.test = this.peek().type === Token.SEMICOLON ? null : this.parseExpression();
    this.expect(Token.SEMICOLON);
    node.update = this.peek().type === Token.SEMICOLON ? null : this.parseExpression();
    this.expect(Token.RPAREN);
    node.body = this.parseStatement();
    return this.finishNode(node, 'ForStatement');
  }

  parseForIn(node, init, isAsync) {
    const next = this.next();
    const isForIn = next.type === Token.IN;
    if (isForIn && isAsync) {
      this.error('Unexpected token');
    } else {
      node.await = isAsync;
    }
    if (
      init.type === 'VariableDeclaration'
      && init.declarations[0].init != null
      && (!isForIn
        || init.kind !== 'var'
        || init.declarations[0].id.type !== 'Identifier')
    ) {
      this.error('For loop variable declaration may not have an initializer');
    } else if (init.type === 'AssignmentPattern') {
      this.error('Invalid left-hand side in for loop');
    }
    node.left = init;
    node.right = isForIn ? this.parseExpression() : this.parseAssignmentExpression();
    this.expect(Token.RPAREN);
    node.body = this.parseStatement();
    return this.finishNode(node, isForIn ? 'ForInStatement' : 'ForOfStatement');
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
    if (this.eat(Token.SEMICOLON) || this.semicolon()) {
      node.LabelIdentifier = null;
    } else {
      const peek = this.peek();
      if (peek.type !== Token.IDENTIFIER) {
        this.error(`Unexpected token: ${peek.name}`);
      }
      node.LabelIdentifier = this.parseIdentifier(false);
      this.semicolon();
    }
    return this.finishNode(node, isBreak ? 'BreakStatement' : 'ContinueStatement');
  }

  // ReturnStatement :
  //   `return` `;`
  //   `return` [no LineTerminator here] Expression `;`
  parseReturnStatement() {
    const node = this.startNode();
    this.expect(Token.RETURN);
    if (this.eat(Token.SEMICOLON)) {
      node.Expression = null;
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
      this.error('Unexpected newline after `throw`');
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
  //   `catch` BLock
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
    node.Block = this.parseBlockStatement();
    if (this.eat(Token.CATCH)) {
      const clause = this.startNode();
      if (this.eat(Token.LPAREN)) {
        clause.CatchParameter = this.parseBindingIdentifier();
        this.expect(Token.RPAREN);
      } else {
        clause.CatchParameter = null;
      }
      clause.Block = this.parseBlockStatement();
      node.Catch = this.finishNode(clause, 'Catch');
    } else {
      node.Catch = null;
    }
    if (this.eat(Token.FINALLY)) {
      node.Finally = this.parseBlockStatement();
    } else {
      node.Finally = null;
    }
    if (!node.Catch && !node.Finally) {
      this.error('Expected a catch or finally clause');
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
}
