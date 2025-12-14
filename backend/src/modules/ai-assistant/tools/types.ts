import OpenAI from 'openai';

/**
 * Parámetros que recibe cada herramienta
 * Incluye _userId inyectado automáticamente por el executor
 */
export interface ToolParams extends Record<string, unknown> {
  _userId: string; // ID del usuario actual - inyectado automáticamente
}

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
  /**
   * Handler de la herramienta
   * @param params - Parámetros del modelo + _userId inyectado
   */
  handler: (params: ToolParams) => Promise<unknown>;
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
