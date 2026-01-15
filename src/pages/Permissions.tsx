import { useState } from 'react';
import { mockRoles, mockPolicyVersions } from '@/data/mockPermissions';
import { Role, Permission } from '@/types/permissions';
import { RoleSidebar } from '@/components/RoleSidebar';
import { PermissionMatrix } from '@/components/PermissionMatrix';
import { ActionToolbar } from '@/components/ActionToolbar';
import { VersionHistoryDrawer } from '@/components/VersionHistoryDrawer';
import { AuthCheckDialog } from '@/components/AuthCheckDialog';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const Permissions = () => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [selectedRole, setSelectedRole] = useState<Role | null>(mockRoles[0]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAuthCheck, setShowAuthCheck] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishComment, setPublishComment] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const hasChanges = roles.some(role => role.hasChanges);

  const handlePermissionChange = (permissionKey: string, allowed: boolean) => {
    if (!selectedRole) return;

    const updatedRoles = roles.map(role => {
      if (role.id === selectedRole.id) {
        return {
          ...role,
          hasChanges: true,
          permissions: role.permissions.map(p =>
            p.key === permissionKey ? { ...p, allowed } : p
          ),
        };
      }
      return role;
    });

    setRoles(updatedRoles);
    setSelectedRole(updatedRoles.find(r => r.id === selectedRole.id) || null);
  };

  const handleScopeChange = (permissionKey: string, scope: Permission['scope']) => {
    if (!selectedRole) return;

    const updatedRoles = roles.map(role => {
      if (role.id === selectedRole.id) {
        return {
          ...role,
          hasChanges: true,
          permissions: role.permissions.map(p =>
            p.key === permissionKey ? { ...p, scope } : p
          ),
        };
      }
      return role;
    });

    setRoles(updatedRoles);
    setSelectedRole(updatedRoles.find(r => r.id === selectedRole.id) || null);
  };

  const handleSaveDraft = () => {
    toast({
      title: "Draft saved",
      description: "Your changes have been saved as a draft.",
    });
  };

  const handlePublish = () => {
    if (!publishComment.trim()) {
      toast({
        title: "Comment required",
        description: "Please describe the changes you're making.",
        variant: "destructive",
      });
      return;
    }

    const updatedRoles = roles.map(role => ({ ...role, hasChanges: false }));
    setRoles(updatedRoles);
    setSelectedRole(updatedRoles.find(r => r.id === selectedRole?.id) || null);
    setShowPublishDialog(false);
    setPublishComment('');

    toast({
      title: "Changes published",
      description: "New policy version has been created successfully.",
    });
  };

  const handleAddRole = () => {
    if (!newRoleName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a role name.",
        variant: "destructive",
      });
      return;
    }

    const newRole: Role = {
      id: `role-${Date.now()}`,
      name: newRoleName,
      description: newRoleDesc || 'Custom role',
      isSystem: false,
      permissions: mockRoles[0].permissions.map(p => ({ ...p, allowed: false })),
    };

    setRoles([...roles, newRole]);
    setSelectedRole(newRole);
    setShowAddRole(false);
    setNewRoleName('');
    setNewRoleDesc('');

    toast({
      title: "Role created",
      description: `${newRoleName} has been created successfully.`,
    });
  };

  const handleCloneRole = () => {
    if (!selectedRole) return;

    const clonedRole: Role = {
      ...selectedRole,
      id: `role-${Date.now()}`,
      name: `${selectedRole.name} (Copy)`,
      isSystem: false,
      hasChanges: true,
    };

    setRoles([...roles, clonedRole]);
    setSelectedRole(clonedRole);

    toast({
      title: "Role cloned",
      description: `Created a copy of ${selectedRole.name}.`,
    });
  };

  const handleCompareRoles = () => {
    toast({
      title: "Compare roles",
      description: "Role comparison feature - coming soon in the full version!",
    });
  };

  const handlePreviewRole = () => {
    toast({
      title: "Preview mode",
      description: `Previewing permissions as ${selectedRole?.name || 'selected role'}.`,
    });
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(roles, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'roles-export.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: "Roles exported",
      description: "Downloaded roles-export.json successfully.",
    });
  };

  const handleImport = () => {
    toast({
      title: "Import roles",
      description: "File import feature - select a JSON file to import roles.",
    });
  };

  const handleRollback = (versionId: string) => {
    toast({
      title: "Rollback initiated",
      description: `Rolling back to version ${versionId}.`,
    });
    setShowHistory(false);
  };

  return (
    <div className="permissions-page flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Cyber Labs</h1>
            <p className="text-sm text-muted-foreground">
              Role-Based Access Control Management
            </p>
          </div>
          <Button onClick={() => setShowAuthCheck(true)} variant="outline">
            Test Authorization
          </Button>
        </div>
      </header>

      {/* Action Toolbar */}
      <ActionToolbar
        selectedRole={selectedRole}
        hasChanges={hasChanges}
        onSaveDraft={handleSaveDraft}
        onPublish={() => setShowPublishDialog(true)}
        onCloneRole={handleCloneRole}
        onCompareRoles={handleCompareRoles}
        onPreviewRole={handlePreviewRole}
        onViewHistory={() => setShowHistory(true)}
        onExport={handleExport}
        onImport={handleImport}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80">
          <RoleSidebar
            roles={roles}
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            onAddRole={() => setShowAddRole(true)}
          />
        </div>
        <div className="flex-1">
          <PermissionMatrix
            role={selectedRole}
            onPermissionChange={handlePermissionChange}
            onScopeChange={handleScopeChange}
          />
        </div>
      </div>

      {/* Dialogs */}
      <VersionHistoryDrawer
        open={showHistory}
        onClose={() => setShowHistory(false)}
        versions={mockPolicyVersions}
        onRollback={handleRollback}
      />

      <AuthCheckDialog
        open={showAuthCheck}
        onClose={() => setShowAuthCheck(false)}
      />

      <Dialog open={showAddRole} onOpenChange={setShowAddRole}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
            <DialogDescription>
              Create a new custom role with specific permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                placeholder="e.g., Senior Developer"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-desc">Description</Label>
              <Textarea
                id="role-desc"
                placeholder="Describe the role's responsibilities..."
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRole(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole}>Create Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Changes</DialogTitle>
            <DialogDescription>
              Describe the changes you're making to create a new policy version
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="publish-comment">Change Description</Label>
            <Textarea
              id="publish-comment"
              placeholder="e.g., Added finance permissions to Manager role"
              value={publishComment}
              onChange={(e) => setPublishComment(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublish}>Publish Version</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Permissions;
