import * as ts from "typescript";
import type { ComplexityResult } from "./types.js";

/**
 * Analyze a TypeScript/JavaScript source text and return complexity metrics
 * for every function-like declaration found.
 */
export function analyzeComplexity(
  fileName: string,
  sourceText: string,
): ComplexityResult[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );

  const results: ComplexityResult[] = [];
  visitNode(sourceFile, sourceFile, results);
  return results;
}

function isFunctionLike(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isGetAccessor(node) ||
    ts.isSetAccessor(node) ||
    ts.isConstructorDeclaration(node)
  );
}

function getFunctionName(node: ts.Node): string {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    return node.name?.getText() ?? "<anonymous>";
  }
  if (ts.isGetAccessor(node)) {
    return `get ${node.name.getText()}`;
  }
  if (ts.isSetAccessor(node)) {
    return `set ${node.name.getText()}`;
  }
  if (ts.isConstructorDeclaration(node)) {
    return "constructor";
  }
  // Arrow function or function expression — check if assigned to a variable
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && parent.name) {
      return parent.name.getText();
    }
    if (ts.isPropertyAssignment(parent) && parent.name) {
      return parent.name.getText();
    }
    if (ts.isPropertyDeclaration(parent) && parent.name) {
      return parent.name.getText();
    }
    return "<anonymous>";
  }
  return "<anonymous>";
}

function visitNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  results: ComplexityResult[],
): void {
  if (isFunctionLike(node)) {
    const cyclomatic = computeCyclomatic(node);
    const cognitive = computeCognitive(node, 0);
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

    // For variable declarations like `const foo = () => {}`,
    // report from the variable declaration start, not the arrow function start
    let reportLine = pos.line;
    let reportChar = pos.character;
    if (
      (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
      ts.isVariableDeclaration(node.parent)
    ) {
      const declStatement = node.parent.parent?.parent;
      if (declStatement && ts.isVariableStatement(declStatement)) {
        const declPos = sourceFile.getLineAndCharacterOfPosition(
          declStatement.getStart(sourceFile),
        );
        reportLine = declPos.line;
        reportChar = declPos.character;
      }
    }

    results.push({
      name: getFunctionName(node),
      cyclomatic,
      cognitive,
      line: reportLine,
      character: reportChar,
    });
  }

  ts.forEachChild(node, (child) => visitNode(child, sourceFile, results));
}

// ---------------------------------------------------------------------------
// Cyclomatic complexity
// ---------------------------------------------------------------------------

function computeCyclomatic(functionNode: ts.Node): number {
  let complexity = 1; // base

  function walk(node: ts.Node): void {
    switch (node.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ConditionalExpression: // ternary
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CatchClause:
        complexity++;
        break;

      case ts.SyntaxKind.CaseClause:
        complexity++;
        break;

      case ts.SyntaxKind.BinaryExpression: {
        const binary = node as ts.BinaryExpression;
        const op = binary.operatorToken.kind;
        if (
          op === ts.SyntaxKind.AmpersandAmpersandToken ||
          op === ts.SyntaxKind.BarBarToken ||
          op === ts.SyntaxKind.QuestionQuestionToken
        ) {
          complexity++;
        }
        break;
      }
    }

    // Don't descend into nested function-like nodes
    if (!isFunctionLike(node)) {
      ts.forEachChild(node, walk);
    }
  }

  // Walk the body, not the function node itself (to avoid double-counting
  // if we ever add function-level increments)
  ts.forEachChild(functionNode, (child) => {
    // Skip parameter lists, modifiers, etc. — walk the body
    if (!isFunctionLike(child)) {
      walk(child);
    }
  });

  return complexity;
}

// ---------------------------------------------------------------------------
// Cognitive complexity
// ---------------------------------------------------------------------------

function computeCognitive(functionNode: ts.Node, _outerNesting: number): number {
  let complexity = 0;

  function walk(node: ts.Node, nesting: number): void {
    switch (node.kind) {
      // Structural increments with nesting penalty
      case ts.SyntaxKind.IfStatement: {
        const ifStmt = node as ts.IfStatement;

        // Only increment if this is NOT an `else if` (else-if is handled by
        // the parent if's elseStatement branch below)
        const parent = ifStmt.parent;
        const isElseIf =
          parent &&
          ts.isIfStatement(parent) &&
          parent.elseStatement === ifStmt;

        if (!isElseIf) {
          complexity += 1 + nesting; // increment + nesting penalty
        } else {
          // else if: +1 flat, no nesting penalty
          complexity += 1;
        }

        // Walk condition for logical operators
        walkExpression(ifStmt.expression, nesting);

        // Walk then-branch with increased nesting
        if (ifStmt.thenStatement) {
          walk(ifStmt.thenStatement, nesting + 1);
        }

        // Handle else / else-if
        if (ifStmt.elseStatement) {
          if (ts.isIfStatement(ifStmt.elseStatement)) {
            // else if — walk it at SAME nesting (it adds its own +1)
            walk(ifStmt.elseStatement, nesting);
          } else {
            // plain else — +1, then walk body at nesting+1
            complexity += 1;
            walk(ifStmt.elseStatement, nesting + 1);
          }
        }
        return; // already handled children
      }

      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
        complexity += 1 + nesting;
        walkChildren(node, nesting + 1);
        return;

      case ts.SyntaxKind.CatchClause:
        complexity += 1 + nesting;
        walkChildren(node, nesting + 1);
        return;

      case ts.SyntaxKind.SwitchStatement:
        complexity += 1 + nesting;
        walkChildren(node, nesting + 1);
        return;

      case ts.SyntaxKind.ConditionalExpression: {
        // Ternary: +1 + nesting
        complexity += 1 + nesting;
        const cond = node as ts.ConditionalExpression;
        walkExpression(cond.condition, nesting);
        walk(cond.whenTrue, nesting + 1);
        walk(cond.whenFalse, nesting + 1);
        return;
      }

      case ts.SyntaxKind.BreakStatement:
      case ts.SyntaxKind.ContinueStatement: {
        const stmt = node as ts.BreakStatement | ts.ContinueStatement;
        if (stmt.label) {
          complexity += 1;
        }
        return;
      }
    }

    // Handle logical operators at the expression level
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      if (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.QuestionQuestionToken
      ) {
        complexity += 1;
        // Walk operands for further logical ops, but don't double-count
        walkExpression(node.left, nesting);
        walkExpression(node.right, nesting);
        return;
      }
    }

    // Don't descend into nested function-like nodes
    if (isFunctionLike(node)) {
      return;
    }

    walkChildren(node, nesting);
  }

  function walkChildren(node: ts.Node, nesting: number): void {
    ts.forEachChild(node, (child) => {
      // Skip nested functions
      if (!isFunctionLike(child)) {
        walk(child, nesting);
      }
    });
  }

  function walkExpression(node: ts.Node, nesting: number): void {
    // Walk an expression subtree looking only for logical operators
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      if (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.QuestionQuestionToken
      ) {
        complexity += 1;
        walkExpression(node.left, nesting);
        walkExpression(node.right, nesting);
        return;
      }
    }
    ts.forEachChild(node, (child) => walkExpression(child, nesting));
  }

  // Walk the function body
  ts.forEachChild(functionNode, (child) => {
    if (!isFunctionLike(child)) {
      walk(child, 0);
    }
  });

  return complexity;
}
