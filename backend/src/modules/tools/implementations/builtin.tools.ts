import { Injectable } from '@nestjs/common';
import { AITool, ToolContext, ToolResult } from '../interfaces/tool.interface';

@Injectable()
export class CalculatorTool implements AITool {
  readonly name = 'calculator';
  readonly description = 'Perform mathematical calculations';
  readonly parameters = {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Mathematical expression to evaluate (e.g. "2 + 2 * 3")',
      },
    },
    required: ['expression'],
  };

  getDefinition() {
    return {
      type: 'function' as const,
      function: {
        name: this.name,
        description: this.description,
        parameters: this.parameters,
      },
    };
  }

  async execute(
    args: Record<string, unknown>,
    _context: ToolContext,
  ): Promise<ToolResult> {
    try {
      const expression = String(args.expression);
      const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
      const result = Function(`"use strict"; return (${sanitized})`)() as number;
      return { success: true, data: { result } };
    } catch {
      return { success: false, error: 'Invalid mathematical expression' };
    }
  }
}

@Injectable()
export class CurrentTimeTool implements AITool {
  readonly name = 'current_time';
  readonly description = 'Get the current date and time';
  readonly parameters = {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'IANA timezone (e.g. "America/New_York")',
      },
    },
  };

  getDefinition() {
    return {
      type: 'function' as const,
      function: {
        name: this.name,
        description: this.description,
        parameters: this.parameters,
      },
    };
  }

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const timezone = (args.timezone as string) ?? 'UTC';
    const now = new Date().toLocaleString('en-US', { timeZone: timezone });
    return { success: true, data: { datetime: now, timezone } };
  }
}

@Injectable()
export class WebhookTool implements AITool {
  readonly name = 'webhook_caller';
  readonly description = 'Call an external webhook URL';
  readonly parameters = {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Webhook URL' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
      body: { type: 'object', description: 'Request body for POST/PUT' },
    },
    required: ['url'],
  };

  getDefinition() {
    return {
      type: 'function' as const,
      function: {
        name: this.name,
        description: this.description,
        parameters: this.parameters,
      },
    };
  }

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const response = await fetch(String(args.url), {
        method: (args.method as string) ?? 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: args.body ? JSON.stringify(args.body) : undefined,
      });
      const data = await response.text();
      return {
        success: true,
        data: { status: response.status, body: data.slice(0, 2000) },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook call failed',
      };
    }
  }
}

@Injectable()
export class FileReaderTool implements AITool {
  readonly name = 'file_reader';
  readonly description = 'Read content from an uploaded document by ID';
  readonly parameters = {
    type: 'object',
    properties: {
      documentId: { type: 'string', description: 'Document ID to read' },
    },
    required: ['documentId'],
  };

  getDefinition() {
    return {
      type: 'function' as const,
      function: {
        name: this.name,
        description: this.description,
        parameters: this.parameters,
      },
    };
  }

  async execute(): Promise<ToolResult> {
    return { success: true, data: { message: 'Use RAG retrieval for document content' } };
  }
}
