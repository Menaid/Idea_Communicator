import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { ChatGateway } from '../chat/chat.gateway';
import { CreateCallDto } from './dto/create-call.dto';
import { EndCallDto, EndCallReason } from './dto/end-call.dto';
import { Call } from './entities/call.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * CallsController
 *
 * REST API endpoints for managing voice/video calls
 *
 * Phase 3 Implementation
 */
@ApiTags('calls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
  constructor(
    private readonly callsService: CallsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Create a new call
   */
  @Post()
  @ApiOperation({ summary: 'Create a new call in a group' })
  @ApiResponse({
    status: 201,
    description: 'Call created successfully',
    type: Call,
  })
  @ApiResponse({ status: 400, description: 'Bad request - already active call' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async create(
    @Body() createCallDto: CreateCallDto,
    @CurrentUser() user: User,
  ): Promise<Call> {
    const call = await this.callsService.create(createCallDto, user.id);

    // Notify group members via WebSocket (using chat namespace)
    this.chatGateway.notifyCallCreated(createCallDto.groupId, call);

    return call;
  }

  /**
   * Get call by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get call details by ID' })
  @ApiParam({ name: 'id', description: 'Call ID' })
  @ApiResponse({
    status: 200,
    description: 'Call details',
    type: Call,
  })
  @ApiResponse({ status: 404, description: 'Call not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Call> {
    return this.callsService.findOne(id, user.id);
  }

  /**
   * Get active call for a group (if any)
   * IMPORTANT: This route must come BEFORE 'group/:groupId' to match correctly
   */
  @Get('group/:groupId/active')
  @ApiOperation({ summary: 'Get active call for a group (if exists)' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Active call or null',
    type: Call,
  })
  async findActiveCallForGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: User,
  ): Promise<Call | null> {
    console.log(`[CallsController] GET /group/${groupId}/active - User: ${user.id}`);

    // Verify user is member of the group
    await this.callsService['groupsService'].findOne(groupId, user.id);

    const activeCall = await this.callsService.findActiveCallByGroup(groupId);

    console.log(`[CallsController] Active call result:`, {
      found: !!activeCall,
      callId: activeCall?.id,
      status: activeCall?.status,
      participants: activeCall?.participants,
    });

    return activeCall;
  }

  /**
   * Get call history for a group
   */
  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get call history for a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of calls to return',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'List of calls',
    type: [Call],
  })
  async findByGroup(
    @Param('groupId') groupId: string,
    @Query('limit') limit: number = 50,
    @CurrentUser() user: User,
  ): Promise<Call[]> {
    return this.callsService.findByGroup(groupId, user.id, limit);
  }

  /**
   * Get active calls for current user
   */
  @Get('user/active')
  @ApiOperation({ summary: 'Get active calls for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of active calls',
    type: [Call],
  })
  async findActiveCalls(@CurrentUser() user: User): Promise<Call[]> {
    return this.callsService.findActiveCallsForUser(user.id);
  }

  /**
   * Join a call
   */
  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join an existing call' })
  @ApiParam({ name: 'id', description: 'Call ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully joined call',
    type: Call,
  })
  @ApiResponse({ status: 400, description: 'Call has ended' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  async join(@Param('id') id: string, @CurrentUser() user: User): Promise<Call> {
    return this.callsService.join(id, user.id);
  }

  /**
   * Leave a call
   */
  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a call' })
  @ApiParam({ name: 'id', description: 'Call ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully left call',
    type: Call,
  })
  @ApiResponse({ status: 404, description: 'Call not found' })
  async leave(@Param('id') id: string, @CurrentUser() user: User): Promise<Call> {
    return this.callsService.leave(id, user.id);
  }

  /**
   * End a call
   */
  @Patch(':id/end')
  @ApiOperation({ summary: 'End a call (initiator or admin only)' })
  @ApiParam({ name: 'id', description: 'Call ID' })
  @ApiResponse({
    status: 200,
    description: 'Call ended successfully',
    type: Call,
  })
  @ApiResponse({ status: 403, description: 'Not authorized to end call' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  async end(
    @Param('id') id: string,
    @Body() endCallDto: EndCallDto,
    @CurrentUser() user: User,
  ): Promise<Call> {
    return this.callsService.end(
      id,
      user.id,
      endCallDto.reason || EndCallReason.NORMAL,
    );
  }
}
