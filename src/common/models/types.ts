import { Snowflake, UserFlags } from 'discord.js';
import { Request } from 'express';
import { Session } from 'express-session';

export type User = {
  avatar: string;
  bot: boolean;
  discriminator: string;
  id: Snowflake;
  username: string;
  token: string;
}

export type Guild = {
  id: string;
  name: string;
  icon: string;
  owner: boolean;
  permissions: string;
  features: string[];
}

export interface ModmailSession extends Session {
  user?: User;
  guildIDs?: string[];
}

export interface RequestWithSession<a = any, b = any, c = any, d = any> extends Request<a, b, c, d> {
  session: ModmailSession;
}
