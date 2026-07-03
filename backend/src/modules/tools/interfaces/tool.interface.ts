export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ToolContext {
  userId: string;
  chatId?: string;
}

/**
 * Interface that all AI tools must implement.
 */
export interface AITool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;

  /**
   * Execute the tool with given arguments.
   */
  execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;

  /**
   * Get OpenAI-compatible tool definition.
   */
  getDefinition(): {
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  };
}
