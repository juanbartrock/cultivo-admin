import { Module } from '@nestjs/common';
import { AIAssistantController } from './ai-assistant.controller';
import { AIAssistantService } from './ai-assistant.service';
import { ContextBuilderService } from './context-builder.service';
import { MemoryService } from './memory.service';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { ToolRegistry, ToolExecutor, ToolsProviderService } from './tools';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AIAssistantController],
  providers: [
    // Core services
    AIAssistantService,
    ContextBuilderService,
    MemoryService,
    
    // Agent services
    AgentOrchestratorService,
    
    // Tools infrastructure
    ToolRegistry,
    ToolExecutor,
    ToolsProviderService,
  ],
  exports: [AIAssistantService, MemoryService],
})
export class AIAssistantModule {}
