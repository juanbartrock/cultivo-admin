import { Injectable, Logger } from '@nestjs/common';
import { ToolDefinition, OpenAITool, toOpenAITool } from './types';

/**
 * Registro central de todas las herramientas disponibles para el agente
 */
@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private tools: Map<string, ToolDefinition> = new Map();

  /**
   * Registra una herramienta
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Tool ${tool.name} already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);
    this.logger.log(`Registered tool: ${tool.name}`);
  }

  /**
   * Registra múltiples herramientas
   */
  registerAll(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Obtiene una herramienta por nombre
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Verifica si una herramienta existe
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Obtiene todas las herramientas en formato OpenAI
   */
  getOpenAITools(): OpenAITool[] {
    return Array.from(this.tools.values()).map(toOpenAITool);
  }

  /**
   * Obtiene los nombres de todas las herramientas
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Obtiene el número de herramientas registradas
   */
  count(): number {
    return this.tools.size;
  }
}
