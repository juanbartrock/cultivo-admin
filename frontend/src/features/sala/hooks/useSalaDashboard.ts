import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDevicesStatus } from '@/hooks/useDeviceStatus';
import { Device, Room } from '@/types';
import { useRoomQuery, useRoomsQuery, useRoomSectionsQuery } from '../queries/useSalaQueries';

/** Parámetro de la URL que fija la sala seleccionada; `roomId` se acepta por compatibilidad. */
const ROOM_PARAM = 'sala';

function getPreferredRoomId(rooms: Room[], roomIdFromUrl: string | null) {
  if (!rooms.length) return null;

  if (roomIdFromUrl) {
    const roomFromUrl = rooms.find((room) => room.id === roomIdFromUrl);
    if (roomFromUrl) return roomFromUrl.id;
  }

  return rooms[0].id;
}

export function useSalaDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams.get(ROOM_PARAM) ?? searchParams.get('roomId');

  const roomsQuery = useRoomsQuery();
  const [selectedRoomId, setSelectedRoomIdState] = useState<string | null>(null);

  const rooms = useMemo(() => roomsQuery.data ?? [], [roomsQuery.data]);

  useEffect(() => {
    if (!rooms.length) {
      setSelectedRoomIdState(null);
      return;
    }

    setSelectedRoomIdState((current) => {
      if (roomIdFromUrl && rooms.some((room) => room.id === roomIdFromUrl)) {
        return roomIdFromUrl;
      }

      if (current && rooms.some((room) => room.id === current)) {
        return current;
      }

      return getPreferredRoomId(rooms, roomIdFromUrl);
    });
  }, [roomIdFromUrl, rooms]);

  /** La sala elegida queda en la URL (`?sala=<id>`) para poder compartirla y no perderla. */
  const setSelectedRoomId = useCallback(
    (roomId: string) => {
      setSelectedRoomIdState(roomId);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('roomId');
      params.set(ROOM_PARAM, roomId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

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
