import { useState } from 'react';
import { Role, Permission } from '@/types/permissions';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, FolderKanban, ListTodo, Clock, FileText, 
  Calendar, DollarSign, Mail, Settings, Search,
  CheckSquare, XSquare, Info, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScopeEditor } from './ScopeEditor';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const groupIcons: Record<string, any> = {
  Users: Users,
  Projects: FolderKanban,
  Tasks: ListTodo,
  Timelogs: Clock,
  Documents: FileText,
  Calendar: Calendar,
  Finance: DollarSign,
  Email: Mail,
  System: Settings,
};

const groupColors: Record<string, string> = {
  Users: 'users',
  Projects: 'projects',
  Tasks: 'tasks',
  Timelogs: 'timelogs',
  Documents: 'documents',
  Calendar: 'calendar',
  Finance: 'finance',
  Email: 'email',
  System: 'system',
};

interface PermissionMatrixProps {
  role: Role | null;
  onPermissionChange: (permissionKey: string, allowed: boolean) => void;
  onScopeChange: (permissionKey: string, scope: Permission['scope']) => void;
}

export function PermissionMatrix({ role, onPermissionChange, onScopeChange }: PermissionMatrixProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>('Users');

  if (!role) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p className="text-lg">Select a role to view permissions</p>
          <p className="text-sm">Choose a role from the sidebar to start editing</p>
        </div>
      </div>
    );
  }

  const groupedPermissions = role.permissions.reduce((acc, permission) => {
    if (!acc[permission.group]) {
      acc[permission.group] = [];
    }
    acc[permission.group].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const filteredGroups = Object.entries(groupedPermissions).reduce((acc, [group, permissions]) => {
    const filtered = permissions.filter(p =>
      p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[group] = filtered;
    }
    return acc;
  }, {} as Record<string, Permission[]>);

  const toggleGroup = (group: string) => {
    setExpandedGroup(expandedGroup === group ? null : group);
  };

  const toggleAllInGroup = (group: string, enabled: boolean) => {
    groupedPermissions[group].forEach(permission => {
      onPermissionChange(permission.key, enabled);
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card p-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">{role.name}</h2>
            <p className="text-sm text-muted-foreground">{role.description}</p>
          </div>
          {role.hasChanges && (
            <Badge variant="outline" className="border-amber-500 text-amber-600">
              Unsaved Changes
            </Badge>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          <TooltipProvider>
            {Object.entries(filteredGroups).map(([group, permissions]) => {
              const Icon = groupIcons[group];
              const colorKey = groupColors[group];
              const activeCount = permissions.filter(p => p.allowed).length;
              const isExpanded = expandedGroup === group;

              return (
                <Card key={group} className="overflow-hidden">
                  <button
                    onClick={() => toggleGroup(group)}
                    className="flex w-full items-center justify-between border-b p-4 text-left transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("rounded-lg p-2", `bg-${colorKey}/10`)}>
                        <Icon className={cn("h-5 w-5", `text-${colorKey}`)} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{group}</h3>
                        <p className="text-sm text-muted-foreground">
                          {activeCount} of {permissions.length} enabled
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllInGroup(group, true);
                        }}
                      >
                        <CheckSquare className="mr-1 h-3 w-3" />
                        All
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAllInGroup(group, false);
                        }}
                      >
                        <XSquare className="mr-1 h-3 w-3" />
                        None
                      </Button>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-1 p-2">
                      {permissions.map((permission) => (
                        <div
                          key={permission.key}
                          className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="mb-1 flex items-center gap-2">
                                <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                                  {permission.key}
                                </code>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">{permission.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {permission.description}
                              </p>
                              {permission.allowed && permission.scope && (
                                <div className="mt-2">
                                  <ScopeEditor
                                    scope={permission.scope}
                                    onChange={(newScope) => onScopeChange(permission.key, newScope)}
                                  />
                                </div>
                              )}
                            </div>
                            <Switch
                              checked={permission.allowed}
                              onCheckedChange={(checked) => 
                                onPermissionChange(permission.key, checked)
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </TooltipProvider>
        </div>
      </ScrollArea>
    </div>
  );
}

