import { Profile, Message, Alert, Post } from './types';

export interface RegisteredUserRecord extends Profile {
  email: string;
  passwordHash: string;
}

// Zero pre-made users, posts, or follows — all accounts are real registered users
export const INITIAL_MOCK_USERS: RegisteredUserRecord[] = [];

export const INITIAL_FOLLOWS: [string, string][] = [];

export const INITIAL_MESSAGES: Message[] = [];
export const INITIAL_ALERTS: Alert[] = [];
export const INITIAL_POSTS: Post[] = [];

