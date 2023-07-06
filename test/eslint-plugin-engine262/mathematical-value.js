'use strict';

const path = require('node:path');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    fixable: 'code',
    hasSuggestions: true,
  },
  create(context) {
    const pathToAbstractOps = `${path.resolve(context.cwd, 'src/abstract-ops').replaceAll('\\', '/')}/`;
    const pathToSpecTypesModule = path.resolve(pathToAbstractOps, 'spec-types.mjs').replaceAll('\\', '/');
    const pathToAllModule = path.resolve(pathToAbstractOps, 'all.mjs').replaceAll('\\', '/');
    /** @type {import('estree').ImportSpecifier | undefined} */
    let importSpecifierForR;
    /** @type {import('estree').ImportSpecifier | undefined} */
    let importSpecifierForℝ;
    /** @type {import('estree').ImportDeclaration | undefined} */
    let importForAllModule;
    /** @type {import('estree').ImportDeclaration | undefined} */
    let importForSpecTypesModule;
    /** @type {import('estree').ImportDeclaration | undefined} */
    let lastImport;
    /** @type {import('estree').Node | undefined} */
    let needsImportForℝ;
    return {
      Program() {
        importSpecifierForR = undefined;
        importSpecifierForℝ = undefined;
        importForAllModule = undefined;
        importForSpecTypesModule = undefined;
        lastImport = undefined;
        needsImportForℝ = undefined;
      },
      'Program:exit': function Program_exit() {
        if (needsImportForℝ && !importSpecifierForℝ) {
          if (importSpecifierForR) {
            context.report({
              node: needsImportForℝ,
              message: 'Import ℝ, not R, to convert mathematical values',
              fix(fixer) {
                return fixer.replaceText(importSpecifierForR.imported, 'ℝ');
              },
            });
          } else if (importForSpecTypesModule) {
            context.report({
              node: needsImportForℝ,
              message: 'Import ℝ to convert mathematical values',
              * fix(fixer) {
                const last = importForSpecTypesModule.specifiers.at(-1);
                yield fixer.insertTextAfter(last, ', ℝ');
              },
            });
          } else if (importForAllModule) {
            context.report({
              node: needsImportForℝ,
              message: 'Import ℝ to convert mathematical values',
              * fix(fixer) {
                const last = importForAllModule.specifiers.at(-1);
                yield fixer.insertTextAfter(last, ', ℝ');
              },
            });
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
              context.report({
                node: needsImportForℝ,
                message: 'Import ℝ to convert mathematical values',
                * fix(fixer) {
                  yield fixer.insertTextAfter(lastImport, `\nimport { ℝ } from ${JSON.stringify(relativePath)};`);
                },
              });
            } else {
              context.report({
                node: needsImportForℝ,
                message: 'Import ℝ to convert mathematical values',
                * fix(fixer) {
                  yield fixer.insertTextAfterRange([0, 0], `import { ℝ } from ${JSON.stringify(relativePath)};\n`);
                },
              });
            }
          }
        }
      },
      ImportDeclaration(node) {
        lastImport = node;
        const importPath = path.resolve(path.dirname(context.filename), node.source.value).replaceAll('\\', '/');
        if (importPath === pathToAllModule) {
          importForAllModule = node;
        } else if (importPath === pathToSpecTypesModule) {
          importForSpecTypesModule = node;
        }
      },
      ImportSpecifier(node) {
        if (node.imported.name === 'R') {
          importSpecifierForR = node;
        } else if (node.imported.name === 'ℝ') {
          importSpecifierForℝ = node;
        }
      },
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'R') {
          /** @type {import('eslint').Rule.ReportFixer} */
          const fix = function* fix(fixer) {
            yield fixer.replaceText(node.callee, 'ℝ');
          };

          context.report({
            node: node.callee,
            message: 'Use ℝ, not R, to get a mathematical value',
            fix: importSpecifierForℝ ? fix : undefined,
          });

          needsImportForℝ ??= node.callee;
        }

        if (node.callee.type === 'MemberExpression'
          && node.callee.computed === false
          && node.callee.property.type === 'Identifier') {
          if (node.callee.property.name === 'numberValue') {
            /** @type {import('eslint').Rule.ReportFixer} */
            const fix = function* fix(fixer) {
              //    foo.numberValue()
              // -> foo
              yield fixer.removeRange([node.callee.object.range[1], node.range[1]]);

              //    foo
              // -> ℝ(foo)
              yield fixer.insertTextBefore(node, 'ℝ(');
              yield fixer.insertTextAfter(node, ')');
            };

            context.report({
              node: node.callee,
              message: 'Use ℝ, not .numberValue(), to get a mathematical value',
              fix: importSpecifierForℝ ? fix : undefined,
            });

            needsImportForℝ ??= node.callee;
          }

          if (node.callee.property.name === 'bigintValue') {
            /** @type {import('eslint').Rule.ReportFixer} */
            const fix = function* fix(fixer) {
              //    foo.bigintValue()
              // -> foo
              yield fixer.removeRange([node.callee.object.range[1], node.range[1]]);

              //    foo
              // -> ℝ(foo)
              yield fixer.insertTextBefore(node, 'ℝ(');
              yield fixer.insertTextAfter(node, ')');
            };

            context.report({
              node: node.callee,
              message: 'Use ℝ, not .bigintValue(), to get a mathematical value',
              fix: importSpecifierForℝ ? fix : undefined,
            });

            needsImportForℝ ??= node.callee;
          }
        }
      },
    };
  },
};
