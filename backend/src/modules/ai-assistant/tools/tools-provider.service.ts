import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ToolRegistry } from './tool-registry';
import { createPlantTools } from './plants.tools';
import { createPlanTools } from './plans.tools';
import { createInfrastructureTools } from './infrastructure.tools';
import { createAutomationTools } from './automations.tools';
import { createContextTools } from './context.tools';
import { createAutonomousProposalTools } from './autonomous-proposal.tools';

/**
 * Proveedor que inicializa y registra todas las herramientas disponibles
 */
@Injectable()
export class ToolsProviderService implements OnModuleInit {
  private readonly logger = new Logger(ToolsProviderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly toolRegistry: ToolRegistry,
  ) {}

  onModuleInit() {
    this.registerAllTools();
  }

  private registerAllTools() {
    this.logger.log('Registering AI Assistant tools...');

    // Herramientas de plantas
    const plantTools = createPlantTools(this.prisma);
    this.toolRegistry.registerAll(plantTools);
    this.logger.log(`Registered ${plantTools.length} plant tools`);

    // Herramientas de planes
    const planTools = createPlanTools(this.prisma);
    this.toolRegistry.registerAll(planTools);
    this.logger.log(`Registered ${planTools.length} plan tools`);

    // Herramientas de infraestructura
    const infraTools = createInfrastructureTools(this.prisma);
    this.toolRegistry.registerAll(infraTools);
    this.logger.log(`Registered ${infraTools.length} infrastructure tools`);

    // Herramientas de automatizaciones
    const automationTools = createAutomationTools(this.prisma);
    this.toolRegistry.registerAll(automationTools);
    this.logger.log(`Registered ${automationTools.length} automation tools`);

    // Herramientas de contexto
    const contextTools = createContextTools(this.prisma);
    this.toolRegistry.registerAll(contextTools);
    this.logger.log(`Registered ${contextTools.length} context tools`);

    // Herramientas de propuestas autónomas
    const autonomousTools = createAutonomousProposalTools(this.prisma);
    this.toolRegistry.registerAll(autonomousTools);
    this.logger.log(`Registered ${autonomousTools.length} autonomous proposal tools`);

    this.logger.log(`Total tools registered: ${this.toolRegistry.count()}`);
    this.logger.log(`Available tools: ${this.toolRegistry.getToolNames().join(', ')}`);
  }
}
