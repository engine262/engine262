const path = require('path');
const COMPLETION_PATH = path.resolve('./src/completion.mjs');

module.exports = ({ types: t }) => {
  const C = (state) => {
    const r = path.relative(state.file.opts.filename, COMPLETION_PATH).replace('../', './');
    return t.ImportDeclaration([
      t.ImportSpecifier(t.Identifier('Completion'), t.Identifier('Completion')),
      t.ImportSpecifier(t.Identifier('AbruptCompletion'), t.Identifier('AbruptCompletion')),
    ], t.StringLiteral(r));
  };

  return {
    visitor: {
      Program(path, state) {
        if (state.file.opts.filename === COMPLETION_PATH) {
          return;
        }
        let found = false;
        path.traverse({
          ImportDeclaration(path) {
            if (path.node.source.value.includes('completion')) {
              found = true;
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
        });
        if (!found) {
          path.node.body.unshift(C(state));
        }
      },
      CallExpression(path) {
        if (path.node.callee.name === 'Q' || path.node.callee.name === 'ReturnIfAbrupt') {
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
