import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Search, KeyRound, Edit, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { http } from '@/shared/lib/http/client';
import { CreateUserModal } from './components/CreateUserModal';
import { EditUserModal } from './components/EditUserModal';
import { ForceResetPasswordModal } from './components/ForceResetPasswordModal';
import type { ManagedUser, Role } from './types';

interface UsersResponse {
  data: ManagedUser[];
}

interface RolesResponse {
  data: Role[];
}

export function UsersPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<ManagedUser | null>(null);

  // Queries
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => http.get<UsersResponse>('/users?pageSize=100'),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => http.get<Role[] | RolesResponse>('/roles'),
  });

  const users = useMemo(() => usersData?.data || [], [usersData]);
  const roles = useMemo(() => {
    if (Array.isArray(rolesData)) return rolesData;
    if (rolesData && 'data' in rolesData && Array.isArray((rolesData as RolesResponse).data)) {
      return (rolesData as RolesResponse).data;
    }
    return [];
  }, [rolesData]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roles.some((r) => r.code.toLowerCase().includes(q) || r.nameTh.toLowerCase().includes(q)),
    );
  }, [users, searchQuery]);

  const handleUserMutated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }, [queryClient]);

  const getRoleBadgeVariant = (code: string) => {
    switch (code) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'COOK':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-orange-600" />
            {t('users.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('users.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white shrink-0 font-medium text-xs sm:text-sm cursor-pointer"
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          {t('users.create_button')}
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('users.search_placeholder')}
          className="pl-9 text-xs sm:text-sm bg-white"
        />
      </div>

      {/* Users List */}
      {isUsersLoading ? (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="p-8 text-center bg-white border-dashed">
          <p className="text-slate-500 text-xs sm:text-sm">{t('users.empty_search')}</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card
              key={user.id}
              className="bg-white border-slate-200 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  {user.isActive ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] shrink-0 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t('users.active')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] shrink-0 gap-1">
                      <XCircle className="h-3 w-3" />
                      {t('users.inactive')}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {user.roles?.map((r) => (
                    <span
                      key={r.id || r.code}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getRoleBadgeVariant(r.code)}`}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {i18n.language === 'th' ? r.nameTh : r.nameEn}
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditUser(user)}
                    className="h-8 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResetPasswordUser(user)}
                    className="h-8 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200 cursor-pointer"
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1 text-amber-600" />
                    {t('users.force_reset_btn')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      {createModalOpen && (
        <CreateUserModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          roles={roles}
          onCreated={handleUserMutated}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
          roles={roles}
          onUpdated={handleUserMutated}
        />
      )}

      {resetPasswordUser && (
        <ForceResetPasswordModal
          user={resetPasswordUser}
          open={!!resetPasswordUser}
          onOpenChange={(open) => !open && setResetPasswordUser(null)}
        />
      )}
    </div>
  );
}
