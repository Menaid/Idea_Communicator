import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private groupMembersRepository: Repository<GroupMember>,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {}

  async create(userId: string, createGroupDto: CreateGroupDto): Promise<Group> {
    const group = this.groupsRepository.create({
      ...createGroupDto,
      createdById: userId,
    });

    const savedGroup = await this.groupsRepository.save(group);

    // Add creator as admin
    await this.groupMembersRepository.save({
      groupId: savedGroup.id,
      userId: userId,
      role: 'admin',
    });

    // Add additional members if provided
    if (createGroupDto.memberIds && createGroupDto.memberIds.length > 0) {
      const members = createGroupDto.memberIds.map(memberId => ({
        groupId: savedGroup.id,
        userId: memberId,
        role: 'member',
      }));
      await this.groupMembersRepository.save(members);
    }

    return this.findOne(savedGroup.id, userId);
  }

  async findAll(userId: string): Promise<Group[]> {
    const memberGroups = await this.groupMembersRepository.find({
      where: { userId, isActive: true },
      relations: ['group', 'group.createdBy', 'group.members', 'group.members.user'],
    });

    const groups = memberGroups.map(mg => mg.group).filter(g => g.isActive);

    // Add unread count to each group
    for (const group of groups) {
      const memberData = memberGroups.find(mg => mg.groupId === group.id);
      (group as any).unreadCount = await this.getUnreadCount(group.id, userId, memberData?.lastReadAt);
    }

    return groups;
  }

  async getUnreadCount(groupId: string, userId: string, lastReadAt?: Date): Promise<number> {
    const query = this.groupsRepository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('messages', 'message')
      .where('message.groupId = :groupId', { groupId })
      .andWhere('message.senderId != :userId', { userId })
      .andWhere('message.isDeleted = false');

    if (lastReadAt) {
      query.andWhere('message.createdAt > :lastReadAt', { lastReadAt });
    }

    const result = await query.getRawOne();
    return parseInt(result.count, 10);
  }

  async markAsRead(groupId: string, userId: string): Promise<void> {
    const member = await this.groupMembersRepository.findOne({
      where: { groupId, userId, isActive: true },
    });

    if (!member) {
      throw new NotFoundException('Group membership not found');
    }

    member.lastReadAt = new Date();
    await this.groupMembersRepository.save(member);
  }

  async findOne(groupId: string, userId: string): Promise<Group> {
    const group = await this.groupsRepository.findOne({
      where: { id: groupId },
      relations: ['createdBy', 'members', 'members.user'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if user is a member
    const isMember = group.members.some(m => m.userId === userId && m.isActive);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    return group;
  }

  async update(groupId: string, userId: string, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const group = await this.findOne(groupId, userId);

    // Check if user is admin
    const member = group.members.find(m => m.userId === userId);
    if (!member || member.role !== 'admin') {
      throw new ForbiddenException('Only group admins can update the group');
    }

    Object.assign(group, updateGroupDto);
    await this.groupsRepository.save(group);

    return this.findOne(groupId, userId);
  }

  async remove(groupId: string, userId: string): Promise<void> {
    const group = await this.findOne(groupId, userId);

    // Check if user is the creator or admin
    if (group.createdById !== userId) {
      const member = group.members.find(m => m.userId === userId);
      if (!member || member.role !== 'admin') {
        throw new ForbiddenException('Only the group creator or admins can delete the group');
      }
    }

    group.isActive = false;
    await this.groupsRepository.save(group);
  }

  async addMember(groupId: string, userId: string, addMemberDto: AddMemberDto): Promise<GroupMember> {
    const group = await this.findOne(groupId, userId);

    // Check if user is admin
    const member = group.members.find(m => m.userId === userId);
    if (!member || member.role !== 'admin') {
      throw new ForbiddenException('Only group admins can add members');
    }

    // Check if user is already a member
    const existingMember = await this.groupMembersRepository.findOne({
      where: { groupId, userId: addMemberDto.userId },
    });

    if (existingMember) {
      if (existingMember.isActive) {
        throw new BadRequestException('User is already a member of this group');
      } else {
        // Reactivate membership
        existingMember.isActive = true;
        existingMember.role = addMemberDto.role || 'member';
        const reactivatedMember = await this.groupMembersRepository.save(existingMember);

        // Send notification to the re-added user
        this.chatGateway.notifyUserAddedToGroup(
          addMemberDto.userId,
          groupId,
          group.name,
          userId,
        );

        return reactivatedMember;
      }
    }

    const newMember = this.groupMembersRepository.create({
      groupId,
      userId: addMemberDto.userId,
      role: addMemberDto.role || 'member',
    });

    const savedMember = await this.groupMembersRepository.save(newMember);

    // Send notification to the newly added user
    this.chatGateway.notifyUserAddedToGroup(
      addMemberDto.userId,
      groupId,
      group.name,
      userId, // The user who invited them
    );

    return savedMember;
  }

  async removeMember(groupId: string, userId: string, memberIdToRemove: string): Promise<void> {
    const group = await this.findOne(groupId, userId);

    // Check if user is admin or removing themselves
    if (userId !== memberIdToRemove) {
      const member = group.members.find(m => m.userId === userId);
      if (!member || member.role !== 'admin') {
        throw new ForbiddenException('Only group admins can remove members');
      }
    }

    // Cannot remove the group creator
    if (memberIdToRemove === group.createdById) {
      throw new ForbiddenException('Cannot remove the group creator');
    }

    const memberToRemove = await this.groupMembersRepository.findOne({
      where: { groupId, userId: memberIdToRemove },
    });

    if (!memberToRemove) {
      throw new NotFoundException('Member not found in this group');
    }

    memberToRemove.isActive = false;
    await this.groupMembersRepository.save(memberToRemove);
  }

  async getMembers(groupId: string, userId: string): Promise<GroupMember[]> {
    await this.findOne(groupId, userId); // Check access

    return this.groupMembersRepository.find({
      where: { groupId, isActive: true },
      relations: ['user'],
    });
  }
}
