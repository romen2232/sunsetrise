import { OAuth2Client } from 'google-auth-library';
import { promises as fs } from 'fs';
import path from 'path';

const TOKEN_PATH = process.env.TOKEN_PATH || '/data/token.json';
const CLIENT_PATH = process.env.CLIENT_PATH || '/data/client_secret.json';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

export async function getOAuthClient(): Promise<OAuth2Client> {
  const credsRaw = await fs.readFile(CLIENT_PATH, 'utf8');
  const creds = JSON.parse(credsRaw);

  const clientId = creds.web?.client_id || creds.installed?.client_id;
  const clientSecret = creds.web?.client_secret || creds.installed?.client_secret;
  const redirectUris: string[] = creds.installed?.redirect_uris || creds.web?.redirect_uris || [];

  // Prefer loopback redirect for local flows
  const loopbackUri = redirectUris.find((u) => u.startsWith('http://localhost')) || 'http://localhost:8080';

  const oauth2Client = new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri: loopbackUri,
  });

  try {
    const tokenRaw = await fs.readFile(TOKEN_PATH, 'utf8');
    oauth2Client.setCredentials(JSON.parse(tokenRaw));
    return oauth2Client;
  } catch {
    // no token, start auth flow
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  // Simple console-based flow: user opens URL, pastes code
  // In Docker, user can copy URL and paste the code via STDIN.
  // We avoid spinning an HTTP server inside the container for simplicity.
  // eslint-disable-next-line no-console
  console.log('Authorize this app by visiting this url:\n', authUrl);

  const code = await readStdin('Enter the authorization code here: ');
  const { tokens } = await oauth2Client.getToken(code.trim());
  oauth2Client.setCredentials(tokens);

  await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf8');

  return oauth2Client;
}

async function readStdin(promptText: string): Promise<string> {
  // eslint-disable-next-line no-console
  process.stdout.write(promptText);
  const chunks: Buffer[] = [];
  return await new Promise<string>((resolve) => {
    process.stdin.resume();
    process.stdin.on('data', (c) => chunks.push(Buffer.from(c)));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}


