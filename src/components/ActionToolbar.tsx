import { Role } from '@/types/permissions';
import { Button } from '@/components/ui/button';
import { 
  Save, Upload, History, Eye, GitCompare, Copy, 
  Download, CheckCircle2 
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActionToolbarProps {
  selectedRole: Role | null;
  hasChanges: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onCloneRole: () => void;
  onCompareRoles: () => void;
  onPreviewRole: () => void;
  onViewHistory: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function ActionToolbar({
  selectedRole,
  hasChanges,
  onSaveDraft,
  onPublish,
  onCloneRole,
  onCompareRoles,
  onPreviewRole,
  onViewHistory,
  onExport,
  onImport,
}: ActionToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onCloneRole}
                disabled={!selectedRole}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Clone
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create a copy of this role</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onCompareRoles}
                className="gap-2"
              >
                <GitCompare className="h-4 w-4" />
                Compare
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Compare two roles side by side</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onPreviewRole}
                disabled={!selectedRole}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Preview permissions as this role</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onViewHistory}
                className="gap-2"
              >
                <History className="h-4 w-4" />
                History
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View policy version history</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export roles to JSON</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onImport}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Import roles from JSON</p>
            </TooltipContent>
          </Tooltip>

          <Button
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={!hasChanges}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>

          <Button
            size="sm"
            onClick={onPublish}
            disabled={!hasChanges}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Publish
          </Button>
        </TooltipProvider>
      </div>
    </div>
  );
}

