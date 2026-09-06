'use client';

import Link from 'next/link';
import { PlugZap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DeviceIssue } from '../hooks/useHomeDashboard';

interface DeviceIssuesBlockProps {
  issues: DeviceIssue[];
}

export function DeviceIssuesBlock({ issues }: DeviceIssuesBlockProps) {
  return (
    <ul className="space-y-2">
      {issues.map(({ device, sectionName }) => (
        <li key={device.id}>
          <Link
            href="/artefactos"
            className="flex items-center gap-3 rounded-md border border-edge bg-surface px-4 py-3 transition-colors hover:border-edge-strong hover:bg-surface-2"
          >
            <PlugZap className="h-4 w-4 shrink-0 text-offline" />
            <span className="min-w-0 flex-1 truncate text-sm text-fg">
              {device.name}
              {sectionName ? <span className="text-fg-faint"> · {sectionName}</span> : null}
            </span>
            <Badge variant="offline">{device.connector}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
