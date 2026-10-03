import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { http } from '@/shared/lib/http/client';
import { formatDateTime } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

interface NotificationItem {
  id: string;
  type: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  params: Record<string, string | number>;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationListResponse {
  data: NotificationItem[];
  meta: { total: number };
}

export function NotificationPopover() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => http.get('/notifications/unread-count'),
    refetchInterval: 30_000,
  });

  const { data: listData } = useQuery<NotificationListResponse>({
    queryKey: ['notifications', 'list'],
    queryFn: () => http.get('/notifications?pageSize=10'),
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => http.post(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => http.post('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = countData?.count ?? 0;
  const notifications = listData?.data ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-600 hover:text-slate-900">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-2">
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100">
          <span className="font-semibold text-sm text-slate-900">{t('notifications.title')}</span>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t('notifications.mark_all_read')}
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">{t('notifications.empty')}</div>
          ) : (
            notifications.map((item) => {
              const title = t(`notifications.types.${item.type}`, item.params);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.readAt) {
                      markReadMutation.mutate(item.id);
                    }
                    if (item.link) {
                      navigate(item.link);
                    }
                  }}
                  className={`p-3 text-xs transition-colors hover:bg-slate-50 cursor-pointer ${
                    !item.readAt ? 'bg-orange-50/50 font-medium' : 'text-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-slate-900">{title}</p>
                    {item.link && <ExternalLink className="h-3 w-3 shrink-0 text-slate-400 mt-0.5" />}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {formatDateTime(item.createdAt, i18n.language)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
