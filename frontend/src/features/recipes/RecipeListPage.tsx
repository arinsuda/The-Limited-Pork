import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  Plus,
  Search,
  UtensilsCrossed,
  Sparkles,
  ArrowRight,
  Star,
  Layers,
  FlaskConical,
} from 'lucide-react';
import { http } from '@/shared/lib/http/client';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { RecipeFormModal } from './RecipeFormModal';
import { useAuthStore } from '@/features/auth/auth-store';

interface RecipeSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'TESTING' | 'APPROVED' | 'ARCHIVED';
  currentVersionNo: number;
  trialCount: number;
  latestTrialDate: string | null;
  bestOverallScore: number | null;
  coverUrl: string | null;
  createdAt: string;
}

interface RecipeListResponse {
  data: RecipeSummary[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function RecipeListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: response, isLoading } = useQuery<RecipeListResponse>({
    queryKey: ['recipes', 'list', search, selectedStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (selectedStatus) params.set('status', selectedStatus);
      params.set('pageSize', '50');
      return http.get(`/recipes?${params.toString()}`);
    },
  });

  const recipes = response?.data ?? [];

  const getStatusBadge = (status: RecipeSummary['status']) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">{t('recipes.status_approved')}</Badge>;
      case 'TESTING':
        return <Badge variant="warning">{t('recipes.status_testing')}</Badge>;
      case 'ARCHIVED':
        return <Badge variant="secondary">{t('recipes.status_archived')}</Badge>;
      default:
        return <Badge variant="outline">{t('recipes.status_draft')}</Badge>;
    }
  };

  const statusFilters = [
    { key: '', label: t('common.total') },
    { key: 'TESTING', label: t('recipes.status_testing') },
    { key: 'APPROVED', label: t('recipes.status_approved') },
    { key: 'DRAFT', label: t('recipes.status_draft') },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-orange-600" />
            {t('recipes.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t('recipes.subtitle')}</p>
        </div>

        {hasPermission('recipes.write') && (
          <Button onClick={() => setIsModalOpen(true)} className="shadow-md shadow-orange-500/20">
            <Plus className="h-4 w-4 mr-1.5" />
            {t('recipes.create_button')}
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {statusFilters.map((sf) => (
            <button
              key={sf.key}
              onClick={() => setSelectedStatus(sf.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedStatus === sf.key
                  ? 'bg-orange-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300 p-8">
          <div className="h-12 w-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">{t('common.no_data')}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            ยังไม่มีสูตรหมูกรอบในระบบ เริ่มต้นสร้างสูตรแรกเพื่อจดบันทึกและนำไปทดสอบทอด
          </p>
          {hasPermission('recipes.write') && (
            <Button onClick={() => setIsModalOpen(true)} className="mt-4" size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              {t('recipes.create_button')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recipes.map((rec) => (
            <Card
              key={rec.id}
              className="overflow-hidden hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              <div>
                {/* Card Cover Banner */}
                <div className="h-36 bg-gradient-to-tr from-amber-600 to-orange-500 relative flex items-center justify-center overflow-hidden">
                  {rec.coverUrl ? (
                    <img
                      src={rec.coverUrl}
                      alt={rec.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-white/80 flex flex-col items-center">
                      <Sparkles className="h-10 w-10 stroke-1 mb-1 text-amber-200" />
                      <span className="text-xs font-semibold tracking-wider uppercase text-amber-100">
                        Crispy Pork Formula
                      </span>
                    </div>
                  )}

                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[11px] font-mono font-semibold">
                    {rec.code}
                  </div>

                  <div className="absolute top-2.5 right-2.5">{getStatusBadge(rec.status)}</div>
                </div>

                {/* Card Details */}
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base text-slate-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                    {rec.name}
                  </CardTitle>
                  <p className="text-xs text-slate-500 line-clamp-2 min-h-[2.5rem]">
                    {rec.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                  </p>
                </CardHeader>

                <CardContent className="px-4 pb-4 pt-1 space-y-3">
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t('recipes.version')}</span>
                      <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                        <Layers className="h-3 w-3 text-slate-400" />v{rec.currentVersionNo}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t('recipes.trials_count')}</span>
                      <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                        <FlaskConical className="h-3 w-3 text-slate-400" />
                        {rec.trialCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t('recipes.best_score')}</span>
                      <span className="text-xs font-bold text-amber-600 flex items-center justify-center gap-1 mt-0.5">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {typeof rec.bestOverallScore === 'number' ? rec.bestOverallScore.toFixed(1) : '-'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Card Footer Button */}
              <div className="p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/recipes/${rec.id}`)}
                  className="w-full text-xs font-medium justify-between group-hover:border-orange-500 group-hover:text-orange-600"
                >
                  <span>{t('common.view')}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <RecipeFormModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
