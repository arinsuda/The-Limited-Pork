export interface Role {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  permissions?: string[];
}

export interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  isActive: boolean;
  roles: Role[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  displayName: string;
  password: string;
  locale: string;
  roleIds: string[];
  isActive: boolean;
}

export interface UpdateUserInput {
  displayName: string;
  locale: string;
  roleIds: string[];
  isActive: boolean;
  version: number;
}
