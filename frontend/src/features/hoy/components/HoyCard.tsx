'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/contexts/ToastContext';
import { RANGE_STAGE_LABELS } from '@/features/home/lib/readings';
import { AgendaSection, AgendaTask, TaskInput, WateringInput } from '@/types';
import { useAgendaMutations } from '../hooks/useAgendaHoy';
import { CompleteTaskDialog } from './CompleteTaskDialog';
import { LightScheduleDialog } from './LightScheduleDialog';
import { PeriodSummary } from './PeriodSummary';
import { PhotoThumb } from './PhotoThumb';
import { TaskDialog } from './TaskDialog';
import { TaskRow } from './TaskRow';
import { UpcomingList } from './UpcomingList';
import { WateringDialog } from './WateringDialog';
import { WateringRow } from './WateringRow';

interface HoyCardProps {
  entry: AgendaSection;
  today: string;
  timeZone: string;
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Error desconocido');

/** Bloque "Hoy" de una carpa: cómo pasó cada período de luz, qué toca hoy y qué viene. */
export function HoyCard({ entry, today, timeZone }: HoyCardProps) {
  const { toast } = useToast();
  const mutations = useAgendaMutations();
  const [taskDialog, setTaskDialog] = useState<{ task: AgendaTask | null } | null>(null);
  const [completing, setCompleting] = useState<AgendaTask | null>(null);
  const [deleting, setDeleting] = useState<AgendaTask | null>(null);
  const [watering, setWatering] = useState(false);
  const [lights, setLights] = useState(false);

  const { section, cycle } = entry;
  const feeding = entry.feeding[0] ?? null;
  const pending = entry.tasks.filter((task) => task.status !== 'DONE').length;
  const emptyLabel = !entry.sensor
    ? 'Sin sensor en la carpa'
    : entry.sensor.readingsEnabled
      ? 'Sin lecturas en este período'
      : 'Lecturas desactivadas';
  const busy = mutations.completeTask.isPending || mutations.completePrevention.isPending;

  const complete = (task: AgendaTask, note?: string) => {
    const onSuccess = () => {
      setCompleting(null);
      toast.success(task.eventType ? `${task.title} · registrado en la bitácora` : task.title, 'Hecha');
    };
    const onError = (error: unknown) => toast.error(errorMessage(error), 'No se pudo marcar');
    if (task.source === 'PREVENCION') {
      mutations.completePrevention.mutate({ sectionId: section.id, key: task.key, note }, { onSuccess, onError });
    } else if (task.taskId) {
      mutations.completeTask.mutate({ id: task.taskId, note }, { onSuccess, onError });
    }
  };

  // Lo que escribe en la bitácora pide confirmación; una tarea sin evento se tilda directo.
  const requestComplete = (task: AgendaTask) => {
    if (task.source === 'PREVENCION' || task.eventType) setCompleting(task);
    else complete(task);
  };

  const saveTask = (data: TaskInput) => {
    const current = taskDialog?.task;
    const options = {
      onSuccess: () => {
        setTaskDialog(null);
        toast.success(data.title, current ? 'Tarea actualizada' : 'Tarea creada');
      },
      onError: (error: unknown) => toast.error(errorMessage(error), 'No se pudo guardar'),
    };
    if (current?.taskId) {
      const { sectionId: _sectionId, ...changes } = data;
      mutations.updateTask.mutate({ id: current.taskId, data: changes }, options);
    } else {
      mutations.createTask.mutate(data, options);
    }
  };

  const saveWatering = (data: WateringInput) =>
    mutations.registerWatering.mutate(data, {
      onSuccess: () => {
        setWatering(false);
        toast.success(`${data.plantIds.length} plantas`, 'Riego registrado');
      },
      onError: (error) => toast.error(errorMessage(error), 'No se pudo registrar'),
    });

  return (
    <article className="overflow-hidden rounded-md border border-edge bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-4 py-3">
        <div className="min-w-0">
          <Link href={`/sala/carpa/${section.id}`} className="text-sm font-medium text-fg hover:text-accent">
            {section.name}
          </Link>
          <p className="text-xs text-fg-faint">
            {[
              RANGE_STAGE_LABELS[section.effectiveStage],
              feeding ? `semana ${feeding.week}` : null,
              cycle ? `${cycle.name}, día ${cycle.day}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setLights(true)}>
            <Clock className="h-4 w-4" />
            {section.lightsOn && section.lightsOff ? `Luz ${section.lightsOn}–${section.lightsOff}` : 'Horario de luz'}
          </Button>
          <Button size="sm" onClick={() => setTaskDialog({ task: null })}>
            <Plus className="h-4 w-4" />
            Tarea
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section aria-label="Ambiente" className="space-y-3 p-4 lg:border-r lg:border-edge">
          {entry.periods.map((period) => (
            <PeriodSummary key={period.start} period={period} timeZone={timeZone} emptyLabel={emptyLabel} />
          ))}
          {entry.photo ? (
            <PhotoThumb
              deviceId={entry.photo.deviceId}
              filename={entry.photo.filename}
              takenAt={entry.photo.takenAt}
              today={today}
              timeZone={timeZone}
            />
          ) : null}
        </section>

        <section aria-label="Tareas" className="space-y-4 border-t border-edge p-4 lg:border-t-0">
          <WateringRow
            feeding={feeding}
            lastWatering={entry.lastWatering}
            plantsTotal={entry.plants.length}
            today={today}
            timeZone={timeZone}
            onWater={() => setWatering(true)}
          />

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
              Tareas{pending ? <span className="ml-1 tabular-nums text-fg-faint">{pending}</span> : null}
            </h3>
            {entry.tasks.length ? (
              <ul className="divide-y divide-edge">
                {entry.tasks.map((task) => (
                  <TaskRow
                    key={task.key}
                    task={task}
                    today={today}
                    timeZone={timeZone}
                    busy={busy}
                    onComplete={requestComplete}
                    onEdit={(item) => setTaskDialog({ task: item })}
                    onSkip={(item) =>
                      item.taskId &&
                      mutations.updateTask.mutate(
                        { id: item.taskId, data: { status: 'SKIPPED' } },
                        { onError: (error) => toast.error(errorMessage(error), 'No se pudo omitir') }
                      )
                    }
                    onDelete={setDeleting}
                  />
                ))}
              </ul>
            ) : (
              <p className="py-2 text-sm text-fg-faint">Sin tareas para hoy</p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Próximo</h3>
            <UpcomingList items={entry.upcoming} today={today} />
          </div>
        </section>
      </div>

      {taskDialog ? (
        <TaskDialog
          open
          task={taskDialog.task}
          sectionId={section.id}
          plants={entry.plants}
          today={today}
          saving={mutations.createTask.isPending || mutations.updateTask.isPending}
          onOpenChange={(open) => !open && setTaskDialog(null)}
          onSave={saveTask}
        />
      ) : null}

      {completing ? (
        <CompleteTaskDialog
          key={completing.key}
          task={completing}
          saving={busy}
          onOpenChange={(open) => !open && setCompleting(null)}
          onConfirm={(note) => complete(completing, note || undefined)}
        />
      ) : null}

      {watering ? (
        <WateringDialog
          open
          sectionId={section.id}
          plants={entry.plants}
          feeding={feeding}
          saving={mutations.registerWatering.isPending}
          onOpenChange={(open) => !open && setWatering(false)}
          onSave={saveWatering}
        />
      ) : null}

      {lights ? (
        <LightScheduleDialog
          sectionName={section.name}
          lightsOn={section.lightsOn}
          lightsOff={section.lightsOff}
          saving={mutations.updateLights.isPending}
          onOpenChange={(open) => !open && setLights(false)}
          onSave={(lightsOn, lightsOff) =>
            mutations.updateLights.mutate(
              { sectionId: section.id, lightsOn, lightsOff },
              {
                onSuccess: () => setLights(false),
                onError: (error) => toast.error(errorMessage(error), 'No se pudo guardar el horario'),
              }
            )
          }
        />
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Borrar tarea"
        message={deleting ? `${deleting.title}. No queda registro.` : ''}
        confirmText="Borrar"
        variant="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting?.taskId) return;
          mutations.deleteTask.mutate(deleting.taskId, {
            onSuccess: () => setDeleting(null),
            onError: (error) => toast.error(errorMessage(error), 'No se pudo borrar'),
          });
        }}
      />
    </article>
  );
}
