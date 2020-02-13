'use strict';

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

function isThrowCall(node) {
  return node.callee.type === 'MemberExpression'
    && node.callee.computed === false
    && node.callee.object.type === 'Identifier'
    && node.callee.object.name === 'surroundingAgent'
    && node.callee.property.type === 'Identifier'
    && node.callee.property.name === 'Throw';
}

const templates = {};

{
  const source = fs.readFileSync(path.join(__dirname, '../../src/messages.mjs'), 'utf8');
  const ast = acorn.parse(source, { ecmaVersion: 2020, sourceType: 'module' });

  ast.body.forEach((n) => {
    if (n.type !== 'ExportNamedDeclaration') {
      return;
    }
    const [v] = n.declaration.declarations;
    const name = v.id.name;
    const length = v.init.params.length;
    templates[name] = length;
  });
}

module.exports = {
  create(context) {
    return {
      CallExpression(node) {
        if (!isThrowCall(node)) {
          return;
        }
        if (node.arguments.length === 1 && node.arguments[0].type !== 'Literal') {
          return;
        }
        const [type, template, ...templateArgs] = node.arguments;
        if (!type || type.type !== 'Literal') {
          context.report(node, 'Throw must use a valid error constructor');
          return;
        }
        if (!template || template.type !== 'Literal') {
          context.report(node, 'Throw must use a valid message template');
          return;
        }
        const tfn = templates[template.value];
        if (tfn === undefined) {
          context.report(template, `'${template.value}' is not a valid message template`);
          return;
        }
        if (tfn !== templateArgs.length) {
          context.report(node, `Template expects ${tfn.length} args`);
        }
      },
    };
  },
};
