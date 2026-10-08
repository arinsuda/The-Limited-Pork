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
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t('trials.outcome_passed')}
          </Badge>
        );
      case 'NEEDS_ADJUSTMENT':
        return (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t('trials.outcome_needs_adjustment')}
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t('trials.outcome_failed')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-orange-600" />
            {t('trials.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t('trials.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          {selectedTrialIds.length >= 2 && (
            <Button
              variant="outline"
              onClick={handleCompare}
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <GitCompare className="h-4 w-4 mr-1.5" />
              {t('trials.compare_button')} ({selectedTrialIds.length})
            </Button>
          )}

          {hasPermission('trials.write') && (
            <Button onClick={() => setIsModalOpen(true)} className="shadow-md shadow-orange-500/20">
              <Plus className="h-4 w-4 mr-1.5" />
              {t('trials.create_button')}
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Selection Banner */}
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

        {/* Outcome Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {outcomeFilters.map((of) => (
            <button
              key={of.key}
              onClick={() => setSelectedOutcome(of.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedOutcome === of.key
                  ? 'bg-orange-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {of.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trials Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Card key={n} className="overflow-hidden border border-slate-200 bg-white space-y-0">
              <div className="p-4 pb-2 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-5 w-44" />
                </div>
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <Skeleton className="h-8 rounded" />
                  <Skeleton className="h-8 rounded" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : trials.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300 p-8">
          <div className="h-12 w-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
            <FlaskConical className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">{t('trials.empty_title')}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {t('trials.empty_subtitle')}
          </p>
          {hasPermission('trials.write') && (
            <Button onClick={() => setIsModalOpen(true)} className="mt-4" size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              {t('trials.create_button')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trials.map((trial) => {
            const isChecked = selectedTrialIds.includes(trial.id);
            return (
              <Card
                key={trial.id}
                className={`overflow-hidden transition-all flex flex-col justify-between ${
                  isChecked ? 'ring-2 ring-orange-500 shadow-md bg-orange-50/20' : 'hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top Bar with Checkbox and Outcome */}
                  <div className="p-4 pb-2 flex items-start justify-between gap-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSelectTrial(trial.id)}
                        className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        title={t('trials.select_for_compare')}
                      />
                      <span className="font-bold text-sm text-slate-900 flex items-center gap-1">
                        {t('trials.trial_round', { round: trial.trialNo })}
                      </span>
                    </div>

                    <div>{getOutcomeBadge(trial.outcome)}</div>
                  </div>

                  {/* Body Content */}
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {trial.recipe.code} (v{trial.versionNo})
                      </span>
                      <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">
                        {trial.recipe.name}
                      </h3>
                      {trial.title && (
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-1 italic">
                          &quot;{trial.title}&quot;
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{t('trials.date')}</span>
                        <span className="text-xs font-medium text-slate-700 flex items-center justify-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {formatDate(trial.trialDate, i18n.language)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">{t('trials.overall_score')}</span>
                        <span className="text-xs font-bold text-amber-600 flex items-center justify-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {typeof trial.overallScore === 'number' ? `${trial.overallScore.toFixed(2)}/5` : '-'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Footer Action */}
                <div className="p-4 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/trials/${trial.id}`)}
                    className="w-full text-xs font-medium justify-between group-hover:border-orange-500 group-hover:text-orange-600"
                  >
                    <span>{t('common.view')}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Record Modal */}
      <TrialFormModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
