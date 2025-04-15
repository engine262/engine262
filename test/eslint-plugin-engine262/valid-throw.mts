import fs from 'fs';
import path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as acorn from 'acorn';
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';

const __dirname = import.meta.dirname;

function isThrowCall(node: ESTree.CallExpression) {
  return node.callee.type === 'MemberExpression'
    && node.callee.computed === false
    && node.callee.object.type === 'Identifier'
    && node.callee.object.name === 'surroundingAgent'
    && node.callee.property.type === 'Identifier'
    && node.callee.property.name === 'Throw';
}

function isRaiseCall(node: ESTree.CallExpression) {
  return node.callee.type === 'MemberExpression'
    && node.callee.computed === false
    && node.callee.object.type === 'ThisExpression'
    && node.callee.property.type === 'Identifier'
    && (
      node.callee.property.name === 'raiseEarly'
      || node.callee.property.name === 'raise'
    );
}

const templates: Record<string, number> = {};

{
  let sourceDir;
  if (__dirname.includes('node_modules')) {
    sourceDir = __dirname.slice(0, __dirname.indexOf('node_modules'));
  } else {
    sourceDir = path.resolve(__dirname, '../..');
  }
  const source = fs.readFileSync(path.join(sourceDir, 'src/messages.mts'), 'utf8');
  const ast = acorn.parse(source, { ecmaVersion: 2020, sourceType: 'module' });

  ast.body.forEach((n) => {
    if (n.type !== 'ExportNamedDeclaration') {
      return;
    }
    const [v] = (n.declaration as acorn.VariableDeclaration).declarations;
    const name = (v.id as acorn.Identifier).name;
    const length = (v.init as acorn.Function).params.length;
    templates[name] = length;
  });
}

function report(context: Rule.RuleContext, node: ESTree.Node, message: string) {
  return context.report({ node, message });
}

export default {
  create(context) {
    return {
      CallExpression(node) {
        let template;
        let templateArgs;
        if (isThrowCall(node)) {
          if (node.arguments.length === 1 && node.arguments[0].type !== 'Literal') {
            return;
          }
          let type;
          ([type, template, ...templateArgs] = node.arguments);
          if (!type || type.type !== 'Literal') {
            report(context, node, 'Throw must use a valid error constructor');
            return;
          }
        } else if (isRaiseCall(node)) {
          ([template,, ...templateArgs] = node.arguments);
        } else {
          return;
        }
        if (!template || template.type !== 'Literal') {
          report(context, node, 'Throw must use a valid message template');
          return;
        }
        const tfn = templates[template.value as string];
        if (tfn === undefined) {
          report(context, template, `'${template.value}' is not a valid message template`);
          return;
        }
        if (tfn !== templateArgs.length) {
          report(context, node, `Template expects ${tfn} args`);
        }
      },
    };
  },
} satisfies Rule.RuleModule;
