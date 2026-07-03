import { Injectable } from '@nestjs/common';
import { AITool, ToolContext, ToolResult } from './interfaces/tool.interface';
import {
  CalculatorTool,
  CurrentTimeTool,
  WebhookTool,
  FileReaderTool,
} from './implementations/builtin.tools';

/**
 * Registry and executor for AI tools.
 */
@Injectable()
export class ToolRegistry {
  private readonly tools: Map<string, AITool>;

  constructor(
    calculator: CalculatorTool,
    currentTime: CurrentTimeTool,
    webhook: WebhookTool,
    fileReader: FileReaderTool,
  ) {
    this.tools = new Map<string, AITool>([
      [calculator.name, calculator],
      [currentTime.name, currentTime],
      [webhook.name, webhook],
      [fileReader.name, fileReader],
    ]);
  }

  /**
   * Get all tool definitions for AI function calling.
   */
  getDefinitions() {
    return Array.from(this.tools.values()).map((t) => t.getDefinition());
  }

  /**
   * Execute a tool by name.
   */
  async execute(
    name: string,
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool "${name}" not found` };
    }
    return tool.execute(args, context);
  }

  /**
   * List all registered tool names.
   */
  listTools(): string[] {
    return Array.from(this.tools.keys());
  }
}
