import { useState } from 'react';
import { AuthCheckResult } from '@/types/permissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Play } from 'lucide-react';

interface AuthCheckDialogProps {
  open: boolean;
  onClose: () => void;
}

const mockUsers = [
  { id: 'u1', name: 'John Director', role: 'Director' },
  { id: 'u2', name: 'Sarah Manager', role: 'Manager' },
  { id: 'u3', name: 'Mike Lead', role: 'Lead' },
  { id: 'u4', name: 'Lisa Consultant', role: 'Consultant' },
];

const mockPermissions = [
  'users:read',
  'users:invite',
  'projects:create',
  'projects:delete',
  'finance:invoices:write',
  'system:roles:manage',
];

export function AuthCheckDialog({ open, onClose }: AuthCheckDialogProps) {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPermission, setSelectedPermission] = useState('');
  const [result, setResult] = useState<AuthCheckResult | null>(null);

  const handleCheck = () => {
    // Mock authorization check
    const user = mockUsers.find(u => u.id === selectedUser);
    const isDirector = user?.role === 'Director';
    const isManager = user?.role === 'Manager';
    
    let allowed = false;
    let reason = '';

    if (isDirector) {
      allowed = true;
      reason = 'Director role has full access to all permissions';
    } else if (isManager && !selectedPermission.includes('system:') && !selectedPermission.includes('delete')) {
      allowed = true;
      reason = 'Manager role has access to this permission within department scope';
    } else {
      allowed = false;
      reason = `${user?.role} role does not have permission: ${selectedPermission}`;
    }

    setResult({
      allowed,
      reason,
      evaluatedRoles: [user?.role || 'Unknown'],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Authorization Check</DialogTitle>
          <DialogDescription>
            Test permissions for a specific user and action
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user">User</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger id="user">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {mockUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <span>{user.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="permission">Permission</Label>
            <Select value={selectedPermission} onValueChange={setSelectedPermission}>
              <SelectTrigger id="permission">
                <SelectValue placeholder="Select a permission" />
              </SelectTrigger>
              <SelectContent>
                {mockPermissions.map((perm) => (
                  <SelectItem key={perm} value={perm}>
                    <code className="text-xs">{perm}</code>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Context (Optional)</Label>
            <Input
              id="context"
              placeholder='{"departmentId": "tech", "projectId": "p123"}'
              className="font-mono text-xs"
            />
          </div>

          <Button
            onClick={handleCheck}
            disabled={!selectedUser || !selectedPermission}
            className="w-full gap-2"
          >
            <Play className="h-4 w-4" />
            Check Authorization
          </Button>

          {result && (
            <div className={`rounded-lg border p-4 ${
              result.allowed 
                ? 'border-green-500/50 bg-green-500/10' 
                : 'border-red-500/50 bg-red-500/10'
            }`}>
              <div className="mb-2 flex items-center gap-2">
                {result.allowed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-semibold">
                  {result.allowed ? 'Access Granted' : 'Access Denied'}
                </span>
              </div>
              <p className="mb-2 text-sm text-muted-foreground">{result.reason}</p>
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Evaluated roles:</span>
                {result.evaluatedRoles.map((role) => (
                  <Badge key={role} variant="outline" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

