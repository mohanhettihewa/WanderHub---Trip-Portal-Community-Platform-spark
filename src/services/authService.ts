/**
 * WanderHub - Authentication & Role-Based Access Control (RBAC) Microservice
 * 
 * Handles user identity, active session context, role assignment ('Organizer' vs 'Participant'),
 * and strict permission enforcement across all portal capabilities.
 */

import { User, UserRole, Permission } from '../types';

// Role to Permission Matrix
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Organizer: [
    'CREATE_TRIP',
    'EDIT_TRIP',
    'DELETE_TRIP',
    'VIEW_PARTICIPANT_ROSTER',
    'BROADCAST_ANNOUNCEMENT',
    'VIEW_ANALYTICS',
    'BROWSE_TRIPS',
    'SEND_CHAT_MESSAGE'
  ],
  Participant: [
    'BROWSE_TRIPS',
    'BOOK_SEAT',
    'CANCEL_OWN_BOOKING',
    'SEND_CHAT_MESSAGE'
  ]
};

// Default seed profiles
const SEED_USERS: User[] = [
  {
    id: 'usr_org_01',
    name: 'Elena Rostova',
    email: 'elena@summitexpeditions.org',
    role: 'Organizer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    organizationName: 'Summit Alpine Expeditions',
    bio: 'Certified UIAGM mountain guide and expedition leader with 14 years across the Himalayas, Andes, and Alps.',
    phone: '+1 (555) 234-8901',
    joinedDate: '2023-04-12'
  },
  {
    id: 'usr_part_01',
    name: 'Marcus Vance',
    email: 'marcus.vance@gmail.com',
    role: 'Participant',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    bio: 'Amateur landscape photographer, coastal kayaker, and high-altitude trail runner.',
    phone: '+1 (555) 876-5432',
    joinedDate: '2024-01-19'
  },
  {
    id: 'usr_part_02',
    name: 'Sarah Chen',
    email: 'sarah.chen@techadventures.io',
    role: 'Participant',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    bio: 'Software engineer and weekend mountaineer eager to summit iconic peaks.',
    phone: '+1 (555) 432-1098',
    joinedDate: '2024-05-08'
  }
];

const STORAGE_KEY_USER = 'wanderhub_current_user_id';

class AuthService {
  private users: User[] = SEED_USERS;
  private currentUserId: string = 'usr_org_01'; // Default to Organizer for full evaluation

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved && this.users.some(u => u.id === saved)) {
      this.currentUserId = saved;
    }
  }

  /**
   * Retrieves the currently authenticated user session.
   */
  public getCurrentUser(): User {
    const user = this.users.find(u => u.id === this.currentUserId);
    return user || this.users[0];
  }

  /**
   * Returns all available seed user profiles for easy demo switching.
   */
  public getAllUsers(): User[] {
    return [...this.users];
  }

  /**
   * Switch the active user session (simulates logging in as Organizer or Participant).
   */
  public switchUser(userId: string): User {
    const target = this.users.find(u => u.id === userId);
    if (!target) {
      throw new Error(`User with ID ${userId} does not exist`);
    }
    this.currentUserId = target.id;
    localStorage.setItem(STORAGE_KEY_USER, target.id);
    return target;
  }

  /**
   * Verify if a given user possesses a specific privilege.
   */
  public hasPermission(user: User, permission: Permission): boolean {
    const allowed = ROLE_PERMISSIONS[user.role] || [];
    return allowed.includes(permission);
  }

  /**
   * Asserts that a user has a required permission, throwing an Authorization error if forbidden.
   */
  public assertPermission(user: User, permission: Permission): void {
    if (!this.hasPermission(user, permission)) {
      throw new Error(`403 Forbidden: Role '${user.role}' lacks permission '${permission}'`);
    }
  }

  /**
   * Returns whether current active user is an Organizer.
   */
  public isOrganizer(): boolean {
    return this.getCurrentUser().role === 'Organizer';
  }

  /**
   * Returns whether current active user is a Participant.
   */
  public isParticipant(): boolean {
    return this.getCurrentUser().role === 'Participant';
  }
}

export const authService = new AuthService();
