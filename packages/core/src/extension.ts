import * as vscode from "vscode";
import { ComplexityCodeLensProvider } from "./codeLens.js";
import { StatusBarManager } from "./statusBar.js";

export function activate(context: vscode.ExtensionContext): void {
  const codeLensProvider = new ComplexityCodeLensProvider();
  const statusBar = new StatusBarManager();

  const selector: vscode.DocumentSelector = [
    { language: "typescript", scheme: "file" },
    { language: "javascript", scheme: "file" },
    { language: "typescriptreact", scheme: "file" },
    { language: "javascriptreact", scheme: "file" },
  ];

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(selector, codeLensProvider),
    statusBar,
  );

  // Update status bar on active editor change
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      statusBar.update(editor?.document);
    }),
  );

  // Update on document save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc === vscode.window.activeTextEditor?.document) {
        statusBar.update(doc);
        codeLensProvider.refresh();
      }
    }),
  );

  // Update on document change (debounced via CodeLens provider)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === vscode.window.activeTextEditor?.document) {
        codeLensProvider.refresh();
        statusBar.update(e.document);
      }
    }),
  );

  // Refresh when config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("fnmetrics")) {
        codeLensProvider.refresh();
        statusBar.update(vscode.window.activeTextEditor?.document);
      }
    }),
  );

  // Initial update
  statusBar.update(vscode.window.activeTextEditor?.document);
}

export function deactivate(): void {
  // Cleanup handled by disposables
}
