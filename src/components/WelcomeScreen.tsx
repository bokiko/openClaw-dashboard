'use client';

import { motion } from 'framer-motion';
import { FolderPlus, Users, RefreshCw } from 'lucide-react';

interface WelcomeScreenProps {
  dashboardName?: string;
}

export default function WelcomeScreen({ dashboardName }: WelcomeScreenProps) {
  const name = dashboardName || 'OpenClaw';

  const steps = [
    {
      icon: FolderPlus,
      title: 'Add task JSON files',
      description: 'Drop JSON task files into your tasks/ directory',
    },
    {
      icon: Users,
      title: 'Link agents',
      description: 'Include "claimed_by" or "assignee" to assign agents',
    },
    {
      icon: RefreshCw,
      title: 'Watch them appear',
      description: 'Tasks and agents show up automatically',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-premium rounded-2xl overflow-hidden max-w-2xl mx-auto mt-12"
    >
      <div className="px-8 pt-8 pb-2 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Welcome to {name}
        </h2>
        <p className="text-sm text-muted-foreground">
          Your agent swarm dashboard is ready. Add some tasks to get started.
        </p>
      </div>

      <div className="px-8 py-6 space-y-4">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * (i + 1) }}
            className="flex items-start gap-4 p-4 rounded-xl"
            style={{
              background: 'var(--surface-subtle)',
              border: '1px solid var(--surface-card-border)',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary, #46a758) 15%, transparent)',
                color: 'var(--accent-primary, #46a758)',
              }}
            >
              <step.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="px-8 pb-8">
        <div
          className="rounded-xl p-4 font-mono text-xs leading-relaxed overflow-x-auto"
          style={{
            background: 'var(--surface-subtle)',
            border: '1px solid var(--surface-card-border)',
          }}
        >
          <p className="text-muted-foreground mb-1">{'// tasks/my-task.json'}</p>
          <pre className="text-foreground">{`{
  "title": "Build landing page",
  "status": "in-progress",
  "priority": "high",
  "claimed_by": "spark",
  "tags": ["frontend", "ui"]
}`}</pre>
        </div>
      </div>
    </motion.div>
  );
}
