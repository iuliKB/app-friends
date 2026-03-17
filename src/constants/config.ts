export const APP_CONFIG = {
  appName: 'Campfire',
  scheme: 'campfire',
  passwordMinLength: 8,
  usernameMinLength: 3,
  usernameMaxLength: 30,
  displayNameMaxLength: 50,
  usernameDebounceMs: 500,
  avatarMaxSizeMb: 5,
  avatarQuality: 0.8,
  avatarAspect: [1, 1] as [number, number],
} as const;
