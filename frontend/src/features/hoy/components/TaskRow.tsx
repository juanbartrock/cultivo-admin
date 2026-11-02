'use client';

import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { AgendaTask } from '@/types';
import { TASK_EVENT_LABEL, formatDay, formatTime } from '../lib/format';

interface TaskRowProps {
  task: AgendaTask;
  today: string;
  timeZone: string;
  busy: boolean;
  onComplete: (task: AgendaTask) => void;
  onEdit: (task: AgendaTask) => void;
  onSkip: (task: AgendaTask) => void;
  onDelete: (task: AgendaTask) => void;
}

export function TaskRow({ task, today, timeZone, busy, onComplete, onEdit, onSkip, onDelete }: TaskRowProps) {
  const done = task.status === 'DONE';
  const manual = task.source === 'MANUAL';
  const overdue = !done && task.dueDate !== null && task.dueDate < today;
  const eventLabel = task.eventType ? TASK_EVENT_LABEL[task.eventType] : null;
  const checkboxId = `tarea-${task.key}`;

  return (
    <li className="flex items-start gap-3 py-2.5">
      <Checkbox
        id={checkboxId}
        checked={done}
        disabled={done || busy}
        onCheckedChange={() => onComplete(task)}
        className="mt-0.5 h-5 w-5"
        aria-label={done ? `Hecha: ${task.title}` : `Marcar hecha: ${task.title}`}
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={checkboxId}
          className={cn('block text-sm', done ? 'text-fg-faint line-through' : 'cursor-pointer text-fg')}
        >
          {task.title}
        </label>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-faint">
          {task.source === 'PREVENCION' ? <span>Preventivo · día {task.day}</span> : null}
          {overdue && task.dueDate ? <span className="text-warn">desde {formatDay(task.dueDate)}</span> : null}
          {manual && !task.dueDate && !done ? <span>sin fecha</span> : null}
          {task.plants.length ? (
            <span className="tabular-nums">{task.plants.map((plant) => plant.tagCode).join(' · ')}</span>
          ) : null}
          {eventLabel && !done ? (
            <span>
              → {eventLabel}{' '}
              {task.plants.length
                ? `en ${task.plants.length} ${task.plants.length === 1 ? 'planta' : 'plantas'}`
                : 'en la carpa'}
            </span>
          ) : null}
          {!done && task.donePlants.length ? (
            <span className="text-warn">
              {task.donePlants.length}/{task.plants.length} registradas
            </span>
          ) : null}
          {done && task.doneAt ? <span className="text-ok">hecha {formatTime(task.doneAt, timeZone)}</span> : null}
        </div>
        {task.detail && !done ? <p className="mt-1 line-clamp-2 text-xs text-fg-muted">{task.detail}</p> : null}
      </div>
      {manual && !done && task.taskId ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Opciones de ${task.title}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(task)}>Editar</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSkip(task)}>Omitir</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(task)} className="text-danger focus:text-danger">
              Borrar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
}
