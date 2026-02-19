'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { Agent, Task, TaskStatus } from '@/types';
import { STATUS_CONFIG, LANE_ORDER } from '@/types';
import TaskCard from './TaskCard';

interface MissionQueueProps {
  tasks: Task[];
  agents: Agent[];
  selectedAgentId: string | null;
  statusFilter: string;
  onStatusFilterChange: (filter: string) => void;
  onTaskClick: (taskId: string) => void;
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
}

const filters = [
  { id: 'all', label: 'All' },
  { id: 'in-progress', label: 'Active' },
  { id: 'review', label: 'Review' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'done', label: 'Done' },
];

// Sortable TaskCard wrapper
function SortableTaskCard({
  task,
  agents,
  onClick,
  compact,
}: {
  task: Task;
  agents: Agent[];
  onClick: () => void;
  compact?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        agents={agents}
        onClick={onClick}
        compact={compact}
        isDragging={isDragging}
      />
    </div>
  );
}

export default function MissionQueue({
  tasks,
  agents,
  selectedAgentId,
  statusFilter,
  onStatusFilterChange,
  onTaskClick,
  onTaskMove,
}: MissionQueueProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const dragEnabled = !!onTaskMove;

  const sensors = useSensors(
    ...(dragEnabled ? [
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    ] : [])
  );

  // Filter by agent
  const agentFiltered = selectedAgentId
    ? tasks.filter(t => t.assigneeId === selectedAgentId)
    : tasks;

  // Group tasks by status
  const grouped = LANE_ORDER.reduce<Record<string, Task[]>>((acc, status) => {
    const statusTasks = agentFiltered
      .filter(t => t.status === status)
      .sort((a, b) => {
        return b.createdAt - a.createdAt;
      });
    if (statusTasks.length > 0 || status === 'in-progress' || status === 'inbox') {
      acc[status] = statusTasks;
    }
    return acc;
  }, {});

  // Which lanes to show
  const visibleLanes = statusFilter === 'all'
    ? Object.keys(grouped)
    : [statusFilter].filter(s => s in STATUS_CONFIG);

  // Check if we're viewing a specific status (grid mode) vs all (kanban mode)
  const isGridMode = statusFilter !== 'all';
  const gridTasks = isGridMode 
    ? (grouped[statusFilter] || []).sort((a, b) => b.createdAt - a.createdAt)
    : [];

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a lane
    if (LANE_ORDER.includes(overId as TaskStatus)) {
      const newStatus = overId as TaskStatus;
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus && onTaskMove) {
        onTaskMove(taskId, newStatus);
      }
    }
    // Check if dropped on another task (get its lane)
    else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask && onTaskMove) {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.status !== overTask.status) {
          onTaskMove(taskId, overTask.status);
        }
      }
    }
  }, [tasks, onTaskMove]);

  return (
    <div className="flex-1 pt-6 pb-16">
      {/* Filter tabs */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6 sm:mb-8 px-2 sm:px-4">
        {filters.map(f => {
          const count = f.id === 'all'
            ? agentFiltered.length
            : agentFiltered.filter(t => t.status === f.id).length;
          
          if (f.id !== 'all' && count === 0) return null;
          
          const isActive = statusFilter === f.id;
          const config = f.id !== 'all' ? STATUS_CONFIG[f.id as TaskStatus] : null;
          
          return (
            <button
              key={f.id}
              onClick={() => onStatusFilterChange(f.id)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-xl transition-all duration-200",
                isActive
                  ? "bg-secondary text-foreground border border-border/80 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              )}
            >
              {config && (
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
              )}
              <span>{f.label}</span>
              <span className={cn(
                "text-xs font-tabular px-1.5 py-0.5 rounded-md",
                isActive 
                  ? "bg-background/50 text-muted-foreground" 
                  : "text-muted-foreground/60"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* GRID MODE: When viewing a specific status */}
        {isGridMode && (
          <div className="px-2 sm:px-4">
            {/* Status header */}
            {statusFilter in STATUS_CONFIG && (
              <div 
                className="flex items-center justify-between px-4 py-3 mb-6 rounded-xl"
                style={{ 
                  background: `linear-gradient(135deg, ${STATUS_CONFIG[statusFilter as TaskStatus].bgColor}50 0%, transparent 100%)`,
                  border: `1px solid ${STATUS_CONFIG[statusFilter as TaskStatus].color}15`
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ 
                      backgroundColor: STATUS_CONFIG[statusFilter as TaskStatus].color,
                      boxShadow: `0 0 10px ${STATUS_CONFIG[statusFilter as TaskStatus].color}50`
                    }}
                  />
                  <span className="text-base font-semibold text-foreground">
                    {STATUS_CONFIG[statusFilter as TaskStatus].label}
                  </span>
                </div>
                <span
                  className="text-sm font-medium px-3 py-1.5 rounded-lg font-tabular"
                  style={{
                    color: STATUS_CONFIG[statusFilter as TaskStatus].color,
                    backgroundColor: STATUS_CONFIG[statusFilter as TaskStatus].bgColor,
                  }}
                >
                  {gridTasks.length} tasks
                </span>
              </div>
            )}

            {/* Grid of cards */}
            <SortableContext items={gridTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                  {gridTasks.map((task) => (
                    <SortableTaskCard
                      key={task.id}
                      task={task}
                      agents={agents}
                      onClick={() => onTaskClick(task.id)}
                      compact={gridTasks.length > 6}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>

            {gridTasks.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-[200px] rounded-2xl border border-dashed border-border/30 bg-gradient-to-b from-transparent to-background/30"
              >
                <span className="text-muted-foreground/50">
                  No {STATUS_CONFIG[statusFilter as TaskStatus]?.label.toLowerCase() || ''} tasks
                </span>
              </motion.div>
            )}
          </div>
        )}

        {/* KANBAN MODE: When viewing "all" */}
        {!isGridMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-2 sm:px-4">
            <AnimatePresence mode="popLayout">
              {visibleLanes.map(status => (
                <DroppableLane
                  key={status}
                  status={status as TaskStatus}
                  tasks={grouped[status] || []}
                  agents={agents}
                  onTaskClick={onTaskClick}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask && (
            <div className="opacity-90 shadow-2xl scale-105">
              <TaskCard
                task={activeTask}
                agents={agents}
                onClick={() => {}}
                isDragging
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {!isGridMode && visibleLanes.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <p className="text-muted-foreground">No tasks match the current filter.</p>
        </motion.div>
      )}
    </div>
  );
}

function DroppableLane({ 
  status, 
  tasks, 
  agents, 
  onTaskClick 
}: {
  status: TaskStatus;
  tasks: Task[];
  agents: Agent[];
  onTaskClick: (id: string) => void;
}) {
  const config = STATUS_CONFIG[status];
  
  const { setNodeRef, isOver } = useSortable({
    id: status,
    data: { type: 'lane', status },
  });

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col transition-all duration-200 rounded-2xl",
        isOver && "ring-2 ring-offset-2 ring-offset-background",
      )}
      style={isOver ? { 
        '--tw-ring-color': config.color,
      } as React.CSSProperties : {}}
    >
      {/* Lane header */}
      <div 
        className="flex items-center justify-between px-3 py-2.5 mb-4 rounded-xl"
        style={{ 
          background: `linear-gradient(135deg, ${config.bgColor}50 0%, transparent 100%)`,
          border: `1px solid ${config.color}15`
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ 
              backgroundColor: config.color,
              boxShadow: `0 0 8px ${config.color}50`
            }}
          />
          <span className="text-sm font-semibold text-foreground">
            {config.label}
          </span>
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-lg font-tabular"
          style={{
            color: config.color,
            backgroundColor: config.bgColor,
          }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4 min-h-[200px]">
          <AnimatePresence mode="popLayout">
            {tasks.slice(0, 3).map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                agents={agents}
                onClick={() => onTaskClick(task.id)}
              />
            ))}
          </AnimatePresence>

          {tasks.length > 3 && (
            <div className="text-center py-2">
              <span className="text-xs text-muted-foreground/60">
                +{tasks.length - 3} more
              </span>
            </div>
          )}

          {tasks.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "flex flex-col items-center justify-center h-[140px] rounded-2xl border border-dashed bg-gradient-to-b from-transparent to-background/30",
                isOver ? "border-solid" : "border-border/30"
              )}
              style={isOver ? { borderColor: config.color } : {}}
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                style={{ backgroundColor: `${config.bgColor}` }}
              >
                <span className="text-sm" style={{ color: config.color }}>
                  {isOver ? '↓' : '○'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground/50">
                {isOver ? 'Drop here' : `No ${config.label.toLowerCase()} tasks`}
              </span>
            </motion.div>
          )}
        </div>
      </SortableContext>
    </motion.div>
  );
}
