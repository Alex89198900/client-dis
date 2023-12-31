export type MongoObjectId = string;
export type Timestamp = number;

export interface MongoEntity {
  id: MongoObjectId;
}

export type DataType = 'data' | 'formData';

export type Data<T extends DataType, F, D> = T extends 'formData' ? F : D;

export interface User<T extends DataType = 'data'> extends MongoEntity {
  name: string;
  password: string;
  email: string;
  phone: string;
  availability: Availability;
  chats: Chat[] | null;
  friends: MongoObjectId[];
  invitesFrom: MongoObjectId[];
  invitesTo: MongoObjectId[];
  invitesToChannels: Data<T, string[], Channel[]>;
  createdAt: string;
  profile: Profile;
}

export interface Profile<T extends DataType = 'data'> {
  avatar: Data<T, File, string | null> | null;
  banner: string | null;
  about: string | null;
}

export interface PersonalMessage extends MongoEntity {
  fromUserId: MongoObjectId;
  toUserId: MongoObjectId;
  responsedToMessageId: MongoObjectId | null;
  date: Timestamp;
  message: string;
  img: string;
  responsedToMessage: PersonalMessage | null;
}
export interface PersonalMessage2 extends MongoEntity {
  fromUserId: MongoObjectId;
  toUserId: MongoObjectId;
  responsedToMessageId: MongoObjectId | null;
  date: Timestamp;
  message: string;
  img: FormDataEntryValue;
  responsedToMessage: PersonalMessage | null;
}

export interface ChannelMessage extends MongoEntity {
  service: boolean;
  userId: MongoObjectId;
  channelId: MongoObjectId;
  responsedToMessageId: MongoObjectId | null;
  date: Timestamp;
  message: string;
  img: string;
  responsedToMessage: ChannelMessage | null;
}

export interface Server<T extends DataType = 'data'> extends MongoEntity {
  name: string;
  image: Data<T, File, string | null>;
  owner: Data<T, string, ServerOwner> | null;
}

export interface Chat extends MongoEntity {
  userId: MongoObjectId;
  userName: string;
  availability: Availability;
  createdAt: string;
}
export interface Channel extends MongoEntity {
  serverId: MongoObjectId;
  name: string;
  general: boolean;
}

export type ServerOwner = Pick<User, 'name' | 'id'>;

export interface ChannelInvite {
  userId: string;
  channelId: string;
  messageId: string;
  date: Date;
  message: string;
  status: ChannelInviteStatus;
}

export enum Availability {
  Online = 'online',
  Offline = 'offline',
  Away = 'away',
  DoNotDisturb = 'donotdisturb',
}

export enum ChannelInviteStatus {
  Pending = 'pending',
  Accepted = 'accepted',
}

export type Lang = 'en' | 'ua' | 'ru';

export type Theme = 'light' | 'dark';

export type ChatAvailabilitiesMap = Map<Chat, Availability>;
