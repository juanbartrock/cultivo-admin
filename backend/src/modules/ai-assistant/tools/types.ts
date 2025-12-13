import OpenAI from 'openai';

/**
 * Definición de una herramienta para el agente
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Resultado de la ejecución de una herramienta
 */
export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  error?: string;
}

/**
 * Formato de herramienta para OpenAI
 */
export type OpenAITool = OpenAI.Chat.ChatCompletionTool;

/**
 * Convierte una ToolDefinition al formato de OpenAI
 */
export function toOpenAITool(tool: ToolDefinition): OpenAITool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

/**
 * Interfaz para mensaje de resultado de herramienta
 */
export interface ToolResultMessage {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

/**
 * Mensaje de resultado de herramienta para OpenAI
 */
export function createToolResultMessage(
  toolCallId: string,
  result: unknown,
): ToolResultMessage {
  return {
    role: 'tool',
    tool_call_id: toolCallId,
    content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
  };
}
