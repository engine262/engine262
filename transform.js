'use strict';

const path = require('path');
const COMPLETION_PATH = path.resolve('./src/completion.mjs');

module.exports = ({ types: t, template }) => {
  function createImportCompletion(file) {
    const r = path.relative(file.opts.filename, COMPLETION_PATH).replace('../', './');
    return template.ast(`
      import { Completion, AbruptCompletion } from "${r}";
    `);
  }

  return {
    visitor: {
      Program: {
        enter(path, state) {
          if (state.file.opts.filename === COMPLETION_PATH) {
            return;
          }
          state.foundCompletion = false;
          state.needCompletion = false;
        },
        exit(path, state) {
          if (!state.foundCompletion && state.needCompletion) {
            path.node.body.unshift(createImportCompletion(state.file));
          }
        },
      },
      ImportDeclaration(path, state) {
        if (path.node.source.value.endsWith('completion')) {
          state.foundCompletion = true;
          if (!path.node.specifiers.find((s) => s.local.name === 'Completion')) {
            path.node.specifiers.push(
              t.ImportSpecifier(t.Identifier('Completion'), t.Identifier('Completion')),
            );
          }
          if (!path.node.specifiers.find((s) => s.local.name === 'AbruptCompletion')) {
            path.node.specifiers.push(
              t.ImportSpecifier(t.Identifier('AbruptCompletion'), t.Identifier('AbruptCompletion')),
            );
          }
        }
      },
      CallExpression(path, state) {
        if (path.node.callee.name === 'Q' || path.node.callee.name === 'ReturnIfAbrupt') {
          state.needCompletion = true;
          const [argument] = path.node.arguments;
          if (t.isCallExpression(argument)) {
            // ReturnIfAbrupt(AbstractOperation())
            const hygenicTemp = path.scope.generateUidIdentifier('hygenicTemp');
            path.replaceWith(t.DoExpression(t.BlockStatement([
              t.VariableDeclaration('const', [
                t.VariableDeclarator(hygenicTemp, argument),
              ]),
              t.IfStatement(
                t.BinaryExpression('instanceof', hygenicTemp, t.Identifier('AbruptCompletion')),
                t.ReturnStatement(hygenicTemp),
              ),
              t.IfStatement(
                t.BinaryExpression('instanceof', hygenicTemp, t.Identifier('Completion')),
                t.ExpressionStatement(
                  t.MemberExpression(hygenicTemp, t.Identifier('Value')),
                ),
                t.ExpressionStatement(hygenicTemp),
              ),
            ])));
          } else {
            // ReturnIfAbrupt(argument);
            path.replaceWith(t.DoExpression(t.BlockStatement([
              t.IfStatement(
                t.BinaryExpression('instanceof', argument, t.Identifier('AbruptCompletion')),
                t.ReturnStatement(argument),
                t.ifStatement(
                  t.BinaryExpression('instanceof', argument, t.Identifier('Completion')),
                  t.ExpressionStatement(
                    t.MemberExpression(argument, t.Identifier('Value')),
                  ),
                  t.ExpressionStatement(argument),
                ),
              ),
            ])));
          }
        } else if (path.node.callee.name === 'X') {
          state.needCompletion = true;
          const [argument] = path.node.arguments;
          const val = path.scope.generateUidIdentifier('val');
          path.replaceWith(t.DoExpression(t.BlockStatement([
            t.VariableDeclaration('const', [
              t.VariableDeclarator(val, argument),
            ]),
            t.IfStatement(
              t.BinaryExpression('instanceof', val, t.Identifier('AbruptCompletion')),
              t.ThrowStatement(
                t.NewExpression(t.Identifier('Error'), [
                  t.StringLiteral('AssertionError'),
                ]),
              ),
            ),
            t.IfStatement(
              t.BinaryExpression('instanceof', val, t.Identifier('Completion')),
              t.ExpressionStatement(
                t.MemberExpression(val, t.Identifier('Value')),
              ),
              t.ExpressionStatement(val),
            ),
          ])));
        }
      },
    },
  };
};
