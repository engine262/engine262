'use strict';

const { relative, resolve } = require('path');

const COMPLETION_PATH = resolve('./src/completion.mjs');
const NOTATIONAL_CONVENTIONS_PATH = resolve('./src/abstract-ops/all.mjs');

module.exports = ({ types: t, template }) => ({
  visitor: {
    Program: {
      enter(path, state) {
        if (state.file.opts.filename === COMPLETION_PATH) {
          return;
        }
        state.foundCompletion = false;
        state.needCompletion = false;
        state.foundAssertOrCall = false;
        state.needAssertOrCall = false;
      },
      exit(path, state) {
        if (!state.foundCompletion && state.needCompletion && !state.file.opts.filename.endsWith('completion.mjs')) {
          const r = relative(state.file.opts.filename, COMPLETION_PATH).replace('../', './');
          path.node.body.unshift(t.ImportDeclaration([
            t.ImportSpecifier(t.Identifier('Completion'), t.Identifier('Completion')),
            t.ImportSpecifier(t.Identifier('AbruptCompletion'), t.Identifier('AbruptCompletion')),
          ], t.StringLiteral(r)));
        }
        if (!state.foundAssertOrCall && state.needAssertOrCall) {
          const r = relative(state.file.opts.filename, NOTATIONAL_CONVENTIONS_PATH).replace('../', './');
          path.node.body.unshift(t.ImportDeclaration([
            t.ImportSpecifier(t.Identifier('Assert'), t.Identifier('Assert')),
            t.ImportSpecifier(t.Identifier('Call'), t.Identifier('Call')),
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
        state.foundAssertOrCall = true;
        if (!path.node.specifiers.find((s) => s.local.name === 'Assert')) {
          path.node.specifiers.push(
            t.ImportSpecifier(t.Identifier('Assert'), t.Identifier('Assert')),
          );
        }
        if (!state.file.opts.filename.endsWith('object-operations.mjs')
            && !path.node.specifiers.find((s) => s.local.name === 'Call')) {
          path.node.specifiers.push(
            t.ImportSpecifier(t.Identifier('Call'), t.Identifier('Call')),
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
          const binding = path.scope.getBinding(argument.name);
          binding.path.parent.kind = 'let';
          path.replaceWith(template(`
          (do {
            if (ARGUMENT instanceof AbruptCompletion) {
              return ARGUMENT;
            } else if (ARGUMENT instanceof Completion) {
              ARGUMENT = ARGUMENT.Value;
            } else {
              ARGUMENT;
            }
          });
          `, { plugins: ['doExpressions'] })({ ARGUMENT: argument }));
        } else {
          const hygenicTemp = path.scope.generateUidIdentifier('hygenicTemp');
          path.replaceWith(template(`
          (do {
            const HYGENIC_TEMP = ARGUMENT;
            if (HYGENIC_TEMP instanceof AbruptCompletion) {
              return HYGENIC_TEMP;
            } else if (HYGENIC_TEMP instanceof Completion) {
              HYGENIC_TEMP.Value;
            } else {
              HYGENIC_TEMP;
            }
          });
          `, { plugins: ['doExpressions'] })({ HYGENIC_TEMP: hygenicTemp, ARGUMENT: argument }));
        }
      } else if (path.node.callee.name === 'X') {
        state.needCompletion = true;
        state.needAssertOrCall = true;

        const [argument] = path.node.arguments;
        const val = path.scope.generateUidIdentifier('val');

        path.replaceWith(template(`
        (do {
          const VAL = ARGUMENT;
          Assert(!(VAL instanceof AbruptCompletion), "!(VAL instanceof AbruptCompletion)");
          if (VAL instanceof Completion) {
            VAL.Value;
          } else {
            VAL;
          }
        });
        `, { plugins: ['doExpressions'] })({ VAL: val, ARGUMENT: argument }));
      } else if (path.node.callee.name === 'IfAbruptRejectPromise') {
        state.needCompletion = true;
        state.needAssertOrCall = true;

        const [value, capability] = path.node.arguments;

        const binding = path.scope.getBinding(value.name);
        binding.path.parent.kind = 'let';

        const hygenicTemp = path.scope.generateUidIdentifier('hygenicTemp');

        path.replaceWith(template(`
        if (VALUE instanceof AbruptCompletion) {
          const HYGENIC_TEMP = Call(CAPABILITY.Reject, Value.undefined, [VALUE.Value]);
          if (HYGENIC_TEMP instanceof AbruptCompletion) {
            return HYGENIC_TEMP;
          }
          return CAPABILITY.Promise;
        } else if (VALUE instanceof Completion) {
          VALUE = VALUE.Value;
        }
        `)({ VALUE: value, CAPABILITY: capability, HYGENIC_TEMP: hygenicTemp }));
      } else if (path.node.callee.name === 'Assert') {
        path.node.arguments.push(t.stringLiteral(path.get('arguments')[0].getSource()));
      }
    },
  },
});
