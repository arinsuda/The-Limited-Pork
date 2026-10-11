import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  FlaskConical,
  Plus,
  Search,
  GitCompare,
  Star,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ImageIcon,
} from 'lucide-react';
import { http } from '@/shared/lib/http/client';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { formatDate } from '@/shared/lib/utils';
import { TrialFormModal } from './TrialFormModal';
import { useAuthStore } from '@/features/auth/auth-store';
import { Page, PageHeader, Toolbar, ChipGroup, Chip, ResponsiveGrid, EmptyState, StickyActionBar } from '@/shared/ui/page';

interface TrialSummary {
  id: string;
  trialNo: number;
  trialDate: string;
  title: string | null;
  recipe: {
    id: string;
    code: string;
    name: string;
  };
  versionNo: number;
  outcome: 'PENDING' | 'PASSED' | 'NEEDS_ADJUSTMENT' | 'FAILED';
  overallScore: number | null;
  evaluationCount: number;
  photoCount: number;
  coverUrl: string | null;
  createdAt: string;
}

interface TrialListResponse {
  data: TrialSummary[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function TrialListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const [search, setSearch] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrialIds, setSelectedTrialIds] = useState<string[]>([]);

  const { data: response, isLoading } = useQuery<TrialListResponse>({
    queryKey: ['trials', 'list', search, selectedOutcome],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (selectedOutcome) params.set('outcome', selectedOutcome);
      params.set('pageSize', '50');
      return http.get(`/trials?${params.toString()}`);
    },
  });

  const trials = response?.data ?? [];

  const handleToggleSelectTrial = (id: string) => {
    setSelectedTrialIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleCompare = () => {
    if (selectedTrialIds.length < 2) return;
    navigate(`/trials/compare?ids=${selectedTrialIds.join(',')}`);
  };

  const getOutcomeBadge = (outcome: TrialSummary['outcome']) => {
    switch (outcome) {
      case 'PASSED':
        return (
          <Badge variant="success" className="gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" />
            {t('trials.outcome_passed')}
          </Badge>
        );
      case 'NEEDS_ADJUSTMENT':
        return (
          <Badge variant="warning" className="gap-1 text-[11px]">
            <AlertTriangle className="h-3 w-3" />
            {t('trials.outcome_needs_adjustment')}
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="destructive" className="gap-1 text-[11px]">
            <XCircle className="h-3 w-3" />
            {t('trials.outcome_failed')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 text-[11px]">
            <Clock className="h-3 w-3" />
            {t('trials.outcome_pending')}
          </Badge>
        );
    }
  };

  const outcomeFilters = [
    { key: '', label: t('common.total') },
    { key: 'PENDING', label: t('trials.outcome_pending') },
    { key: 'PASSED', label: t('trials.outcome_passed') },
    { key: 'NEEDS_ADJUSTMENT', label: t('trials.outcome_needs_adjustment') },
    { key: 'FAILED', label: t('trials.outcome_failed') },
  ];

  return (
    <Page>
      {/* Page Header */}
      <PageHeader
        title={t('trials.title')}
        subtitle={t('trials.subtitle')}
        icon={FlaskConical}
        actions={
          <div className="flex items-center gap-2 max-sm:w-full">
            {selectedTrialIds.length >= 2 && (
              <Button
                variant="outline"
                onClick={handleCompare}
                className="border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold touch-target max-sm:flex-1"
              >
                <GitCompare className="h-4 w-4 mr-1.5" />
                {t('trials.compare_button')} ({selectedTrialIds.length})
              </Button>
            )}

            {hasPermission('trials.write') && (
              <Button
                onClick={() => setIsModalOpen(true)}
                className="shadow-md shadow-orange-500/20 font-semibold touch-target max-sm:flex-1"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {t('trials.create_button')}
              </Button>
            )}
          </div>
        }
      />

      {/* Filters Toolbar */}
      <Toolbar>
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-3 md:top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 md:h-9 text-xs sm:text-sm"
          />
        </div>

        {/* Outcome Filter Chips */}
        <ChipGroup>
          {outcomeFilters.map((of) => (
            <Chip
              key={of.key}
              shape="tab"
              active={selectedOutcome === of.key}
              onClick={() => setSelectedOutcome(of.key)}
            >
              {of.label}
            </Chip>
          ))}
        </ChipGroup>
      </Toolbar>

      {/* Trials Grid */}
      {isLoading ? (
        <ResponsiveGrid preset="cards">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Card key={n} className="overflow-hidden border border-slate-200 bg-white">
              <Skeleton className="h-32 sm:h-36 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </Card>
          ))}
        </ResponsiveGrid>
      ) : trials.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title={t('common.no_data')}
          description={selectedOutcome ? t('trials.empty_filtered') : t('trials.empty_subtitle')}
          action={
            hasPermission('trials.write') ? (
              <Button onClick={() => setIsModalOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                {t('trials.create_button')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ResponsiveGrid preset="cards">
          {trials.map((tr) => {
            const isSelected = selectedTrialIds.includes(tr.id);
            return (
              <Card
                key={tr.id}
                className={`overflow-hidden transition-all group flex flex-col justify-between border ${
                  isSelected
                    ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-md'
                    : 'border-slate-200 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Card Cover Banner */}
                  <div className="h-32 sm:h-36 bg-gradient-to-tr from-slate-800 to-slate-700 relative flex items-center justify-center overflow-hidden">
                    {tr.coverUrl ? (
                      <img
                        src={tr.coverUrl}
                        alt={tr.title || tr.recipe.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-white/60 flex flex-col items-center">
                        <FlaskConical className="h-8 sm:h-10 w-8 sm:w-10 stroke-1 mb-1 text-slate-300" />
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-300">
                          Trial #{tr.trialNo}
                        </span>
                      </div>
                    )}

                    {/* Top Left: Checkbox for comparison & Trial # */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <label
                        className="flex items-center gap-1.5 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[11px] font-mono font-semibold cursor-pointer select-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectTrial(tr.id)}
                          className="h-3.5 w-3.5 rounded text-orange-600 focus:ring-orange-500 accent-orange-600 cursor-pointer"
                        />
                        <span>#{tr.trialNo}</span>
                      </label>
                    </div>

                    {/* Top Right: Outcome Badge */}
                    <div className="absolute top-2.5 right-2.5">{getOutcomeBadge(tr.outcome)}</div>

                    {/* Bottom Right: Photo Count Badge */}
                    {tr.photoCount > 0 && (
                      <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-white px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        <span>{tr.photoCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 sm:p-4 pb-2 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-orange-600">{tr.recipe.code}</span>
                      <span>•</span>
                      <span className="truncate">{tr.recipe.name}</span>
                      <span>•</span>
                      <span className="text-[10px] font-semibold">v{tr.versionNo}</span>
                    </div>

                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                      {tr.title || `${t('trials.trial_number', { number: tr.trialNo })}`}
                    </h3>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(tr.trialDate, i18n.language)}</span>
                    </div>
                  </div>

                  {/* Score & Evaluations Bar */}
                  <CardContent className="px-3.5 sm:p-4 pb-3 sm:pb-4 pt-1">
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{t('trials.overall_score')}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          <span className="text-xs sm:text-sm font-bold text-amber-700">
                            {typeof tr.overallScore === 'number' ? tr.overallScore.toFixed(1) : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">{t('trials.evaluation_count')}</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5 block">
                          {tr.evaluationCount}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Card Footer */}
                <div className="p-3.5 sm:p-4 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/trials/${tr.id}`)}
                    className="w-full text-xs font-medium justify-between group-hover:border-orange-500 group-hover:text-orange-600 touch-target"
                  >
                    <span>{t('common.view')}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </ResponsiveGrid>
      )}

      {/* Floating comparison button on mobile when 2+ trials are selected */}
      {selectedTrialIds.length >= 2 && (
        <StickyActionBar>
          <Button
            onClick={handleCompare}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-lg shadow-orange-500/30"
          >
            <GitCompare className="h-4 w-4 mr-2" />
            {t('trials.compare_button')} ({selectedTrialIds.length} {t('common.items')})
          </Button>
        </StickyActionBar>
      )}

      {/* Create Trial Modal */}
      <TrialFormModal open={isModalOpen} onOpenChange={setIsModalOpen} mode="create" />
    </Page>
  );
}
