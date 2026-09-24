import type { NodePath, PluginObject, PluginPass } from '@babel/core';
import { template, types as t } from '@babel/core';
import {
  analyzeEvaluatorDataFlow,
  planEvaluatorFrames,
  GCTransformError,
} from './gc-analysis.mjs';
import { analyzeRecordCreations } from './record-analysis.mjs';
import createTransforms from './transforms.mjs';
import type { TypeScriptProgramProvider } from './typescript-project.mjs';
import { analyzeValueLiteralCreations, type ValueLiteralCreationPlan } from './value-analysis.mjs';

export interface CompilerOptions {
  readonly project: TypeScriptProgramProvider;
  readonly internals?: string;
  readonly valueDefinitionPath?: string;
}

export default function engine262Compiler(
  _api: unknown,
  rawOptions: object,
): PluginObject<PluginPass> {
  const options = rawOptions as Partial<CompilerOptions>;
  const project = options?.project;
  if (!project || typeof project.getProgram !== 'function') {
    throw new TypeError('@engine262/babel-compiler requires a TypeScript project service in the project option');
  }
  const internals = options.internals ?? '@engine262/engine262';
  return {
    name: '@engine262/babel-compiler',
    inherits: () => createTransforms({ internals }),
    visitor: {
      Program: {
        enter(programPath, state) {
          const filename = state.file.opts.filename;
          if (!filename) throw new Error('@engine262/babel-compiler requires Babel to provide a filename');
          const program = project.getProgram(filename, state.file.code);
          const compilerState = state as PluginPass & {
            recordCreations: Set<string>;
            valueLiteralCreations: Map<string, Pick<ValueLiteralCreationPlan, 'constructor' | 'localConstructor'>>;
          };
          compilerState.recordCreations = new Set(
            analyzeRecordCreations(filename, program).map(({ start, end }) => `${start}:${end}`),
          );
          compilerState.valueLiteralCreations = new Map(
            analyzeValueLiteralCreations(filename, program, {
              valueDefinitionPath: options.valueDefinitionPath,
            }).map(({ start, end, constructor, localConstructor }) => [
              `${start}:${end}`,
              { constructor, localConstructor },
            ]),
          );
          const flows = analyzeEvaluatorDataFlow(filename, {
            program,
            valueDefinitionPath: options.valueDefinitionPath,
          });
          const { plans, diagnostics } = planEvaluatorFrames(flows);
          const diagnostic = diagnostics[0];
          if (diagnostic) throw new GCTransformError(diagnostic.message, diagnostic.yield.start);
          if (plans.length === 0) return;

          const statements = new Map<string, NodePath<t.Statement>>();
          programPath.traverse({
            Statement(path) {
              if (path.node.start !== null && path.node.start !== undefined && path.node.end !== null && path.node.end !== undefined) {
                statements.set(`${path.node.start}:${path.node.end}`, path as NodePath<t.Statement>);
              }
            },
          });
          const nextUsing = new Map<number, number>();
          for (const plan of plans) {
            const target = statements.get(`${plan.insertion.start}:${plan.insertion.end}`);
            if (!target) throw new Error(`@engine262/babel-compiler: failed to locate GC frame insertion at ${filename}:${plan.insertion.start}`);
            const index = (nextUsing.get(plan.functionStart) ?? 0) + 1;
            nextUsing.set(plan.functionStart, index);
            const resource = index === 1 ? '_' : `_${index}`;
            const captures = t.arrowFunctionExpression([], t.objectExpression(
              plan.names.map((name) => t.objectProperty(t.identifier(name), t.identifier(name), false, true)),
            ));
            const frameName = template.expression.ast(plan.frameName);
            const statement = t.variableDeclaration('using', [t.variableDeclarator(
              t.identifier(resource),
              t.callExpression(t.identifier('captureEvaluatorFrame'), [captures, frameName]),
            )]);
            if (plan.insertion.mode === 'before') target.insertBefore(statement);
            else target.insertAfter(statement);
          }
          addImport(programPath, internals, 'captureEvaluatorFrame');
        },
      },
    },
  };
}

function addImport(program: NodePath<t.Program>, source: string, name: string): void {
  for (const statement of program.get('body')) {
    if (
      !statement.isImportDeclaration()
      || statement.node.source.value !== source
      || statement.node.importKind === 'type'
    ) continue;
    const named = statement.node.specifiers.find((specifier) => (
      t.isImportSpecifier(specifier)
      && specifier.importKind !== 'type'
      && t.isIdentifier(specifier.imported, { name })
    ));
    if (named) return;
    statement.node.specifiers.push(t.importSpecifier(t.identifier(name), t.identifier(name)));
    return;
  }
  program.unshiftContainer('body', t.importDeclaration(
    [t.importSpecifier(t.identifier(name), t.identifier(name))],
    t.stringLiteral(source),
  ));
}

export {
  analyzeEvaluatorDataFlow,
  analyzeEvaluatorFrames,
  isIdentifierReference,
  planEvaluatorFrames,
  referencedSymbols,
  GCTransformError,
  type EvaluatorBindingLifetime,
  type EvaluatorDataFlow,
  type FrameInsertionPlan,
  type FramePlanningOptions,
  type FramePlanningDiagnostic,
  type FramePlanningResult,
} from './gc-analysis.mjs';
export { isGCRelevant } from './gc-types.mjs';
export {
  analyzeRecordClasses,
  analyzeRecordCreations,
  isRecordClass,
  type RecordClassAnalysisResult,
  type RecordClassDiagnostic,
  type RecordClassDiagnosticKind,
  type RecordClassInsertionFix,
} from './record-analysis.mjs';
export {
  analyzeQMacroTransformations,
  qMacroNames,
  type QMacroAnalysisResult,
  type QMacroName,
  type QMacroSyntaxNode,
  type QMacroTransformationDiagnostic,
  type QMacroTransformationPlan,
  type QMacroVisitorKeys,
} from './q-macro-analysis.mjs';
export { analyzeValueLiteralCreations, type ValueLiteralConstructor } from './value-analysis.mjs';
export {
  createTypeScriptProjectService,
  type TypeScriptProgramProvider,
  type TypeScriptProjectService,
} from './typescript-project.mjs';
