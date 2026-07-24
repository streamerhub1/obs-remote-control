const fs = require('fs');

function patch(file, pairs) {
  let c = fs.readFileSync(file, 'utf-8');
  for (const [a, b] of pairs) {
    if (!c.includes(a)) { console.log(`  [MISS] ${a.slice(0,40)} in ${file}`); continue; }
    c = c.split(a).join(b);
  }
  fs.writeFileSync(file, c);
  console.log('OK: ' + file);
}

const R = 'apps/desktop/src/renderer';
const T = R + '/transports';

// ── data-sources.ts ──────────────────────────────────────────────────────────
patch(`${R}/data-sources.ts`, [
  [
    'this.unsubTransport = this.transport.subscribe((msg: unknown) => {',
    `this.unsubTransport = this.transport.subscribe((msg: { type: string; payload: unknown }) => {`,
  ],
  ['return {} as unknown;', 'return {} as ObsSnapshot;'],
]);

// ── ObsDashboard.tsx ──────────────────────────────────────────────────────────
patch(`${R}/ObsDashboard.tsx`, [
  // subscribe event callback
  [
    'let cleanup = dataSource.subscribe((event) => {',
    `let cleanup = dataSource.subscribe((event: { state?: string; snapshot?: ObsSnapshot; event?: { type: string; payload: ObsSnapshot } }) => {`,
  ],
  // .map((item: unknown) =>
  [
    '(item: unknown) =>',
    '(item: { sceneItemId: number; sourceName: string; sceneItemEnabled: boolean }) =>',
  ],
]);

// ── WebRtcTransport.ts ────────────────────────────────────────────────────────
patch(`${T}/WebRtcTransport.ts`, [
  // heartbeatInterval type
  ['private heartbeatInterval: unknown;', 'private heartbeatInterval: ReturnType<typeof setInterval> | null = null;'],
  // clearInterval with cast
  ['if (this.heartbeatInterval) clearInterval(this.heartbeatInterval as unknown as number)', 'if (this.heartbeatInterval !== null) clearInterval(this.heartbeatInterval)'],
  // also any leftover clearInterval cast
  ['clearInterval(this.heartbeatInterval as any)', 'clearInterval(this.heartbeatInterval!)'],
  // handleSignalingMessage
  ['private async handleSignalingMessage(msg: unknown)', 'private async handleSignalingMessage(msg: { type: string; payload: any })'],
  // err.message in sign failed
  ["code: 'SIGN_FAILED',\n          message: err.message,", "code: 'SIGN_FAILED',\n          message: (err as Error).message,"],
  // err.message in EXECUTION_FAILED
  ["error: { code: 'EXECUTION_FAILED', message: err.message },", "error: { code: 'EXECUTION_FAILED', message: (err as Error).message },"],
]);

// ── WebSocketRelayTransport.ts ────────────────────────────────────────────────
patch(`${T}/WebSocketRelayTransport.ts`, [
  // sessionContext fields
  ['async connect(sessionContext: unknown): Promise<void>', 'async connect(sessionContext: { role: string; moderatorAuthorization?: string; streamerAuthorization?: string }): Promise<void>'],
  ['private sessionContext: unknown = null;', 'private sessionContext: { role: string; moderatorAuthorization?: string; streamerAuthorization?: string } | null = null;'],
  // reconnectTimer
  ['private reconnectTimer: unknown = null;', 'private reconnectTimer: ReturnType<typeof setTimeout> | null = null;'],
  // clearTimeout
  ['clearTimeout(this.reconnectTimer)', 'clearTimeout(this.reconnectTimer!)'],
  ['clearInterval(this.heartbeatInterval as unknown as number)', 'clearInterval(this.heartbeatInterval!)'],
]);

// ── Moderators.tsx ────────────────────────────────────────────────────────────
patch(`${R}/Moderators.tsx`, [
  ["'Failed to invite: ' + e.message", "'Failed to invite: ' + (e as Error).message"],
  ['(p: unknown) => (map[p.permissionKey]', '(p: { permissionKey: string; allowed: boolean }) => (map[p.permissionKey]'],
  ["'Failed to start session: ' + e.message", "'Failed to start session: ' + (e as Error).message"],
]);

// ── Calendar.tsx ──────────────────────────────────────────────────────────────
patch(`${R}/Calendar.tsx`, [
  ['.message\n          }', '.message as string\n          }'],
]);

// ── Feed.tsx ──────────────────────────────────────────────────────────────────
// Already handled by earlier script, just ensure no raw e.message
let feedC = fs.readFileSync(`${R}/Feed.tsx`, 'utf-8');
feedC = feedC.replace(/\} catch \(e: unknown\)([\s\S]*?)([^(])e\.message/g, (m, mid, pre) => {
  return `} catch (e: unknown)${mid}${pre}(e as Error).message`;
});
fs.writeFileSync(`${R}/Feed.tsx`, feedC);
console.log('OK: Feed.tsx');

// ── Collabs.tsx ───────────────────────────────────────────────────────────────
let collabsC = fs.readFileSync(`${R}/Collabs.tsx`, 'utf-8');
collabsC = collabsC.replace(/\} catch \(e: unknown\)([\s\S]*?)([^(])e\.message/g, (m, mid, pre) => {
  return `} catch (e: unknown)${mid}${pre}(e as Error).message`;
});
fs.writeFileSync(`${R}/Collabs.tsx`, collabsC);
console.log('OK: Collabs.tsx');

// ── Notifications.tsx ─────────────────────────────────────────────────────────
let notifC = fs.readFileSync(`${R}/Notifications.tsx`, 'utf-8');
notifC = notifC.replace(/\} catch \(e: unknown\)([\s\S]*?)([^(])e\.message/g, (m, mid, pre) => {
  return `} catch (e: unknown)${mid}${pre}(e as Error).message`;
});
fs.writeFileSync(`${R}/Notifications.tsx`, notifC);
console.log('OK: Notifications.tsx');

// ── App.tsx ───────────────────────────────────────────────────────────────────
patch(`${R}/App.tsx`, [
  ['navigate={setCurrentRoute} />', 'navigate={setCurrentRoute as (r: string) => void} />'],
]);

console.log('\nDone.');
