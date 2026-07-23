import { OAuth2Client } from 'arctic';

let _oauthClient: OAuth2Client | null = null;

export function getTwitchOAuth(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
) {
  if (!_oauthClient) {
    _oauthClient = new OAuth2Client(clientId, clientSecret, redirectUri);
  }
  return _oauthClient;
}

export async function fetchTwitchUser(accessToken: string) {
  const response = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID!,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch Twitch user');
  }
  const data = await response.json();
  return data.data[0];
}
