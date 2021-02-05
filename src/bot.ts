import { ServerResponse, ServerMessage } from 'modmail-types';
import { Worker } from 'worker_threads';
import { v1 as uuid } from 'uuid';
import { MAX_RESPONSE_TIME } from './globals';

export default class BotController {
  private readonly bot: Worker;

  constructor(modmailLoc: string) {
    this.bot = new Worker(modmailLoc);
  }

  public getRoles(guildID: string, memberID: string): Promise<string[]> {
    return new Promise((res, rej) => {
      const task: ServerMessage = {
        args: [guildID, memberID],
        task: 'get_member_roles',
        id: uuid(),
      };
      const callback = (msg: ServerResponse) => {
        if (msg.id !== task.id) {
          return;
        }
        const resp = msg.data as string[];
        res(resp);
        this.bot.removeListener('done', callback);
      }
      this.bot.addListener('message', callback);
      this.bot.postMessage(task);
      setTimeout(() => {
        rej(new Error('Max response time was met, no data was provided.'));
        this.bot.removeListener('error', callback);
      }, MAX_RESPONSE_TIME);
    });
  }
}
