import { ServerResponse, ServerMessage } from 'modmail-types';
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
    const task: ServerMessage = {
      args: [guildID, memberID],
      task: 'get_member_roles',
      id: uuid(),
    };
    const resp = await this.transaction(task);

    return resp.data as string[];
  }

  private transaction(req: ServerMessage): Promise<ServerResponse> {
    return new Promise((res, rej) => {
      const callback = (msg: ServerResponse) => {
        console.debug(msg);
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
