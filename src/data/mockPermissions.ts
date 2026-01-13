import { Permission, Role, PolicyVersion } from '@/types/permissions';

export const permissionGroups = {
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

export const allPermissions: Omit<Permission, 'allowed' | 'scope'>[] = [
  // Users
  { key: 'users:read', group: 'Users', description: 'View user profiles and information' },
  { key: 'users:invite', group: 'Users', description: 'Send invitations to new users' },
  { key: 'users:deactivate', group: 'Users', description: 'Deactivate user accounts' },
  { key: 'approvals:any', group: 'Users', description: 'Approve any user action across organization' },
  { key: 'approvals:dept', group: 'Users', description: 'Approve actions within department' },

  // Projects
  { key: 'projects:create', group: 'Projects', description: 'Create new projects' },
  { key: 'projects:read', group: 'Projects', description: 'View project details' },
  { key: 'projects:update', group: 'Projects', description: 'Edit project information' },
  { key: 'projects:delete', group: 'Projects', description: 'Delete projects' },
  { key: 'projects:assign', group: 'Projects', description: 'Assign team members to projects' },

  // Tasks
  { key: 'tasks:create', group: 'Tasks', description: 'Create new tasks' },
  { key: 'tasks:read', group: 'Tasks', description: 'View task details' },
  { key: 'tasks:update', group: 'Tasks', description: 'Edit task information' },
  { key: 'tasks:assign', group: 'Tasks', description: 'Assign tasks to team members' },
  { key: 'tasks:comment', group: 'Tasks', description: 'Comment on tasks' },

  // Timelogs
  { key: 'timelogs:create', group: 'Timelogs', description: 'Log time entries' },
  { key: 'timelogs:read', group: 'Timelogs', description: 'View time entries' },
  { key: 'timelogs:update', group: 'Timelogs', description: 'Edit time entries' },

  // Documents
  { key: 'documents:upload', group: 'Documents', description: 'Upload new documents' },
  { key: 'documents:read', group: 'Documents', description: 'View documents' },
  { key: 'documents:assign_reviewer', group: 'Documents', description: 'Assign reviewers to documents' },
  { key: 'documents:review', group: 'Documents', description: 'Review and approve documents' },

  // Calendar
  { key: 'calendar:connect', group: 'Calendar', description: 'Connect calendar services' },
  { key: 'calendar:read', group: 'Calendar', description: 'View calendar events' },
  { key: 'calendar:sources_manage', group: 'Calendar', description: 'Manage calendar sources' },

  // Finance
  { key: 'finance:invoices:read', group: 'Finance', description: 'View invoices' },
  { key: 'finance:invoices:write', group: 'Finance', description: 'Create and edit invoices' },
  { key: 'finance:receipts:read', group: 'Finance', description: 'View receipts' },
  { key: 'finance:receipts:verify', group: 'Finance', description: 'Verify receipt authenticity' },
  { key: 'finance:receipts:reject', group: 'Finance', description: 'Reject invalid receipts' },
  { key: 'finance:receipts:match', group: 'Finance', description: 'Match receipts to transactions' },
  { key: 'finance:bank_credits:read', group: 'Finance', description: 'View bank credits' },
  { key: 'finance:bank_credits:match', group: 'Finance', description: 'Match bank credits to records' },

  // Email
  { key: 'email:send_invite', group: 'Email', description: 'Send email invitations' },

  // System
  { key: 'system:settings:manage', group: 'System', description: 'Manage system settings' },
  { key: 'system:roles:manage', group: 'System', description: 'Manage roles and permissions' },
  { key: 'system:departments:manage', group: 'System', description: 'Manage departments' },
  { key: 'system:audit:read', group: 'System', description: 'View audit logs' },
];

export const mockRoles: Role[] = [
  {
    id: 'director',
    name: 'Director',
    description: 'Full access to all features and settings',
    isSystem: true,
    permissions: allPermissions.map(p => ({ ...p, allowed: true, scope: { type: 'any' as const } })),
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Manage team and department operations',
    isSystem: true,
    permissions: allPermissions.map(p => {
      const allowed = [
        'users:read', 'users:invite', 'approvals:dept',
        'projects:create', 'projects:read', 'projects:update', 'projects:assign',
        'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign', 'tasks:comment',
        'documents:upload', 'documents:read', 'documents:assign_reviewer', 'documents:review',
        'calendar:connect', 'calendar:read',
        'finance:invoices:read', 'finance:receipts:read', 'finance:receipts:verify', 'finance:bank_credits:read'
      ].includes(p.key);
      return { 
        ...p, 
        allowed,
        scope: allowed && (p.key.includes('approvals:dept') || p.key.includes('projects')) 
          ? { type: 'department' as const, ids: ['tech', 'grc'] } 
          : { type: 'any' as const }
      };
    }),
  },
  {
    id: 'lead',
    name: 'Lead',
    description: 'Lead team members within department',
    isSystem: true,
    permissions: allPermissions.map(p => {
      const allowed = [
        'users:read', 'approvals:dept',
        'projects:read', 'projects:update', 'projects:assign',
        'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign', 'tasks:comment',
        'documents:upload', 'documents:read', 'documents:review',
        'calendar:connect', 'calendar:read',
        'finance:invoices:read', 'finance:receipts:read'
      ].includes(p.key);
      return { 
        ...p, 
        allowed,
        scope: allowed && p.key.includes('approvals:dept') 
          ? { type: 'department' as const, ids: ['tech'] } 
          : { type: 'any' as const }
      };
    }),
  },
  {
    id: 'consultant',
    name: 'Consultant',
    description: 'Work on assigned projects and tasks',
    isSystem: false,
    permissions: allPermissions.map(p => {
      const allowed = [
        'projects:read',
        'tasks:create', 'tasks:read', 'tasks:update', 'tasks:comment',
        'timelogs:create', 'timelogs:read', 'timelogs:update',
        'documents:upload', 'documents:read', 'documents:review',
        'calendar:connect', 'calendar:read'
      ].includes(p.key);
      return { 
        ...p, 
        allowed,
        scope: allowed ? { type: 'assigned' as const } : { type: 'any' as const }
      };
    }),
  },
  {
    id: 'member',
    name: 'Member',
    description: 'Basic team member access',
    isSystem: false,
    permissions: allPermissions.map(p => {
      const allowed = [
        'projects:read',
        'tasks:read', 'tasks:comment',
        'timelogs:create', 'timelogs:read',
        'documents:read',
        'calendar:connect', 'calendar:read'
      ].includes(p.key);
      return { 
        ...p, 
        allowed,
        scope: allowed ? { type: 'assigned' as const } : { type: 'any' as const }
      };
    }),
  },
  {
    id: 'client',
    name: 'Client',
    description: 'External client with limited access',
    isSystem: false,
    permissions: allPermissions.map(p => {
      const allowed = [
        'projects:read',
        'tasks:read', 'tasks:comment',
        'documents:read', 'documents:upload'
      ].includes(p.key);
      return { 
        ...p, 
        allowed,
        scope: allowed ? { type: 'assigned' as const } : { type: 'any' as const }
      };
    }),
  },
];

export const mockPolicyVersions: PolicyVersion[] = [
  {
    id: 'v5',
    authorName: 'Sarah Chen',
    comment: 'Granted Manager role access to finance receipts verification',
    changes: ['Added finance:receipts:verify to Manager role'],
    createdAt: '2025-01-15T10:30:00Z',
  },
  {
    id: 'v4',
    authorName: 'John Smith',
    comment: 'Restricted project assignment to department scope for Leads',
    changes: ['Updated projects:assign scope from "any" to "department" for Lead role'],
    createdAt: '2025-01-10T14:20:00Z',
  },
  {
    id: 'v3',
    authorName: 'Sarah Chen',
    comment: 'Added Client role for external stakeholders',
    changes: ['Created new Client role with limited permissions'],
    createdAt: '2025-01-05T09:15:00Z',
  },
  {
    id: 'v2',
    authorName: 'Admin System',
    comment: 'Initial setup of department-scoped permissions',
    changes: ['Configured department scopes for Manager and Lead roles'],
    createdAt: '2025-01-01T08:00:00Z',
  },
];
