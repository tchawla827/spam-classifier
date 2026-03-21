"use client";

import { Clock } from "lucide-react";

export function HistoryEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted/30 p-4 mb-4">
        <Clock className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">No history yet</p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Classified emails will appear here
      </p>
    </div>
  );
}
