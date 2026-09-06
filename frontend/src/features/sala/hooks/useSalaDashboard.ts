import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDevicesStatus } from '@/hooks/useDeviceStatus';
import { Device, Room } from '@/types';
import { useRoomQuery, useRoomsQuery, useRoomSectionsQuery } from '../queries/useSalaQueries';

function getPreferredRoomId(rooms: Room[], roomIdFromUrl: string | null) {
  if (!rooms.length) return null;

  if (roomIdFromUrl) {
    const roomFromUrl = rooms.find((room) => room.id === roomIdFromUrl);
    if (roomFromUrl) return roomFromUrl.id;
  }

  return rooms[0].id;
}

export function useSalaDashboard() {
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams.get('roomId');

  const roomsQuery = useRoomsQuery();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const rooms = useMemo(() => roomsQuery.data ?? [], [roomsQuery.data]);

  useEffect(() => {
    if (!rooms.length) {
      setSelectedRoomId(null);
      return;
    }

    setSelectedRoomId((current) => {
      if (current && rooms.some((room) => room.id === current)) {
        return current;
      }

      return getPreferredRoomId(rooms, roomIdFromUrl);
    });
  }, [roomIdFromUrl, rooms]);

  const selectedRoomQuery = useRoomQuery(selectedRoomId);
  const roomSectionsQuery = useRoomSectionsQuery(selectedRoomId);

  const selectedRoom = useMemo(
    () => selectedRoomQuery.data ?? rooms.find((room) => room.id === selectedRoomId) ?? null,
    [selectedRoomId, selectedRoomQuery.data, rooms]
  );

  const sections = useMemo(() => roomSectionsQuery.data ?? [], [roomSectionsQuery.data]);

  const allDevices = useMemo<Device[]>(() => {
    return sections.flatMap((section) => section.devices ?? []);
  }, [sections]);

  const {
    getStatus,
    loading: statusLoading,
    refresh: refreshStatuses,
  } = useDevicesStatus(allDevices, {
    pollingInterval: 30_000,
    autoRefresh: true,
  });

  const isLoading =
    roomsQuery.isLoading ||
    roomsQuery.isFetching ||
    selectedRoomQuery.isLoading ||
    roomSectionsQuery.isLoading;

  const error =
    roomsQuery.error instanceof Error
      ? roomsQuery.error.message
      : selectedRoomQuery.error instanceof Error
      ? selectedRoomQuery.error.message
      : roomSectionsQuery.error instanceof Error
      ? roomSectionsQuery.error.message
      : null;

  async function refreshAll() {
    await Promise.all([
      roomsQuery.refetch(),
      selectedRoomId ? selectedRoomQuery.refetch() : Promise.resolve(),
      selectedRoomId ? roomSectionsQuery.refetch() : Promise.resolve(),
      refreshStatuses(),
    ]);
  }

  return {
    rooms,
    sections,
    selectedRoom,
    selectedRoomId,
    setSelectedRoomId,
    getStatus,
    statusLoading,
    isLoading,
    error,
    refreshAll,
    refetchRooms: roomsQuery.refetch,
    refetchSections: roomSectionsQuery.refetch,
  };
}
