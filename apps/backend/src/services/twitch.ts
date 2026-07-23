import { Twitch } from 'arctic';

let _twitch: Twitch | null = null;

export function getTwitch(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
) {
  if (!_twitch) {
    _twitch = new Twitch(clientId, clientSecret, redirectUri);
  }
  return _twitch;
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
