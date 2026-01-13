import { useState } from 'react';
import { Permission, PermissionScope } from '@/types/permissions';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from '@/components/ui/checkbox';
import { Globe, Building2, FolderKanban, UserCheck, ChevronDown } from 'lucide-react';

interface ScopeEditorProps {
  scope: Permission['scope'];
  onChange: (scope: Permission['scope']) => void;
}

const mockDepartments = [
  { id: 'tech', name: 'Technology' },
  { id: 'grc', name: 'GRC' },
  { id: 'finance', name: 'Finance' },
  { id: 'hr', name: 'Human Resources' },
];

const mockProjects = [
  { id: 'proj-a', name: 'Project Alpha' },
  { id: 'proj-b', name: 'Project Beta' },
  { id: 'proj-c', name: 'Project Gamma' },
];

export function ScopeEditor({ scope, onChange }: ScopeEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getScopeIcon = () => {
    switch (scope?.type) {
      case 'any':
        return <Globe className="h-3 w-3" />;
      case 'department':
        return <Building2 className="h-3 w-3" />;
      case 'project':
        return <FolderKanban className="h-3 w-3" />;
      case 'assigned':
        return <UserCheck className="h-3 w-3" />;
      default:
        return <Globe className="h-3 w-3" />;
    }
  };

  const getScopeLabel = () => {
    if (!scope) return 'Any';
    
    switch (scope.type) {
      case 'any':
        return 'Any';
      case 'department':
        return scope.ids && scope.ids.length > 0
          ? `Dept: ${scope.ids.map(id => mockDepartments.find(d => d.id === id)?.name || id).join(', ')}`
          : 'Department';
      case 'project':
        return scope.ids && scope.ids.length > 0
          ? `Project: ${scope.ids.map(id => mockProjects.find(p => p.id === id)?.name || id).join(', ')}`
          : 'Project';
      case 'assigned':
        return 'Assigned Only';
      default:
        return 'Any';
    }
  };

  const handleScopeTypeChange = (type: PermissionScope['type']) => {
    onChange({ type, ids: [] });
    if (type === 'any' || type === 'assigned') {
      setIsOpen(false);
    }
  };

  const handleItemToggle = (itemId: string) => {
    const currentIds = scope?.ids || [];
    const newIds = currentIds.includes(itemId)
      ? currentIds.filter(id => id !== itemId)
      : [...currentIds, itemId];
    onChange({ type: scope?.type || 'any', ids: newIds });
  };

  const items = scope?.type === 'department' ? mockDepartments : mockProjects;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
          {getScopeIcon()}
          <span>{getScopeLabel()}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="mb-3 text-sm font-semibold">Permission Scope</h4>
            <div className="space-y-2">
              <button
                onClick={() => handleScopeTypeChange('any')}
                className={`flex w-full items-center gap-2 rounded-md border p-2 text-left text-sm transition-colors hover:bg-accent ${
                  scope?.type === 'any' ? 'border-primary bg-accent' : ''
                }`}
              >
                <Globe className="h-4 w-4" />
                <div>
                  <div className="font-medium">Any</div>
                  <div className="text-xs text-muted-foreground">No restrictions</div>
                </div>
              </button>

              <button
                onClick={() => handleScopeTypeChange('department')}
                className={`flex w-full items-center gap-2 rounded-md border p-2 text-left text-sm transition-colors hover:bg-accent ${
                  scope?.type === 'department' ? 'border-primary bg-accent' : ''
                }`}
              >
                <Building2 className="h-4 w-4" />
                <div>
                  <div className="font-medium">Department</div>
                  <div className="text-xs text-muted-foreground">Specific departments</div>
                </div>
              </button>

              <button
                onClick={() => handleScopeTypeChange('project')}
                className={`flex w-full items-center gap-2 rounded-md border p-2 text-left text-sm transition-colors hover:bg-accent ${
                  scope?.type === 'project' ? 'border-primary bg-accent' : ''
                }`}
              >
                <FolderKanban className="h-4 w-4" />
                <div>
                  <div className="font-medium">Project</div>
                  <div className="text-xs text-muted-foreground">Specific projects</div>
                </div>
              </button>

              <button
                onClick={() => handleScopeTypeChange('assigned')}
                className={`flex w-full items-center gap-2 rounded-md border p-2 text-left text-sm transition-colors hover:bg-accent ${
                  scope?.type === 'assigned' ? 'border-primary bg-accent' : ''
                }`}
              >
                <UserCheck className="h-4 w-4" />
                <div>
                  <div className="font-medium">Assigned Only</div>
                  <div className="text-xs text-muted-foreground">Only assigned items</div>
                </div>
              </button>
            </div>
          </div>

          {(scope?.type === 'department' || scope?.type === 'project') && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">
                Select {scope.type === 'department' ? 'Departments' : 'Projects'}
              </h4>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      id={item.id}
                      checked={scope.ids?.includes(item.id) || false}
                      onCheckedChange={() => handleItemToggle(item.id)}
                    />
                    <label
                      htmlFor={item.id}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      {item.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
