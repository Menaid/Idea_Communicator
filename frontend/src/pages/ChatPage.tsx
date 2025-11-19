import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { groupsService } from '../services/groups.service';
import { messagesService } from '../services/messages.service';
import { usersService } from '../services/users.service';
import { notificationsService } from '../services/notifications.service';
import { Group } from '../types/group.types';
import { Message } from '../types/message.types';
import { User } from '../types/auth';
import { Notification } from '../types/notification';
import { NotificationBell } from '../components/NotificationBell';
import { VideoCall } from '../components/video/VideoCall';
import { callsService, Call } from '../services/calls.service';
import toast from 'react-hot-toast';

export const ChatPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isInCall, setIsInCall] = useState(false);

  useEffect(() => {
    loadGroups();
    loadUnreadNotificationsCount();
  }, []);

  const loadUnreadNotificationsCount = async () => {
    try {
      const count = await notificationsService.getUnreadCount();
      setUnreadNotificationsCount(count);
    } catch (error) {
      console.error('Failed to load unread notifications count:', error);
    }
  };

  useEffect(() => {
    if (selectedGroup) {
      loadMessages(selectedGroup.id);

      // Mark messages as read when selecting a group
      groupsService.markAsRead(selectedGroup.id).catch((error) => {
        console.error('Failed to mark as read:', error);
      });

      // Update local unread count
      setGroups(prevGroups =>
        prevGroups.map(g =>
          g.id === selectedGroup.id ? { ...g, unreadCount: 0 } : g
        )
      );

      if (socket) {
        socket.emit('group:join', { groupId: selectedGroup.id });
      }
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (!socket) return;

    socket.on('message:new', (message: Message) => {
      if (message.groupId === selectedGroup?.id) {
        setMessages((prev) => [message, ...prev]);
        scrollToBottom();
      } else {
        // Increment unread count for other groups
        setGroups(prevGroups =>
          prevGroups.map(g =>
            g.id === message.groupId
              ? { ...g, unreadCount: (g.unreadCount || 0) + 1 }
              : g
          )
        );
      }
    });

    socket.on('typing:start', ({ userId, groupId }) => {
      if (groupId === selectedGroup?.id && userId !== user?.id) {
        setIsTyping(true);
      }
    });

    socket.on('typing:stop', ({ userId, groupId }) => {
      if (groupId === selectedGroup?.id && userId !== user?.id) {
        setIsTyping(false);
      }
    });

    socket.on('notification:group-invitation', (notification: {
      type: string;
      groupId: string;
      groupName: string;
      invitedBy: string;
      timestamp: Date;
    }) => {
      toast.success(`You've been added to the group "${notification.groupName}"!`, {
        duration: 5000,
      });
      // Reload groups to show the new group
      loadGroups();
      // Increment unread notifications count
      setUnreadNotificationsCount(prev => prev + 1);
    });

    return () => {
      socket.off('message:new');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('notification:group-invitation');
    };
  }, [socket, selectedGroup, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadGroups = async () => {
    try {
      const data = await groupsService.getAll();
      setGroups(data);
      if (data.length > 0 && !selectedGroup) {
        setSelectedGroup(data[0]);
      }
    } catch (error) {
      toast.error('Failed to load groups');
    }
  };

  const loadMessages = async (groupId: string) => {
    try {
      const data = await messagesService.getByGroup(groupId, 50);
      setMessages(data.reverse());
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newGroup = await groupsService.create({
        name: newGroupName,
        description: newGroupDescription,
      });
      setGroups([...groups, newGroup]);
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupDescription('');
      toast.success('Group created successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create group');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedGroup) return;

    try {
      if (socket && isConnected) {
        socket.emit('message:send', {
          groupId: selectedGroup.id,
          content: messageInput,
          type: 'text',
        });
      } else {
        await messagesService.create({
          groupId: selectedGroup.id,
          content: messageInput,
          type: 'text',
        });
      }
      setMessageInput('');
      handleTypingStop();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    }
  };

  const handleTypingStart = () => {
    if (!socket || !selectedGroup) return;

    socket.emit('typing:start', { groupId: selectedGroup.id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000);
  };

  const handleTypingStop = () => {
    if (!socket || !selectedGroup) return;

    socket.emit('typing:stop', { groupId: selectedGroup.id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSearchUsers = async (query: string) => {
    setUserSearch(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await usersService.search(query);
      // Filter out users who are already members
      const memberIds = selectedGroup?.members?.map(m => m.userId) || [];
      const filteredResults = results.filter(u => !memberIds.includes(u.id) && u.id !== user?.id);
      setSearchResults(filteredResults);
    } catch (error) {
      toast.error('Failed to search users');
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedGroup) return;

    try {
      await groupsService.addMember(selectedGroup.id, userId);
      toast.success('Member added successfully');
      setShowAddMember(false);
      setUserSearch('');
      setSearchResults([]);
      // Reload the selected group to update members list
      const updatedGroup = await groupsService.getOne(selectedGroup.id);
      setSelectedGroup(updatedGroup);
      loadGroups();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add member');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // If the notification is for a group, select that group
    if (notification.groupId) {
      const group = groups.find(g => g.id === notification.groupId);
      if (group) {
        setSelectedGroup(group);
      } else {
        // Group might be newly added, reload groups
        await loadGroups();
        const updatedGroup = groups.find(g => g.id === notification.groupId);
        if (updatedGroup) {
          setSelectedGroup(updatedGroup);
        }
      }
    }
  };

  const isGroupAdmin = () => {
    if (!selectedGroup || !user) return false;
    const member = selectedGroup.members?.find(m => m.userId === user.id);
    return member?.role === 'admin' || selectedGroup.createdById === user.id;
  };

  const canLeaveGroup = () => {
    if (!selectedGroup || !user) return false;
    return selectedGroup.createdById !== user.id;
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    if (!window.confirm(`Are you sure you want to delete "${selectedGroup.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await groupsService.delete(selectedGroup.id);
      toast.success('Group deleted successfully');
      setGroups(groups.filter(g => g.id !== selectedGroup.id));
      setSelectedGroup(groups.find(g => g.id !== selectedGroup.id) || null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete group');
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup || !user) return;

    if (!window.confirm(`Are you sure you want to leave "${selectedGroup.name}"?`)) {
      return;
    }

    try {
      await groupsService.leave(selectedGroup.id, user.id);
      toast.success('You have left the group');
      setGroups(groups.filter(g => g.id !== selectedGroup.id));
      setSelectedGroup(groups.find(g => g.id !== selectedGroup.id) || null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to leave group');
    }
  };

  const handleStartCall = async () => {
    if (!selectedGroup || !user) return;

    try {
      // Create call in backend
      const call = await callsService.createCall({
        groupId: selectedGroup.id,
        type: 'video',
      });

      // Join the call
      await callsService.joinCall(call.id);

      // Set active call and enter call UI
      setActiveCall(call);
      setIsInCall(true);

      toast.success('Call started');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start call');
    }
  };

  const handleJoinCall = async (call: Call) => {
    if (!user) return;

    try {
      // Join the call in backend
      await callsService.joinCall(call.id);

      // Set active call and enter call UI
      setActiveCall(call);
      setIsInCall(true);

      toast.success('Joined call');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to join call');
    }
  };

  const handleLeaveCall = async () => {
    if (!activeCall || !user) return;

    try {
      // Leave call in backend
      await callsService.leaveCall(activeCall.id);

      // Exit call UI
      setIsInCall(false);
      setActiveCall(null);

      toast.success('Left call');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to leave call');
    }
  };

  // Get participant names for video call
  const getParticipantNames = (): Map<string, string> => {
    const names = new Map<string, string>();

    if (selectedGroup?.members) {
      selectedGroup.members.forEach((member) => {
        if (member.user) {
          names.set(member.userId, `${member.user.firstName} ${member.user.lastName}`);
        }
      });
    }

    return names;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition"
            >
              ← Dashboard
            </button>
            <h1 className="text-xl font-bold text-gray-900">Chat</h1>
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isConnected ? '● Connected' : '● Disconnected'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <NotificationBell
              unreadCount={unreadNotificationsCount}
              onCountChange={setUnreadNotificationsCount}
              onNotificationClick={handleNotificationClick}
            />
            <span className="text-sm text-gray-600">{user?.firstName} {user?.lastName}</span>
            <button
              onClick={() => logout()}
              className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Groups List */}
        <div className="w-64 bg-white border-r flex flex-col">
          <div className="p-3 border-b">
            <button
              onClick={() => setShowCreateGroup(true)}
              className="w-full px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition text-sm font-medium"
            >
              + Create Group
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`relative border-b ${selectedGroup?.id === group.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
              >
                <button
                  onClick={() => setSelectedGroup(group)}
                  className="w-full p-3 text-left hover:bg-gray-50 transition"
                >
                  <div className="font-medium text-gray-900 pr-8">{group.name}</div>
                  <div className="text-xs text-gray-500 truncate">{group.description || 'No description'}</div>
                  <div className="text-xs text-gray-400 mt-1">{group.members?.length || 0} members</div>
                  {group.unreadCount > 0 && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {group.unreadCount > 99 ? '99+' : group.unreadCount}
                    </div>
                  )}
                </button>

                {/* Group Actions */}
                <div className="px-3 pb-2 flex gap-2">
                  {group.createdById === user?.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroup(group);
                        handleDeleteGroup();
                      }}
                      className="flex-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition border border-red-200"
                      title="Delete group"
                    >
                      Delete
                    </button>
                  )}
                  {group.createdById !== user?.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroup(group);
                        handleLeaveGroup();
                      }}
                      className="flex-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition border border-gray-300"
                      title="Leave group"
                    >
                      Leave
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedGroup ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b px-4 py-3 flex justify-between items-center">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedGroup.name}</h2>
                  <p className="text-sm text-gray-500">{selectedGroup.description}</p>
                </div>
                {/* Start Video Call Button */}
                <button
                  onClick={handleStartCall}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                  title="Start video call"
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Start Call
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${message.senderId === user?.id ? 'bg-indigo-600 text-white' : 'bg-white'} rounded-lg px-4 py-2 shadow`}>
                      {message.senderId !== user?.id && (
                        <div className="text-xs font-medium mb-1 text-gray-600">
                          {message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : 'Unknown'}
                        </div>
                      )}
                      <div className="text-sm">{message.content}</div>
                      <div className={`text-xs mt-1 ${message.senderId === user?.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {formatTime(message.createdAt)}
                        {message.isEdited && ' (edited)'}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 rounded-lg px-4 py-2">
                      <div className="text-sm text-gray-500">Someone is typing...</div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="bg-white border-t p-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      handleTypingStart();
                    }}
                    onBlur={handleTypingStop}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a group to start chatting
            </div>
          )}
        </div>

        {/* Right Sidebar - Members (if group selected) */}
        {selectedGroup && (
          <div className="w-64 bg-white border-l p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Members ({selectedGroup.members?.length || 0})</h3>
              <button
                onClick={() => setShowAddMember(true)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
                title="Add member"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {selectedGroup.members?.map((member) => (
                <div key={member.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                    {member.user?.firstName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Unknown'}
                      {member.role === 'admin' && <span className="ml-1 text-xs text-indigo-600">(Admin)</span>}
                    </div>
                    <div className="text-xs text-gray-500">{member.user?.email || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter group description"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Member to {selectedGroup?.name}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Users
                </label>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {searchResults.length > 0 ? (
                  searchResults.map((searchUser) => (
                    <div
                      key={searchUser.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                          {searchUser.firstName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {searchUser.firstName} {searchUser.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{searchUser.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(searchUser.id)}
                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                      >
                        Add
                      </button>
                    </div>
                  ))
                ) : userSearch.length >= 2 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No users found
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Type at least 2 characters to search
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false);
                    setUserSearch('');
                    setSearchResults([]);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Call UI */}
      {isInCall && activeCall && user && (
        <VideoCall
          callId={activeCall.id}
          userId={user.id}
          userName={`${user.firstName} ${user.lastName}`}
          participantNames={getParticipantNames()}
          onLeave={handleLeaveCall}
        />
      )}
    </div>
  );
};
