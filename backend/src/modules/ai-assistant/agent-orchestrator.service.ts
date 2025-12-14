import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ToolRegistry, ToolExecutor } from './tools';
import { AIContextType, AIMessageRole } from '@prisma/client';
import OpenAI from 'openai';

/**
 * Resultado del procesamiento del agente
 */
export interface AgentResponse {
  content: string;
  toolsUsed: string[];
  iterations: number;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * Información de una iteración del agente
 */
interface AgentIteration {
  iteration: number;
  toolCalls?: string[];
  response?: string;
}

// Colores para logs (ANSI)
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgMagenta: '\x1b[45m',
};

const AGENT_SYSTEM_PROMPT = `Eres un consultor experto en cultivo indoor de cannabis con acceso completo al sistema de gestión.

## TU ROL
- Experto en cultivo de cannabis indoor
- Conocedor de nutrición vegetal, control de plagas/hongos, automatización
- Asesor en tecnología IoT para cultivo
- Siempre basas tus respuestas en datos del sistema

## HERRAMIENTAS DISPONIBLES
Tienes acceso a herramientas para obtener información del sistema. SIEMPRE usa las herramientas antes de responder sobre:

- **Plantas específicas**: Usa get_plant_details cuando el usuario mencione una planta por número (ej: "048", "la 041", "planta 69")
- **Planes de prevención**: Usa get_prevention_plan para obtener detalles de un plan de prevención
- **Planes de alimentación**: Usa get_feeding_plan para obtener detalles de un plan de alimentación
- **Secciones/Carpas**: Usa get_section_details para obtener información de una sección
- **Automatizaciones**: Usa get_automation para obtener detalles de una automatización
- **Dispositivos/Sensores**: Usa get_device_status o get_sensor_readings
- **Búsquedas**: Usa search_plants para buscar plantas por criterios
- **Vista general**: Usa get_system_overview para un resumen del sistema

## FLUJO DE TRABAJO
1. Analiza el mensaje del usuario
2. Identifica qué información necesitas del sistema
3. Llama a las herramientas necesarias para obtener esa información
4. Si necesitas más información después de ver los resultados, llama más herramientas
5. Cuando tengas toda la información necesaria, genera tu respuesta

## REGLAS IMPORTANTES
- NUNCA inventes datos. Si no tienes la información, usa las herramientas.
- Si el usuario menciona una planta por número, SIEMPRE usa get_plant_details primero
- Si el usuario menciona un plan, SIEMPRE usa get_prevention_plan o get_feeding_plan
- Responde siempre en español
- Sé preciso y usa los datos reales del sistema
- Si detectas problemas, menciónalos proactivamente

## FORMATO JSON PARA PLANES DE PREVENCIÓN
Cuando el usuario solicite un JSON para crear o importar un plan de prevención, DEBES usar EXACTAMENTE esta estructura:

\`\`\`json
{
  "name": "Nombre del plan",
  "description": "Descripción opcional del plan",
  "stage": "VEGETATIVO" | "FLORACION" | "PRE_FLORA" | "GERMINACION" | "SECADO" | "CURADO",
  "totalDays": 21,
  "applications": [
    {
      "dayNumber": 1,
      "applicationType": "FOLIAR" | "RIEGO" | "PREVENTIVO",
      "target": "PLAGAS" | "HONGOS" | "AMBOS" | "PREVENTIVO",
      "products": [
        {
          "name": "Nombre del producto",
          "dose": "5",
          "unit": "ml/L"
        }
      ],
      "notes": "Notas opcionales"
    }
  ]
}
\`\`\`

### Campos requeridos:
- **name**: string (nombre del plan)
- **stage**: uno de: "GERMINACION", "VEGETATIVO", "PRE_FLORA", "FLORACION", "SECADO", "CURADO"
- **totalDays**: number (duración del ciclo en días)
- **applications**: array de aplicaciones

### Campos opcionales:
- **description**: string (descripción del plan)
- **applicationType**: "FOLIAR" | "RIEGO" | "PREVENTIVO" (opcional en cada aplicación)
- **target**: "PLAGAS" | "HONGOS" | "AMBOS" | "PREVENTIVO" (opcional en cada aplicación)
- **notes**: string (opcional en cada aplicación)

### Estructura de cada aplicación:
- **dayNumber**: number (día de aplicación: 1, 7, 14, etc.)
- **products**: array de objetos con:
  - **name**: string (nombre del producto)
  - **dose**: string (dosis como string, ej: "5", "2.5", "1")
  - **unit**: string (unidad, ej: "ml/L", "g/L", "ml/10L")
- **applicationType**: opcional, tipo de aplicación
- **target**: opcional, objetivo de la aplicación
- **notes**: opcional, notas adicionales

### Ejemplo completo:
\`\`\`json
{
  "name": "Preventivo Floración 21 días",
  "description": "Ciclo preventivo para floración con rotación de productos",
  "stage": "FLORACION",
  "totalDays": 21,
  "applications": [
    {
      "dayNumber": 1,
      "applicationType": "FOLIAR",
      "target": "PLAGAS",
      "products": [
        {
          "name": "Aceite de Neem",
          "dose": "5",
          "unit": "ml/L"
        },
        {
          "name": "Jabón potásico",
          "dose": "3",
          "unit": "ml/L"
        }
      ],
      "notes": "Aplicar al atardecer"
    },
    {
      "dayNumber": 7,
      "applicationType": "RIEGO",
      "target": "HONGOS",
      "products": [
        {
          "name": "Trichoderma harzianum",
          "dose": "1",
          "unit": "g/L"
        }
      ],
      "notes": "Aplicar en sustrato húmedo"
    }
  ]
}
\`\`\`

**IMPORTANTE**: Cuando generes un JSON para un plan de prevención, SIEMPRE usa esta estructura exacta. NO inventes campos adicionales ni cambies los nombres de los campos. Los valores de "stage", "applicationType" y "target" deben ser exactamente uno de los valores permitidos en mayúsculas.

## FORMATO JSON PARA PLANES DE ALIMENTACIÓN
Cuando el usuario solicite un JSON para crear o importar un plan de alimentación, DEBES usar EXACTAMENTE esta estructura:

\`\`\`json
{
  "name": "Nombre del plan",
  "description": "Descripción opcional del plan",
  "stage": "VEGETATIVO" | "FLORACION" | "PRE_FLORA" | "GERMINACION" | "SECADO" | "CURADO",
  "weeks": [
    {
      "weekNumber": 1,
      "products": [
        {
          "name": "Nombre del producto",
          "dose": "2",
          "unit": "ml/L"
        }
      ],
      "ph": 6.2,
      "ec": 1.2,
      "notes": "Notas opcionales"
    }
  ]
}
\`\`\`

### Campos requeridos:
- **name**: string (nombre del plan)
- **stage**: uno de: "GERMINACION", "VEGETATIVO", "PRE_FLORA", "FLORACION", "SECADO", "CURADO"
- **weeks**: array de semanas

### Campos opcionales:
- **description**: string (descripción del plan)

### Estructura de cada semana:
- **weekNumber**: number (número de semana: 1, 2, 3, etc.)
- **products**: array de objetos con:
  - **name**: string (nombre del producto)
  - **dose**: string (dosis como string, ej: "2", "1.5", "0.7")
  - **unit**: string (unidad, ej: "ml/L", "g/L", "ml/10L")
- **ph**: number (opcional, pH recomendado)
- **ec**: number (opcional, EC recomendada)
- **notes**: string (opcional, notas adicionales)

### Ejemplo completo:
\`\`\`json
{
  "name": "BioBizz Floración",
  "description": "Plan de floración con productos BioBizz",
  "stage": "FLORACION",
  "weeks": [
    {
      "weekNumber": 1,
      "ph": 6.2,
      "ec": 1.2,
      "products": [
        {
          "name": "Bio-Bloom",
          "dose": "2",
          "unit": "ml/L"
        },
        {
          "name": "Top-Max",
          "dose": "1",
          "unit": "ml/L"
        }
      ]
    },
    {
      "weekNumber": 2,
      "ph": 6.3,
      "ec": 1.4,
      "products": [
        {
          "name": "Bio-Bloom",
          "dose": "3",
          "unit": "ml/L"
        },
        {
          "name": "Top-Max",
          "dose": "2",
          "unit": "ml/L"
        }
      ]
    }
  ]
}
\`\`\`

**IMPORTANTE**: Cuando generes un JSON para un plan de alimentación, SIEMPRE usa esta estructura exacta. NO inventes campos adicionales ni cambies los nombres de los campos. El valor de "stage" debe ser exactamente uno de los valores permitidos en mayúsculas.
`;

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);
  private readonly openai: OpenAI;
  private readonly maxIterations = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly toolRegistry: ToolRegistry,
    private readonly toolExecutor: ToolExecutor,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // ==================== LOGGING HELPERS ====================
  
  private logSection(title: string, color: string = COLORS.cyan) {
    console.log(`\n${color}${COLORS.bright}${'='.repeat(60)}${COLORS.reset}`);
    console.log(`${color}${COLORS.bright}  ${title}${COLORS.reset}`);
    console.log(`${color}${COLORS.bright}${'='.repeat(60)}${COLORS.reset}\n`);
  }

  private logSubSection(title: string) {
    console.log(`\n${COLORS.yellow}--- ${title} ---${COLORS.reset}`);
  }

  private logKeyValue(key: string, value: any, indent: number = 0) {
    const spaces = '  '.repeat(indent);
    if (typeof value === 'object' && value !== null) {
      console.log(`${spaces}${COLORS.dim}${key}:${COLORS.reset}`);
      console.log(`${spaces}${COLORS.white}${JSON.stringify(value, null, 2).split('\n').map(l => spaces + '  ' + l).join('\n')}${COLORS.reset}`);
    } else {
      console.log(`${spaces}${COLORS.dim}${key}:${COLORS.reset} ${COLORS.white}${value}${COLORS.reset}`);
    }
  }

  private logToolCall(name: string, args: any, result: any, error?: string) {
    console.log(`\n${COLORS.magenta}${COLORS.bright}🔧 TOOL CALL: ${name}${COLORS.reset}`);
    console.log(`${COLORS.dim}  Parámetros:${COLORS.reset} ${COLORS.cyan}${JSON.stringify(args)}${COLORS.reset}`);
    if (error) {
      console.log(`${COLORS.red}  ❌ Error: ${error}${COLORS.reset}`);
    } else {
      const resultStr = JSON.stringify(result);
      const truncated = resultStr.length > 500 ? resultStr.substring(0, 500) + '...' : resultStr;
      console.log(`${COLORS.green}  ✓ Resultado:${COLORS.reset} ${COLORS.dim}${truncated}${COLORS.reset}`);
    }
  }

  private logIteration(num: number, action: string) {
    console.log(`\n${COLORS.blue}${COLORS.bright}📍 ITERACIÓN ${num}${COLORS.reset} - ${action}`);
  }

  private logLLMRequest(messages: any[], tools: any[]) {
    console.log(`\n${COLORS.bgBlue}${COLORS.white}${COLORS.bright} 🤖 LLAMADA A LLM ${COLORS.reset}`);
    console.log(`${COLORS.dim}  Modelo:${COLORS.reset} gpt-5.2`);
    console.log(`${COLORS.dim}  Mensajes:${COLORS.reset} ${messages.length}`);
    console.log(`${COLORS.dim}  Herramientas disponibles:${COLORS.reset} ${tools.length}`);
    
    // Mostrar últimos mensajes
    console.log(`${COLORS.yellow}  Últimos 3 mensajes:${COLORS.reset}`);
    const lastMessages = messages.slice(-3);
    lastMessages.forEach((msg, i) => {
      const role = msg.role.toUpperCase();
      const content = typeof msg.content === 'string' 
        ? (msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content)
        : '[Contenido complejo]';
      const hasToolCalls = msg.tool_calls ? ` [+${msg.tool_calls.length} tool_calls]` : '';
      console.log(`${COLORS.dim}    [${role}]${hasToolCalls}${COLORS.reset} ${content}`);
    });
  }

  private logLLMResponse(choice: any, usage: any) {
    console.log(`\n${COLORS.bgGreen}${COLORS.white}${COLORS.bright} ✓ RESPUESTA LLM ${COLORS.reset}`);
    console.log(`${COLORS.dim}  finish_reason:${COLORS.reset} ${choice.finish_reason}`);
    if (usage) {
      console.log(`${COLORS.dim}  Tokens:${COLORS.reset} prompt=${usage.prompt_tokens}, completion=${usage.completion_tokens}, total=${usage.total_tokens}`);
    }
    if (choice.message.tool_calls) {
      console.log(`${COLORS.magenta}  Tool calls solicitados: ${choice.message.tool_calls.length}${COLORS.reset}`);
      choice.message.tool_calls.forEach((tc: any) => {
        console.log(`${COLORS.magenta}    → ${tc.function.name}(${tc.function.arguments})${COLORS.reset}`);
      });
    }
    if (choice.message.content) {
      const content = choice.message.content.length > 300 
        ? choice.message.content.substring(0, 300) + '...' 
        : choice.message.content;
      console.log(`${COLORS.green}  Contenido:${COLORS.reset} ${content}`);
    }
  }

  /**
   * Procesa un mensaje usando el loop de agente
   * @param userMessage - Mensaje del usuario
   * @param conversationId - ID de la conversación
   * @param userId - ID del usuario actual (para filtrar datos)
   * @param imageUrls - URLs de imágenes adjuntas
   */
  async processMessage(
    userMessage: string,
    conversationId: string,
    userId: string,
    imageUrls: string[] = [],
  ): Promise<AgentResponse> {
    // ==================== LOG INICIO ====================
    this.logSection('🚀 NUEVA CONVERSACIÓN CON AGENTE', COLORS.green);
    this.logKeyValue('Conversation ID', conversationId);
    this.logKeyValue('User ID', userId);
    this.logKeyValue('Mensaje del usuario', userMessage);
    this.logKeyValue('Imágenes adjuntas', imageUrls.length);
    
    const toolsUsed: string[] = [];
    const iterations: AgentIteration[] = [];
    let totalTokens = { prompt: 0, completion: 0, total: 0 };

    // Obtener historial de la conversación
    const previousMessages = await this.getConversationHistory(conversationId);
    this.logKeyValue('Mensajes previos en conversación', previousMessages.length);

    // Construir mensajes iniciales
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      ...previousMessages,
    ];

    // Agregar mensaje del usuario (con imágenes si las hay)
    if (imageUrls.length > 0) {
      const content: OpenAI.Chat.ChatCompletionContentPart[] = [
        { type: 'text', text: userMessage },
        ...imageUrls.map((url) => ({
          type: 'image_url' as const,
          image_url: { url, detail: 'high' as const },
        })),
      ];
      messages.push({ role: 'user', content });
    } else {
      messages.push({ role: 'user', content: userMessage });
    }

    // Obtener herramientas disponibles
    const tools = this.toolRegistry.getOpenAITools();
    
    this.logSubSection('HERRAMIENTAS DISPONIBLES');
    const toolNames = tools.map(t => (t as any).function?.name || t.type).join(', ');
    console.log(`${COLORS.cyan}  ${toolNames}${COLORS.reset}`);
    console.log(`${COLORS.dim}  Total: ${tools.length} herramientas${COLORS.reset}`);

    // ==================== AGENT LOOP ====================
    this.logSection('🔄 INICIANDO AGENT LOOP', COLORS.blue);

    for (let i = 0; i < this.maxIterations; i++) {
      this.logIteration(i + 1, 'Llamando al LLM...');

      try {
        // Log de la request
        this.logLLMRequest(messages, tools);

        const response = await this.openai.chat.completions.create({
          model: 'gpt-5.2',
          messages,
          tools: tools.length > 0 ? tools : undefined,
          tool_choice: tools.length > 0 ? 'auto' : undefined,
          max_completion_tokens: 2000,
          temperature: 0.7,
        });

        const choice = response.choices[0];
        const usage = response.usage;

        // Log de la respuesta
        this.logLLMResponse(choice, usage);

        if (usage) {
          totalTokens.prompt += usage.prompt_tokens;
          totalTokens.completion += usage.completion_tokens;
          totalTokens.total += usage.total_tokens;
        }

        // Si el modelo quiere usar herramientas
        if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
          const toolCalls = choice.message.tool_calls as Array<{
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
          }>;
          const toolNames = toolCalls.map((tc) => tc.function.name);
          
          this.logSubSection('EJECUTANDO HERRAMIENTAS');
          toolsUsed.push(...toolNames);

          // Agregar mensaje del asistente con tool calls
          messages.push(choice.message);

          // Ejecutar herramientas y loguear cada una - PASAMOS EL userId
          for (const tc of toolCalls) {
            const args = JSON.parse(tc.function.arguments || '{}');
            const result = await this.toolExecutor.execute(tc, userId);
            this.logToolCall(tc.function.name, args, result.result, result.error);
          }

          // Ejecutar todas y obtener mensajes - PASAMOS EL userId
          const results = await this.toolExecutor.executeAll(toolCalls, userId);
          const toolMessages = this.toolExecutor.resultsToMessages(results);

          // Agregar resultados
          messages.push(...toolMessages);

          iterations.push({
            iteration: i + 1,
            toolCalls: toolNames,
          });

          console.log(`\n${COLORS.yellow}➡️  Continuando a siguiente iteración...${COLORS.reset}`);
          continue;
        }

        // Si el modelo terminó (respuesta final)
        if (choice.finish_reason === 'stop' || choice.finish_reason === 'length') {
          const content = choice.message.content || 'Sin respuesta';
          
          // ==================== LOG FINAL ====================
          this.logSection('✅ AGENTE COMPLETADO', COLORS.green);
          this.logKeyValue('Iteraciones totales', i + 1);
          this.logKeyValue('Herramientas usadas', [...new Set(toolsUsed)]);
          this.logKeyValue('Tokens totales', totalTokens);
          
          this.logSubSection('RESPUESTA FINAL');
          console.log(`${COLORS.green}${content}${COLORS.reset}`);
          console.log(`\n${'='.repeat(60)}\n`);

          return {
            content,
            toolsUsed: [...new Set(toolsUsed)],
            iterations: i + 1,
            tokensUsed: totalTokens,
          };
        }

        // Caso inesperado
        console.log(`${COLORS.red}⚠️  Finish reason inesperado: ${choice.finish_reason}${COLORS.reset}`);
        break;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        this.logSection('❌ ERROR EN AGENTE', COLORS.red);
        this.logKeyValue('Iteración', i + 1);
        this.logKeyValue('Error', errorMessage);
        if (error instanceof Error && error.stack) {
          console.log(`${COLORS.dim}${error.stack}${COLORS.reset}`);
        }
        
        return {
          content: `Lo siento, hubo un error al procesar tu mensaje: ${errorMessage}`,
          toolsUsed,
          iterations: i + 1,
        };
      }
    }

    // Si llegamos al límite de iteraciones
    this.logSection('⚠️ LÍMITE DE ITERACIONES ALCANZADO', COLORS.yellow);
    this.logKeyValue('Máximo iteraciones', this.maxIterations);
    this.logKeyValue('Herramientas usadas', toolsUsed);
    
    return {
      content: 'Lo siento, la consulta requirió demasiados pasos. Por favor, intenta ser más específico.',
      toolsUsed,
      iterations: this.maxIterations,
      tokensUsed: totalTokens,
    };
  }

  /**
   * Obtiene el historial de conversación formateado para OpenAI
   */
  private async getConversationHistory(
    conversationId: string,
  ): Promise<OpenAI.Chat.ChatCompletionMessageParam[]> {
    const messages = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20, // Últimos 20 mensajes
    });

    return messages.map((msg) => ({
      role: msg.role.toLowerCase() as 'user' | 'assistant',
      content: msg.content,
    }));
  }
}
