import { Injectable, Logger } from '@nestjs/common';
import { ToolRegistry } from './tool-registry';
import { ToolResult, ToolResultMessage, createToolResultMessage } from './types';

// Colores para logs
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

/**
 * Interfaz para tool call compatible con OpenAI
 */
interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Ejecutor de herramientas - procesa las llamadas del modelo
 */
@Injectable()
export class ToolExecutor {
  private readonly logger = new Logger(ToolExecutor.name);
  private executionCount = 0;

  constructor(private readonly registry: ToolRegistry) {}

  /**
   * Ejecuta una llamada a herramienta
   */
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const { id, function: fn } = toolCall;
    const { name, arguments: argsString } = fn;
    const execId = ++this.executionCount;
    const startTime = Date.now();

    console.log(`\n${C.magenta}${C.bright}┌─ 🔧 TOOL EXECUTION #${execId}: ${name} ─┐${C.reset}`);
    console.log(`${C.dim}│  ID: ${id}${C.reset}`);

    const tool = this.registry.get(name);
    if (!tool) {
      console.log(`${C.red}│  ❌ ERROR: Herramienta no encontrada${C.reset}`);
      console.log(`${C.magenta}└${'─'.repeat(50)}┘${C.reset}`);
      return {
        toolCallId: id,
        name,
        result: null,
        error: `Herramienta '${name}' no encontrada`,
      };
    }

    try {
      // Parsear argumentos
      const args = JSON.parse(argsString || '{}');
      console.log(`${C.cyan}│  📥 PARÁMETROS:${C.reset}`);
      Object.entries(args).forEach(([key, value]) => {
        console.log(`${C.dim}│     ${key}: ${C.reset}${C.yellow}${JSON.stringify(value)}${C.reset}`);
      });

      // Ejecutar handler
      console.log(`${C.dim}│  ⏳ Ejecutando...${C.reset}`);
      const result = await tool.handler(args);
      const duration = Date.now() - startTime;
      
      console.log(`${C.green}│  ✓ ÉXITO${C.reset} ${C.dim}(${duration}ms)${C.reset}`);
      
      // Mostrar resultado resumido
      const resultStr = JSON.stringify(result);
      if (resultStr.length > 500) {
        console.log(`${C.dim}│  📤 RESULTADO (truncado):${C.reset}`);
        console.log(`${C.dim}│     ${resultStr.substring(0, 500)}...${C.reset}`);
        console.log(`${C.dim}│     [Total: ${resultStr.length} caracteres]${C.reset}`);
      } else {
        console.log(`${C.dim}│  📤 RESULTADO:${C.reset}`);
        const lines = JSON.stringify(result, null, 2).split('\n');
        lines.slice(0, 10).forEach(line => {
          console.log(`${C.dim}│     ${line}${C.reset}`);
        });
        if (lines.length > 10) {
          console.log(`${C.dim}│     ... (${lines.length - 10} líneas más)${C.reset}`);
        }
      }
      
      console.log(`${C.magenta}└${'─'.repeat(50)}┘${C.reset}`);
      
      return {
        toolCallId: id,
        name,
        result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const duration = Date.now() - startTime;
      
      console.log(`${C.red}│  ❌ ERROR${C.reset} ${C.dim}(${duration}ms)${C.reset}`);
      console.log(`${C.red}│     ${errorMessage}${C.reset}`);
      if (error instanceof Error && error.stack) {
        const stackLines = error.stack.split('\n').slice(1, 4);
        stackLines.forEach(line => {
          console.log(`${C.dim}│     ${line.trim()}${C.reset}`);
        });
      }
      console.log(`${C.magenta}└${'─'.repeat(50)}┘${C.reset}`);
      
      return {
        toolCallId: id,
        name,
        result: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Ejecuta múltiples llamadas a herramientas en paralelo
   */
  async executeAll(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    this.logger.log(`Executing ${toolCalls.length} tool calls`);
    
    const results = await Promise.all(
      toolCalls.map((call) => this.execute(call)),
    );

    return results;
  }

  /**
   * Convierte resultados a mensajes de OpenAI
   */
  resultsToMessages(results: ToolResult[]): ToolResultMessage[] {
    return results.map((result) => {
      const content = result.error
        ? `Error: ${result.error}`
        : result.result;
      
      return createToolResultMessage(result.toolCallId, content);
    });
  }
}
