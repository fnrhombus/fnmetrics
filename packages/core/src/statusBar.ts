import * as vscode from "vscode";
import { analyzeComplexity } from "./complexity.js";

export class StatusBarManager {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.tooltip = "Average complexity for this file (fnmetrics)";
  }

  update(document: vscode.TextDocument | undefined): void {
    if (!document || !isSupportedLanguage(document.languageId)) {
      this.item.hide();
      return;
    }

    const config = vscode.workspace.getConfiguration("fnmetrics");
    if (!config.get<boolean>("enabled", true)) {
      this.item.hide();
      return;
    }

    const results = analyzeComplexity(document.fileName, document.getText());
    if (results.length === 0) {
      this.item.text = "$(symbol-function) No functions";
      this.item.show();
      return;
    }

    const avgCyclomatic =
      results.reduce((sum, r) => sum + r.cyclomatic, 0) / results.length;
    const avgCognitive =
      results.reduce((sum, r) => sum + r.cognitive, 0) / results.length;

    this.item.text = `$(symbol-function) Avg: ${avgCyclomatic.toFixed(1)}C / ${avgCognitive.toFixed(1)}K`;
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}

function isSupportedLanguage(languageId: string): boolean {
  return ["typescript", "javascript", "typescriptreact", "javascriptreact"].includes(
    languageId,
  );
}
