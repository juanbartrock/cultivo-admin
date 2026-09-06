export const salaKeys = {
  all: ['sala'] as const,
  rooms: () => [...salaKeys.all, 'rooms'] as const,
  room: (roomId: string) => [...salaKeys.rooms(), roomId] as const,
  roomSections: (roomId: string) => [...salaKeys.room(roomId), 'sections'] as const,
};
