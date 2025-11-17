import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { CallsService } from './calls.service';
import { StartCallDto } from './dto/start-call.dto';
import { JoinCallDto } from './dto/join-call.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('calls')
@Controller('calls')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new call in a group' })
  @ApiResponse({ status: 201, description: 'Call started successfully' })
  @ApiResponse({ status: 400, description: 'There is already an active call' })
  async startCall(
    @Request() req: ExpressRequest & { user: any },
    @Body() startCallDto: StartCallDto,
  ) {
    return this.callsService.startCall(req.user.id, startCallDto);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join an active call' })
  @ApiResponse({ status: 200, description: 'Joined call successfully' })
  @ApiResponse({ status: 404, description: 'Call not found' })
  async joinCall(
    @Request() req: ExpressRequest & { user: any },
    @Param('id') id: string,
    @Body() joinCallDto: JoinCallDto,
  ) {
    return this.callsService.joinCall(id, req.user.id, joinCallDto);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave a call' })
  @ApiResponse({ status: 200, description: 'Left call successfully' })
  async leaveCall(@Request() req: ExpressRequest & { user: any }, @Param('id') id: string) {
    await this.callsService.leaveCall(id, req.user.id);
    return { message: 'Left call successfully' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'End a call (admin/initiator only)' })
  @ApiResponse({ status: 200, description: 'Call ended successfully' })
  async endCall(@Request() req: ExpressRequest & { user: any }, @Param('id') id: string) {
    await this.callsService.endCall(id);
    return { message: 'Call ended successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get call details' })
  @ApiResponse({ status: 200, description: 'Returns call details' })
  async getCall(@Request() req: ExpressRequest & { user: any }, @Param('id') id: string) {
    return this.callsService.findOne(id, req.user.id);
  }

  @Get('group/:groupId/active')
  @ApiOperation({ summary: 'Get active call in a group' })
  @ApiResponse({ status: 200, description: 'Returns active call or null' })
  async getActiveCall(
    @Request() req: ExpressRequest & { user: any },
    @Param('groupId') groupId: string,
  ) {
    return this.callsService.findActiveCallInGroup(groupId, req.user.id);
  }

  @Get('group/:groupId/history')
  @ApiOperation({ summary: 'Get call history for a group' })
  @ApiResponse({ status: 200, description: 'Returns call history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCallHistory(
    @Request() req: ExpressRequest & { user: any },
    @Param('groupId') groupId: string,
    @Query('limit') limit?: number,
  ) {
    return this.callsService.getCallHistory(groupId, req.user.id, limit);
  }
}
