import { Profile, Message, Alert, QuantumStage, QuantumStatusEvent, Post } from './types';
import { INITIAL_MOCK_USERS, INITIAL_FOLLOWS, RegisteredUserRecord } from './mockData';

type Listener = () => void;

class MockStore {
  private users: RegisteredUserRecord[] = [];
  private follows: Set<string> = new Set();
  private messages: Message[] = [];
  private alerts: Alert[] = [];
  private posts: Post[] = [];
  private currentUserId: string | null = null;
  private listeners: Set<Listener> = new Set();
  private quantumListeners: Set<(event: QuantumStatusEvent) => void> = new Set();
  private inFlightMessageId: string | null = null;
  private queue: { message: Message; onDone: () => void }[] = [];

  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this.init();
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('shnik_sync');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_STATE') {
            this.reloadFromStorage();
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel error', err);
      }
    }
  }

  private reloadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const storedUsers = localStorage.getItem('shnik_real_users');
      const storedFollows = localStorage.getItem('shnik_real_follows');
      const storedMessages = localStorage.getItem('shnik_real_messages');
      const storedAlerts = localStorage.getItem('shnik_real_alerts');
      const storedPosts = localStorage.getItem('shnik_real_posts');

      if (storedUsers) {
        const loaded: RegisteredUserRecord[] = JSON.parse(storedUsers);
        this.users = loaded.filter(
          (u) => u.id !== 'user-alice' && u.id !== 'user-bob' && u.id !== 'user-eve'
        );
      }
      if (storedFollows) this.follows = new Set(JSON.parse(storedFollows));
      if (storedMessages) this.messages = JSON.parse(storedMessages);
      if (storedAlerts) this.alerts = JSON.parse(storedAlerts);
      if (storedPosts) this.posts = JSON.parse(storedPosts);
      this.notify();
    } catch (_) {}
  }

  private init() {
    if (typeof window !== 'undefined') {
      try {
        const storedUsers = localStorage.getItem('shnik_real_users');
        const storedFollows = localStorage.getItem('shnik_real_follows');
        const storedMessages = localStorage.getItem('shnik_real_messages');
        const storedAlerts = localStorage.getItem('shnik_real_alerts');
        const storedPosts = localStorage.getItem('shnik_real_posts');
        const storedCurrentUserId = localStorage.getItem('shnik_real_current_user_id');

        const loadedUsers: RegisteredUserRecord[] = storedUsers ? JSON.parse(storedUsers) : [];
        this.users = loadedUsers.filter(
          (u) => u.id !== 'user-alice' && u.id !== 'user-bob' && u.id !== 'user-eve'
        );
        this.follows = storedFollows ? new Set(JSON.parse(storedFollows)) : new Set();
        this.messages = storedMessages ? JSON.parse(storedMessages) : [];
        this.alerts = storedAlerts ? JSON.parse(storedAlerts) : [];
        this.posts = storedPosts ? JSON.parse(storedPosts) : [];

        const validStoredUserId =
          storedCurrentUserId &&
          storedCurrentUserId !== 'user-alice' &&
          storedCurrentUserId !== 'user-bob' &&
          storedCurrentUserId !== 'user-eve'
            ? storedCurrentUserId
            : null;

        // Support URL parameter override for tab testing if matching user exists: ?as=username
        const urlParams = new URLSearchParams(window.location.search);
        const urlAs = urlParams.get('as') || urlParams.get('user');
        const sessionUserId = sessionStorage.getItem('shnik_session_user_id');

        if (urlAs) {
          const match = this.users.find((u) => u.username.toLowerCase() === urlAs.toLowerCase() || u.id === urlAs);
          if (match) {
            this.currentUserId = match.id;
            sessionStorage.setItem('shnik_session_user_id', match.id);
          } else {
            this.currentUserId = validStoredUserId;
          }
        } else if (
          sessionUserId &&
          sessionUserId !== 'user-alice' &&
          sessionUserId !== 'user-bob' &&
          sessionUserId !== 'user-eve'
        ) {
          this.currentUserId = sessionUserId;
        } else {
          this.currentUserId = validStoredUserId;
        }

        // Listen for cross-window localStorage changes
        window.addEventListener('storage', (e) => {
          if (e.key?.startsWith('shnik_real_')) {
            this.reloadFromStorage();
          }
        });

      } catch (e) {
        console.warn('Could not read user data from localStorage', e);
        this.users = [];
        this.currentUserId = null;
      }
    }
  }

  private persist() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('shnik_real_users', JSON.stringify(this.users));
        localStorage.setItem('shnik_real_follows', JSON.stringify(Array.from(this.follows)));
        localStorage.setItem('shnik_real_messages', JSON.stringify(this.messages));
        localStorage.setItem('shnik_real_alerts', JSON.stringify(this.alerts));
        localStorage.setItem('shnik_real_posts', JSON.stringify(this.posts));
        if (this.currentUserId) {
          localStorage.setItem('shnik_real_current_user_id', this.currentUserId);
        } else {
          localStorage.removeItem('shnik_real_current_user_id');
        }
      } catch (e) {
        console.error('Failed to persist user data', e);
      }
    }
    this.notify();
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'SYNC_STATE' });
      } catch (_) {}
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeQuantum(listener: (event: QuantumStatusEvent) => void): () => void {
    this.quantumListeners.add(listener);
    return () => this.quantumListeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error in listener', err);
      }
    });
  }

  public emitQuantumEvent(event: QuantumStatusEvent) {
    this.quantumListeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.error('Error in quantum listener', err);
      }
    });
  }

  // --- Real Auth Methods ---

  public getCurrentUser(): Profile | null {
    if (!this.currentUserId) return null;
    const user = this.users.find((u) => u.id === this.currentUserId);
    if (!user) return null;
    return this.decorateProfile(user);
  }

  public login(usernameOrEmail: string, password?: string): Profile {
    const clean = usernameOrEmail.trim().toLowerCase();
    const user = this.users.find(
      (u) =>
        u.username.toLowerCase() === clean ||
        u.email.toLowerCase() === clean ||
        `${u.username.toLowerCase()}@shnik.internal` === clean ||
        `${u.username.toLowerCase()}@shnik.app` === clean
    );

    if (!user) {
      throw new Error('No account found with this username or email. Please sign up first.');
    }

    if (user.passwordHash && password && user.passwordHash !== password) {
      throw new Error('Incorrect password. Please try again.');
    }

    this.currentUserId = user.id;
    this.persist();
    return this.decorateProfile(user);
  }

  public signUp(data: { username: string; full_name: string; email: string; password?: string }): Profile {
    const cleanUsername = data.username.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    const cleanEmail = data.email.trim().toLowerCase();

    if (!cleanUsername) {
      throw new Error('Please choose a valid username.');
    }

    const existingUsername = this.users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (existingUsername) {
      throw new Error(`The username @${cleanUsername} is already taken. Please choose another.`);
    }

    const existingEmail = this.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existingEmail) {
      throw new Error('An account with this email already exists. Please log in.');
    }

    const newUser: RegisteredUserRecord = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      username: cleanUsername,
      full_name: data.full_name.trim(),
      email: cleanEmail,
      passwordHash: data.password || '',
      bio: '',
      avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}`,
      created_at: new Date().toISOString(),
      followers_count: 0,
      following_count: 0,
      posts_count: 0,
    };

    this.users.push(newUser);
    this.currentUserId = newUser.id;
    this.persist();
    return this.decorateProfile(newUser);
  }

  public logout() {
    this.currentUserId = null;
    this.persist();
  }

  public getUserById(id: string): Profile | null {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    return this.decorateProfile(user);
  }

  public getUserByUsername(username: string): Profile | null {
    const clean = username.toLowerCase();
    const user = this.users.find((u) => u.username.toLowerCase() === clean);
    if (!user) return null;
    return this.decorateProfile(user);
  }

  public getAllUsers(): Profile[] {
    return this.users.map((u) => this.decorateProfile(u));
  }

  public updateProfile(id: string, updates: Partial<Pick<Profile, 'full_name' | 'bio' | 'avatar_url'>>): Profile {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');
    this.users[index] = { ...this.users[index], ...updates };
    this.persist();
    return this.decorateProfile(this.users[index]);
  }

  private decorateProfile(user: Profile): Profile {
    const followers = Array.from(this.follows).filter((f) => f.endsWith(`:${user.id}`)).length;
    const following = Array.from(this.follows).filter((f) => f.startsWith(`${user.id}:`)).length;
    const isFollowing = this.currentUserId ? this.isFollowing(this.currentUserId, user.id) : false;
    const userPosts = this.posts.filter((p) => p.user_id === user.id);

    return {
      ...user,
      followers_count: followers,
      following_count: following,
      posts_count: userPosts.length,
      is_following: isFollowing,
    };
  }

  // --- Follows ---

  public isFollowing(followerId: string, followeeId: string): boolean {
    return this.follows.has(`${followerId}:${followeeId}`);
  }

  public toggleFollow(followeeId: string): boolean {
    if (!this.currentUserId) return false;
    const key = `${this.currentUserId}:${followeeId}`;
    let isNowFollowing = false;
    if (this.follows.has(key)) {
      this.follows.delete(key);
      isNowFollowing = false;
    } else {
      this.follows.add(key);
      isNowFollowing = true;
    }
    this.persist();
    return isNowFollowing;
  }

  public getFollowing(userId: string): Profile[] {
    const followingIds = Array.from(this.follows)
      .filter((k) => k.startsWith(`${userId}:`))
      .map((k) => k.split(':')[1]);
    return this.users.filter((u) => followingIds.includes(u.id)).map((u) => this.decorateProfile(u));
  }

  public getFollowers(userId: string): Profile[] {
    const followerIds = Array.from(this.follows)
      .filter((k) => k.endsWith(`:${userId}`))
      .map((k) => k.split(':')[0]);
    return this.users.filter((u) => followerIds.includes(u.id)).map((u) => this.decorateProfile(u));
  }

  // --- Real Posts & Feed ---

  public getPosts(): Post[] {
    return this.posts.map((p) => {
      const author = this.getUserById(p.user_id) || p.user;
      return {
        ...p,
        user: author,
      };
    });
  }

  public createPost(data: { image_url: string; caption: string }): Post {
    const currentUser = this.getCurrentUser();
    if (!currentUser) throw new Error('You must be logged in to create a post.');

    const newPost: Post = {
      id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: currentUser.id,
      user: currentUser,
      image_url: data.image_url,
      caption: data.caption,
      likes_count: 0,
      is_liked: false,
      comments: [],
      created_at: new Date().toISOString(),
    };

    this.posts.unshift(newPost);
    this.persist();
    return newPost;
  }

  public toggleLikePost(postId: string): boolean {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return false;
    post.is_liked = !post.is_liked;
    post.likes_count += post.is_liked ? 1 : -1;
    this.persist();
    return post.is_liked;
  }

  public addCommentToPost(postId: string, text: string) {
    const post = this.posts.find((p) => p.id === postId);
    const currentUser = this.getCurrentUser();
    if (!post || !currentUser || !text.trim()) return;

    post.comments.push({
      id: `c-${Date.now()}`,
      username: currentUser.username,
      text: text.trim(),
      created_at: new Date().toISOString(),
    });
    this.persist();
  }

  public getUserPosts(userId: string): Post[] {
    return this.posts.filter((p) => p.user_id === userId);
  }

  // --- Direct Messages ---

  public getMessagesBetween(userId1: string, userId2: string): Message[] {
    return this.messages.filter(
      (m) =>
        (m.sender_id === userId1 && m.recipient_id === userId2) ||
        (m.sender_id === userId2 && m.recipient_id === userId1)
    );
  }

  public getConversations(userId: string) {
    const userMessages = this.messages.filter((m) => m.sender_id === userId || m.recipient_id === userId);
    const otherUserIds = Array.from(
      new Set(userMessages.map((m) => (m.sender_id === userId ? m.recipient_id : m.sender_id)))
    );

    return otherUserIds
      .map((otherId) => {
        const otherUser = this.getUserById(otherId);
        if (!otherUser) return null;
        const thread = this.getMessagesBetween(userId, otherId);
        const lastMessage = thread[thread.length - 1];
        return {
          otherUser,
          lastMessage,
        };
      })
      .filter(Boolean);
  }

  public queueAndSendMessage(
    recipientId: string,
    body: string,
    onProgress?: (event: QuantumStatusEvent) => void,
    forceFailure: boolean = false
  ): Message {
    const sender = this.getCurrentUser();
    if (!sender) throw new Error('Not authenticated');

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const isChannelBusy = this.inFlightMessageId !== null;

    const newMessage: Message = {
      id: msgId,
      sender_id: sender.id,
      recipient_id: recipientId,
      body,
      status: isChannelBusy ? 'queued' : 'in_transit',
      verified: null,
      session_id: `sess-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
      stage: isChannelBusy ? 'queued' : 'encoding',
    };

    this.messages.push(newMessage);
    this.persist();

    if (isChannelBusy) {
      this.queue.push({
        message: newMessage,
        onDone: () => {
          this.executeQuantumSimulation(newMessage, onProgress, forceFailure);
        },
      });
      if (onProgress) {
        onProgress({
          type: 'status',
          id: newMessage.id,
          stage: 'queued',
          ok: true,
          detail: 'Queued...',
        });
      }
    } else {
      this.executeQuantumSimulation(newMessage, onProgress, forceFailure);
    }

    return newMessage;
  }

  private executeQuantumSimulation(
    message: Message,
    onProgress?: (event: QuantumStatusEvent) => void,
    forceFailure: boolean = false
  ) {
    this.inFlightMessageId = message.id;

    const stages: { stage: QuantumStage; delay: number; detail: string }[] = [
      { stage: 'encoding', delay: 400, detail: 'Encrypting...' },
      { stage: 'entangling', delay: 400, detail: 'Securing channel...' },
      { stage: 'testing_channel', delay: 400, detail: 'Verifying keys...' },
      { stage: 'teleporting', delay: 500, detail: 'Sending message...' },
      { stage: 'classical_sent', delay: 350, detail: 'Delivering...' },
      { stage: 'delivered', delay: 300, detail: 'Delivered' },
    ];

    let currentStep = 0;

    const runNextStage = () => {
      if (currentStep >= stages.length) {
        const target = this.messages.find((m) => m.id === message.id);
        if (target) {
          target.status = 'delivered';
          target.verified = true;
          target.stage = 'delivered';
          target.stageDetail = 'Delivered';
          this.persist();
        }
        this.inFlightMessageId = null;
        this.processQueue();
        return;
      }

      const item = stages[currentStep];

      if (forceFailure && currentStep === 2) {
        const failedEvt: QuantumStatusEvent = {
          type: 'status',
          id: message.id,
          stage: 'failed',
          ok: false,
          detail: 'Failed to deliver message securely.',
        };
        const target = this.messages.find((m) => m.id === message.id);
        if (target) {
          target.status = 'failed';
          target.verified = false;
          target.stage = 'failed';
          target.stageDetail = failedEvt.detail;
          this.persist();
        }
        this.emitQuantumEvent(failedEvt);
        if (onProgress) onProgress(failedEvt);

        this.createAlert([message.sender_id, message.recipient_id], failedEvt.detail || 'Security alert', 'critical', message.id);

        this.inFlightMessageId = null;
        this.processQueue();
        return;
      }

      const event: QuantumStatusEvent = {
        type: 'status',
        id: message.id,
        stage: item.stage,
        ok: true,
        detail: item.detail,
      };

      const target = this.messages.find((m) => m.id === message.id);
      if (target) {
        target.stage = item.stage;
        target.stageDetail = item.detail;
        if (item.stage === 'delivered') {
          target.status = 'delivered';
          target.verified = true;
        }
        this.persist();
      }

      this.emitQuantumEvent(event);
      if (onProgress) onProgress(event);

      currentStep++;
      setTimeout(runNextStage, item.delay);
    };

    runNextStage();
  }

  private processQueue() {
    if (this.queue.length > 0 && this.inFlightMessageId === null) {
      const next = this.queue.shift();
      if (next) {
        next.onDone();
      }
    }
  }

  // --- Alerts ---

  public getAlertsForUser(userId: string): Alert[] {
    return this.alerts.filter((a) => a.user_ids.includes(userId));
  }

  public createAlert(userIds: string[], reason: string, severity: 'warning' | 'critical', messageId?: string | null): Alert {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_ids: userIds,
      reason,
      severity,
      message_id: messageId || null,
      created_at: new Date().toISOString(),
    };
    this.alerts.unshift(alert);
    this.persist();
    return alert;
  }

  public dismissAlert(alertId: string) {
    this.alerts = this.alerts.filter((a) => a.id !== alertId);
    this.persist();
  }
}

export const mockStore = new MockStore();
