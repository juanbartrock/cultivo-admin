import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roomService, sectionService } from '@/services/locationService';
import { CreateSectionDto, Room } from '@/types';
import { salaKeys } from './salaKeys';

export function useRoomsQuery() {
  return useQuery({
    queryKey: salaKeys.rooms(),
    queryFn: () => roomService.getAll(),
  });
}

export function useRoomQuery(roomId: string | null) {
  return useQuery({
    queryKey: roomId ? salaKeys.room(roomId) : [...salaKeys.rooms(), 'selected-none'],
    queryFn: () => roomService.getById(roomId as string),
    enabled: Boolean(roomId),
  });
}

export function useRoomSectionsQuery(roomId: string | null) {
  return useQuery({
    queryKey: roomId ? salaKeys.roomSections(roomId) : [...salaKeys.rooms(), 'sections-none'],
    queryFn: () => roomService.getSections(roomId as string),
    enabled: Boolean(roomId),
  });
}

export function useCreateRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) => roomService.create(payload),
    onSuccess: (createdRoom: Room) => {
      queryClient.invalidateQueries({ queryKey: salaKeys.rooms() });
      queryClient.setQueryData(salaKeys.room(createdRoom.id), createdRoom);
    },
  });
}

export function useDeleteRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => roomService.delete(roomId),
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: salaKeys.rooms() });
      queryClient.removeQueries({ queryKey: salaKeys.room(roomId) });
      queryClient.removeQueries({ queryKey: salaKeys.roomSections(roomId) });
    },
  });
}

export function useCreateSectionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSectionDto) => sectionService.create(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: salaKeys.roomSections(variables.roomId) });
      queryClient.invalidateQueries({ queryKey: salaKeys.rooms() });
    },
  });
}
