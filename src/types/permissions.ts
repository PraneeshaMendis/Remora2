export type PermissionScope = {
  type: 'any' | 'department' | 'project' | 'assigned'
  ids?: string[]
}

export type Permission = {
  key: string
  group: string
  description: string
  allowed: boolean
  scope?: PermissionScope
}

export type Role = {
  id: string
  name: string
  description: string
  isSystem: boolean
  permissions: Permission[]
  hasChanges?: boolean
}

export type PolicyVersion = {
  id: string
  authorName: string
  comment: string
  changes: string[]
  createdAt: string
}

export type AuthCheckResult = {
  allowed: boolean
  reason: string
  evaluatedRoles: string[]
}

