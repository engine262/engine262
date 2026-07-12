import type { Rule } from 'eslint'
import ts from 'typescript'
import { isGCRelevant, isIdentifierReference, referencedSymbols } from '@engine262/babel-compiler'
import type { TypeAwareParserServices } from './utils.mjs'

const factorySpecs = new Map([
    [
        'CreateBuiltinFunction',
        {
            closureArgument: 0,
            optionsArgument: 4,
        },
    ],
    [
        'from',
        {
            insertName: 'CreateBuiltinFunction.from',
            closureField: 'steps',
            optionsArgument: 0,
        },
    ],
    [
        'CreateIteratorFromClosure',
        {
            closureArgument: 0,
            optionsArgument: 3,
        },
    ],
    [
        'Job',
        {
            closureField: 'evaluate',
            optionsArgument: 0,
        },
    ],
])

export const sharedMessages = {
    captures: '{{factory}} requires an explicit {{field}} field.',
    missingCapture: '{{factory}} capture provider omits GC references: {{names}}.',
    directNext: 'Evaluator.next() may only be called by stepEvaluator().',
}

export type CaptureFrameHandler = (call: ts.CallExpression, node: Rule.Node) => void

/**
 * Check the following calls:
 *
 * captureEvaluatorFrame(...)
 * $evaluator.next(...) with no stepEvaluator
 * CreateBuiltinFunction(...)
 */
export function checkGCRelatedInternalFunctionCalls(
    node: Rule.Node,
    checker: ts.TypeChecker,
    services: TypeAwareParserServices,
    context: Rule.RuleContext,
    onCaptureFrame: CaptureFrameHandler,
): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = services.esTreeNodeToTSNodeMap.get(node as any)
    if (!ts.isCallExpression(call) && !ts.isNewExpression(call)) return
    const callArguments = call.arguments ?? ts.factory.createNodeArray()
    if (
        // Matches `captureEvaluatorFrame(...)`.
        ts.isCallExpression(call) &&
        ts.isIdentifier(call.expression) &&
        call.expression.text === 'captureEvaluatorFrame'
    ) {
        onCaptureFrame(call, node)
    }
    if (
        // Matches `$evaluator.next(...) that is not wrapped by stepEvaluator`.
        ts.isCallExpression(call) &&
        ts.isPropertyAccessExpression(call.expression) &&
        call.expression.name.text === 'next'
    ) {
        const containingFunction = findContainingFunction(call)
        if (propertyName(containingFunction?.name) === 'stepEvaluator')
            return
        const receiverType = checker.getTypeAtLocation(call.expression.expression)
        const typeName = checker.typeToString(receiverType)
        const aliasName = receiverType.aliasSymbol?.name ?? ''
        if (aliasName.endsWith('Evaluator') || /(?:^|<|\b)Evaluator(?:<|\b)/.test(typeName)) {
            context.report({ node, messageId: 'directNext' })
        }
        return
    }
    // resolve if this is a CreateBuiltinFunction, CreateIteratorFromClosure, ...etc call
    const factory = parseToFactorySpec(call.expression, checker)
    if (!factory) return
    const { name: factoryName, spec } = factory
    const options = callArguments[spec.optionsArgument]
    const closureProperty =
        options && ts.isObjectLiteralExpression(options) && spec.closureField
            ? getProperty(options, spec.closureField)
            : undefined
    const closure =
        spec.closureArgument === undefined
            ? closureProperty && propertyValue(closureProperty)
            : callArguments[spec.closureArgument]
    const resolvedFunction = closure && resolveFunctionDeclarationInOptions(closure, checker)
    const gcReferences = resolvedFunction && collectGCReferences(resolvedFunction, checker)
    // CreateBuiltinFunction(..., optionsIsNotAObjectLiteral)
    if (!options || !ts.isObjectLiteralExpression(options)) {
        context.report({
            node,
            messageId: 'captures',
            data: { factory: factoryName, field: 'captures' },
            fix:
                // Missing options object, can provide a fix.
                !options && gcReferences && callArguments.length === spec.optionsArgument
                    ? (fixer) =>
                          fixer.insertTextAfterRange(
                              [callArguments.at(-1)!.getStart(), callArguments.at(-1)!.getEnd()],
                              `, { captures: ${generateCapturesList(gcReferences)} }`,
                          )
                    : undefined,
        })
        return
    }
    const capturesProperty = getProperty(options, 'captures')
    // CreateBuiltinFunction(..., { }) captures is missing
    if (!capturesProperty) {
        context.report({
            node,
            messageId: 'captures',
            data: { factory: factoryName, field: 'captures' },
            fix: gcReferences
                ? (fixer) =>
                      insertCaptureProperty(
                          options,
                          'captures',
                          generateCapturesList(gcReferences),
                          fixer,
                          context.sourceCode.text,
                      )
                : undefined,
        })
        return
    }
    if (!gcReferences?.length) return
    const captures = propertyValue(capturesProperty)
    const missing = [...gcReferences].filter(
        (reference) =>
            !captures ||
            captures.kind === ts.SyntaxKind.NullKeyword ||
            !capturesContains(captures, reference, checker),
    )
    if (missing.length > 0) {
        context.report({
            node,
            messageId: 'missingCapture',
            data: {
                factory: factoryName,
                names: missing
                    .map((reference) => reference.displayName)
                    .sort()
                    .join(', '),
            },
            fix:
                captures?.kind === ts.SyntaxKind.NullKeyword
                    ? (fixer) =>
                          fixer.replaceTextRange(
                              [captures.getStart(), captures.getEnd()],
                              generateCapturesList(missing),
                          )
                    : undefined,
        })
    }
}

function getProperty(object: ts.ObjectLiteralExpression, name: string): ts.ObjectLiteralElementLike | undefined {
    return object.properties.find((property) => propertyName(property.name) === name)
}

/**
 * Generate list like this:
 *
 * () => ({ a, b, c })
 */
function generateCapturesList(refs: readonly GCReference[]): string {
    if (refs.length === 0) return 'null'
    const entries = [...refs]
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((reference) => {
            const expression = reference.expression.getText()
            return ts.isIdentifier(reference.expression)
                ? expression
                : `[${JSON.stringify(expression)}]: ${expression}`
        })
    return `() => ({ ${entries.join(', ')} })`
}

function insertCaptureProperty(
    options: ts.ObjectLiteralExpression,
    field: string,
    provider: string,
    fixer: Rule.RuleFixer,
    source: string,
): Rule.Fix {
    const openingBrace = options.getStart()
    const contents = source.slice(openingBrace + 1, options.getEnd() - 1)
    if (!contents.trim().length || !contents.includes('\n')) {
        return fixer.insertTextAfterRange([openingBrace, openingBrace + 1], ` ${field}: ${provider},`)
    }
    const firstProperty = options.properties[0]
    const indentation = firstProperty
        ? source.slice(source.lastIndexOf('\n', firstProperty.getStart()) + 1, firstProperty.getStart())
        : '  '
    return fixer.insertTextAfterRange([openingBrace, openingBrace + 1], `\n${indentation}${field}: ${provider},`)
}

function parseToFactorySpec(
    expression: ts.LeftHandSideExpression,
    checker: ts.TypeChecker,
): { name: string; spec: FactorySpec } | undefined {
    let symbol = checker.getSymbolAtLocation(expression)
    const seen = new Set<ts.Symbol>()
    while (symbol && symbol.flags & ts.SymbolFlags.Alias && !seen.has(symbol)) {
        seen.add(symbol)
        symbol = checker.getAliasedSymbol(symbol)
    }
    if (!symbol) return undefined
    const spec = factorySpecs.get(symbol.name)
    if (!spec) return undefined
    if (
        !(symbol.declarations ?? []).some((declaration) =>
            isImportFromEngine262Library(symbol.name, declaration.getSourceFile().fileName),
        )
    )
        return undefined
    return { name: spec.insertName || symbol.name, spec }
}

interface FactorySpec {
    readonly closureArgument?: number
    readonly closureField?: string
    readonly optionsArgument: number
}

function isImportFromEngine262Library(name: string, fileName: string): boolean {
    const expectedSource = new Map<string, readonly string[]>([
        [
            'CreateBuiltinFunction',
            ['/src/abstract-ops/function-operations.mts', '/declaration/abstract-ops/function-operations.d.mts'],
        ],
        ['from', ['/src/abstract-ops/function-operations.mts', '/declaration/abstract-ops/function-operations.d.mts']],
        [
            'CreateIteratorFromClosure',
            ['/src/abstract-ops/generator-operations.mts', '/declaration/abstract-ops/generator-operations.d.mts'],
        ],
        ['Job', ['/src/execution-context/Job.mts', '/declaration/execution-context/Job.d.mts']],
    ]).get(name)
    const normalized = fileName.replaceAll('\\', '/')
    return expectedSource?.some((suffix) => normalized.endsWith(suffix)) === true
}

export function findContainingFunction(node: ts.Node): ts.FunctionLikeDeclaration | undefined {
    let parent = node.parent
    while (parent) {
        if (isFunctionLikeDeclarationNode(parent)) return parent
        parent = parent.parent
    }
    return undefined
}

export function isFunctionLikeDeclarationNode(node: ts.Node): node is ts.FunctionLikeDeclaration {
    return (
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isGetAccessorDeclaration(node) ||
        ts.isSetAccessorDeclaration(node) ||
        ts.isConstructorDeclaration(node)
    )
}

function propertyValue(property: ts.ObjectLiteralElementLike): ts.Node | undefined {
    if (ts.isPropertyAssignment(property)) return property.initializer
    if (ts.isShorthandPropertyAssignment(property)) return property.name
    if (ts.isMethodDeclaration(property)) return property
    return undefined
}

/** Reads a static identifier or string-literal property name. */
export function propertyName(name: ts.PropertyName | undefined): string | undefined {
    if (name && (ts.isIdentifier(name) || ts.isStringLiteral(name))) return name.text
    return undefined
}

/**
 * Return the function declaration node for the following cases:
 *
 * CreateBuiltinFunction(() => ...);
 *                       ~~~~~~~~~
 *
 * function f() {}
 * ~~~~~~~~~~~~~~~
 * CreateBuiltinFunction(f);
 */
function resolveFunctionDeclarationInOptions(expression: ts.Node, checker: ts.TypeChecker): ts.FunctionLikeDeclaration | undefined {
    if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression) || ts.isMethodDeclaration(expression))
        return expression
    if (!ts.isIdentifier(expression)) return undefined
    const symbol =
        (ts.isShorthandPropertyAssignment(expression.parent)
            ? checker.getShorthandAssignmentValueSymbol(expression.parent)
            : undefined) ?? checker.getSymbolAtLocation(expression)
    for (const declaration of symbol?.declarations ?? []) {
        if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)) return declaration
        if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
            const initializer = declaration.initializer
            if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) return initializer
        }
    }
    return undefined
}

interface GCReference {
    readonly symbol: ts.Symbol
    readonly expression: ts.Expression
    readonly path: readonly string[]
    readonly displayName: string
}

function collectGCReferences(fn: ts.FunctionLikeDeclaration | undefined, checker: ts.TypeChecker): GCReference[] {
    if (!fn?.body) return []

    const refs: GCReference[] = []
    const addReference = (symbol: ts.Symbol, expression: ts.Expression, path: readonly string[]) => {
        if (
            refs.some(
                (reference) =>
                    reference.symbol === symbol &&
                    reference.path.length === path.length &&
                    reference.path.every((part, index) => part === path[index]),
            )
        )
            return
        refs.push({
            symbol,
            expression,
            path,
            displayName: path.length === 0 ? symbol.name : expression.getText(),
        })
    }
    const isCaptured = (symbol: ts.Symbol | undefined, node: ts.Identifier): symbol is ts.Symbol => {
        const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0]
        return !!(
            symbol &&
            declaration &&
            !containsNode(fn, declaration) &&
            declaration.getSourceFile() === fn.getSourceFile() &&
            !ts.isImportSpecifier(declaration) &&
            !ts.isImportClause(declaration) &&
            node.text !== 'surroundingAgent'
        )
    }
    const visit = (node: ts.Node) => {
        if (isCaptureAccess(node) && isGCRelevant(checker.getTypeAtLocation(node), checker)) {
            const path = captureToAccessPath(node, checker)
            if (path && isCaptured(path.symbol, path.root)) {
                const rootType = checker.getTypeAtLocation(path.root)
                const receiverType = isCaptureAccess(node.expression)
                    ? checker.getTypeAtLocation(node.expression)
                    : undefined
                if (!isGCRelevant(rootType, checker) && (!receiverType || !isGCRelevant(receiverType, checker)))
                    addReference(path.symbol, node, path.parts)
            }
        }
        if (ts.isIdentifier(node) && isIdentifierReference(node)) {
            const symbol = checker.getSymbolAtLocation(node)
            if (isCaptured(symbol, node) && isGCRelevant(checker.getTypeAtLocation(node), checker)) {
                addReference(symbol, node, [])
            }
        }
        ts.forEachChild(node, visit)
    }
    visit(fn.body)
    return refs
}

function containsNode(ancestor: ts.Node, node: ts.Node): boolean {
    let current: ts.Node | undefined = node
    while (current) {
        if (current === ancestor) return true
        current = current.parent
    }
    return false
}

function isCaptureAccess(node: ts.Node): node is ts.PropertyAccessExpression | ts.ElementAccessExpression {
    return ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)
}

/**
 * Convert a PropertyAccessExpression to a path description easier to consume
 */
function captureToAccessPath(
    expression: ts.PropertyAccessExpression | ts.ElementAccessExpression,
    checker: ts.TypeChecker,
): { readonly root: ts.Identifier; readonly symbol: ts.Symbol; readonly parts: readonly string[] } | undefined {
    const parts: string[] = []
    let current: ts.Expression = expression
    while (isCaptureAccess(current)) {
        if (ts.isPropertyAccessExpression(current)) {
            parts.unshift(current.name.text)
        } else {
            const argument = current.argumentExpression
            if (!argument) return undefined
            parts.unshift(`[${argument.getText()}]`)
        }
        current = current.expression
    }
    while (ts.isParenthesizedExpression(current)) current = current.expression
    if (!ts.isIdentifier(current)) return undefined
    const symbol = checker.getSymbolAtLocation(current)
    return symbol ? { root: current, symbol, parts } : undefined
}

/**
 * @param captures the () => ({ ... }) node in captures field
 */
function capturesContains(captures: ts.Node, reference: GCReference, checker: ts.TypeChecker): boolean {
    if (reference.path.length === 0) return referencedSymbols(captures, checker).has(reference.symbol)
    let found = false
    /** Searches the provider for an exact root-symbol and member-path match. */
    const visit = (node: ts.Node) => {
        if (found) return
        if (isCaptureAccess(node)) {
            const path = captureToAccessPath(node, checker)
            if (
                path?.symbol === reference.symbol &&
                path.parts.length === reference.path.length &&
                path.parts.every((part, index) => part === reference.path[index])
            ) {
                found = true
                return
            }
        }
        ts.forEachChild(node, visit)
    }
    visit(captures)
    return found
}
