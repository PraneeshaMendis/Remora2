import { useState } from 'react';
import { Role } from '@/types/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Shield, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleSidebarProps {
  roles: Role[];
  selectedRole: Role | null;
  onSelectRole: (role: Role) => void;
  onAddRole: () => void;
}

export function RoleSidebar({ roles, selectedRole, onSelectRole, onAddRole }: RoleSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col border-r bg-card">
      <div className="border-b p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Roles</h2>
          </div>
        
          <Button size="sm" onClick={onAddRole} className="gap-2">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {filteredRoles.map((role) => {
            const activePermissions = role.permissions.filter(p => p.allowed).length;
            const totalPermissions = role.permissions.length;
            
            return (
              <button
                key={role.id}
                onClick={() => onSelectRole(role)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-all hover:bg-accent/50",
                  selectedRole?.id === role.id && "border-primary bg-accent shadow-sm"
                )}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{role.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{role.description}</p>
                  </div>
                  {role.hasChanges && (
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={role.isSystem ? "secondary" : "outline"} className="text-xs">
                    {role.isSystem ? 'System' : 'Custom'}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{activePermissions}/{totalPermissions}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

