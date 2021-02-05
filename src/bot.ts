import {
  GetMemberStateReq,
  GetRolesReq,
  ServerResponse,
  ServerMessage,
  WORKER_CALLS,
  MemberState,
} from 'modmail-types';
import { Worker } from 'worker_threads';
import { v1 as uuid } from 'uuid';
import { MAX_RESPONSE_TIME } from './globals';
import { BotConfig } from './common/config';

export default class BotController {
  private readonly bot: Worker;

  constructor(botConf: BotConfig) {
    process.env.CONFIG = botConf.config;
    this.bot = new Worker(botConf.location);
  }

  public async getRoles(guildID: string, memberID: string): Promise<string[]> {
    const task: GetRolesReq = {
      args: [guildID, memberID],
      task: WORKER_CALLS.getRoles,
      id: uuid(),
    };
    const resp = await this.transaction(task);

    return resp.data as string[];
  }

  public async getMember(guildID: string, memberID: string): Promise<MemberState> {
    const task: GetMemberStateReq = {
      args: [guildID, memberID],
      task: WORKER_CALLS.getMember,
      id: uuid(),
    }
    const resp = await this.transaction(task);

    return resp.data as MemberState;
  }

  private transaction(req: ServerMessage): Promise<ServerResponse> {
    return new Promise((res, rej) => {
      const callback = (msg: ServerResponse) => {
        if (msg.id !== req.id) {
          return;
        }
        if (msg.data instanceof Error) {
          rej(msg.data);
        } else {
          res(msg);
        }
        this.bot.removeListener('done', callback);
      }
      this.bot.addListener('message', callback);
      this.bot.postMessage(req);
      setTimeout(() => {
        rej(new Error('Max response time was met, no data was provided.'));
        this.bot.removeListener('error', callback);
      }, MAX_RESPONSE_TIME);
    });
  }
}
