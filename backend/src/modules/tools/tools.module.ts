import { Module } from '@nestjs/common';
import { ToolRegistry } from './tool.registry';
import {
  CalculatorTool,
  CurrentTimeTool,
  WebhookTool,
  FileReaderTool,
} from './implementations/builtin.tools';

@Module({
  providers: [
    ToolRegistry,
    CalculatorTool,
    CurrentTimeTool,
    WebhookTool,
    FileReaderTool,
  ],
  exports: [ToolRegistry],
})
export class ToolsModule {}
