import type { Rule } from 'eslint'
import ts from 'typescript'
import {
    analyzeEvaluatorDataFlow,
    isIdentifierReference,
    planEvaluatorFrames,
    referencedSymbols,
    type EvaluatorBindingLifetime,
    type EvaluatorDataFlow,
    type FrameInsertionPlan,
    type FramePlanningDiagnostic,
} from '@engine262/babel-compiler'
import { addNamedImports, getEngine262Settings, getParserServices, type TypeAwareParserServices } from './utils.mjs'
import {
    checkGCRelatedInternalFunctionCalls,
    findContainingFunction,
    isFunctionLikeDeclarationNode,
    propertyName,
    sharedMessages,
} from './gc-captures-shared.mjs'

const messages = {
    ...sharedMessages,
    missingFrame: 'Evaluator frame omits GC references live across suspension: {{names}}.',
    mergeFrames: 'Evaluator frames before this suspension can be merged.',
    unnecessaryCapture: 'Evaluator frame capture {{name}} is not live across a suspension.',
    captureBeforeInitialization: '{{name}} is captured before its lexical binding is initialized.',
}

export default {
    meta: {
        fixable: 'code',
        messages,
    },
    create(context) {
        const settings = getEngine262Settings(context)
        if (settings.compiler) return {}
        const services = getParserServices(context, 'gc-captures-manual')
        const checker = services.program.getTypeChecker()
        return {
            Program() {
                const flows = analyzeEvaluatorDataFlow(context.physicalFilename, {
                    program: services.program,
                    valueDefinitionPath: settings.valueDefinitionPath,
                    includeFunctionsWithFrames: true,
                })
                const result = planEvaluatorFrames(flows, { respectExistingFrames: true })
                for (const flow of flows) {
                    checkEvaluatorFrame(
                        flow,
                        result.plans.filter((plan) => plan.functionStart === flow.function.getStart()),
                        result.diagnostics.filter(
                            (diagnostic) => diagnostic.functionStart === flow.function.getStart(),
                        ),
                        checker,
                        services,
                        context,
                        settings.internals,
                    )
                }
            },
            'CallExpression, NewExpression'(node: Rule.Node) {
                checkGCRelatedInternalFunctionCalls(node, checker, services, context, (call) => {
                    checkCaptureInitialization(call, checker, services, context)
                })
            },
        } satisfies Rule.RuleListener
    },
} satisfies Rule.RuleModule

/**
 * Reports TDZ errors:
 *
 * using _ = captureEvaluatorFrame(() => ({ x }));
 *                                          ~ x is referenced before init
 * let x;
 */
function checkCaptureInitialization(
    frame: ts.CallExpression,
    checker: ts.TypeChecker,
    services: TypeAwareParserServices,
    context: Rule.RuleContext,
): void {
    const provider = frame.arguments[0]
    if (!provider) return
    const body = ts.isArrowFunction(provider) || ts.isFunctionExpression(provider) ? provider.body : provider
    const reported = new Set<ts.Symbol>()
    const visit = (node: ts.Node) => {
        if (node !== body && isFunctionLikeDeclarationNode(node)) return
        if (ts.isIdentifier(node) && isIdentifierReference(node)) {
            const symbol = getSymbolAtLocation(node, checker)
            if (
                symbol &&
                !reported.has(symbol) &&
                isLocalLexicalBinding(symbol, frame) &&
                !isInitializedAt(node, frame, checker)
            ) {
                reported.add(symbol)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const reportNode = services.tsNodeToESTreeNodeMap.get(node) as any
                context.report({
                    node: reportNode,
                    messageId: 'captureBeforeInitialization',
                    data: { name: symbol.name },
                })
            }
        }
        ts.forEachChild(node, visit)
    }
    visit(body)
}

/**
 * Return the symbol for an identifier. If it is a shorthand property assignment, return the value symbol instead of the property symbol.
 *
 * ({ value: value1 })
 *           ~~~~~~ get the symbol for `value1`
 *
 * ({ value })
 *    ~~~~~ get the symbol for `value` as a local variable lookup, not the contextual type of the object literal
 */
function getSymbolAtLocation(identifier: ts.Identifier, checker: ts.TypeChecker): ts.Symbol | undefined {
    const symbol = ts.isShorthandPropertyAssignment(identifier.parent)
        ? checker.getShorthandAssignmentValueSymbol(identifier.parent)
        : checker.getSymbolAtLocation(identifier)
    return symbol
}

/**
 * Check if a symbol is defined in the lexical scope within the same function as the frame.
 */
function isLocalLexicalBinding(symbol: ts.Symbol, frame: ts.CallExpression): boolean {
    const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0]
    if (!declaration) return false
    const binding = bindingDeclaration(declaration)
    if (ts.isClassDeclaration(binding)) {
        return findContainingFunction(binding) === findContainingFunction(frame)
    }
    return (
        // Matches `let name = value` in a block-scoped declaration list.
        ts.isVariableDeclaration(binding) &&
        ts.isVariableDeclarationList(binding.parent) &&
        (binding.parent.flags & ts.NodeFlags.BlockScoped) !== 0 &&
        findContainingFunction(binding) === findContainingFunction(frame)
    )
}

/**
 * Check whether a binding is initialized when a frame is created.
 */
function isInitializedAt(identifier: ts.Identifier, frame: ts.CallExpression, checker: ts.TypeChecker): boolean {
    const symbol = getSymbolAtLocation(identifier, checker)
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0]
    if (!declaration) return false
    const binding = bindingDeclaration(declaration)
    if (ts.isParameter(binding)) return isAncestor(binding.parent, frame)
    if (ts.isImportClause(binding) || ts.isImportSpecifier(binding) || ts.isNamespaceImport(binding)) {
        return true
    }
    if (ts.isFunctionDeclaration(binding)) return true
    if (ts.isClassDeclaration(binding)) return statementPrecedes(binding, frame)
    if (!ts.isVariableDeclaration(binding)) return false
    if (ts.isCatchClause(binding.parent)) return isAncestor(binding.parent.block, frame)
    if (!ts.isVariableDeclarationList(binding.parent)) return false
    const owner = binding.parent.parent
    if (ts.isForInStatement(owner) || ts.isForOfStatement(owner) || ts.isForStatement(owner))
        return isAncestor(owner.statement, frame)
    if (!ts.isVariableStatement(owner)) return false
    if ((binding.parent.flags & ts.NodeFlags.BlockScoped) === 0) {
        return findContainingFunction(binding) === findContainingFunction(frame)
    }
    return statementPrecedes(owner, frame)
}

/**
 * Get declaration of a binding element.
 */
function bindingDeclaration(declaration: ts.Declaration): ts.Declaration {
    let current = declaration
    while (ts.isBindingElement(current)) {
        const parent = current.parent
        current = parent.parent
    }
    return current
}

function statementPrecedes(declaration: ts.Statement, node: ts.Node): boolean {
    const owner = declaration.parent
    const statements = statementList(owner)
    if (!statements) return false
    let containing: ts.Node | undefined = node
    while (containing && containing.parent !== owner) containing = containing.parent
    if (!containing || !ts.isStatement(containing)) return false
    return statements.indexOf(declaration) < statements.indexOf(containing)
}

function statementList(node: ts.Node): readonly ts.Statement[] | undefined {
    if (ts.isBlock(node) || ts.isSourceFile(node) || ts.isCaseClause(node) || ts.isDefaultClause(node))
        return node.statements
    return undefined
}

function isAncestor(ancestor: ts.Node, node: ts.Node): boolean {
    let current: ts.Node | undefined = node
    while (current) {
        if (current === ancestor) return true
        current = current.parent
    }
    return false
}

/**
 * Validates evaluator captures across yield and provides frame fixes.
 */
function checkEvaluatorFrame(
    flow: EvaluatorDataFlow,
    plans: readonly FrameInsertionPlan[],
    diagnostics: readonly FramePlanningDiagnostic[],
    checker: ts.TypeChecker,
    services: TypeAwareParserServices,
    context: Rule.RuleContext,
    internals: string,
): void {
    const fn = flow.function
    const declarations = flow.bindings
    const uses = flow.uses
    const yields = flow.yields
    const frames = flow.existingFrames.map((call) => ({
        call,
        entries: evaluatorFrameEntries(call.arguments[0], checker),
    }))
    const firstUsingIndex = countUsingDeclarations(fn) + 1
    for (const [index, plan] of plans.entries()) {
        context.report({
            loc: sourceRange(context, plan.yield),
            messageId: 'missingFrame',
            data: { names: plan.names.join(', ') },
            fix: (fixer) => fixEvaluatorFrame(plan, firstUsingIndex + index, fn.getSourceFile(), fixer, internals),
        })
    }
    for (const diagnostic of diagnostics) {
        context.report({
            loc: sourceRange(context, diagnostic.yield),
            messageId: 'missingFrame',
            data: { names: diagnostic.names.join(', ') },
        })
    }

    for (const group of mergeableEvaluatorFrameGroups(frames, yields)) {
        const scope = getParentSoleDeclaration(group.frames[0].call)!.statement.parent
        const yieldExpression = yields.find((node) => group.at < node.getStart() && isAncestor(scope, node))
        if (!yieldExpression) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reportNode = services.tsNodeToESTreeNodeMap.get(yieldExpression) as any
        context.report({
            node: reportNode,
            messageId: 'mergeFrames',
            fix: (fixer) => mergeEvaluatorFrames(group.frames, fixer),
        })
    }

    for (const frame of frames) {
        for (const entry of frame.entries) {
            const localSymbols = [...entry.symbols].filter((symbol) => declarations.has(symbol))
            if (
                localSymbols.length === 0 ||
                localSymbols.some((symbol) =>
                    isLiveAcrossSuspension(symbol, frame.call, declarations.get(symbol)!, uses, yields),
                )
            )
                continue
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const reportNode = services.tsNodeToESTreeNodeMap.get(entry.property) as any
            context.report({
                node: reportNode,
                messageId: 'unnecessaryCapture',
                data: { name: entry.name },
                fix: (fixer) => removeObjectProperty(entry.property, fixer),
            })
        }
    }
}

interface EvaluatorFrame {
    readonly call: ts.CallExpression
    readonly entries: readonly EvaluatorFrameEntry[]
}

interface EvaluatorFrameEntry {
    readonly property: ts.ObjectLiteralElementLike
    readonly name: string
    readonly symbols: ReadonlySet<ts.Symbol>
}

interface MergeableEvaluatorFrameGroup {
    readonly at: number
    readonly frames: readonly EvaluatorFrame[]
}

/** Extracts captured properties and symbols from a frame provider. */
function evaluatorFrameEntries(provider: ts.Expression, checker: ts.TypeChecker): EvaluatorFrameEntry[] {
    if (!ts.isArrowFunction(provider) && !ts.isFunctionExpression(provider)) return []
    let body: ts.Node = provider.body
    while (ts.isParenthesizedExpression(body)) body = body.expression
    if (!ts.isObjectLiteralExpression(body)) return []
    return body.properties.map((property) => ({
        property,
        name: propertyName(property.name) ?? '<spread>',
        symbols: referencedSymbols(property, checker),
    }))
}

/** Checks whether a local binding remains live across a suspension after a frame. */
function isLiveAcrossSuspension(
    symbol: ts.Symbol,
    frame: ts.CallExpression,
    lifetime: EvaluatorBindingLifetime,
    uses: ReadonlyMap<ts.Symbol, readonly number[]>,
    yields: readonly ts.YieldExpression[],
): boolean {
    const lastUse = Math.max(...(uses.get(symbol) ?? [lifetime.declaredAt]))
    const scope = findCaptureScope(frame)
    return yields.some(
        (yieldExpression) =>
            lifetime.declaredAt < yieldExpression.getStart() &&
            frame.getEnd() < yieldExpression.getStart() &&
            yieldExpression.getStart() < lastUse &&
            (!scope || isAncestor(scope, yieldExpression)),
    )
}

/** Finds the lexical block or source-file scope containing a capture frame. */
function findCaptureScope(node: ts.Node): ts.Block | ts.SourceFile | undefined {
    let current: ts.Node | undefined = node.parent
    while (current) {
        if (ts.isBlock(current) || ts.isSourceFile(current)) return current
        current = current.parent
    }
    return undefined
}

/** Removes an object property together with the appropriate separator. */
function removeObjectProperty(property: ts.ObjectLiteralElementLike, fixer: Rule.RuleFixer): Rule.Fix {
    const object = property.parent
    if (!ts.isObjectLiteralExpression(object)) {
        return fixer.removeRange([property.getStart(), property.getEnd()])
    }
    const index = object.properties.indexOf(property)
    const next = object.properties[index + 1]
    const previous = object.properties[index - 1]
    if (next) return fixer.removeRange([property.getStart(), next.getStart()])
    if (previous) return fixer.removeRange([previous.getEnd(), property.getEnd()])
    return fixer.removeRange([property.getStart(), property.getEnd()])
}

/** Creates imports and a frame declaration from a compiler insertion plan. */
function fixEvaluatorFrame(
    plan: FrameInsertionPlan,
    usingIndex: number,
    sourceFile: ts.SourceFile,
    fixer: Rule.RuleFixer,
    internals: string,
): Rule.Fix[] {
    const fixes: Rule.Fix[] = []
    const importFix = addNamedImports(sourceFile, internals, ['captureEvaluatorFrame'], fixer)
    if (importFix) fixes.push(importFix)

    const resource = usingIndex === 1 ? '_' : `_${usingIndex}`
    const fields = plan.names.join(', ')
    const displayName = plan.displayName.replaceAll("'", "\\'")
    const frame = `using ${resource} = captureEvaluatorFrame(() => ({ ${fields} }), '${displayName}');`
    const indent = indentAtLine(sourceFile.text, plan.insertion.start)
    const range: [number, number] = [plan.insertion.start, plan.insertion.end]
    if (plan.insertion.mode === 'before') {
        fixes.push(fixer.insertTextBeforeRange(range, `${frame}\n${indent}`))
    } else {
        fixes.push(fixer.insertTextAfterRange(range, `\n${indent}${frame}`))
    }
    return fixes
}

function sourceRange(
    context: Rule.RuleContext,
    range: { readonly start: number; readonly end: number },
): { start: { line: number; column: number }; end: { line: number; column: number } } {
    return {
        start: context.sourceCode.getLocFromIndex(range.start),
        end: context.sourceCode.getLocFromIndex(range.end),
    }
}

function indentAtLine(source: string, offset: number): string {
    const lineStart = source.lastIndexOf('\n', offset - 1) + 1
    return source.slice(lineStart, offset).match(/^\s*/)?.[0] ?? ''
}

/**
 * Groups adjacent evaluator frames that can be merged safely.
 *
 * For example:
 *
 * using _1 = captureEvaluatorFrame(() => ({ x }), 'Func');
 * using _2 = captureEvaluatorFrame(() => ({ y }), 'Func');
 * yield* op;
 * using _3 = captureEvaluatorFrame(() => ({ z }), 'Func');
 *
 * can be merged into:
 *
 * using _1 = captureEvaluatorFrame(() => ({ x, y }), 'Func');
 * yield* op;
 * using _3 = captureEvaluatorFrame(() => ({ z }), 'Func');
 */
function mergeableEvaluatorFrameGroups(
    frames: readonly EvaluatorFrame[],
    yields: readonly ts.YieldExpression[],
): MergeableEvaluatorFrameGroup[] {
    const candidates = frames
        .flatMap((frame) => {
            const statement = getParentSoleDeclaration(frame.call)
            // skip merge for the following cases:
            // ({ x: expr })
            // only merge for
            // ({ x })
            if (
                !statement ||
                frame.entries.length === 0 ||
                frame.entries.some((entry) => !ts.isShorthandPropertyAssignment(entry.property))
            )
                return []
            const explicitName = frame.call.arguments[1]
            if (!explicitName) return []
            return [
                {
                    frame,
                    statement: statement.statement,
                    identity: explicitName.getText(),
                },
            ]
        })
        .sort((a, b) => a.frame.call.getStart() - b.frame.call.getStart())
    const groups: MergeableEvaluatorFrameGroup[] = []
    let current: typeof candidates = []
    for (const candidate of candidates) {
        const previous = current.at(-1)
        const separatedByYield =
            previous &&
            yields.some(
                (node) =>
                    previous.frame.call.getEnd() < node.getStart() && node.getStart() < candidate.frame.call.getStart(),
            )
        if (
            previous &&
            previous.statement.parent === candidate.statement.parent &&
            previous.identity === candidate.identity &&
            !separatedByYield
        ) {
            current.push(candidate)
            continue
        }
        if (current.length > 1) {
            groups.push({ at: current.at(-1)!.frame.call.getEnd(), frames: current.map(({ frame }) => frame) })
        }
        current = [candidate]
    }
    if (current.length > 1) {
        groups.push({ at: current.at(-1)!.frame.call.getEnd(), frames: current.map(({ frame }) => frame) })
    }
    return groups
}

/**
 * Merge a list of "using _ = captureEvaluatorFrame(() => ({ x, y, z }))" statements into one
 */
function mergeEvaluatorFrames(
    frames: readonly EvaluatorFrame[],
    fixer: Rule.RuleFixer,
): Rule.Fix[] {
    // a list of "using _ = captureEvaluatorFrame(() => ({ x, y, z }))" statements
    const statements = frames.map((frame) => getParentSoleDeclaration(frame.call)!)
    const last = statements.at(-1)!
    const names = [...new Set(frames.flatMap((frame) => frame.entries.map((entry) => entry.name)))].sort()
    const fields = names.join(', ')
    const frameName = `, ${frames.at(-1)!.call.arguments[1]!.getText()}`
    const replacement = `using ${statements[0].name} = captureEvaluatorFrame(() => ({ ${fields} })${frameName});`
    return [
        ...statements.slice(0, -1).map(({ statement }) => fixer.removeRange(statementRemovalRange(statement))),
        fixer.replaceTextRange([last.statement.getStart(), last.statement.getEnd()], replacement),
    ]
}

function statementRemovalRange(statement: ts.Statement): [number, number] {
    const source = statement.getSourceFile().text
    let start = statement.getStart()
    while (start > 0 && source[start - 1] !== '\n' && /\s/.test(source[start - 1])) start -= 1
    let end = statement.getEnd()
    while (end < source.length && source[end] !== '\n' && /\s/.test(source[end])) end += 1
    if (source[end] === '\n') end += 1
    return [start, end]
}

/**
 * match the sole declaration in a declaration list
 *
 * matches:
 * var name = expr();
 *
 * not matches:
 * var name = expr(), other = expr();
 * var [name] = expr();
 */
function getParentSoleDeclaration(
    call: ts.CallExpression,
): { statement: ts.VariableStatement; name: string } | undefined {
    const declaration = call.parent
    if (
        !ts.isVariableDeclaration(declaration) ||
        declaration.initializer !== call ||
        !ts.isIdentifier(declaration.name)
    )
        return undefined
    const declarationList = declaration.parent
    const statement = declarationList.parent
    if (
        !ts.isVariableDeclarationList(declarationList) ||
        declarationList.declarations.length !== 1 ||
        !ts.isVariableStatement(statement)
    )
        return undefined
    return { statement, name: declaration.name.text }
}

/**
 * used to generated `using _1 = ...` `using _2 = ...`
 */
function countUsingDeclarations(fn: ts.FunctionLikeDeclaration): number {
    let count = 0
    const visit = (node: ts.Node) => {
        if (node !== fn && isFunctionLikeDeclarationNode(node)) return
        if (
            // Matches `using name = value` in a using declaration list.
            ts.isVariableDeclaration(node) &&
            ts.isVariableDeclarationList(node.parent) &&
            (node.parent.flags & ts.NodeFlags.Using) === ts.NodeFlags.Using
        )
            count += 1
        ts.forEachChild(node, visit)
    }
    visit(fn)
    return count
}
