import { ObsCommand } from '@obs-remote/obs-contracts';

export const PermissionKeys = [
  'obs.read',
  'scenes.read',
  'scenes.create',
  'scenes.update',
  'scenes.delete',
  'scenes.switch',
  'sceneItems.read',
  'sceneItems.create',
  'sceneItems.update',
  'sceneItems.delete',
  'sceneItems.visibility',
  'sceneItems.transform',
  'inputs.read',
  'inputs.create',
  'inputs.update',
  'inputs.delete',
  'audio.read',
  'audio.mute',
  'audio.volume',
  'audio.balance',
  'audio.monitoring',
  'filters.read',
  'filters.create',
  'filters.update',
  'filters.delete',
  'transitions.read',
  'transitions.update',
  'studioMode.read',
  'studioMode.control',
  'stream.read',
  'stream.start',
  'stream.stop',
  'record.read',
  'record.start',
  'record.stop',
  'record.pause',
  'replayBuffer.read',
  'replayBuffer.control',
  'virtualCamera.read',
  'virtualCamera.control',
  'profiles.read',
  'profiles.switch',
  'sceneCollections.read',
  'sceneCollections.switch',
  'hotkeys.trigger',
  'screenshots.create',
  'files.transfer',
  'vendorRequests.execute',
] as const;

export type PermissionKey = (typeof PermissionKeys)[number];

export interface CommandPermissionMapping {
  permissionKey: PermissionKey;
  auditAction: string;
  dangerous: boolean;
}

export const commandPermissionRegistry: Record<
  ObsCommand['type'],
  CommandPermissionMapping
> = {
  'scene.setCurrentProgram': {
    permissionKey: 'scenes.switch',
    auditAction: 'switch_scene',
    dangerous: false,
  },
  'sceneItem.setEnabled': {
    permissionKey: 'sceneItems.visibility',
    auditAction: 'toggle_scene_item_visibility',
    dangerous: false,
  },
  'input.setMute': {
    permissionKey: 'audio.mute',
    auditAction: 'toggle_input_mute',
    dangerous: false,
  },
  'input.setVolume': {
    permissionKey: 'audio.volume',
    auditAction: 'set_input_volume',
    dangerous: false,
  },
  'stream.start': {
    permissionKey: 'stream.start',
    auditAction: 'start_stream',
    dangerous: true,
  },
  'stream.stop': {
    permissionKey: 'stream.stop',
    auditAction: 'stop_stream',
    dangerous: true,
  },
  'record.start': {
    permissionKey: 'record.start',
    auditAction: 'start_record',
    dangerous: false,
  },
  'record.stop': {
    permissionKey: 'record.stop',
    auditAction: 'stop_record',
    dangerous: false,
  },
};

export const Presets = {
  Observer: [
    'obs.read',
    'scenes.read',
    'sceneItems.read',
    'inputs.read',
    'audio.read',
    'filters.read',
    'stream.read',
    'record.read',
  ] as PermissionKey[],
  ScenesOnly: [
    'obs.read',
    'scenes.read',
    'scenes.switch',
    'stream.read',
    'record.read',
  ] as PermissionKey[],
  ScenesAndSources: [
    'obs.read',
    'scenes.read',
    'scenes.switch',
    'sceneItems.read',
    'sceneItems.visibility',
    'stream.read',
    'record.read',
  ] as PermissionKey[],
  ScenesAndAudio: [
    'obs.read',
    'scenes.read',
    'scenes.switch',
    'sceneItems.read',
    'sceneItems.visibility',
    'inputs.read',
    'audio.read',
    'audio.mute',
    'audio.volume',
    'stream.read',
    'record.read',
  ] as PermissionKey[],
  FullControl: [...PermissionKeys] as PermissionKey[],
};

export function getCommandPermission(
  commandType: ObsCommand['type'],
): CommandPermissionMapping | null {
  return commandPermissionRegistry[commandType] || null;
}
