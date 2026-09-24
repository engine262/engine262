import type { Rule } from 'eslint';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import ts from 'typescript';

export type TypeAwareParserServices = ParserServicesWithTypeInformation;

export function getParserServices(
  context: Rule.RuleContext,
  ruleName: string,
): TypeAwareParserServices {
  const services = context.sourceCode.parserServices;
  if (
    !services?.program
    || !services.esTreeNodeToTSNodeMap
    || !services.tsNodeToESTreeNodeMap
  ) {
    throw new Error(`${ruleName} requires type-aware parser services`);
  }
  return services;
}

export interface Engine262Settings {
  readonly compiler: boolean;
  readonly internals: string;
  readonly valueDefinitionPath?: string;
}

export function getEngine262Settings(context: Rule.RuleContext): Engine262Settings {
  const settings = context.settings?.engine262 as {
    readonly compiler?: unknown;
    readonly internals?: unknown;
    readonly valueDefinitionPath?: unknown;
  } | undefined;
  return {
    compiler: settings?.compiler === true,
    internals: typeof settings?.internals === 'string' ? settings.internals : '@engine262/engine262',
    valueDefinitionPath: typeof settings?.valueDefinitionPath === 'string'
      ? settings.valueDefinitionPath
      : undefined,
  };
}

export function addNamedImports(
  sourceFile: ts.SourceFile,
  moduleName: string,
  names: readonly string[],
  fixer: Rule.RuleFixer,
  typeOnly = false,
): Rule.Fix | undefined {
  const importDeclaration = sourceFile.statements.find(
    (statement): statement is ts.ImportDeclaration => (
      ts.isImportDeclaration(statement)
      && ts.isStringLiteral(statement.moduleSpecifier)
      && statement.moduleSpecifier.text === moduleName
    ),
  );
  const namedBindings = importDeclaration?.importClause?.namedBindings;
  const importedNames = namedBindings && ts.isNamedImports(namedBindings)
    ? new Set(namedBindings.elements.map((element) => element.name.text))
    : new Set<string>();
  const missingNames = names.filter((name) => !importedNames.has(name));
  if (missingNames.length === 0) return undefined;
  const formatName = (name: string) => typeOnly ? `type ${name}` : name;
  if (namedBindings && ts.isNamedImports(namedBindings)) {
    const first = namedBindings.elements[0];
    const isMultiline = first && sourceFile.text.slice(namedBindings.getStart(), first.getStart()).includes('\n');
    const insertion = isMultiline
      ? missingNames.map((name) => `\n${lineIndent(first)}${formatName(name)},`).join('')
      : ` ${missingNames.map(formatName).join(', ')},`;
    return fixer.insertTextAfterRange(
      [namedBindings.getStart(), namedBindings.getStart() + 1],
      insertion,
    );
  }
  return fixer.insertTextBeforeRange(
    [sourceFile.getStart(), sourceFile.getEnd()],
    `import { ${missingNames.map(formatName).join(', ')} } from '${moduleName.replaceAll("'", "\\'")}';\n`,
  );
}

function lineIndent(node: ts.Node): string {
  const source = node.getSourceFile().text;
  const lineStart = source.lastIndexOf('\n', node.getStart() - 1) + 1;
  return source.slice(lineStart, node.getStart()).match(/^\s*/)?.[0] ?? '';
}
