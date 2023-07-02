import type { Mutable } from '../helpers.mjs';
import { Token, isAutomaticSemicolon } from './tokens.mjs';
import { ExpressionParser } from './ExpressionParser.mjs';
import { FunctionKind } from './FunctionParser.mjs';
import { getDeclarations } from './Scope.mjs';
import type { ParseNode } from './ParseNode.mjs';

export abstract class StatementParser extends ExpressionParser {
  eatSemicolonWithASI() {
    if (this.eat(Token.SEMICOLON)) {
      return true;
    }
    if (this.peek().hadLineTerminatorBefore || isAutomaticSemicolon(this.peek().type)) {
      return true;
    }
    return false;
  }

  semicolon() {
    if (!this.eatSemicolonWithASI()) {
      this.unexpected();
    }
  }

  // StatementList :
  //   StatementListItem
  //   StatementList StatementListItem
  /**
   * @param endToken endToken
   * @param directives directives, this array will be mutated.
   */
  parseStatementList(endToken: string | Token, directives?: string[]): ParseNode.StatementList {
    const statementList: Mutable<ParseNode.StatementList> = [];
    const oldStrict = this.state.strict;
    const directiveData = [];
    while (!this.eat(endToken)) {
      if (directives !== undefined && this.test(Token.STRING)) {
        const token = this.peek();
        const directive = this.source.slice(token.startIndex + 1, token.endIndex - 1);
        if (directive === 'use strict') {
          this.state.strict = true;
          directiveData.forEach((d) => {
            if (/\\([1-9]|0\d)/.test(d.directive)) {
              this.raiseEarly('IllegalOctalEscape', d.token);
            }
          });
        }
        directives.push(directive);
        directiveData.push({ directive, token });
      } else {
        directives = undefined;
      }

      const stmt = this.parseStatementListItem();
      statementList.push(stmt);
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
  parseStatementListItem(): ParseNode.StatementListItem {
    switch (this.peek().type) {
      case Token.FUNCTION:
        return this.parseHoistableDeclaration();
      case Token.CLASS:
        return this.parseClassDeclaration();
      case Token.CONST:
        return this.parseLexicalDeclaration();
      default:
        if (this.test('let')) {
          switch (this.peekAhead().type) {
            case Token.LBRACE:
            case Token.LBRACK:
            case Token.IDENTIFIER:
            case Token.YIELD:
            case Token.AWAIT:
              return this.parseLexicalDeclaration();
            default:
              break;
          }
        }
        if (this.test('async') && this.testAhead(Token.FUNCTION) && !this.peekAhead().hadLineTerminatorBefore) {
          return this.parseHoistableDeclaration();
        }
        return this.parseStatement();
    }
  }

  // HoistableDeclaration :
  //   FunctionDeclaration
  //   GeneratorDeclaration
  //   AsyncFunctionDeclaration
  //   AsyncGeneratorDeclaration
  parseHoistableDeclaration(): ParseNode.HoistableDeclaration {
    switch (this.peek().type) {
      case Token.FUNCTION:
        return this.parseFunctionDeclaration(FunctionKind.NORMAL);
      default:
        if (this.test('async') && this.testAhead(Token.FUNCTION) && !this.peekAhead().hadLineTerminatorBefore) {
          return this.parseFunctionDeclaration(FunctionKind.ASYNC);
        }
        throw new Error('unreachable');
    }
  }

  // ClassDeclaration :
  //   `class` BindingIdentifier ClassTail
  //   [+Default] `class` ClassTail
  parseClassDeclaration(): ParseNode.ClassDeclaration {
    return this.parseClass(false) as ParseNode.ClassDeclaration;
  }

  // LexicalDeclaration : LetOrConst BindingList `;`
  parseLexicalDeclaration(): ParseNode.LexicalDeclarationLike {
    const node = this.startNode<ParseNode.LexicalDeclaration>();
    const letOrConst = this.eat('let') ? 'let' : this.expect(Token.CONST) && 'const';
    node.LetOrConst = letOrConst;
    node.BindingList = this.parseBindingList();
    this.semicolon();

    this.scope.declare(node.BindingList, 'lexical');
    node.BindingList.forEach((b) => {
      if (node.LetOrConst === 'const' && !b.Initializer) {
        this.raiseEarly('ConstDeclarationMissingInitializer', b);
      }
    });

    return this.finishNode(node, 'LexicalDeclaration');
  }

  // BindingList :
  //   LexicalBinding
  //   BindingList `,` LexicalBinding
  //
  // LexicalBinding :
  //   BindingIdentifier Initializer?
  //   BindingPattern Initializer
  parseBindingList(): ParseNode.BindingList {
    const bindingList: Mutable<ParseNode.BindingList> = [];
    do {
      const node = this.parseBindingElement();
      bindingList.push(this.repurpose(node, 'LexicalBinding'));
    } while (this.eat(Token.COMMA));
    return bindingList;
  }

  // BindingElement :
  //   SingleNameBinding
  //   BindingPattern Initializer?
  // SingleNameBinding :
  //   BindingIdentifier Initializer?
  parseBindingElement(): ParseNode.BindingElementLike {
    const node = this.startNode<ParseNode.BindingElementLike>();
    if (this.test(Token.LBRACE) || this.test(Token.LBRACK)) {
      node.BindingPattern = this.parseBindingPattern();
    } else {
      node.BindingIdentifier = this.parseBindingIdentifier();
    }
    node.Initializer = this.parseInitializerOpt();
    return this.finishNode(node, node.BindingPattern ? 'BindingElement' : 'SingleNameBinding');
  }

  // BindingPattern:
  //   ObjectBindingPattern
  //   ArrayBindingPattern
  parseBindingPattern(): ParseNode.BindingPattern {
    switch (this.peek().type) {
      case Token.LBRACE:
        return this.parseObjectBindingPattern();
      case Token.LBRACK:
        return this.parseArrayBindingPattern();
      default:
        return this.unexpected();
    }
  }

  // ObjectBindingPattern :
  //   `{` `}`
  //   `{` BindingRestProperty `}`
  //   `{` BindingPropertyList `}`
  //   `{` BindingPropertyList `,` BindingRestProperty? `}`
  parseObjectBindingPattern(): ParseNode.ObjectBindingPattern {
    const node = this.startNode<ParseNode.ObjectBindingPattern>();
    this.expect(Token.LBRACE);
    const BindingPropertyList: Mutable<ParseNode.BindingPropertyList> = [];
    node.BindingPropertyList = BindingPropertyList;
    while (!this.eat(Token.RBRACE)) {
      if (this.test(Token.ELLIPSIS)) {
        node.BindingRestProperty = this.parseBindingRestProperty();
        this.expect(Token.RBRACE);
        break;
      } else {
        BindingPropertyList.push(this.parseBindingProperty());
        if (!this.eat(Token.COMMA)) {
          this.expect(Token.RBRACE);
          break;
        }
      }
    }
    return this.finishNode(node, 'ObjectBindingPattern');
  }

  // BindingProperty :
  //   SingleNameBinding
  //   PropertyName : BindingElement
  parseBindingProperty(): ParseNode.BindingPropertyLike {
    const node = this.startNode<ParseNode.BindingProperty | ParseNode.SingleNameBinding>();
    const name = this.parsePropertyName();
    if (this.eat(Token.COLON)) {
      node.PropertyName = name;
      node.BindingElement = this.parseBindingElement();
      return this.finishNode(node, 'BindingProperty');
    } else {
      if (name.type !== 'IdentifierName') {
        this.unexpected(name);
      }
      this.validateIdentifierReference(name.name, node);
    }
    node.BindingIdentifier = this.repurpose(name, 'BindingIdentifier');
    node.Initializer = this.parseInitializerOpt();
    return this.finishNode(node, 'SingleNameBinding');
  }

  // BindingRestProperty :
  //  `...` BindingIdentifier
  parseBindingRestProperty(): ParseNode.BindingRestProperty {
    const node = this.startNode<ParseNode.BindingRestProperty>();
    this.expect(Token.ELLIPSIS);
    node.BindingIdentifier = this.parseBindingIdentifier();
    return this.finishNode(node, 'BindingRestProperty');
  }

  // ArrayBindingPattern :
  //   `[` Elision? BindingRestElement `]`
  //   `[` BindingElementList `]`
  //   `[` BindingElementList `,` Elision? BindingRestElement `]`
  parseArrayBindingPattern(): ParseNode.ArrayBindingPattern {
    const node = this.startNode<ParseNode.ArrayBindingPattern>();
    this.expect(Token.LBRACK);
    const BindingElementList: Mutable<ParseNode.BindingElementList> = [];
    node.BindingElementList = BindingElementList;
    while (true) {
      while (this.test(Token.COMMA)) {
        const elision = this.startNode<ParseNode.Elision>();
        this.next();
        BindingElementList.push(this.finishNode(elision, 'Elision'));
      }
      if (this.eat(Token.RBRACK)) {
        break;
      }
      if (this.test(Token.ELLIPSIS)) {
        node.BindingRestElement = this.parseBindingRestElement();
        this.expect(Token.RBRACK);
        break;
      } else {
        BindingElementList.push(this.parseBindingElement());
      }
      if (this.eat(Token.RBRACK)) {
        break;
      }
      this.expect(Token.COMMA);
    }
    return this.finishNode(node, 'ArrayBindingPattern');
  }

  // BindingRestElement :
  //   `...` BindingIdentifier
  //   `...` BindingPattern
  parseBindingRestElement(): ParseNode.BindingRestElement {
    const node = this.startNode<ParseNode.BindingRestElement>();
    this.expect(Token.ELLIPSIS);
    switch (this.peek().type) {
      case Token.LBRACE:
      case Token.LBRACK:
        node.BindingPattern = this.parseBindingPattern();
        break;
      default:
        node.BindingIdentifier = this.parseBindingIdentifier();
        break;
    }
    return this.finishNode(node, 'BindingRestElement');
  }

  // Initializer : `=` AssignmentExpression
  parseInitializerOpt(): ParseNode.Initializer | null {
    if (this.eat(Token.ASSIGN)) {
      return this.parseAssignmentExpression();
    }
    return null;
  }

  // FunctionDeclaration
  parseFunctionDeclaration(kind: FunctionKind): ParseNode.FunctionDeclarationLike {
    return this.parseFunction(false, kind) as ParseNode.FunctionDeclarationLike;
  }

  // Statement :
  //   ...
  parseStatement(): ParseNode.Statement {
    switch (this.peek().type) {
      case Token.LBRACE:
        return this.parseBlockStatement();
      case Token.VAR:
        return this.parseVariableStatement();
      case Token.SEMICOLON: {
        const node = this.startNode<ParseNode.EmptyStatement>();
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
  parseBlockStatement(): ParseNode.BlockStatement {
    return this.parseBlock();
  }

  // Block : `{` StatementList `}`
  parseBlock(lexical = true): ParseNode.Block {
    const node = this.startNode<ParseNode.Block>();
    this.expect(Token.LBRACE);
    node.StatementList = this.scope.with({ lexical }, () => this.parseStatementList(Token.RBRACE));
    return this.finishNode(node, 'Block');
  }

  // VariableStatement : `var` VariableDeclarationList `;`
  parseVariableStatement(): ParseNode.VariableStatement {
    const node = this.startNode<ParseNode.VariableStatement>();
    this.expect(Token.VAR);
    node.VariableDeclarationList = this.parseVariableDeclarationList();
    this.semicolon();
    this.scope.declare(node.VariableDeclarationList, 'variable');
    return this.finishNode(node, 'VariableStatement');
  }

  // VariableDeclarationList :
  //   VariableDeclaration
  //   VariableDeclarationList `,` VariableDeclaration
  parseVariableDeclarationList(firstDeclarationRequiresInit = true): ParseNode.VariableDeclarationList {
    const declarationList: Mutable<ParseNode.VariableDeclarationList> = [];
    do {
      const node = this.parseVariableDeclaration(firstDeclarationRequiresInit);
      declarationList.push(node);
    } while (this.eat(Token.COMMA));
    return declarationList;
  }

  // VariableDeclaration :
  //   BindingIdentifier Initializer?
  //   BindingPattern Initializer
  parseVariableDeclaration(firstDeclarationRequiresInit: boolean): ParseNode.VariableDeclaration {
    const node = this.startNode<ParseNode.VariableDeclaration>();
    switch (this.peek().type) {
      case Token.LBRACE:
      case Token.LBRACK:
        node.BindingPattern = this.parseBindingPattern();
        if (firstDeclarationRequiresInit) {
          this.expect(Token.ASSIGN);
          node.Initializer = this.parseAssignmentExpression();
        } else {
          node.Initializer = this.parseInitializerOpt();
        }
        break;
      default:
        node.BindingIdentifier = this.parseBindingIdentifier();
        node.Initializer = this.parseInitializerOpt();
        break;
    }
    return this.finishNode(node, 'VariableDeclaration');
  }

  // IfStatement :
  //  `if` `(` Expression `)` Statement `else` Statement
  //  `if` `(` Expression `)` Statement [lookahead != `else`]
  parseIfStatement(): ParseNode.IfStatement {
    const node = this.startNode<ParseNode.IfStatement>();
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
  parseWhileStatement(): ParseNode.WhileStatement {
    const node = this.startNode<ParseNode.WhileStatement>();
    this.expect(Token.WHILE);
    this.expect(Token.LPAREN);
    node.Expression = this.parseExpression();
    this.expect(Token.RPAREN);
    this.scope.with({ label: 'loop' }, () => {
      node.Statement = this.parseStatement();
    });
    return this.finishNode(node, 'WhileStatement');
  }

  // `do` Statement `while` `(` Expression `)` `;`
  parseDoWhileStatement(): ParseNode.DoWhileStatement {
    const node = this.startNode<ParseNode.DoWhileStatement>();
    this.expect(Token.DO);
    node.Statement = this.scope.with({ label: 'loop' }, () => this.parseStatement());
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
  // `for` `(` [lookahead != { `let`, `async` `of` }] LeftHandSideExpression `of` AssignmentExpression `)` Statement
  // `for` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
  // `for` `(` ForDeclaration `of` AssignmentExpression `)` Statement
  // `for` `await` `(` [lookahead != `let`] LeftHandSideExpression `of` AssignmentExpression `)` Statement
  // `for` `await` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
  // `for` `await` `(` ForDeclaration `of` AssignmentExpression `)` Statement
  //
  // ForDeclaration : LetOrConst ForBinding
  parseForStatement(): ParseNode.ForStatement | ParseNode.ForInOfStatement {
    return this.scope.with({
      lexical: true,
      label: 'loop',
    }, () => {
      const node = this.startNode<ParseNode.ForStatement | ParseNode.ForInOfStatement>();
      this.expect(Token.FOR);
      const isAwait = this.scope.hasAwait() && this.eat(Token.AWAIT);
      if (isAwait && !this.scope.hasReturn()) {
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
      const isLexicalStart = () => {
        switch (this.peekAhead().type) {
          case Token.LBRACE:
          case Token.LBRACK:
          case Token.IDENTIFIER:
          case Token.YIELD:
          case Token.AWAIT:
            return true;
          default:
            return false;
        }
      };
      if ((this.test('let') || this.test(Token.CONST)) && isLexicalStart()) {
        const inner = this.startNode<ParseNode.LexicalDeclaration | ParseNode.ForDeclaration>();
        if (this.eat('let')) {
          inner.LetOrConst = 'let';
        } else {
          this.expect(Token.CONST);
          inner.LetOrConst = 'const';
        }
        const list = this.parseBindingList();
        this.scope.declare(list, 'lexical');
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
        inner.ForBinding = this.repurpose(list[0], 'ForBinding', (_, oldNode) => {
          if (oldNode.Initializer) {
            this.unexpected(oldNode.Initializer);
          }
        });
        node.ForDeclaration = this.finishNode(inner, 'ForDeclaration');
        getDeclarations(node.ForDeclaration)
          .forEach((d) => {
            if (d.name === 'let') {
              this.raiseEarly('UnexpectedToken', d.node);
            }
          });
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
          node.ForBinding = this.parseForBinding();
          this.expect('of');
          node.AssignmentExpression = this.parseAssignmentExpression();
          this.expect(Token.RPAREN);
          node.Statement = this.parseStatement();
          return this.finishNode(node, 'ForAwaitStatement');
        }
        const list = this.parseVariableDeclarationList(false);
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
        node.ForBinding = this.repurpose(list[0], 'ForBinding', (_, oldNode) => {
          if (oldNode.Initializer) {
            this.unexpected(oldNode.Initializer);
          }
        });
        if (this.eat('of')) {
          node.AssignmentExpression = this.parseAssignmentExpression();
        } else {
          this.expect(Token.IN);
          node.Expression = this.parseExpression();
        }
        this.expect(Token.RPAREN);
        node.Statement = this.parseStatement();
        return this.finishNode(node, node.AssignmentExpression ? 'ForOfStatement' : 'ForInStatement');
      }

      this.scope.pushAssignmentInfo('for');
      const expression = this.scope.with({ in: false }, () => this.parseExpression());
      const validateLHS = (n: ParseNode) => {
        if (n.type === 'AssignmentExpression') {
          this.raiseEarly('UnexpectedToken', n);
        } else {
          this.validateAssignmentTarget(n);
        }
      };
      const assignmentInfo = this.scope.popAssignmentInfo();
      if (!isAwait && this.eat(Token.IN)) {
        assignmentInfo.clear();
        validateLHS(expression);
        node.LeftHandSideExpression = expression as ParseNode.LeftHandSideExpression; // NOTE: unsound cast
        node.Expression = this.parseExpression();
        this.expect(Token.RPAREN);
        node.Statement = this.parseStatement();
        return this.finishNode(node, 'ForInStatement');
      }
      const isExactlyAsync = expression.type === 'IdentifierReference'
        && !expression.escaped
        && expression.name === 'async';
      if ((!isExactlyAsync || isAwait) && this.eat('of')) {
        assignmentInfo.clear();
        validateLHS(expression);
        node.LeftHandSideExpression = expression as ParseNode.LeftHandSideExpression; // NOTE: unsound cast
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

  // ForBinding :
  //   BindingIdentifier
  //   BindingPattern
  parseForBinding(): ParseNode.ForBinding {
    const node = this.startNode<ParseNode.ForBinding>();
    switch (this.peek().type) {
      case Token.LBRACE:
      case Token.LBRACK:
        node.BindingPattern = this.parseBindingPattern();
        break;
      default:
        node.BindingIdentifier = this.parseBindingIdentifier();
        break;
    }
    return this.finishNode(node, 'ForBinding');
  }


  // SwitchStatement :
  //   `switch` `(` Expression `)` CaseBlock
  parseSwitchStatement(): ParseNode.SwitchStatement {
    const node = this.startNode<ParseNode.SwitchStatement>();
    this.expect(Token.SWITCH);
    this.expect(Token.LPAREN);
    node.Expression = this.parseExpression();
    this.expect(Token.RPAREN);
    this.scope.with({
      lexical: true,
      label: 'switch',
    }, () => {
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
  parseCaseBlock(): ParseNode.CaseBlock {
    const node = this.startNode<ParseNode.CaseBlock>();
    let CaseClauses_a: Mutable<ParseNode.CaseClauses> | undefined;
    let CaseClauses_b: Mutable<ParseNode.CaseClauses> | undefined;
    this.expect(Token.LBRACE);
    while (!this.eat(Token.RBRACE)) {
      switch (this.peek().type) {
        case Token.CASE:
        case Token.DEFAULT: {
          const inner = this.startNode<ParseNode.CaseClause | ParseNode.DefaultClause>();
          const t = this.next().type;
          if (t === Token.DEFAULT && node.DefaultClause) {
            this.unexpected();
          }
          if (t === Token.CASE) {
            inner.Expression = this.parseExpression();
          }
          this.expect(Token.COLON);
          let StatementList: Mutable<ParseNode.StatementList> | undefined;
          while (!(this.test(Token.CASE) || this.test(Token.DEFAULT) || this.test(Token.RBRACE))) {
            if (!StatementList) {
              StatementList = [];
              inner.StatementList = StatementList;
            }
            StatementList.push(this.parseStatementListItem());
          }
          if (t === Token.DEFAULT) {
            node.DefaultClause = this.finishNode(inner, 'DefaultClause');
          } else {
            if (node.DefaultClause) {
              if (!CaseClauses_b) {
                CaseClauses_b = [];
                node.CaseClauses_b = CaseClauses_b;
              }
              CaseClauses_b.push(this.finishNode(inner, 'CaseClause'));
            } else {
              if (!CaseClauses_a) {
                CaseClauses_a = [];
                node.CaseClauses_a = CaseClauses_a;
              }
              CaseClauses_a.push(this.finishNode(inner, 'CaseClause'));
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
  parseBreakContinueStatement(): ParseNode.BreakStatement | ParseNode.ContinueStatement {
    const node = this.startNode<ParseNode.BreakStatement | ParseNode.ContinueStatement>();
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
    this.verifyBreakContinue(node, isBreak);
    return this.finishNode(node, isBreak ? 'BreakStatement' : 'ContinueStatement');
  }

  verifyBreakContinue(node: ParseNode.Unfinished<ParseNode.BreakStatement | ParseNode.ContinueStatement>, isBreak: boolean) {
    let i = 0;
    for (; i < this.scope.labels.length; i += 1) {
      const label = this.scope.labels[i];
      if (!node.LabelIdentifier || node.LabelIdentifier.name === label.name) {
        if (label.type && (isBreak || label.type === 'loop')) {
          break;
        }
        if (node.LabelIdentifier && isBreak) {
          break;
        }
      }
    }
    if (i === this.scope.labels.length) {
      this.raiseEarly('IllegalBreakContinue', node, isBreak);
    }
  }

  // ReturnStatement :
  //   `return` `;`
  //   `return` [no LineTerminator here] Expression `;`
  parseReturnStatement(): ParseNode.ReturnStatement {
    if (!this.scope.hasReturn()) {
      this.unexpected();
    }
    const node = this.startNode<ParseNode.ReturnStatement>();
    this.expect(Token.RETURN);
    if (this.eatSemicolonWithASI()) {
      node.Expression = null;
    } else {
      node.Expression = this.parseExpression();
      this.semicolon();
    }
    return this.finishNode(node, 'ReturnStatement');
  }

  // WithStatement :
  //   `with` `(` Expression `)` Statement
  parseWithStatement(): ParseNode.WithStatement {
    if (this.isStrictMode()) {
      this.raiseEarly('UnexpectedToken');
    }
    const node = this.startNode<ParseNode.WithStatement>();
    this.expect(Token.WITH);
    this.expect(Token.LPAREN);
    node.Expression = this.parseExpression();
    this.expect(Token.RPAREN);
    node.Statement = this.parseStatement();
    return this.finishNode(node, 'WithStatement');
  }

  // ThrowStatement :
  //   `throw` [no LineTerminator here] Expression `;`
  parseThrowStatement(): ParseNode.ThrowStatement {
    const node = this.startNode<ParseNode.ThrowStatement>();
    this.expect(Token.THROW);
    if (this.peek().hadLineTerminatorBefore) {
      this.raise('NewlineAfterThrow', node);
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
  parseTryStatement(): ParseNode.TryStatement {
    const node = this.startNode<ParseNode.TryStatement>();
    this.expect(Token.TRY);
    node.Block = this.parseBlock();
    if (this.eat(Token.CATCH)) {
      this.scope.with({ lexical: true }, () => {
        const clause = this.startNode<ParseNode.Catch>();
        if (this.eat(Token.LPAREN)) {
          switch (this.peek().type) {
            case Token.LBRACE:
            case Token.LBRACK:
              clause.CatchParameter = this.parseBindingPattern();
              break;
            default:
              clause.CatchParameter = this.parseBindingIdentifier();
              break;
          }
          this.scope.declare(clause.CatchParameter, 'lexical');
          this.expect(Token.RPAREN);
        } else {
          clause.CatchParameter = null;
        }
        clause.Block = this.parseBlock(false);
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
      this.raise('TryMissingCatchOrFinally');
    }
    return this.finishNode(node, 'TryStatement');
  }

  // DebuggerStatement : `debugger` `;`
  parseDebuggerStatement(): ParseNode.DebuggerStatement {
    const node = this.startNode<ParseNode.DebuggerStatement>();
    this.expect(Token.DEBUGGER);
    this.semicolon();
    return this.finishNode(node, 'DebuggerStatement');
  }

  // ExpressionStatement :
  //   [lookahead != `{`, `function`, `async` [no LineTerminator here] `function`, `class`, `let` `[` ] Expression `;`
  parseExpressionStatement(): ParseNode.ExpressionStatement | ParseNode.LabelledStatement {
    switch (this.peek().type) {
      case Token.LBRACE:
      case Token.FUNCTION:
      case Token.CLASS:
        this.unexpected();
        break;
      default:
        if (this.test('async') && this.testAhead(Token.FUNCTION) && !this.peekAhead().hadLineTerminatorBefore) {
          this.unexpected();
        }
        if (this.test('let') && this.testAhead(Token.LBRACK)) {
          this.unexpected();
        }
        break;
    }
    const startToken = this.peek();
    const node = this.startNode<ParseNode.ExpressionStatement | ParseNode.LabelledStatement>();
    const expression = this.parseExpression();
    if (expression.type === 'IdentifierReference' && this.eat(Token.COLON)) {
      const LabelIdentifier = this.repurpose(expression, 'LabelIdentifier');
      node.LabelIdentifier = LabelIdentifier;

      if (this.scope.labels.find((l) => l.name === LabelIdentifier.name)) {
        this.raiseEarly('AlreadyDeclared', node.LabelIdentifier, node.LabelIdentifier.name);
      }
      let type = null;
      switch (this.peek().type) {
        case Token.SWITCH:
          type = 'switch';
          break;
        case Token.DO:
        case Token.WHILE:
        case Token.FOR:
          type = 'loop';
          break;
        default:
          break;
      }
      if (type !== null && this.scope.labels.length > 0) {
        const last = this.scope.labels[this.scope.labels.length - 1];
        if (last.nextToken === startToken) {
          last.type = type;
        }
      }
      this.scope.labels.push({
        name: node.LabelIdentifier.name,
        type,
        nextToken: type === null ? this.peek() : null,
      });

      node.LabelledItem = this.parseStatement();

      this.scope.labels.pop();

      return this.finishNode(node, 'LabelledStatement');
    }
    node.Expression = expression;
    this.semicolon();
    return this.finishNode(node, 'ExpressionStatement');
  }
}
