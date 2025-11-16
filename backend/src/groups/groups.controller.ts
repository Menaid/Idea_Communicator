import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('groups')
@Controller('groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  async create(@Request() req, @Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.create(req.user.userId, createGroupDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all groups for current user' })
  @ApiResponse({ status: 200, description: 'Returns all groups' })
  async findAll(@Request() req) {
    return this.groupsService.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID' })
  @ApiResponse({ status: 200, description: 'Returns group details' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.groupsService.findOne(id, req.user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update group' })
  @ApiResponse({ status: 200, description: 'Group updated successfully' })
  @ApiResponse({ status: 403, description: 'Only admins can update' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, req.user.userId, updateGroupDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete group' })
  @ApiResponse({ status: 200, description: 'Group deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only creator/admin can delete' })
  async remove(@Request() req, @Param('id') id: string) {
    await this.groupsService.remove(id, req.user.userId);
    return { message: 'Group deleted successfully' };
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get all members of a group' })
  @ApiResponse({ status: 200, description: 'Returns group members' })
  async getMembers(@Request() req, @Param('id') id: string) {
    return this.groupsService.getMembers(id, req.user.userId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to group' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  @ApiResponse({ status: 403, description: 'Only admins can add members' })
  async addMember(
    @Request() req,
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.groupsService.addMember(id, req.user.userId, addMemberDto);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from group' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Only admins can remove members' })
  async removeMember(
    @Request() req,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.groupsService.removeMember(id, req.user.userId, userId);
    return { message: 'Member removed successfully' };
  }
}
