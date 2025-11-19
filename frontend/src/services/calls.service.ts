import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Call interface
 */
export interface Call {
  id: string;
  groupId: string;
  createdBy: string;
  type: 'audio' | 'video';
  status: 'active' | 'ended';
  startedAt: Date;
  endedAt?: Date;
  participants: CallParticipant[];
}

export interface CallParticipant {
  id: string;
  callId: string;
  userId: string;
  joinedAt: Date;
  leftAt?: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateCallData {
  groupId: string;
  type: 'audio' | 'video';
}

/**
 * Calls Service
 * Handles API calls related to video/audio calls
 */
class CallsService {
  /**
   * Get auth token from localStorage
   */
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  /**
   * Get auth headers
   */
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.getAuthToken()}`,
    };
  }

  /**
   * Create a new call
   */
  async createCall(data: CreateCallData): Promise<Call> {
    const response = await axios.post(`${API_URL}/api/calls`, data, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get call by ID
   */
  async getCall(callId: string): Promise<Call> {
    const response = await axios.get(`${API_URL}/api/calls/${callId}`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get call history for a group
   */
  async getGroupCallHistory(groupId: string): Promise<Call[]> {
    const response = await axios.get(`${API_URL}/api/calls/group/${groupId}`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Get active call for a group (if any)
   */
  async getActiveCallForGroup(groupId: string): Promise<Call | null> {
    try {
      const response = await axios.get(`${API_URL}/api/calls/group/${groupId}/active`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      // If backend returns error, log and return null
      // This allows call creation to proceed
      console.warn('[CallsService] Failed to get active call for group:', error);
      return null;
    }
  }

  /**
   * Get active calls for current user
   */
  async getActiveCalls(): Promise<Call[]> {
    const response = await axios.get(`${API_URL}/api/calls/user/active`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  /**
   * Join a call
   */
  async joinCall(callId: string): Promise<void> {
    await axios.post(`${API_URL}/api/calls/${callId}/join`, {}, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Leave a call
   */
  async leaveCall(callId: string): Promise<void> {
    await axios.post(`${API_URL}/api/calls/${callId}/leave`, {}, {
      headers: this.getHeaders(),
    });
  }

  /**
   * End a call (creator only)
   */
  async endCall(callId: string): Promise<void> {
    await axios.patch(`${API_URL}/api/calls/${callId}/end`, {}, {
      headers: this.getHeaders(),
    });
  }
}

// Export singleton instance
export const callsService = new CallsService();
