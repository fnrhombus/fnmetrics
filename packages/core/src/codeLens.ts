import * as vscode from "vscode";
import { analyzeComplexity } from "./complexity.js";
import type { ComplexityResult, ThresholdConfig } from "./types.js";

export class ComplexityCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.CodeLens[] {
    const config = vscode.workspace.getConfiguration("fnmetrics");
    if (!config.get<boolean>("enabled", true)) {
      return [];
    }

    const results = analyzeComplexity(document.fileName, document.getText());
    const thresholds: ThresholdConfig = {
      green: config.get<number>("greenThreshold", 5),
      yellow: config.get<number>("yellowThreshold", 10),
    };

    return results.map((result) => createCodeLens(result, thresholds));
  }
}

function createCodeLens(
  result: ComplexityResult,
  thresholds: ThresholdConfig,
): vscode.CodeLens {
  const range = new vscode.Range(result.line, result.character, result.line, result.character);
  const maxComplexity = Math.max(result.cyclomatic, result.cognitive);
  const icon = getIcon(maxComplexity, thresholds);

  const command: vscode.Command = {
    title: `${icon} Complexity: ${result.cyclomatic} (cyclomatic) \u00b7 ${result.cognitive} (cognitive)`,
    command: "",
    tooltip: `${result.name}\nCyclomatic: ${result.cyclomatic} (decision paths)\nCognitive: ${result.cognitive} (understanding difficulty)`,
  };

  return new vscode.CodeLens(range, command);
}

function getIcon(complexity: number, thresholds: ThresholdConfig): string {
  if (complexity <= thresholds.green) return "\u{1F7E2}";   // green circle
  if (complexity <= thresholds.yellow) return "\u{1F7E1}";  // yellow circle
  return "\u{1F534}";                                        // red circle
}
