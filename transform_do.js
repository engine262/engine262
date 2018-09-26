'use strict';

const { relative, resolve } = require('path');

const COMPLETION_PATH = resolve('./src/completion.mjs');
const NOTATIONAL_CONVENTIONS_PATH = resolve('./src/abstract-ops/all.mjs');

module.exports = ({ types: t, template }) => {
  return {
    visitor: {
      Program: {
        enter(path, state) {
          if (state.file.opts.filename === COMPLETION_PATH) {
            return;
          }
          state.foundCompletion = false;
          state.needCompletion = false;
          state.foundAssert = false;
          state.needAssert = false;
        },
        exit(path, state) {
          if (!state.foundCompletion && state.needCompletion) {
            const r = relative(state.file.opts.filename, COMPLETION_PATH).replace('../', './');
            path.node.body.unshift(t.ImportDeclaration([
              t.ImportSpecifier(t.Identifier('Completion'), t.Identifier('Completion')),
              t.ImportSpecifier(t.Identifier('AbruptCompletion'), t.Identifier('AbruptCompletion')),
            ], t.Literal(r)));
          }
          if (!state.foundAssert && state.needAssert) {
            const r = relative(state.file.opts.filename, NOTATIONAL_CONVENTIONS_PATH).replace('../', './');
            path.node.body.unshift(t.ImportDeclaration([
              t.ImportSpecifier(t.Identifier('Assert'), t.Identifier('Assert')),
            ], t.StringLiteral(r)));
          }
        },
      },
      ImportDeclaration(path, state) {
        if (path.node.source.value.endsWith('completion.mjs')) {
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
        } else if (path.node.source.value.endsWith('abstract-ops/all.mjs')
            || (state.file.opts.filename.includes('abstract-ops') && path.node.source.value === './all.mjs')) {
          if (state.file.opts.filename.endsWith('api.mjs')) {
            return;
          }
          state.foundAssert = true;
          if (!path.node.specifiers.find((s) => s.local.name === 'Assert')) {
            path.node.specifiers.push(
              t.ImportSpecifier(t.Identifier('Assert'), t.Identifier('Assert')),
            );
          }
        }
      },
      CallExpression(path, state) {
        if (!t.isIdentifier(path.node.callee)) {
          return;
        }
        if (path.node.callee.name === 'Q' || path.node.callee.name === 'ReturnIfAbrupt') {
          const [argument] = path.node.arguments;

          if (t.isReturnStatement(path.parentPath)) {
            path.replaceWith(argument);
            return;
          }

          state.needCompletion = true;

          if (t.isIdentifier(argument)) {
            path.replaceWith(t.DoExpression(t.BlockStatement([
              t.IfStatement(
                t.BinaryExpression('instanceof', argument, t.Identifier('AbruptCompletion')),
                t.ReturnStatement(argument),
                t.IfStatement(
                  t.BinaryExpression('instanceof', argument, t.Identifier('Completion')),
                  t.ExpressionStatement(
                    t.AssignmentExpression('=', argument, t.MemberExpression(argument, t.Identifier('Value'))),
                  ),
                  t.ExpressionStatement(argument),
                ),
              ),
            ])));
          } else {
            const hygenicTemp = path.scope.generateUidIdentifier('hygenicTemp');
            path.replaceWith(t.DoExpression(t.BlockStatement([
              t.VariableDeclaration('const', [
                t.VariableDeclarator(hygenicTemp, argument),
              ]),
              t.IfStatement(
                t.BinaryExpression('instanceof', hygenicTemp, t.Identifier('AbruptCompletion')),
                t.ReturnStatement(hygenicTemp),
                t.IfStatement(
                  t.BinaryExpression('instanceof', hygenicTemp, t.Identifier('Completion')),
                  t.ExpressionStatement(
                    t.MemberExpression(hygenicTemp, t.Identifier('Value')),
                  ),
                  t.ExpressionStatement(hygenicTemp),
                ),
              ),
            ])));
          }
        } else if (path.node.callee.name === 'X') {
          state.needCompletion = true;
          state.needAssert = true;

          const [argument] = path.node.arguments;

          const hygenicTemp = path.scope.generateUidIdentifier('hygenicTemp');
          path.replaceWith(t.DoExpression(t.BlockStatement([
            t.VariableDeclaration('const', [
              t.VariableDeclarator(hygenicTemp, argument),
            ]),
            t.ExpressionStatement(t.CallExpression(
              t.Identifier('Assert'), [
                t.UnaryExpression('!', t.BinaryExpression(
                  'instanceof',
                  hygenicTemp,
                  t.Identifier('AbruptCompletion'),
                )),
              ],
            )),
            t.IfStatement(
              t.BinaryExpression('instanceof', hygenicTemp, t.Identifier('Completion')),
              t.ExpressionStatement(
                t.MemberExpression(hygenicTemp, t.Identifier('Value')),
              ),
              t.ExpressionStatement(hygenicTemp),
            ),
          ])));
        } else if (path.node.callee.name === 'IfAbruptRejectPromise') {
          // stuff
        } else if (path.node.callee.name === 'Assert') {
          path.node.arguments.push(t.stringLiteral(path.get('arguments')[0].getSource()));
        }
      },
    },
  };
};
