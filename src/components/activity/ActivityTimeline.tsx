'use client';

import { Inbox } from 'lucide-react';
import type { WorkItem, Agent } from '@/types';
import WorkItemCard from './WorkItemCard';
import TeamGroup from './TeamGroup';

interface ActivityTimelineProps {
  items: WorkItem[];
  agents: Agent[];
  hasFilters: boolean;
}

export default function ActivityTimeline({ items, agents, hasFilters }: ActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="text-sm font-medium text-muted-foreground">
          {hasFilters ? 'No items match your filters' : 'No activity yet'}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {hasFilters ? 'Try adjusting your filter criteria' : 'Work items will appear here as agents complete tasks'}
        </p>
      </div>
    );
  }

  // Group items by team where applicable
  const teamItems = new Map<string, WorkItem[]>();
  const ungrouped: WorkItem[] = [];

  for (const item of items) {
    if (item.team) {
      const existing = teamItems.get(item.team);
      if (existing) {
        existing.push(item);
      } else {
        teamItems.set(item.team, [item]);
      }
    } else {
      ungrouped.push(item);
    }
  }

  // Only group teams with 2+ items
  const actualGroups: [string, WorkItem[]][] = [];
  for (const [team, teamList] of teamItems) {
    if (teamList.length >= 2) {
      actualGroups.push([team, teamList]);
    } else {
      ungrouped.push(...teamList);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {actualGroups.map(([team, teamList]) => (
        <TeamGroup key={team} team={team} items={teamList} agents={agents} />
      ))}
      {ungrouped.map(item => (
        <WorkItemCard key={item.id} item={item} agents={agents} />
      ))}
    </div>
  );
}
