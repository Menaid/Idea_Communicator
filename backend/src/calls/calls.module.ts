import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { CallsGateway } from './calls.gateway';
import { Call } from './entities/call.entity';
import { GroupsModule } from '../groups/groups.module';
import { CommonModule } from '../common/common.module';

/**
 * CallsModule
 *
 * Handles voice/video call functionality
 * - REST API for call management
 * - WebSocket gateway for real-time signaling
 * - Integration with Groups
 *
 * Phase 3 Implementation
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Call]),
    forwardRef(() => GroupsModule), // Prevent circular dependency
    CommonModule,
  ],
  controllers: [CallsController],
  providers: [CallsService, CallsGateway],
  exports: [CallsService, CallsGateway],
})
export class CallsModule {}
