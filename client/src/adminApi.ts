import API from './api';

export const adminPermissionOptions = [
  { key: 'library:view', label: 'View library' },
  { key: 'library:create', label: 'Create folders' },
  { key: 'library:update', label: 'Edit / move' },
  { key: 'library:upload', label: 'Upload PDFs' },
  { key: 'library:publish', label: 'Publish' },
  { key: 'library:unpublish', label: 'Unpublish' },
  { key: 'library:delete', label: 'Delete / bin' },
  { key: 'kits:manage', label: 'Kits' },
  { key: 'review:manage', label: 'Review' },
  { key: 'users:manage', label: 'Users' },
] as const;

export type AdminPermissionKey = typeof adminPermissionOptions[number]['key'];

export interface AdminScope {
  enabled: boolean;
  rootCardIds: string[];
  permissions: AdminPermissionKey[];
  examSlugs: string[];
  updatedAt?: string;
}

export interface AdminUserWorkspace {
  _id: string;
  name: string;
  shortName?: string;
  slug: string;
  type: string;
}

export interface AdminUser {
  _id: string;
  email: string;
  role: 'admin' | 'user';
  name?: string;
  avatarUrl?: string;
  authProvider: 'password' | 'google';
  googleLinked: boolean;
  adminScope?: AdminScope;
  createdAt?: string;
  updatedAt?: string;
  library: {
    total: number;
    saved: number;
    bookmarked: number;
    downloaded: number;
    completed: number;
    offline: number;
    lastActivityAt?: string;
  };
  preference?: {
    language?: string;
    activePhase?: string;
    onboardingCompleted: boolean;
    selectedSubjects: string[];
    preferredResourceTypes: string[];
    activeWorkspace?: AdminUserWorkspace | null;
    selectedWorkspaces: AdminUserWorkspace[];
    interviewProfile?: {
      homeState?: string;
      graduationStream?: string;
      hobbies?: string[];
    };
    updatedAt?: string;
  } | null;
}

export interface AdminUserParams {
  q?: string;
  role?: 'all' | 'admin' | 'user';
  provider?: 'all' | 'password' | 'google';
  limit?: number;
}

export interface AdminUserPayload {
  email?: string;
  password?: string;
  name?: string;
  role?: AdminUser['role'];
  adminScope?: AdminScope;
}

export const fetchAdminUsers = async (params: AdminUserParams = {}) => {
  const { data } = await API.get<AdminUser[]>('/api/auth/admin/users', { params });
  return data;
};

export const createAdminUser = async (payload: Required<Pick<AdminUserPayload, 'email' | 'password'>> & Pick<AdminUserPayload, 'name' | 'role'>) => {
  const { data } = await API.post<AdminUser>('/api/auth/admin/users', payload);
  return data;
};

export const updateAdminUser = async (id: string, payload: AdminUserPayload) => {
  const { data } = await API.patch<AdminUser>(`/api/auth/admin/users/${id}`, payload);
  return data;
};

export const deleteAdminUser = async (id: string) => {
  const { data } = await API.delete<{ deleted: boolean }>(`/api/auth/admin/users/${id}`);
  return data;
};
