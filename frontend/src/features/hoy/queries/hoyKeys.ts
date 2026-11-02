export const hoyKeys = {
  all: ['agenda'] as const,
  today: ['agenda', 'today'] as const,
  photo: (deviceId: string, filename: string) => ['agenda', 'photo', deviceId, filename] as const,
};
