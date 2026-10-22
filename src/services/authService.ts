/**
 * WanderHub - Authentication & Role-Based Access Control (RBAC) Microservice Client
 * 
 * Synchronizes user identity, active session context, JWT token, and role assignment
 * ('Organizer' vs 'Participant') with the live Python 3 FastAPI Auth Microservice.
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

// Resilient inline SVG Data-URI Avatars (Zero external network fragility)
export const AVATAR_ELENA =
  "data:image/svg+xml;utf8," +
  "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>" +
  "<rect width='120' height='120' rx='60' fill='%23065f46'/>" +
  "<circle cx='60' cy='46' r='20' fill='%23a7f3d0'/>" +
  "<path d='M24 104c6-22 22-34 36-34s30 12 36 34' fill='%23a7f3d0'/>" +
  "<text x='60' y='52' text-anchor='middle' font-family='sans-serif' font-size='14' font-weight='bold' fill='%23064e3b'>ER</text>" +
  "</svg>";

export const AVATAR_MARCUS =
  "data:image/svg+xml;utf8," +
  "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>" +
  "<rect width='120' height='120' rx='60' fill='%231e3a8a'/>" +
  "<circle cx='60' cy='46' r='20' fill='%23bfdbfe'/>" +
  "<path d='M24 104c6-22 22-34 36-34s30 12 36 34' fill='%23bfdbfe'/>" +
  "<text x='60' y='52' text-anchor='middle' font-family='sans-serif' font-size='14' font-weight='bold' fill='%231e3a8a'>MV</text>" +
  "</svg>";

export const AVATAR_SARAH =
  "data:image/svg+xml;utf8," +
  "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>" +
  "<rect width='120' height='120' rx='60' fill='%237c2d12'/>" +
  "<circle cx='60' cy='46' r='20' fill='%23fed7aa'/>" +
  "<path d='M24 104c6-22 22-34 36-34s30 12 36 34' fill='%23fed7aa'/>" +
  "<text x='60' y='52' text-anchor='middle' font-family='sans-serif' font-size='14' font-weight='bold' fill='%237c2d12'>SC</text>" +
  "</svg>";

const SEED_USERS: User[] = [
  {
    id: 'usr_org_01',
    name: 'Elena Rostova',
    email: 'elena@summitexpeditions.org',
    role: 'Organizer',
    avatar: AVATAR_ELENA,
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
    avatar: AVATAR_MARCUS,
    bio: 'Amateur landscape photographer, coastal kayaker, and high-altitude trail runner.',
    phone: '+1 (555) 876-5432',
    joinedDate: '2024-01-19'
  },
  {
    id: 'usr_part_02',
    name: 'Sarah Chen',
    email: 'sarah.chen@techadventures.io',
    role: 'Participant',
    avatar: AVATAR_SARAH,
    bio: 'Software engineer and weekend mountaineer eager to summit iconic peaks.',
    phone: '+1 (555) 432-1098',
    joinedDate: '2024-05-08'
  }
];

const STORAGE_KEY_USER = 'wanderhub_current_user_id';

class AuthService {
  private users: User[] = SEED_USERS;
  private currentUserId: string = 'usr_org_01';
  private accessToken: string = '';

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    if (saved && this.users.some(u => u.id === saved)) {
      this.currentUserId = saved;
    }
  }

  /**
   * Synchronize user state from the live Python FastAPI backend.
   */
  public syncFromBackend(currentUser: User, users: User[], token?: string): void {
    if (Array.isArray(users) && users.length > 0) {
      this.users = users;
    }
    if (currentUser && currentUser.id) {
      this.currentUserId = currentUser.id;
      localStorage.setItem(STORAGE_KEY_USER, currentUser.id);
    }
    if (token) {
      this.accessToken = token;
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
   * Look up a user by ID.
   */
  public getUserById(userId: string): User | undefined {
    return this.users.find(u => u.id === userId);
  }

  /**
   * Returns all available user profiles.
   */
  public getAllUsers(): User[] {
    return [...this.users];
  }

  /**
   * Returns the active JWT access token issued by the Python Auth Microservice.
   */
  public getAccessToken(): string {
    return this.accessToken;
  }

  /**
   * Switch the active user session and notify the Python Auth Microservice.
   */
  public switchUser(userId: string, syncBackend: boolean = true): User {
    const target = this.users.find(u => u.id === userId);
    if (!target) {
      throw new Error(`User with ID ${userId} does not exist`);
    }
    this.currentUserId = target.id;
    localStorage.setItem(STORAGE_KEY_USER, target.id);

    if (syncBackend) {
      fetch('/api/v1/auth/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: target.id })
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.accessToken) {
            this.accessToken = data.accessToken;
          }
        })
        .catch(() => {});
    }

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
