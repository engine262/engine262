import type { Rule } from 'eslint';
import ts from 'typescript';
import { isGCRelevant } from '@engine262/babel-compiler';
import { getParserServices } from './utils.mjs';

const rule = {
  meta: {
    messages: {
      missingMark: '{{name}} contains GC references and must implement mark(trace).',
      missingField: 'mark(trace) does not trace GC-relevant field {{name}}.',
      missingSuper: 'mark(trace) must call super.mark(trace) for GC-relevant base fields.',
    },
  },
  create(context) {
    const services = getParserServices(context, 'gc-mark-complete');
    const checker = services.program.getTypeChecker();
    return {
      ClassDeclaration(node) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const declaration = services.esTreeNodeToTSNodeMap.get(node as any);
        if (!ts.isClassDeclaration(declaration)) return;
        if (declaration.getSourceFile().fileName.endsWith('/src/gc.mts')) return;
        const reportNode: Rule.Node = declaration.name
          ? services.tsNodeToESTreeNodeMap.get(declaration.name) as Rule.Node
          : node;
        const fields: string[] = [];
        for (const member of declaration.members) {
          if (!ts.isPropertyDeclaration(member)) continue;
          if (member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword)) continue;
          if (member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.OverrideKeyword)) continue;
          if (!member.name || checker.typeToString(checker.getTypeAtLocation(member)).startsWith('WeakSet<')) continue;
          if (!isGCRelevant(checker.getTypeAtLocation(member), checker)) continue;
          const name = fieldNameOf(member.name);
          if (name !== undefined) fields.push(name);
        }
        const classSymbol = declaration.name && checker.getSymbolAtLocation(declaration.name);
        const classType = classSymbol
          ? checker.getDeclaredTypeOfSymbol(classSymbol)
          : checker.getTypeAtLocation(declaration);
        const baseRelevant = getBaseTypes(classType, checker)
          .some((base) => base.getProperties().some((property) => {
            const value = property.valueDeclaration ?? property.declarations?.[0];
            return value ? isGCRelevant(checker.getTypeOfSymbolAtLocation(property, value), checker) : false;
          }));
        const mark = declaration.members.find((member): member is ts.MethodDeclaration => (
          ts.isMethodDeclaration(member) && fieldNameOf(member.name) === 'mark'
        ));
        if (!mark?.body) {
          context.report({
            node: reportNode,
            messageId: 'missingMark',
            data: { name: declaration.name?.text ?? '<anonymous>' },
          });
          return;
        }
        if (baseRelevant && !ifCalledSuperMark(mark.body)) {
          context.report({ node: reportNode, messageId: 'missingSuper' });
        }
        const tracedFields = fieldsTracedBy(mark);
        for (const name of fields) {
          if (!tracedFields.has(name)) {
            context.report({ node: reportNode, messageId: 'missingField', data: { name } });
          }
        }
      },
    } satisfies Rule.RuleListener;
  },
} satisfies Rule.RuleModule;

export default rule;

function fieldsTracedBy(mark: ts.MethodDeclaration): ReadonlySet<string> {
  const fields = new Set<string>();
  const traceName = mark.parameters[0]?.name;
  if (!traceName || !ts.isIdentifier(traceName) || !mark.body) return fields;
  const visit = (node: ts.Node) => {
    if (ts.isForOfStatement(node) && containsTraceCall(node.statement, traceName.text)) {
      const field = accessedThisFieldName(node.expression);
      if (field) fields.add(field);
    }
    if (ts.isCallExpression(node) && containsTraceCallInArguments(node, traceName.text)) {
      const field = accessedThisFieldName(node.expression);
      if (field) fields.add(field);
    }
    if (
      // Matches `trace.strong(...)`, `trace.weak(...)`, or `trace.ephemeron(...)`.
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === traceName.text
      && ['strong', 'weak', 'ephemeron'].includes(node.expression.name.text)
    ) {
      const collectField = (target: ts.Node) => {
        if (
          // Matches `this.value`.
          ts.isPropertyAccessExpression(target)
          && target.expression.kind === ts.SyntaxKind.ThisKeyword
        ) fields.add(target.name.text);
        if (
          // Matches `this.values[0]` or `this.values['key']`.
          ts.isElementAccessExpression(target)
          && target.expression.kind === ts.SyntaxKind.ThisKeyword
          && target.argumentExpression
          && (ts.isStringLiteral(target.argumentExpression) || ts.isNumericLiteral(target.argumentExpression))
        ) fields.add(target.argumentExpression.text);
        ts.forEachChild(target, collectField);
      };
      node.arguments.slice(1).forEach(collectField);
    }
    ts.forEachChild(node, visit);
  };
  visit(mark.body);
  return fields;
}

/**
 * this.value          => "value"
 * this.values[0]      => "values"
 * this.value.forEach  => "value"
 * this.value.map(...) => "value"
 */
function accessedThisFieldName(node: ts.Node): string | undefined {
  if (ts.isPropertyAccessExpression(node)) {
    if (node.expression.kind === ts.SyntaxKind.ThisKeyword) return node.name.text;
    return accessedThisFieldName(node.expression);
  }
  if (ts.isElementAccessExpression(node)) {
    if (
      // Matches `this.values[0]` or `this.values['key']`.
      node.expression.kind === ts.SyntaxKind.ThisKeyword
      && node.argumentExpression
      && (ts.isStringLiteral(node.argumentExpression) || ts.isNumericLiteral(node.argumentExpression))
    ) return node.argumentExpression.text;
    return accessedThisFieldName(node.expression);
  }
  if (ts.isCallExpression(node)) return accessedThisFieldName(node.expression);
  return undefined;
}

function containsTraceCallInArguments(call: ts.CallExpression, traceName: string): boolean {
  return call.arguments.some((argument) => containsTraceCall(argument, traceName));
}

function containsTraceCall(node: ts.Node, traceName: string): boolean {
  let found = false;
  const visit = (child: ts.Node) => {
    if (
      // Matches `trace.strong(...)`, `trace.weak(...)`, or `trace.ephemeron(...)`.
      ts.isCallExpression(child)
      && ts.isPropertyAccessExpression(child.expression)
      && ts.isIdentifier(child.expression.expression)
      && child.expression.expression.text === traceName
      && ['strong', 'weak', 'ephemeron'].includes(child.expression.name.text)
    ) found = true;
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function ifCalledSuperMark(body: ts.Block): boolean {
  let found = false;
  const visit = (node: ts.Node) => {
    if (
      // Matches `super.mark(...)`.
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.kind === ts.SyntaxKind.SuperKeyword
      && node.expression.name.text === 'mark'
    ) found = true;
    ts.forEachChild(node, visit);
  };
  visit(body);
  return found;
}

function getBaseTypes(type: ts.Type, checker: ts.TypeChecker): readonly ts.BaseType[] {
  if (
    type.flags & ts.TypeFlags.Object
    && (type as ts.ObjectType).objectFlags & ts.ObjectFlags.ClassOrInterface
  ) return checker.getBaseTypes(type as ts.InterfaceType);
  return [];
}

function fieldNameOf(name: ts.PropertyName | ts.BindingName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}
