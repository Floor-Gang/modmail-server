import Config from './common/config';
import ModmailServer from './server/server';

async function main() {
  const config = Config.getConfig();
  const server = new ModmailServer(config);

  await server.start();
}

main().catch(console.error);
