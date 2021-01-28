import Config from './common/config';
import ModmailServer from './server/server';

async function main() {
  const config = Config.getConfig();
  const server = new ModmailServer(config.oauth);

  await server.start(config);
}

main().catch(console.error);
