const path = require('path');

const COMPLETION_PATH = path.resolve('./src/completion.js');

module.exports = ({ types: t }) => {
  const C = (state) => {
    const r = path.relative(state.file.opts.filename, COMPLETION_PATH).replace('../', './');
    return {
      Completion: t.MemberExpression(
        t.CallExpression(
          t.Identifier('require'),
          [t.StringLiteral(r)],
        ),
        t.Identifier('Completion'),
      ),
      AbruptCompletion: t.MemberExpression(
        t.CallExpression(
          t.Identifier('require'),
          [t.StringLiteral(r)],
        ),
        t.Identifier('AbruptCompletion'),
      ),
    };
  };

  return {
    visitor: {
      CallExpression(path, state) {
        if (path.node.callee.name === 'Q' || path.node.callee.name === 'ReturnIfAbrupt') {
          const { Completion, AbruptCompletion } = C(state);
          const [argument] = path.node.arguments;
          if (t.isCallExpression(argument)) {
            // ReturnIfAbrupt(AbstractOperation())
            const hygenicTemp = path.scope.generateUidIdentifier('hygenicTemp');
            path.replaceWith(t.DoExpression(t.BlockStatement([
              t.VariableDeclaration('const', [
                t.VariableDeclarator(hygenicTemp, argument),
              ]),
              t.IfStatement(
                t.BinaryExpression('instanceof', hygenicTemp, AbruptCompletion),
                t.ReturnStatement(hygenicTemp),
              ),
              t.IfStatement(
                t.BinaryExpression('instanceof', hygenicTemp, Completion),
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
                t.BinaryExpression('instanceof', argument, AbruptCompletion),
                t.ReturnStatement(argument),
                t.ifStatement(
                  t.BinaryExpression('instanceof', argument, Completion),
                  t.ExpressionStatement(
                    t.MemberExpression(argument, t.Identifier('Value')),
                  ),
                  t.ExpressionStatement(argument),
                ),
              ),
            ])));
          }
        } else if (path.node.callee.name === 'X') {
          const { Completion, AbruptCompletion } = C(state);
          const [argument] = path.node.arguments;
          const val = path.scope.generateUidIdentifier('val');
          path.replaceWith(t.DoExpression(t.BlockStatement([
            t.VariableDeclaration('const', [
              t.VariableDeclarator(val, argument),
            ]),
            t.IfStatement(
              t.BinaryExpression('instanceof', val, AbruptCompletion),
              t.ThrowStatement(
                t.NewExpression(t.Identifier('Error'), [
                  t.StringLiteral('AssertionError'),
                ]),
              ),
            ),
            t.IfStatement(
              t.BinaryExpression('instanceof', val, Completion),
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
