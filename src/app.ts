import ModmailServer from './server/server';

async function main() {
  const server = new ModmailServer({
    accessTokenUri: 'https://discord.com/api/oauth2/token',
    authorizationUri: 'https://discord.com/api/oauth2/authorize',
    redirectUri: 'http://127.0.0.1/oauth/callback',
    clientId: '',
    clientSecret: '',
    scopes: ['identify'],
  });

  await server.start(80);
}

main().catch(console.error);
