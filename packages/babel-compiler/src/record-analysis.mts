import path from 'node:path';
import ts from 'typescript';

export interface RecordCreationPlan {
  readonly start: number;
  readonly end: number;
}

export type RecordClassDiagnosticKind =
  | 'classDecorator'
  | 'elementDecorator'
  | 'staticBlock'
  | 'fieldInitializer'
  | 'constructor'
  | 'constructorGuard'
  | 'fieldCopy'
  | 'visibility'
  | 'privateName'
  | 'extends';

export interface RecordClassInsertionFix {
  readonly kind: 'insertAfter';
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export interface RecordClassDiagnostic {
  readonly start: number;
  readonly end: number;
  readonly kind: RecordClassDiagnosticKind;
  readonly fix?: RecordClassInsertionFix;
}

export interface RecordClassAnalysisResult {
  readonly diagnostics: readonly RecordClassDiagnostic[];
}

const allowedClassDecorators = new Set(['callable', 'record']);

/** Analyzes every record class and returns syntax ranges and optional fixes for its structural violations. */
export function analyzeRecordClasses(
  fileName: string,
  program: ts.Program,
): RecordClassAnalysisResult {
  const sourceFile = findSourceFile(program, fileName);
  if (!sourceFile) {
    throw new Error(`@engine262/babel-compiler: ${fileName} is not part of the supplied TypeScript Program`);
  }
  const checker = program.getTypeChecker();
  const diagnostics: RecordClassDiagnostic[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isClassDeclaration(node) || ts.isClassExpression(node))
      && isRecordClass(node, checker)
    ) {
      diagnostics.push(...analyzeRecordClass(node, sourceFile));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { diagnostics };
}

export function analyzeRecordCreations(
  fileName: string,
  program: ts.Program,
): readonly RecordCreationPlan[] {
  const sourceFile = findSourceFile(program, fileName);
  if (!sourceFile) {
    throw new Error(`@engine262/babel-compiler: ${fileName} is not part of the supplied TypeScript Program`);
  }
  const checker = program.getTypeChecker();
  const plans: RecordCreationPlan[] = [];
  const visit = (node: ts.Node) => {
    // Matches `new Record({ value })` or `Record({ value })`.
    if (
      (ts.isCallExpression(node) || ts.isNewExpression(node))
      && node.arguments?.length === 1
      && recordClassForExpression(node.expression, checker)
    ) {
      plans.push({ start: node.getStart(sourceFile), end: node.getEnd() });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return plans;
}

function recordClassForExpression(
  expression: ts.Expression,
  checker: ts.TypeChecker,
): ts.ClassLikeDeclaration | undefined {
  let symbol = checker.getSymbolAtLocation(expression);
  const seen = new Set<ts.Symbol>();
  while (symbol?.flags && symbol.flags & ts.SymbolFlags.Alias && !seen.has(symbol)) {
    seen.add(symbol);
    symbol = checker.getAliasedSymbol(symbol);
  }
  for (const declaration of symbol?.declarations ?? []) {
    const classDeclaration = classFromDeclaration(declaration);
    if (classDeclaration && isRecordClass(classDeclaration, checker)) return classDeclaration;
  }
  return undefined;
}

function classFromDeclaration(declaration: ts.Declaration): ts.ClassLikeDeclaration | undefined {
  if (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration)) return declaration;
  if (
    // Matches `const Record = class { ... }`.
    ts.isVariableDeclaration(declaration)
    && declaration.initializer
    && ts.isClassExpression(declaration.initializer)
  ) return declaration.initializer;
  return undefined;
}

export function isRecordClass(
  declaration: ts.ClassLikeDeclaration,
  checker: ts.TypeChecker,
): boolean {
  if (classDecorators(declaration).some((decorator) => decoratorName(decorator) === 'record')) {
    return true;
  }
  return declaration.heritageClauses?.some((clause) => (
    clause.token === ts.SyntaxKind.ImplementsKeyword
    && clause.types.some((type) => isRecordProtocol(type, checker))
  )) === true;
}

function classDecorators(declaration: ts.ClassLikeDeclaration): readonly ts.Decorator[] {
  return ts.canHaveDecorators(declaration) ? ts.getDecorators(declaration) ?? [] : [];
}

function decoratorName(decorator: ts.Decorator): string | undefined {
  let expression = decorator.expression;
  // Matches `@record(...)`.
  if (ts.isCallExpression(expression)) expression = expression.expression;
  return ts.isIdentifier(expression) ? expression.text : undefined;
}

function isRecordProtocol(type: ts.ExpressionWithTypeArguments, checker: ts.TypeChecker): boolean {
  // Matches `implements record`.
  if (ts.isIdentifier(type.expression) && type.expression.text === 'record') return true;
  let symbol = checker.getSymbolAtLocation(type.expression);
  if (symbol?.flags && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  return symbol?.name === 'record';
}

/** Checks the complete structural contract for one class already identified as a record class. */
function analyzeRecordClass(
  declaration: ts.ClassLikeDeclaration,
  sourceFile: ts.SourceFile,
): readonly RecordClassDiagnostic[] {
  const diagnostics: RecordClassDiagnostic[] = [];
  const report = (
    target: ts.Node,
    kind: RecordClassDiagnosticKind,
    fix?: RecordClassInsertionFix,
  ) => {
    diagnostics.push({
      start: target.getStart(sourceFile),
      end: target.getEnd(),
      kind,
      fix,
    });
  };
  const reportKeyword = (
    target: ts.Node,
    keyword: string,
    kind: RecordClassDiagnosticKind,
    fix?: RecordClassInsertionFix,
  ) => {
    const start = target.getStart(sourceFile);
    diagnostics.push({ start, end: start + keyword.length, kind, fix });
  };

  for (const decorator of classDecorators(declaration)) {
    if (!allowedClassDecorators.has(decoratorName(decorator) ?? '')) {
      report(nameOfDecoratorExpression(decorator), 'classDecorator');
    }
  }
  for (const clause of declaration.heritageClauses ?? []) {
    if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
    for (const type of clause.types) {
      report(nameOfExpression(type.expression), 'extends');
    }
  }

  const fields: ts.PropertyDeclaration[] = [];
  let constructor: ts.ConstructorDeclaration | undefined;
  for (const member of declaration.members) {
    for (const decorator of decorators(member)) {
      report(nameOfDecoratorExpression(decorator), 'elementDecorator');
    }
    if (ts.isClassStaticBlockDeclaration(member)) {
      reportKeyword(member, 'static', 'staticBlock');
      continue;
    }
    if (member.name && ts.isPrivateIdentifier(member.name)) report(member.name, 'privateName');
    if (ts.isPropertyDeclaration(member)) {
      fields.push(member);
      if (member.initializer) report(member.initializer, 'fieldInitializer');
      const visibility = modifier(member, ts.SyntaxKind.PrivateKeyword)
        ?? modifier(member, ts.SyntaxKind.ProtectedKeyword);
      if (visibility) report(member.name, 'visibility');
    } else if (ts.isConstructorDeclaration(member)) {
      constructor = member;
    }
  }

  if (!constructor || constructor.parameters.length !== 1 || !ts.isIdentifier(constructor.parameters[0].name)) {
    if (constructor) reportKeyword(constructor, 'constructor', 'constructor');
    else report(declaration.name ?? declaration, 'constructor');
    return diagnostics;
  }

  const className = declaration.name?.text;
  const parameter = constructor.parameters[0].name.text;
  const statements = [...(constructor.body?.statements ?? [])];
  const hasGuard = className !== undefined
    && statements[0] !== undefined
    && isFinalClassGuard(statements[0], className);
  if (!hasGuard) {
    const body = constructor.body;
    reportKeyword(
      constructor,
      'constructor',
      'constructorGuard',
      className && body
        ? {
            kind: 'insertAfter',
            start: body.getStart(sourceFile),
            end: body.getStart(sourceFile) + 1,
            text: `${lineBreak(sourceFile)}${memberIndent(sourceFile, constructor)}${finalClassGuard(
              className,
              memberIndent(sourceFile, constructor),
              lineBreak(sourceFile),
            )}`,
          }
        : undefined,
    );
  }

  const fieldsByName = new Map<string, ts.PropertyDeclaration>();
  for (const field of fields) {
    if (ts.isIdentifier(field.name)) fieldsByName.set(field.name.text, field);
    else if (!ts.isPrivateIdentifier(field.name)) report(field.name, 'fieldCopy');
  }

  const copied = new Set<string>();
  for (const statement of statements.slice(hasGuard ? 1 : 0)) {
    const name = copiedFieldName(statement, parameter);
    if (name === undefined || !fieldsByName.has(name) || copied.has(name)) {
      report(statement, 'fieldCopy');
    } else {
      copied.add(name);
    }
  }
  for (const [name, field] of fieldsByName) {
    if (copied.has(name) || !constructor.body) continue;
    const lastStatement = constructor.body.statements.at(-1);
    const target = lastStatement ?? constructor.body;
    report(field.name, 'fieldCopy', {
      kind: 'insertAfter',
      start: target.getStart(sourceFile),
      end: lastStatement ? target.getEnd() : target.getStart(sourceFile) + 1,
      text: `${lineBreak(sourceFile)}${memberIndent(sourceFile, constructor)}this.${name} = ${parameter}.${name};`,
    });
  }
  return diagnostics;
}

function findSourceFile(program: ts.Program, fileName: string): ts.SourceFile | undefined {
  const normalized = normalize(fileName);
  return program.getSourceFiles().find((sourceFile) => normalize(sourceFile.fileName) === normalized);
}

function normalize(fileName: string): string {
  return path.resolve(fileName).replaceAll('\\', '/');
}

function decorators(node: ts.Node): readonly ts.Decorator[] {
  return ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
}

function nameOfDecoratorExpression(decorator: ts.Decorator): ts.Expression {
  const expression = ts.isCallExpression(decorator.expression)
    ? decorator.expression.expression
    : decorator.expression;
  return nameOfExpression(expression);
}

function nameOfExpression(expression: ts.Expression): ts.Expression {
  return ts.isPropertyAccessExpression(expression) ? expression.name : expression;
}

function modifier(node: ts.Node, kind: ts.SyntaxKind): ts.Modifier | undefined {
  return ts.canHaveModifiers(node) ? ts.getModifiers(node)?.find((item) => item.kind === kind) : undefined;
}

/** Matches the required final-class guard at the start of a record constructor. */
function isFinalClassGuard(statement: ts.Statement, className: string): boolean {
  if (!ts.isIfStatement(statement) || statement.elseStatement || !ts.isBinaryExpression(statement.expression)) {
    return false;
  }
  const { left, operatorToken, right } = statement.expression;
  if (
    operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken
    || !ts.isMetaProperty(left)
    || left.keywordToken !== ts.SyntaxKind.NewKeyword
    || left.name.text !== 'target'
    || !ts.isIdentifier(right)
    || right.text !== className
    || !ts.isBlock(statement.thenStatement)
    || statement.thenStatement.statements.length !== 1
  ) return false;
  const [throwStatement] = statement.thenStatement.statements;
  if (!ts.isThrowStatement(throwStatement) || !ts.isNewExpression(throwStatement.expression)) return false;
  const error = throwStatement.expression;
  return ts.isIdentifier(error.expression)
    && error.expression.text === 'TypeError'
    && error.arguments?.length === 1
    && ts.isStringLiteralLike(error.arguments[0]);
}

/** Returns the copied field name for an exact `this.name = parameter.name` statement. */
function copiedFieldName(statement: ts.Statement, parameter: string): string | undefined {
  if (!ts.isExpressionStatement(statement) || !ts.isBinaryExpression(statement.expression)) return undefined;
  const { left, operatorToken, right } = statement.expression;
  if (
    operatorToken.kind !== ts.SyntaxKind.EqualsToken
    || !ts.isPropertyAccessExpression(left)
    || left.expression.kind !== ts.SyntaxKind.ThisKeyword
    || !ts.isPropertyAccessExpression(right)
    || !ts.isIdentifier(right.expression)
    || right.expression.text !== parameter
    || left.name.text !== right.name.text
  ) return undefined;
  return left.name.text;
}

function finalClassGuard(className: string, indent: string, newline: string): string {
  return `if (new.target !== ${className}) {${newline}${indent}  throw new TypeError('${className} is a final class and cannot be subclassed');${newline}${indent}}`;
}

function memberIndent(sourceFile: ts.SourceFile, constructor: ts.ConstructorDeclaration): string {
  const start = constructor.getStart(sourceFile);
  const lineStart = sourceFile.text.lastIndexOf('\n', start - 1) + 1;
  return `${sourceFile.text.slice(lineStart, start).match(/^\s*/)?.[0] ?? ''}  `;
}

function lineBreak(sourceFile: ts.SourceFile): string {
  return sourceFile.text.includes('\r\n') ? '\r\n' : '\n';
}
