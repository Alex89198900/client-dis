import { chats, users } from '../develop/data';
import { ErrorStatusCode, http, isExpressError, multipartHeaders } from '../lib/http';
// import moment from '../lib/moment'
import moment, { Moment, MomentInput } from 'moment';
import {
  Channel,
  ChannelInvite,
  ChannelMessage,
  Chat,
  ChatAvailabilitiesMap,
  Lang,
  PersonalMessage,
  PersonalMessage2,
  Profile,
  Server,
  ServerOwner,
  User,
} from '../types/entities';
import { LoginError, RegisterError, RegisterErrorData } from '../types/http-errors';
import { AppOmit } from '../types/utils';
import { RenderedPersonalMessage } from '../views/chats-main-content-view';
import { RenderedChannelMessage } from '../views/servers-main-content-view';
import en from '../lang/en';
import ua from '../lang/ua';
import ru from '../lang/ru';
import { deepMergeObject } from '../utils/functions';
import { ServerToClientEvents } from '../types/socket';
import socket from '../lib/socket';
import { CustomEventData, CustomEvents } from '../types/types';

export type IncomingPersonalMessage = AppOmit<PersonalMessage, 'id' | 'responsedToMessage'>;
//export type IncomingPersonalMessage2 = AppOmit<PersonalMessage2, 'id' | 'responsedToMessage'>;
export type IncomingChannelMessage = AppOmit<ChannelMessage, 'id' | 'responsedToMessage'>;

export type Translation = typeof en | typeof ua | typeof ru;

class AppStore {
  private static instance: AppStore;

  private _user: User | null = null; // Current user

  private _users: User[] = [];

  private _friends: User[] = [];

  private _invitedToFriends: User[] = [];

  private _invitedFromFriends: User[] = [];

  private _channels: Channel[] = []; // Current user related channels

  private _chats: Chat[] = []; // Current user related chats

  private _chatStatuses: ChatAvailabilitiesMap = new Map();

  private _personalMessages: PersonalMessage[] = [];

  private _channelMessages: ChannelMessage[] = [];

  private _lastAddedChannelMessage: ChannelMessage | null = null;

  private _channelInvites: ChannelInvite[] = [];

  private _servers: Server[] = []; // Current user related servers

  private _allServers: Server[] = []; // All servers

  private moment: typeof moment = moment;

  private _lang: Lang = 'en';

  private _translation: Translation = en;

  get isAuth(): boolean {
    return Boolean(this.user);
  }

  get user(): User | null {
    return this._user;
  }

  private set user(user: User | null) {
    this._user = user;
  }

  get users(): User[] {
    return this._users;
  }

  private set users(users: User[]) {
    this._users = users;
  }

  get friends(): User[] {
    return this._friends;
  }

  private set friends(friends: User[]) {
    this._friends = friends;
  }

  get invitedToFriends(): User[] {
    return this._invitedToFriends;
  }

  private set invitedToFriends(friends: User[]) {
    this._invitedToFriends = friends;
  }

  get invitedFromFriends(): User[] {
    return this._invitedFromFriends;
  }

  private set invitedFromFriends(friends: User[]) {
    this._invitedFromFriends = friends;
  }

  get chats(): Chat[] {
    return this._chats;
  }

  private set chats(chats: Chat[]) {
    this._chats = chats;
  }

  private set channels(channels: Channel[]) {
    this._channels = channels;
  }

  get channels(): Channel[] {
    return this._channels;
  }

  get chatStatuses(): ChatAvailabilitiesMap {
    return this._chatStatuses;
  }

  private set chatStatuses(statuses: ChatAvailabilitiesMap) {
    this._chatStatuses = statuses;
  }

  get personalMessages(): PersonalMessage[] {
    return this._personalMessages;
  }

  private set personalMessages(messages: PersonalMessage[]) {
    this._personalMessages = messages;
  }

  get channelMessages(): ChannelMessage[] {
    return this._channelMessages;
  }

  private set channelMessages(messages: ChannelMessage[]) {
    this._channelMessages = messages;
  }

  get channelInvites(): ChannelInvite[] {
    return this._channelInvites;
  }

  private set channelInvites(invites: ChannelInvite[]) {
    this._channelInvites = invites;
  }

  get servers(): Server[] {
    return this._servers;
  }

  private set servers(servers: Server[]) {
    this._servers = servers;
  }

  get allServers(): Server[] {
    return this._allServers;
  }

  private set allServers(servers: Server[]) {
    this._allServers = servers;
  }

  get lang(): Lang {
    return this._lang;
  }

  private set lang(lang: Lang) {
    this._lang = lang;
    this.moment.locale(lang);
  }

  translation(lang: Lang): Translation {
    switch (lang) {
      case 'en': {
        return en;
      }
      case 'ua': {
        return ua;
      }
      case 'ru': {
        return ru;
      }
      default: {
        return en;
      }
    }
  }

  setLang(lang: Lang): void {
    this.lang = lang;
    // if (lang === 'en') {
    //   this._translation = en;
    // } else if (lang === 'ua') {
    //   this._translation = ua;
    // } else if (lang === 'ru') {
    //   this._translation = ru;
    // }
  }

  getServer(serverId: string): Server | null {
    return this.allServers.find(({ id }) => serverId === id) || null;
  }

  getChannel(channelId: string): Channel | null {
    return this.channels.find(({ id }) => id === channelId) || null;
  }

  getServerOwner(serverId: string): ServerOwner | null {
    return this.getServer(serverId)?.owner || null;
  }

  getChannelOwner(channelId: string): ServerOwner | null {
    const channel = this.getChannel(channelId);
    if (channel) {
      return this.getServer(channel.serverId)?.owner || null;
    }
    return null;
  }

  getChannelMembers(channelId: string): User[] {
    const invitedUsers = this.users.filter((user) => {
      if (!user.invitesToChannels) {
        return false;
      }
      return user.invitesToChannels.some((channel) => channel.id == channelId);
    });

    const owner = this.getChannelOwner(channelId);
    const ownerUser = this.users.find((user) => user.id === owner?.id) || null;

    return invitedUsers.concat(ownerUser || []);
  }

  getChannelNameAndServerName(channelId: string): { serverName: string; channelName: string } | null {
    const channel = this.getChannel(channelId);
    if (channel) {
      const server = this.getServer(channel.serverId);
      if (server) {
        return {
          serverName: server.name,
          channelName: channel.name,
        };
      }
    }
    return null;
  }

  getInviteFriendList(channelId: string) {
    const members = this.getChannelMembers(channelId);
    const friends = this.friends
      .map((friend) => this.users.find((user) => user.id === friend.id))
      .filter((friend) => !!friend) as User[];
    return friends.filter((friend) => !members.some((member) => member.id === friend?.id));
  }

  getMutualServers(opponentId: string): Server[] {
    if (!this.user) {
      return [];
    }
    const opponent = this.users.find((op) => op.id === opponentId);
    if (!opponent) {
      return [];
    }
    const userServers: Server[] = this.servers;
    const opponentOwnServers: Server[] = this.allServers.filter((server) => server.owner?.id === opponentId);
    const opponentInviteServerIDs: string[] = opponent.invitesToChannels.map((channel) => channel.serverId);
    const opponentInviteServers = this.allServers.filter((server) => opponentInviteServerIDs.includes(server.id));
    const opponentServers = opponentOwnServers.concat(opponentInviteServers);

    return userServers.filter((userServer) =>
      opponentServers.some((opponentServer) => opponentServer.id === userServer.id)
    );
  }

  async fetchCurrentUser(): Promise<void> {
    if (!this.user) {
      return;
    }
    const response = await http.get<{ user: User }>(`/users/${this.user.id}`).catch((err) => console.error(err));
    if (response) {
      this.user = response.data.user;
    }
  }

  async fetchUser(userId: string): Promise<void> {
    const response = await http.get<{ user: User }>(`/users/${userId}`).catch((err) => console.error(err));
    if (response) {
      const userIdx = this.users.findIndex((u) => u.id === userId);
      if (userIdx !== -1) {
        this.users = [...this.users.slice(0, userIdx), response.data.user, ...this.users.slice(userIdx + 1)];
      }
    }
  }

  async fetchUsers(): Promise<void> {
    const response = await http.get<{ users: User[] | null }>('/users');
    if (response) {
      this.users = response.data.users || [];
    } else {
      this.users = users;
    }
  }

  async fetchFriends(): Promise<void> {
    if (!this.user) {
      return;
    }
    const response = await http
      .get<{ friends: User[] }>(`/users/${this.user.id}/friends`)
      .catch((err) => console.error(err));
    if (response) {
      this.friends = response.data.friends;
    }
  }

  async fetchInvitedToFriends(): Promise<void> {
    if (!this.user) {
      return;
    }
    const response = await http
      .get<{ invitedToFriends: User[] }>(`/users/${this.user.id}/invited-to-friends`)
      .catch((err) => console.error(err));
    if (response) {
      this.invitedToFriends = response.data.invitedToFriends;
    }
  }

  async fetchInvitedFromFriends(): Promise<void> {
    if (!this.user) {
      return;
    }
    const response = await http
      .get<{ invitedFromFriends: User[] }>(`/users/${this.user.id}/invited-from-friends`)
      .catch((err) => console.error(err));
    if (response) {
      this.invitedFromFriends = response.data.invitedFromFriends;
    }
  }

  async fetchChats(userId: User['id']): Promise<void> {
    const response = await http.get<{ chats: Chat[] }>(`/chats/users/${userId}`);
    if (response) {
      this.chats = response.data.chats || [];
    } else {
      this.chats = chats;
    }
  }

  async fetchChat(userOneId: string, userTwoId: string): Promise<void> {
    const response = await http.get<{ chat: Chat }>(`/chats/users/${userOneId}/${userTwoId}`);
    if (response) {
      this.chats.forEach((chat, i) => {
        if (chat.userId === userTwoId) {
          this.chats[i] = response.data.chat;
          this.onChatUpdate(response.data.chat);
        }
      });
    }
  }

  async fetchPersonalMessages(userOneId: string, userTwoId: string): Promise<void> {
    const response = await http.get<{ messages: PersonalMessage[] }>(`/chats/messages/${userOneId}/${userTwoId}`);
    console.log(http);
    if (response) {
      this.personalMessages = response.data.messages || [];
    } else {
      this.personalMessages = [];
    }
    this.onPersonalMessageListChanged(this.getFormattedRenderedPersonalMessages());
  }

  async fetchChannelMessages(channelId: string): Promise<void> {
    const response = await http.get<{ messages: ChannelMessage[] }>(`/channels/${channelId}/messages`);
    console.log(response);
    if (response) {
      this.channelMessages = response.data.messages || [];
    } else {
      this.channelMessages = [];
    }
    this.onChannelMessageListChanged(this.getFormattedRenderedChannelMessages(), this.channelInvites);
  }

  async fetchAllServers(): Promise<void> {
    const response = await http.get<{ servers: Server[] }>(`/servers`);
    if (response) {
      this.allServers = response.data.servers || [];
    } else {
      this.allServers = [];
    }
  }

  async fetchUserRelatedServers(userId: string): Promise<void> {
    const response = await http
      .get<{ servers: Server[] }>(`/users/${userId}/related-servers`)
      .catch((err) => console.error(err));
    if (response) {
      this.servers = response.data.servers || [];
    } else {
      this.servers = [];
    }
    this.onServerListChanged(this.servers);
  }

  async fetchUserRelatedChannels(userId: string): Promise<void> {
    const response = await http
      .get<{ channels: Channel[] }>(`/users/${userId}/related-channels`)
      .catch((err) => console.error(err));
  }

  async fetchChannels(serverId: string): Promise<void> {
    const response = await http
      .get<{ channels: Channel[] }>(`/servers/${serverId}/channels`)
      .catch((error) => console.error(error));
    if (response) {
      this.channels = response.data.channels || [];
    } else {
      this.channels = [];
    }
    this.onChannelListChanged(this.channels);
  }

  resetChannels(): void {
    this.channels = [];
  }

  async fetchChannelInvites(channelId: string): Promise<void> {
    const response = await http
      .get<{ invites: ChannelInvite[] }>(`/channels/${channelId}/invites`)
      .catch((error) => console.error(error));
    if (response) {
      this.channelInvites = response.data.invites || [];
    } else {
      this.channelInvites = [];
    }
  }

  async searchUsers(value: string): Promise<User[]> {
    const response = await http
      .get<{ users: User[] }>(`/users/search?search=${value}`)
      .catch((error) => console.error(error));
    if (response) {
      return response.data.users;
    }
    return [];
  }

  async checkAuth(): Promise<boolean> {
    const response = await http.get<{ user: User | null }>('/users/check-auth').catch((error) => console.error(error));
    if (response) {
      this.user = response.data.user;
      return this.isAuth;
    }
    return false;
  }

  async logIn(email: string, password: string, onUnauthorized: (error: LoginError) => void): Promise<void> {
    const response = await http
      .post<{ email: string; password: string }, { data: { user: User } }>('/users/login', { email, password })
      .catch((error) => {
        if (isExpressError<{ message: string }>(error) && error.status === ErrorStatusCode.Unauthorized) {
          onUnauthorized(error);
        }
      });
    if (response) {
      this.user = response.data.user;
    } else {
      // TODO: REMOVE THIS LINE BEFORE PRODUCTION!
      // this.user = users.find((user) => email === user.email) || users[0];
    }
  }

  async register(
    { email, password, name }: { email: string; password: string; name: string },
    onSuccess: (userId: string) => void,
    onUnauthorized: (error: RegisterError) => void
  ): Promise<void> {
    const response = await http
      .post<{ email: string; password: string; name: string }, { data: { user: User } }>('/users/register', {
        email,
        password,
        name,
      })
      .catch((error) => {
        if (isExpressError<RegisterErrorData>(error) && error.status === ErrorStatusCode.Unauthorized) {
          onUnauthorized(error);
        }
      });
    if (response) {
      this.user = response.data.user;
      onSuccess(response.data.user.id);
    }
  }

  async logOut(): Promise<void> {
    const response = await http.get('/users/logout').catch((err) => console.error(err));
    if (response) {
      this.user = null;
    } else {
      console.error('Something really odd happened');
    }
  }

  async updateUser(
    userId: string,
    data: Partial<User<'formData'>>,
    params?: { remove: (keyof User)[] }
  ): Promise<void> {
    if (!this.user) {
      return;
    }
    console.log(data);
    const response = await http
      .patch<Partial<User<'formData'>>, { data: { user: User } }>(`/users/${userId}`, data, { params })
      .catch((err) => console.log(err));
    if (response) {
      if (!response.data?.user) {
        return;
      }
      const userIdx = this.users.findIndex(({ id }) => userId === id);
      if (userIdx !== -1) {
        this.users = [...this.users.slice(0, userIdx), response.data.user, ...this.users.slice(userIdx + 1)];
        if (this.user.id === response.data.user.id) {
          this.user = response.data.user;
        }
      }
    }
  }

  async deleteCurrentUser(): Promise<void> {
    if (!this.user) {
      return;
    }
    const userId = this.user.id;
    await this.logOut();
    const response = await http.delete(`/users/${userId}`).catch((err) => console.error(err));
  }

  async updateProfile(data: Partial<Profile<'formData'>>): Promise<void> {
    if (!this.user) {
      return;
    }
    const userId = this.user.id;
    const response = await http
      .patch<{ profile: Partial<Profile<'formData'>> }, { data: { user: User } }>(
        `/users/${userId}`,
        { profile: data },
        { headers: multipartHeaders }
      )
      .catch((err) => console.error(err));
    if (response) {
      if (this.user.profile) {
        this.user.profile = response.data.user.profile;
      }
    }
  }

  async createChat(userIDs: string[]): Promise<void> {
    if (!this.user) {
      return;
    }
    console.log('creating chat');
    const response = await http
      .post(`/chats/users/${this.user.id}`, { userId: userIDs[0] })
      .catch((err) => console.error(err));
    if (response) {
      await this.fetchChats(this.user.id);
    }
    console.log(this.chats);
    this.onChatListChanged(this.chats);
  }

  async deleteChat(userId: string): Promise<void> {
    if (!this.user) {
      return;
    }
    const response = await http.delete(`/chats/users/${this.user.id}/${userId}`).catch((err) => console.error(err));
    if (response) {
      this.chats = this.chats.filter(({ userId: chatUserId }) => chatUserId !== userId);
      this.onChatListChanged(this.chats);
    }
  }

  async addPersonalMessage(message: FormData): Promise<void> {
    await http
      .post('/personal-messages', message, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .catch((error) => console.error(error));
    this.onPersonalMessageListChanged(this.getFormattedRenderedPersonalMessages());
  }

  async editPersonalMessage(id: string, message: string): Promise<void> {
    const response = await http
      .patch<{ message: string }, { data: { message: PersonalMessage } }>(`/personal-messages/${id}`, { message })
      .catch((error) => console.error(error));
    if (response) {
      const messageIdx = this.personalMessages.findIndex(({ id: itemId }) => itemId === id);
      if (messageIdx) {
        this.personalMessages = [
          ...this.personalMessages.slice(0, messageIdx),
          response.data.message,
          ...this.personalMessages.slice(messageIdx + 1),
        ];
        this.onPersonalMessageChanged(this.getFormattedRenderedPersonalMessage(response.data.message));
      }
    }
  }

  async deletePersonalMessage(id: string): Promise<void> {
    const response = await http.delete(`/personal-messages/${id}`).catch((error) => console.error(error));
    if (response) {
      this.personalMessages = this.personalMessages.filter(({ id: currId }) => currId !== id);
      this.onPersonalMessageDeleted();
    }
  }

  async addChannelMessage(message: FormData): Promise<ChannelMessage | null> {
    const response = await http.post<FormData, { data: { channelMessage: ChannelMessage } }>(
      '/channels/messages',
      message,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    if (response) {
      return response.data.channelMessage;
    }
    return null;
  }

  async editChannelMessage(id: string, message: string): Promise<void> {
    const response = await http
      .patch<{ message: string }, { data: { message: ChannelMessage } }>(`/channels/messages/${id}`, { message })
      .catch((error) => console.error(error));
    if (response) {
      const messageIdx = this.channelMessages.findIndex(({ id: itemId }) => itemId === id);
      if (messageIdx) {
        this.channelMessages = [
          ...this.channelMessages.slice(0, messageIdx),
          response.data.message,
          ...this.channelMessages.slice(messageIdx + 1),
        ];
        this.onChannelMessageChanged(this.getFormattedRenderedChannelMessage(response.data.message));
      }
    }
  }

  async deleteChannelMessage(id: string): Promise<void> {
    const response = await http.delete(`/channels/messages/${id}`).catch((error) => console.error(error));
    if (response) {
      this.channelMessages = this.channelMessages.filter(({ id: currId }) => currId !== id);
      this.onChannelMessageDeleted();
    }
  }

  async addServer(server: Partial<Server<'formData'>>): Promise<Server | null> {
    if (!this.user) {
      return null;
    }
    console.log(server);
    const response = await http
      .post<Partial<Server<'formData'>>, { data: { server: Server } }>('/servers', server, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .catch((error) => console.error(error));
    if (response) {
      await Promise.all([await this.fetchUserRelatedServers(this.user.id), await this.fetchAllServers()]);
      this.onServerListChanged(this.servers);
      return response.data.server;
    }
    return null;
  }

  async addChannel(channel: AppOmit<Channel, 'id'>, serverId: string): Promise<Channel | null> {
    const response = await http
      .post<AppOmit<Channel, 'id'>, { data: { channel: Channel } }>('/channels', channel)
      .catch((error) => console.error(error));
    if (response) {
      const channel = response.data.channel;
      await this.fetchChannels(serverId);
      return channel;
    }
    return null;
  }

  async addChannelInvite(data: Partial<ChannelInvite>) {
    const response = await http
      .post<Partial<ChannelInvite>, { data: { invite: ChannelInvite } }>('/channels/invites', data)
      .catch((err) => console.error(err));
  }

  updateChatLocally(chatId: Chat['userId'], data: Partial<Pick<Chat, 'userName' | 'availability'>>) {
    let chat = this.chats.find(({ userId }) => userId === chatId);
    if (chat) {
      chat = { ...chat, ...data };
      Object.entries(this.onChatLocallyUpdate).forEach(([_, callback]) => callback(chat as Chat));
    }
  }

  onServerListChanged = (servers: Server[]): void => {};
  onSigningIn = (data: FormData): void => {};
  onPersonalMessageListChanged = (messages: RenderedPersonalMessage[]): void => {};
  onChannelMessageListChanged = (messages: RenderedChannelMessage[], invites: ChannelInvite[]): void => {};
  onChatLocallyUpdate: Record<'appbar' | 'sidebar' | 'main-content' | 'infobar', (chat: Chat) => void> = {
    appbar: (chat: Chat) => {},
    sidebar: (chat: Chat) => {},
    infobar: (chat: Chat) => {},
    'main-content': (chat: Chat) => {},
  };
  onChatListChanged = (chats: Chat[]): void => {};
  onChannelListChanged = (channels: Channel[]): void => {};
  onChatUpdate = (chat: Chat): void => {};
  onPersonalMessageChanged = (message: RenderedPersonalMessage): void => {};
  onPersonalMessageDeleted = (): void => {};
  onChannelMessageChanged = (message: RenderedChannelMessage): void => {};
  onChannelMessageDeleted = (): void => {};

  async bindServerListChanged(callback: (servers: Server[]) => void): Promise<void> {
    this.onServerListChanged = callback;
  }

  bindChannelListChanged(callback: (channels: Channel[]) => void): void {
    this.onChannelListChanged = callback;
  }

  bindSigningIn(callback: (data: FormData) => void): void {
    this.onSigningIn = callback;
  }

  bindPersonalMessageListChanged = (callback: (messages: RenderedPersonalMessage[]) => void): void => {
    this.onPersonalMessageListChanged = callback;
  };

  bindPersonalMessageChanged = (callback: (message: RenderedPersonalMessage) => void): void => {
    this.onPersonalMessageChanged = callback;
  };

  bindPersonalMessageDeleted = (callback: () => void): void => {
    this.onPersonalMessageDeleted = callback;
  };

  bindChannelMessageListChanged = (
    callback: (messages: RenderedChannelMessage[], invites: ChannelInvite[]) => void
  ): void => {
    this.onChannelMessageListChanged = callback;
  };

  bindChannelMessageChanged = (callback: (message: RenderedChannelMessage) => void): void => {
    this.onChannelMessageChanged = callback;
  };

  bindChannelMessageDeleted = (callback: () => void): void => {
    this.onChannelMessageDeleted = callback;
  };

  bindChatLocallyUpdate = (
    name: 'appbar' | 'sidebar' | 'main-content' | 'infobar',
    callback: (chat: Chat) => void
  ): void => {
    this.onChatLocallyUpdate[name] = callback;
  };

  bindChatListChanged = (callback: (chats: Chat[]) => void): void => {
    this.onChatListChanged = callback;
  };

  bindChatUpdate = (callback: (chat: Chat) => void): void => {
    this.onChatUpdate = callback;
  };

  getFormattedRenderedPersonalMessages(): RenderedPersonalMessage[] {
    return this.personalMessages.map((message) => {
      return this.getFormattedRenderedPersonalMessage(message);
    });
  }

  getFormattedRenderedPersonalMessage({
    id,
    fromUserId,
    date,
    message,
    img,
    responsedToMessage,
  }: PersonalMessage): RenderedPersonalMessage {
    const user = this.users.find((user) => user.id === fromUserId);
    const responsedUser = this.users.find((user) => user.id === responsedToMessage?.fromUserId);
    console.log(responsedUser);
    return {
      id,
      userId: fromUserId,
      username: user?.name || '',
      date: moment(date).calendar(),
      message,
      img,
      responsedToMessage: responsedToMessage
        ? {
            id: responsedToMessage.id,
            userId: responsedToMessage.fromUserId,
            username: responsedUser?.name || '',
            date: moment(responsedToMessage.date).calendar(),
            message: responsedToMessage.message,
            img: responsedToMessage.img,
            responsedToMessage: null,
          }
        : null,
    };
  }

  getFormattedRenderedChannelMessages(): RenderedChannelMessage[] {
    return this.channelMessages.map((message) => {
      return this.getFormattedRenderedChannelMessage(message);
    });
  }

  getFormattedRenderedChannelMessage({
    id,
    userId,
    service,
    channelId,
    date,
    message,
    img,
    responsedToMessage,
  }: ChannelMessage): RenderedChannelMessage {
    const user = this.users.find((user) => user.id === userId);
    // const channel = this.channels.find((channel) => channel.id === channelId);
    const responsedUser = this.users.find((user) => user.id === responsedToMessage?.userId);
    return {
      id,
      service,
      userId,
      username: user?.name || '',
      date: moment(date).calendar(),
      message,
      img,
      responsedToMessage: responsedToMessage
        ? {
            id: responsedToMessage.id,
            service,
            userId: responsedToMessage.userId,
            username: responsedUser?.name || '',
            date: moment(responsedToMessage.date).calendar(),
            message: responsedToMessage.message,
            img: responsedToMessage.img,
            responsedToMessage: null,
          }
        : null,
    };
  }

  static onSocketUserRegistered: ServerToClientEvents['userRegistered'] = () => {};

  static onSocketAccountUpdated: ServerToClientEvents['accountUpdated'] = () => {};

  static onSocketPersonalMessage: ServerToClientEvents['personalMessage'] = () => {};

  private constructor() {
    AppStore.instance = this;

    socket.removeListener('userRegistered', AppStore.onSocketUserRegistered);
    socket.on(
      'userRegistered',
      (AppStore.onSocketUserRegistered = async ({ userId }) => {
        await this.fetchUsers();
      })
    );

    socket.removeListener('accountUpdated', AppStore.onSocketAccountUpdated);
    socket.on(
      'accountUpdated',
      (AppStore.onSocketAccountUpdated = async ({ userId }) => {
        Promise.all([await this.fetchUser(userId), this.user ? await this.fetchChat(this.user.id, userId) : null]);

        const user = this.users.find((u) => u.id === userId);
        if (user) {
          const event = new CustomEvent<CustomEventData[CustomEvents.ACCOUNTUPDATED]>(CustomEvents.ACCOUNTUPDATED, {
            detail: { user },
            bubbles: true,
          });
          document.dispatchEvent(event);
        }
      })
    );

    socket.removeListener('personalMessage', AppStore.onSocketPersonalMessage);
    socket.on(
      'personalMessage',
      (AppStore.onSocketPersonalMessage = async ({ fromUserId, toUserId }) => {
        if (!appStore.user || toUserId !== appStore.user.id) {
          return;
        }
        await appStore.createChat([fromUserId]);
      })
    );
  }

  static get Instance() {
    if (!AppStore.instance) {
      AppStore.instance = new AppStore();
    }
    return AppStore.instance;
  }
}

export default AppStore;

export const appStore = AppStore.Instance;

Object.defineProperty(exports, '__', {
  get: function () {
    return appStore.translation(appStore.lang);
  },
});
