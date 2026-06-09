import API from './api';
import type { AdminScope } from './adminApi';

export interface AccountProfile {
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
}

export interface AccountUpdatePayload {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export const fetchAccountProfile = async () => {
  const { data } = await API.get<AccountProfile>('/api/auth/me');
  return data;
};

export const updateAccountProfile = async (payload: AccountUpdatePayload) => {
  const { data } = await API.patch<AccountProfile>('/api/auth/me', payload);
  return data;
};
