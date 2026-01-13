import { PolicyVersion } from '@/types/permissions';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Undo2, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

interface VersionHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  versions: PolicyVersion[];
  onRollback: (versionId: string) => void;
}

export function VersionHistoryDrawer({ 
  open, 
  onClose, 
  versions,
  onRollback 
}: VersionHistoryDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Version History</SheetTitle>
          <SheetDescription>
            View and rollback to previous policy versions
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-4 mt-6">
          <div className="space-y-4">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        {version.id}
                      </Badge>
                      {index === 0 && (
                        <Badge variant="outline" className="border-green-500 text-green-600">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">{version.comment}</p>
                  </div>
                  {index !== 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRollback(version.id)}
                      className="gap-1.5"
                    >
                      <Undo2 className="h-3 w-3" />
                      Rollback
                    </Button>
                  )}
                </div>

                <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    <span>{version.authorName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(version.createdAt), 'PPpp')}</span>
                  </div>
                </div>

                <div className="rounded-md bg-muted/50 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Changes:</p>
                  <ul className="space-y-1">
                    {version.changes.map((change, i) => (
                      <li key={i} className="text-xs">
                        • {change}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

