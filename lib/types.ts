export type QuantumStage =
  | 'queued'
  | 'encoding'
  | 'entangling'
  | 'testing_channel'
  | 'teleporting'
  | 'classical_sent'
  | 'delivered'
  | 'failed';

export interface QuantumStatusEvent {
  type: 'status';
  id: string;
  stage: QuantumStage;
  ok: boolean;
  detail?: string;
  timestamp?: number;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_following?: boolean;
}

export interface Follow {
  follower_id: string;
  followee_id: string;
  created_at: string;
}

export type MessageStatus = 'queued' | 'in_transit' | 'delivered' | 'failed';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  status: MessageStatus;
  verified: boolean | null;
  session_id: string | null;
  created_at: string;
  stage?: QuantumStage;
  stageDetail?: string;
}

export interface Alert {
  id: string;
  user_ids: string[];
  reason: string;
  severity: 'warning' | 'critical';
  message_id: string | null;
  created_at: string;
}

export interface Conversation {
  otherUser: Profile;
  lastMessage?: Message;
  unreadCount?: number;
}

export interface PostComment {
  id: string;
  username: string;
  text: string;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  user: Profile;
  image_url: string;
  caption: string;
  likes_count: number;
  is_liked?: boolean;
  comments: PostComment[];
  created_at: string;
}
