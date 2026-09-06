import { ChevronRight, Home, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Room } from '@/types';
import { cn } from '@/lib/utils';

interface RoomSelectorProps {
  rooms: Room[];
  selectedRoomId: string | null;
  onSelect: (roomId: string) => void;
  onDelete: (roomId: string) => void;
}

export function RoomSelector({ rooms, selectedRoomId, onSelect, onDelete }: RoomSelectorProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {rooms.map((room) => {
        const isSelected = selectedRoomId === room.id;

        return (
          <motion.button
            key={room.id}
            whileHover={{ scale: 1.02 }}
            type="button"
            onClick={() => onSelect(room.id)}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
              isSelected
                ? 'border-cultivo-green-500 bg-cultivo-green-600/20'
                : 'border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600'
            )}
          >
            <Home className={cn('h-5 w-5', isSelected ? 'text-cultivo-green-400' : 'text-zinc-400')} />
            <div className="min-w-0">
              <span className={cn('block font-medium', isSelected ? 'text-cultivo-green-300' : 'text-white')}>
                {room.name}
              </span>
              {room.description ? (
                <p className="max-w-[200px] truncate text-xs text-zinc-400">{room.description}</p>
              ) : null}
            </div>
            {isSelected ? <ChevronRight className="ml-1 h-4 w-4 text-cultivo-green-400" /> : null}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(room.id);
              }}
              className="absolute -right-2 -top-2 rounded-full bg-zinc-700 p-1 opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
              aria-label={`Eliminar ${room.name}`}
            >
              <Trash2 className="h-3 w-3 text-zinc-300" />
            </button>
          </motion.button>
        );
      })}
    </div>
  );
}
