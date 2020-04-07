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
      list.push(statement);
      if (!parsedNonDirective
          && statement.type === 'ExpressionStatement'
          && statement.Expression.type === 'StringLiteral') {
        if (statement.Expression.value === 'use strict') {
          this.state.strict = true;
        }
        if (directives !== undefined) {
          directives.push(statement.Expression.value);
        }
      } else {
        parsedNonDirective = true;
      }
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

  parseLexical() {
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
      if (this.eat(Token.ASSIGN)) {
        declarator.init = this.parseAssignmentExpression();
      } else if (next.type === Token.CONST) {
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

  parseVariable() {
    const node = this.startNode();
    this.expect(Token.VAR);
    node.declarations = [];
    node.kind = 'var';
    do {
      const declarator = this.startNode();
      declarator.id = this.parseBindingIdentifier();
      if (this.eat(Token.ASSIGN)) {
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

  // 1.  `for` `(` [lookahead != `let` `[`] Expression `;` Expression `;` Expression `)` Statement
  // 2.  `for` `(` `var` VariableDeclarationList `;` Expression `;` Expression `)` Statement
  // 3.  `for` `(` LexicalDeclaration Expression `;` Expression `)` Statement
  // 4.  `for` `(` [lookahead != `let` `[`] LeftHandSideExpression `in` Expression `)` Statement
  // 5.  `for` `(` `var` ForBinding `in` Expression `)` Statement
  // 6.  `for` `(` ForDeclaration `in` Expression `)` Statement
  // 7.  `for` `(` [lookahead != `let`] LeftHandSideExpression `of` AssignmentExpression `)` Statement
  // 8.  `for` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
  // 9.  `for` `(` ForDeclaration `of` AssignmentExpression `)` Statement
  // 10. `for` `await` `(` [lookahead != `let`] LeftHandSideExpression `of` AssignmentExpression `)` Statement
  // 11. `for` `await` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
  // 12. `for` `await` `(` ForDeclaration `of` AssignmentExpression `)` Statement
  //
  // ForDeclaration : LetOrConst ForBinding
  // ForBinding :
  //   BindingIdentifier
  //   BindingPattern
  parseForStatement() {
    const node = this.startNode();

    this.eat(Token.FOR);
    const isAwait = this.isAwaitScope && this.eat(Token.AWAIT);
    this.expect(Token.LPAREN);

    // 3.  `for` `(` LexicalDeclaration Expression `;` Expression `)` Statement
    // 6.  `for` `(` ForDeclaration `in` Expression `)` Statement
    // 9.  `for` `(` ForDeclaration `of` AssignmentExpression `)` Statement
    // 12. `for` `await` `(` ForDeclaration `of` AssignmentExpression `)` Statement
    if (this.test(Token.LET) || this.test(Token.CONST)) {
    }

    // 10. `for` `await` `(` [lookahead != `let`] LeftHandSideExpression `of` AssignmentExpression `)` Statement
    if (isAwait) {
      node.LeftHandSideExpression = this.parseLeftHandSideExpression();
      const maybeOf = this.parseIdentifier();
      if (maybeOf.name !== 'of') {
        this.error(`Unexpected token: ${maybeOf.name}`);
      }
      node.AssignmentExpression = this.parseAssignmentExpression();
      this.expect(Token.RPAREN);
      node.Statement = this.parseStatement();
      return this.finishNode(node, 'ForStatement');
    }

    // 2.  `for` `(` `var` VariableDeclarationList `;` Expression `;` Expression `)` Statement
    // 5.  `for` `(` `var` ForBinding `in` Expression `)` Statement
    // 8.  `for` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
    // 11. `for` `await` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
    if (this.test(Token.VAR)) {
    }


    // 1. `for` `(` [lookahead != `let` `[`] Expression `;` Expression `;` Expression `)` Statement
    // 4. `for` `(` [lookahead != `let` `[`] LeftHandSideExpression `in` Expression `)` Statement
    // 7. `for` `(` [lookahead != `let`] LeftHandSideExpression `of` AssignmentExpression `)` Statement
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
