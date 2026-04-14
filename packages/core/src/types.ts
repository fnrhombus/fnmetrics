export interface ComplexityResult {
  /** Name of the function/method */
  name: string;
  /** Cyclomatic complexity (decision points + 1) */
  cyclomatic: number;
  /** Cognitive complexity (SonarSource-style, nesting-aware) */
  cognitive: number;
  /** 0-based line number where the function starts */
  line: number;
  /** 0-based character offset on the start line */
  character: number;
}

export interface ThresholdConfig {
  green: number;
  yellow: number;
}
