import { useSearchParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  GitCompare,
  Star,
  Flame,
  Clock,
  RotateCw,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { http } from '@/shared/lib/http/client';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Skeleton } from '@/shared/ui/skeleton';
import { formatDate } from '@/shared/lib/utils';

interface TasteAttribute {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
}

interface ComparedTrial {
  id: string;
  trialNo: number;
  trialDate: string;
  title: string | null;
  outcome: 'PENDING' | 'PASSED' | 'NEEDS_ADJUSTMENT' | 'FAILED';
  overallScore: number | null;
  actualYieldPct: number | null;
  recipe: {
    code: string;
    name: string;
  };
  versionNo: number;
  averages: Array<{
    tasteAttributeId: string;
    average: number;
  }>;
  steps: Array<{
    id: string;
    stepNo: number;
    roundNo: number | null;
    title: string | null;
    temperatureC: number | null;
    durationMinutes: number | null;
    orientation: { nameTh: string; nameEn: string } | null;
  }>;
}

interface TrialComparisonResult {
  attributes: TasteAttribute[];
  trials: ComparedTrial[];
}

const TRIAL_COLORS = ['#ea580c', '#2563eb', '#16a34a', '#9333ea', '#d97706'];

export function TrialComparePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const ids = searchParams.get('ids') || '';

  const { data: comparison, isLoading } = useQuery<TrialComparisonResult>({
    queryKey: ['trials', 'compare', ids],
    queryFn: () => http.get(`/trials/compare?ids=${ids}`),
    enabled: Boolean(ids),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>

        {/* Radar Chart Card Skeleton */}
        <Card className="p-6 border-slate-200 bg-white space-y-4">
          <Skeleton className="h-5 w-48" />
          <div className="h-80 flex items-center justify-center">
            <Skeleton className="h-64 w-64 rounded-full" />
          </div>
        </Card>

        {/* Comparison Matrix Table Skeleton */}
        <Card className="p-6 border-slate-200 bg-white space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex justify-between py-2.5 border-b border-slate-100">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-8">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (!comparison || comparison.trials.length < 2) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{t('trials.select_min_trials')}</p>
        <Button onClick={() => navigate('/trials')} className="mt-4" variant="outline">
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const { attributes, trials } = comparison;

  // Build combined radar chart data
  const radarData = attributes.map((attr) => {
    const item: Record<string, any> = {
      attribute: i18n.language === 'th' ? attr.nameTh : attr.nameEn,
    };
    trials.forEach((tr) => {
      const avg = tr.averages.find((a) => a.tasteAttributeId === attr.id);
      item[`trial_${tr.id}`] = avg ? avg.average : 0;
    });
    return item;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/trials')}
          className="text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-orange-600" />
            {t('trials.compare_title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('trials.compare_subtitle')}</p>
        </div>
      </div>

      {/* Side-by-side Radar Chart Card */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900">
            {t('trials.compare_radar_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="attribute" tick={{ fill: '#334155', fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 5]} stroke="#cbd5e1" />
                {trials.map((tr, idx) => {
                  const color = TRIAL_COLORS[idx % TRIAL_COLORS.length];
                  return (
                    <Radar
                      key={tr.id}
                      name={`${t('trials.trial_round', { round: tr.trialNo })} (${tr.recipe.code} v${tr.versionNo})`}
                      dataKey={`trial_${tr.id}`}
                      stroke={color}
                      fill={color}
                      fillOpacity={0.2}
                    />
                  );
                })}
                <Legend />
                <RechartsTooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Side-by-Side Summary Comparison Table */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900">
            {t('trials.compare_table_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">{t('trials.comparison_topic')}</TableHead>
                {trials.map((tr, idx) => (
                  <TableHead key={tr.id} style={{ color: TRIAL_COLORS[idx % TRIAL_COLORS.length] }}>
                    <div className="font-bold text-sm">{t('trials.trial_round', { round: tr.trialNo })}</div>
                    <div className="text-[11px] font-normal text-slate-500">
                      {tr.recipe.code} (v{tr.versionNo})
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Date */}
              <TableRow>
                <TableCell className="font-semibold text-xs text-slate-600">{t('trials.date')}</TableCell>
                {trials.map((tr) => (
                  <TableCell key={tr.id} className="text-xs text-slate-900">
                    {formatDate(tr.trialDate, i18n.language)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Outcome */}
              <TableRow>
                <TableCell className="font-semibold text-xs text-slate-600">{t('trials.outcome')}</TableCell>
                {trials.map((tr) => (
                  <TableCell key={tr.id}>
                    {tr.outcome === 'PASSED' && <Badge variant="success">{t('trials.outcome_passed')}</Badge>}
                    {tr.outcome === 'NEEDS_ADJUSTMENT' && <Badge variant="warning">{t('trials.outcome_needs_adjustment')}</Badge>}
                    {tr.outcome === 'FAILED' && <Badge variant="destructive">{t('trials.outcome_failed')}</Badge>}
                    {tr.outcome === 'PENDING' && <Badge variant="outline">{t('trials.outcome_pending')}</Badge>}
                  </TableCell>
                ))}
              </TableRow>

              {/* Overall Taste Score */}
              <TableRow>
                <TableCell className="font-semibold text-xs text-slate-600">
                  {t('trials.overall_score_range', { min: 0, max: 5 })}
                </TableCell>
                {trials.map((tr) => (
                  <TableCell key={tr.id} className="text-sm font-bold text-amber-600">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      {typeof tr.overallScore === 'number' ? `${tr.overallScore.toFixed(2)} / 5` : '-'}
                    </span>
                  </TableCell>
                ))}
              </TableRow>

              {/* Yield */}
              <TableRow>
                <TableCell className="font-semibold text-xs text-slate-600">{t('trials.actual_yield')}</TableCell>
                {trials.map((tr) => (
                  <TableCell key={tr.id} className="text-xs font-bold text-slate-800">
                    {typeof tr.actualYieldPct === 'number' ? `${tr.actualYieldPct}%` : '-'}
                  </TableCell>
                ))}
              </TableRow>

              {/* Individual Taste Attributes */}
              {attributes.map((attr) => (
                <TableRow key={attr.id}>
                  <TableCell className="font-medium text-xs text-slate-500 pl-6">
                    • {i18n.language === 'th' ? attr.nameTh : attr.nameEn}
                  </TableCell>
                  {trials.map((tr) => {
                    const avg = (tr.averages ?? []).find((a) => a.tasteAttributeId === attr.id);
                    const isZero = avg && typeof avg.average === 'number' && avg.average === 0;
                    return (
                      <TableCell key={tr.id} className="text-xs font-semibold text-slate-900">
                        {avg && typeof avg.average === 'number'
                          ? isZero
                            ? `0 (${t('trials.score_zero_label')})`
                            : avg.average.toFixed(1)
                          : '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}

              {/* Frying Rounds Breakdown */}
              <TableRow className="bg-slate-50/70">
                <TableCell colSpan={trials.length + 1} className="font-bold text-xs text-slate-800 py-2">
                  {t('trials.actual_process')}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold text-xs text-slate-600">{t('trials.process_step_label')}</TableCell>
                {trials.map((tr) => (
                  <TableCell key={tr.id} className="align-top py-3">
                    <div className="space-y-2">
                      {tr.steps.map((st) => (
                        <div
                          key={st.id}
                          className="p-2 rounded border border-slate-200 bg-white space-y-1 text-xs"
                        >
                          <div className="font-bold text-slate-900">
                            {st.title || t('common.step')} {st.roundNo && `(${t('trials.trial_round', { round: st.roundNo })})`}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                            {st.temperatureC && (
                              <span className="flex items-center text-orange-600 font-semibold">
                                <Flame className="h-3 w-3 mr-0.5" />
                                {st.temperatureC}°C
                              </span>
                            )}
                            {st.durationMinutes && (
                              <span className="flex items-center text-slate-700">
                                <Clock className="h-3 w-3 mr-0.5" />
                                {st.durationMinutes} {t('common.minutes')}
                              </span>
                            )}
                            {st.orientation && (
                              <span className="flex items-center text-slate-600">
                                <RotateCw className="h-2.5 w-2.5 mr-0.5" />
                                {i18n.language === 'th' ? st.orientation.nameTh : st.orientation.nameEn}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
