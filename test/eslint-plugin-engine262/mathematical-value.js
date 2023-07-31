'use strict';

const path = require('node:path');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    fixable: 'code',
    hasSuggestions: true,
  },
  create(context) {
    /**
     * @typedef {import('estree').CallExpression & { callee: import('estree').MemberExpression & { computed: false, property: import('estree').Identifier } }} FixableCallExpression
     */

    /** @type {{ node: FixableCallExpression, fixable: boolean, reachable: boolean, name: string }[] | undefined} */
    let needsImportForR;
    /** @type {import('estree').ImportSpecifier[]} */
    let importSpecifiersForR;
    /** @type {import('estree').ImportDeclaration | undefined} */
    let importForAllModule;
    /** @type {import('estree').ImportDeclaration | undefined} */
    let importForSpecTypesModule;
    /** @type {import('estree').ImportDeclaration | undefined} */
    let lastImport;
    const pathToAbstractOps = `${path.resolve(context.cwd, 'src/abstract-ops').replaceAll('\\', '/')}/`;
    const pathToSpecTypesModule = path.resolve(pathToAbstractOps, 'spec-types.mjs').replaceAll('\\', '/');
    const pathToAllModule = path.resolve(pathToAbstractOps, 'all.mjs').replaceAll('\\', '/');

    return {
      Program() {
        needsImportForR = [];
        importSpecifiersForR = [];
        importForAllModule = undefined;
        importForSpecTypesModule = undefined;
        lastImport = undefined;
      },
      'Program:exit': function Program_exit(node) {
        for (const importName of ['R', 'MathematicalValue']) {
          const needsImportForRNonFixable = needsImportForR.filter((entry) => !entry.fixable && entry.reachable && entry.name === importName);
          if (needsImportForRNonFixable.length) {
            // If some calls aren't fixable and there are no imports of 'R', report the need to import 'R'.
            // Include a fix, if possible.
            const importNamePart = importName === 'R' ? 'R' : `R (imported as ${importName})`;
            const importSpecifier = importName === 'R' ? 'R' : `R as ${importName}`;
            const fixable = !lookup(context.sourceCode.getScope(node), importName);
            /** @type {import('eslint').Rule.ReportFixer} */
            const fix = function* fix(fixer) {
              if (importForSpecTypesModule) {
                const last = importForSpecTypesModule.specifiers.at(-1);
                yield fixer.insertTextAfter(last, `, ${importSpecifier}`);
              } else if (importForAllModule) {
                const last = importForAllModule.specifiers.at(-1);
                yield fixer.insertTextAfter(last, `, ${importSpecifier}`);
              } else {
                const filename = path.resolve(context.filename).replaceAll('\\', '/');
                let relativePath;
                if (filename.startsWith(pathToAbstractOps)) {
                  relativePath = path.relative(path.dirname(filename), pathToSpecTypesModule).replaceAll('\\', '/');
                } else {
                  relativePath = path.relative(path.dirname(filename), pathToAllModule).replaceAll('\\', '/');
                }
                if (!path.isAbsolute(relativePath)
                  && !relativePath.startsWith('../')
                  && !relativePath.startsWith('./')) {
                  relativePath = `./${relativePath}`;
                }
                if (lastImport) {
                  yield fixer.insertTextAfter(lastImport, `\nimport { ${importSpecifier} } from ${JSON.stringify(relativePath)};`);
                } else {
                  yield fixer.insertTextAfterRange([0, 0], `import { ${importSpecifier} } from ${JSON.stringify(relativePath)};\n`);
                }
              }
            };

            context.report({
              node: needsImportForRNonFixable[0].node,
              message: `Import ${importNamePart} to convert mathematical values`,
              fix: fixable ? fix : undefined,
            });
          }
        }

        for (const { node: callNode, fixable, name } of needsImportForR) {
          /** @type {import('eslint').Rule.ReportFixer} */
          const fix = function* fix(fixer) {
            //    foo.numberValue()
            // -> foo
            yield fixer.removeRange([callNode.callee.object.range[1], callNode.range[1]]);

            //    foo
            // -> R(foo)
            yield fixer.insertTextBefore(callNode, `${name}(`);
            yield fixer.insertTextAfter(callNode, ')');
          };

          // Report the need to use 'R'. Include a fix, if possible.
          const namePart = name === 'R' ? 'R' : `R (imported as ${name})`;
          const methodNamePart = callNode.callee.property.name;
          context.report({
            node: callNode.callee,
            message: `Use ${namePart}, not .${methodNamePart}(), to get a mathematical value`,
            fix: fixable ? fix : undefined,
          });
        }
      },
      ImportDeclaration(node) {
        lastImport = node;
        switch (isImportOfRModule(node)) {
          case 'spec-types':
            importForSpecTypesModule ??= node;
            break;
          case 'all':
            importForAllModule ??= node;
            break;
          default:
            break;
        }
      },
      ImportSpecifier(node) {
        if (isImportOfR(node)) {
          importSpecifiersForR.push(node);
        }
      },
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression'
          && node.callee.computed === false
          && node.callee.property.type === 'Identifier') {
          if (node.callee.property.name === 'numberValue'
            || node.callee.property.name === 'bigintValue') {
            const { fixable, reachable, name } = getUsableReferenceToR(context.sourceCode.getScope(node));
            needsImportForR.push({
              node, fixable, reachable, name,
            });
          }
        }
      },
    };

    /**
     * @param {import('eslint').Scope.Scope} scope
     */
    function lookup(scope, name) {
      while (scope) {
        const v = scope.set.get(name);
        if (v) {
          return v;
        }
        scope = scope.upper;
      }
      return undefined;
    }

    /**
     * @param {import('estree').ImportDeclaration} node
     */
    function isImportOfRModule(node) {
      if (!node.specifiers.length) {
        // `import {} from ...` not currently usable
      }
      if (node.specifiers.length && node.specifiers[0].type === 'ImportNamespaceSpecifier') {
        // `import * as ns from ...` not currently usable
        return false;
      }
      if (node.specifiers.length && node.specifiers[0].type === 'ImportDefaultSpecifier') {
        // `import X from ...` and `import X, {} from ...` not currently usable
        return false;
      }
      const importPath = path.resolve(path.dirname(context.filename), node.source.value).replaceAll('\\', '/');
      if (importPath === pathToAllModule) {
        return 'all';
      } else if (importPath === pathToSpecTypesModule) {
        return 'spec-types';
      }
      return false;
    }

    /**
     * @param {import('estree').ImportSpecifier & import('eslint').Rule.NodeParentExtension} node
     */
    function isImportOfR(node) {
      if (node.imported.name === 'R'
        && node.parent.type === 'ImportDeclaration') {
        return !!isImportOfRModule(node.parent);
      }
      return false;
    }

    /**
     * @param {import('eslint').Scope.Scope} scope
     */
    function getUsableReferenceToR(scope) {
      let candidate;
      for (const spec of importSpecifiersForR) {
        const varDecl = lookup(scope, spec.local.name);
        if (varDecl?.defs.some((def) => def.type === 'ImportBinding' && def.node === spec)) {
          if (spec.local.name === 'R') {
            // prefer 'R' if it is found
            return { fixable: true, reachable: true, name: spec.local.name };
          }
          if (spec.local.name === 'MathematicalValue') {
            candidate = 'MathematicalValue';
          } else {
            candidate ??= spec.local.name;
          }
        }
      }

      // if we found a candidate, return it
      if (candidate) {
        return { fixable: true, reachable: true, name: candidate };
      }

      // if no imports were found, try R
      if (!lookup(scope, 'R')) {
        return { fixable: false, reachable: true, name: 'R' };
      }

      // if R isn't reachable, try MathematicalValue
      if (!lookup(scope, 'MathematicalValue')) {
        return { fixable: false, reachable: true, name: 'MathematicalValue' };
      }

      // no imports were found or usable
      return { fixable: false, reachable: false, name: 'R' };
    }
  },
};
