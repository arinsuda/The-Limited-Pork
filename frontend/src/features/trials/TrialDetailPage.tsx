import * as React from 'react';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Flame,
  Clock,
  RotateCw,
  Star,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Camera,
  Upload,
  User,
  Thermometer,
  CloudRain,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { http } from '@/shared/lib/http/client';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Slider } from '@/shared/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Skeleton } from '@/shared/ui/skeleton';
import { useConfirm } from '@/shared/ui/confirm-modal';
import { formatDate, cn } from '@/shared/lib/utils';
import { Page, PageHeader } from '@/shared/ui/page';
import { ResponsiveActions, type ResponsiveActionItem } from '@/shared/ui/responsive-actions';
import { useAuthStore } from '@/features/auth/auth-store';
import { toast } from 'sonner';

interface TasteAttribute {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  descriptionTh?: string | null;
  descriptionEn?: string | null;
  minScore: number;
  maxScore: number;
  color: string;
}

interface EvaluationScore {
  id: string;
  tasteAttributeId: string;
  score: number;
  comment: string | null;
}

interface Evaluation {
  id: string;
  tasterName: string;
  overallComment: string | null;
  average?: number;
  averageScore?: number;
  scores: EvaluationScore[];
  createdAt: string;
}

interface Attachment {
  id: string;
  fileName: string;
  url: string;
  caption: string | null;
  isCover: boolean;
}

interface TrialDetail {
  id: string;
  trialNo: number;
  trialDate: string;
  title: string | null;
  outcome: 'PENDING' | 'PASSED' | 'NEEDS_ADJUSTMENT' | 'FAILED';
  inputQuantity: number | null;
  inputUnit: { symbol: string } | null;
  outputQuantity: number | null;
  outputUnit: { symbol: string } | null;
  actualYieldPct: number | null;
  ambientTempC: number | null;
  humidityPct: number | null;
  weather: { nameTh: string; nameEn: string } | null;
  summary: string | null;
  issues: string | null;
  nextActions: string | null;
  overallScore: number | null;
  version: number;
  recipe: {
    id: string;
    code: string;
    name: string;
  };
  versionNo: number;
  steps: Array<{
    id: string;
    stepNo: number;
    roundNo: number | null;
    stepType: { nameTh: string; nameEn: string };
    title: string | null;
    instruction: string | null;
    temperatureC: number | null;
    durationMinutes: number | null;
    orientation: { nameTh: string; nameEn: string } | null;
    notes: string | null;
  }>;
  evaluations: Evaluation[];
  averages: Array<{
    tasteAttributeId: string;
    code: string;
    nameTh: string;
    nameEn: string;
    color: string;
    minScore?: number;
    maxScore?: number;
    average: number;
    count: number;
  }>;
  attachments: Attachment[];
}

export function TrialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const { confirm } = useConfirm();

  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Evaluation Form State
  const [tasterName, setTasterName] = useState('');
  const [overallComment, setOverallComment] = useState('');
  const [scoresMap, setScoresMap] = useState<Record<string, number>>({});

  // Query Trial Detail
  const { data: trial, isLoading } = useQuery<TrialDetail>({
    queryKey: ['trials', 'detail', id],
    queryFn: () => http.get(`/trials/${id}`),
    enabled: Boolean(id),
  });

  // Query Taste Attributes Master Data for evaluation sliders
  const { data: attributes = [] } = useQuery<TasteAttribute[]>({
    queryKey: ['masterdata', 'taste-attributes'],
    queryFn: () => http.get('/taste-attributes'),
    enabled: isEvaluationModalOpen,
  });

  // Initialize sliders with dynamic middle score based on min/max of each attribute
  React.useEffect(() => {
    if (attributes.length > 0 && Object.keys(scoresMap).length === 0) {
      const initial: Record<string, number> = {};
      attributes.forEach((attr) => {
        const min = attr.minScore ?? 0;
        const max = attr.maxScore ?? 5;
        initial[attr.id] = Math.round(((min + max) / 2) * 2) / 2;
      });
      setScoresMap(initial);
    }
  }, [attributes, scoresMap]);

  // Update Outcome Mutation
  const outcomeMutation = useMutation({
    mutationFn: (newOutcome: string) =>
      http.post(`/trials/${id}/outcome`, {
        outcome: newOutcome,
        version: trial?.version,
      }),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['trials'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Outcome change failed');
    },
  });

  // Add Evaluation Mutation
  const addEvalMutation = useMutation({
    mutationFn: async () => {
      const scoresPayload = Object.entries(scoresMap).map(([attrId, score]) => ({
        tasteAttributeId: attrId,
        score,
        comment: null,
      }));

      return http.post(`/trials/${id}/evaluations`, {
        tasterName,
        overallComment: overallComment ? overallComment : null,
        scores: scoresPayload,
      });
    },
    onSuccess: () => {
      toast.success(t('trials.evaluation_added'));
      queryClient.invalidateQueries({ queryKey: ['trials', 'detail', id] });
      setIsEvaluationModalOpen(false);
      setTasterName('');
      setOverallComment('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add evaluation');
    },
  });

  // Delete Evaluation Mutation
  const deleteEvalMutation = useMutation({
    mutationFn: (evaluationId: string) =>
      http.delete(`/trials/${id}/evaluations/${evaluationId}`),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['trials', 'detail', id] });
    },
  });

  // Photo Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ownerType', 'TRIAL');
    formData.append('ownerId', id);

    try {
      await http.post('/attachments', formData);
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['trials', 'detail', id] });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Set as Cover Mutation
  const setCoverMutation = useMutation({
    mutationFn: (attId: string) =>
      http.patch(`/attachments/${attId}`, { isCover: true }),
    onSuccess: () => {
      toast.success(t('trials.photo_cover_set'));
      queryClient.invalidateQueries({ queryKey: ['trials', 'detail', id] });
    },
  });

  // Delete Attachment Mutation
  const deleteAttMutation = useMutation({
    mutationFn: (attId: string) => http.delete(`/attachments/${attId}`),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['trials', 'detail', id] });
    },
  });

  const handleDeleteEvaluation = async (evaluationId: string) => {
    const isConfirmed = await confirm({
      title: t('trials.delete_eval_confirm_title'),
      description: t('trials.delete_eval_confirm_desc'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      variant: 'destructive',
    });
    if (!isConfirmed) return;
    deleteEvalMutation.mutate(evaluationId);
  };

  const handleDeleteAttachment = async (attId: string) => {
    const isConfirmed = await confirm({
      title: t('trials.delete_att_confirm_title'),
      description: t('trials.delete_att_confirm_desc'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      variant: 'destructive',
    });
    if (!isConfirmed) return;
    deleteAttMutation.mutate(attId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>

        {/* 4 Metrics Cards Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="p-4 flex items-center gap-3 border-slate-200 bg-white">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </Card>
          ))}
        </div>

        {/* Tabs Bar Skeleton */}
        <Skeleton className="h-10 w-96 rounded-xl" />

        {/* Detail Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-5 space-y-4 border-slate-200 bg-white">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                  <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-1 p-5 space-y-4 border-slate-200 bg-white">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!trial) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{t('common.no_data')}</p>
        <Button onClick={() => navigate('/trials')} className="mt-4" variant="outline">
          {t('common.back')}
        </Button>
      </div>
    );
  }

  // Format radar data dynamically
  const maxPossibleScore = (trial.averages ?? []).length > 0
    ? Math.max(...trial.averages.map((a) => a.maxScore ?? 5))
    : 5;
  const minPossibleScore = (trial.averages ?? []).length > 0
    ? Math.min(...trial.averages.map((a) => a.minScore ?? 0))
    : 0;

  const radarData = (trial.averages ?? []).map((avg) => ({
    attribute: i18n.language === 'th' ? avg.nameTh : avg.nameEn,
    score: typeof avg.average === 'number' ? avg.average : 0,
    fullMark: avg.maxScore ?? maxPossibleScore,
  }));

  const steps = trial.steps ?? [];
  const evaluations = trial.evaluations ?? [];
  const attachments = trial.attachments ?? [];

  const outcomeActions: ResponsiveActionItem[] = [
    ...(hasPermission('trials.write')
      ? [
          {
            key: 'passed',
            label: t('trials.outcome_passed'),
            icon: CheckCircle2,
            variant: (trial.outcome === 'PASSED' ? 'default' : 'outline') as ResponsiveActionItem['variant'],
            onClick: () => outcomeMutation.mutate('PASSED'),
            disabled: outcomeMutation.isPending,
            priority: 'high' as const,
          },
          {
            key: 'needs_adjustment',
            label: t('trials.outcome_needs_adjustment'),
            icon: AlertTriangle,
            variant: (trial.outcome === 'NEEDS_ADJUSTMENT' ? 'default' : 'outline') as ResponsiveActionItem['variant'],
            onClick: () => outcomeMutation.mutate('NEEDS_ADJUSTMENT'),
            disabled: outcomeMutation.isPending,
            priority: 'high' as const,
          },
          {
            key: 'failed',
            label: t('trials.outcome_failed'),
            icon: XCircle,
            variant: (trial.outcome === 'FAILED' ? 'destructive' : 'outline') as ResponsiveActionItem['variant'],
            onClick: () => outcomeMutation.mutate('FAILED'),
            disabled: outcomeMutation.isPending,
            priority: 'medium' as const,
          },
        ]
      : []),
  ];

  return (
    <Page className="space-y-6">
      {/* Top Header */}
      <PageHeader
        back="/trials"
        title={`${t('trials.trial_no')} ${trial.trialNo}`}
        badge={
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
              [{trial.recipe.code} v{trial.versionNo}] {trial.recipe.name}
            </span>
            <span className="text-xs text-slate-400">
              • {formatDate(trial.trialDate, i18n.language)}
            </span>
          </div>
        }
        description={trial.title ? <p className="italic">&quot;{trial.title}&quot;</p> : undefined}
        actions={<ResponsiveActions items={outcomeActions} collapseAt="md" />}
      />

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Overall Score */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-orange-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold shadow">
              <Star className="h-5 w-5 fill-white text-white" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">
                {t('trials.overall_score')}
              </span>
              <span className="text-xl font-bold text-orange-700">
                {typeof trial.overallScore === 'number'
                  ? `${trial.overallScore.toFixed(2)} / ${maxPossibleScore}`
                  : '-'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Actual Yield */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              %
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">
                {t('trials.actual_yield')}
              </span>
              <span className="text-lg font-bold text-slate-800">
                {trial.actualYieldPct ? `${trial.actualYieldPct}%` : '-'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {trial.inputQuantity ?? '-'} {trial.inputUnit?.symbol} →{' '}
                {trial.outputQuantity ?? '-'} {trial.outputUnit?.symbol}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Environment */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Thermometer className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">
                {t('trials.temp_and_humidity')}
              </span>
              <span className="text-sm font-bold text-slate-800">
                {trial.ambientTempC ? `${trial.ambientTempC}°C` : '-'} /{' '}
                {trial.humidityPct ? `${trial.humidityPct}%` : '-'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Weather */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <CloudRain className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">
                {t('trials.weather')}
              </span>
              <span className="text-sm font-bold text-slate-800">
                {trial.weather
                  ? i18n.language === 'th'
                    ? trial.weather.nameTh
                    : trial.weather.nameEn
                  : '-'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes: Summary, Issues & Next Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-900">{t('trials.summary')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs text-slate-700 min-h-[5rem]">
            {trial.summary || t('trials.no_summary')}
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="p-4 pb-2 border-b border-amber-100">
            <CardTitle className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              {t('trials.issues')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs text-amber-950 min-h-[5rem]">
            {trial.issues || t('trials.no_issues')}
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="p-4 pb-2 border-b border-blue-100">
            <CardTitle className="text-xs font-bold text-blue-900">{t('trials.next_actions')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-xs text-blue-950 min-h-[5rem]">
            {trial.nextActions || t('trials.no_next_actions')}
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout: Radar Chart & Actual Process Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Taste Radar Chart Card */}
        <Card>
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-orange-600" />
              {t('trials.radar_chart_title')}
            </CardTitle>
            <span className="text-xs text-slate-400 font-medium">
              {evaluations.length} {t('trials.evaluations_count')}
            </span>
          </CardHeader>
          <CardContent className="p-4">
            {radarData.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                {t('trials.no_evaluations_yet')}
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="attribute" tick={{ fill: '#334155', fontSize: 11 }} />
                    <PolarRadiusAxis domain={[minPossibleScore, maxPossibleScore]} stroke="#cbd5e1" />
                    <Radar
                      name={t('trials.average_score')}
                      dataKey="score"
                      stroke="#ea580c"
                      fill="#f97316"
                      fillOpacity={0.4}
                    />
                    <RechartsTooltip
                      formatter={(val: any) => [
                        Number(val) === 0
                          ? `0 / ${maxPossibleScore} (${t('trials.score_zero_label')})`
                          : `${Number(val).toFixed(2)} / ${maxPossibleScore}`,
                        t('trials.average_score'),
                      ]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Frying Process Steps in this Trial */}
        <Card>
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              {t('trials.frying_steps')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 max-h-96 overflow-y-auto">
            <div className="relative border-l-2 border-orange-200 ml-3 pl-5 space-y-4">
              {steps.map((st) => (
                <div key={st.id} className="relative">
                  <div className="absolute -left-[27px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white shadow">
                    {st.stepNo}
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {st.title || (i18n.language === 'th' ? st.stepType.nameTh : st.stepType.nameEn)}
                        </span>
                        {st.roundNo && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                            {t('trials.trial_round', { round: st.roundNo })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {st.temperatureC !== null && (
                          <Badge variant="outline" className="text-xs text-orange-600 bg-orange-50/50">
                            <Flame className="h-3 w-3 mr-0.5" />
                            {st.temperatureC}°C
                          </Badge>
                        )}
                        {st.durationMinutes !== null && (
                          <Badge variant="outline" className="text-xs text-slate-700">
                            <Clock className="h-3 w-3 mr-0.5" />
                            {st.durationMinutes} {t('common.minutes')}
                          </Badge>
                        )}
                        {st.orientation && (
                          <Badge variant="secondary" className="text-[10px]">
                            <RotateCw className="h-2.5 w-2.5 mr-0.5" />
                            {i18n.language === 'th' ? st.orientation.nameTh : st.orientation.nameEn}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {st.instruction && (
                      <p className="text-xs text-slate-600 leading-snug">{st.instruction}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evaluations List & Add Evaluation Button */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-900">
            {t('trials.evaluations')}
          </CardTitle>

          {hasPermission('trials.evaluate') && (
            <Button size="sm" onClick={() => setIsEvaluationModalOpen(true)} className="text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t('trials.add_evaluation')}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4">
          {evaluations.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {t('trials.no_tasters_yet')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evaluations.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-900 block leading-tight">
                          {ev.tasterName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(ev.createdAt, i18n.language)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        {typeof ev.average === 'number'
                          ? `${ev.average.toFixed(1)}/${maxPossibleScore}`
                          : typeof ev.averageScore === 'number'
                          ? `${ev.averageScore.toFixed(1)}/${maxPossibleScore}`
                          : '-'}
                      </span>
                      {hasPermission('trials.write') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEvaluation(ev.id)}
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {ev.overallComment && (
                    <p className="text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      &quot;{ev.overallComment}&quot;
                    </p>
                  )}

                  {/* Individual Scores */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                    {(ev.scores ?? []).map((sc) => {
                      const attr = (trial.averages ?? []).find((a) => a.tasteAttributeId === sc.tasteAttributeId);
                      const isZero = typeof sc.score === 'number' && sc.score === 0;
                      return (
                        <div
                          key={sc.id}
                          className="flex items-center justify-between text-xs px-2 py-1 rounded bg-slate-50 border border-slate-100"
                        >
                          <span className="text-slate-600 text-[11px] truncate">
                            {attr ? (i18n.language === 'th' ? attr.nameTh : attr.nameEn) : t('trials.dimension')}
                          </span>
                          <span className={cn('font-bold ml-1', isZero ? 'text-slate-500' : 'text-slate-900')}>
                            {typeof sc.score === 'number'
                              ? isZero
                                ? `0 (${t('trials.score_zero_label')})`
                                : sc.score.toFixed(1)
                              : (sc.score ?? '-')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos & Attachments Gallery */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Camera className="h-4 w-4 text-orange-600" />
            {t('trials.photos')}
          </CardTitle>

          {hasPermission('files.upload') && (
            <label className="cursor-pointer">
              <Button size="sm" asChild disabled={isUploading} className="text-xs">
                <span>
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {isUploading ? t('common.loading') : t('trials.upload_photo')}
                </span>
              </Button>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </label>
          )}
        </CardHeader>
        <CardContent className="p-4">
          {attachments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {t('trials.no_photos_yet')}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-4/3 shadow-2xs"
                >
                  <img src={att.url} alt={att.fileName} className="w-full h-full object-cover" />

                  {att.isCover && (
                    <div className="absolute top-2 left-2 bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                      {t('trials.cover_photo')}
                    </div>
                  )}

                  {hasPermission('files.upload') && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {!att.isCover && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setCoverMutation.mutate(att.id)}
                          className="text-[10px] h-7 px-2"
                        >
                          {t('trials.set_cover')}
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="h-7 w-7"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Evaluation Modal */}
      <Dialog open={isEvaluationModalOpen} onOpenChange={setIsEvaluationModalOpen}>
        <DialogContent size="md" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('trials.add_evaluation')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-4 sm:p-0 sm:py-2 w-full max-w-full overflow-x-hidden">
            <div className="space-y-1.5">
              <Label htmlFor="taster-name">
                {t('trials.taster_name')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="taster-name"
                required
                placeholder={t('trials.taster_name_placeholder')}
                value={tasterName}
                onChange={(e) => setTasterName(e.target.value)}
              />
            </div>

            {/* Sliders for each Taste Attribute (Dynamic 0 to 5) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">
                  {attributes.length > 0
                    ? t('trials.scores_range', {
                        min: Math.min(...attributes.map((a) => a.minScore ?? 0)),
                        max: Math.max(...attributes.map((a) => a.maxScore ?? 5)),
                      })
                    : t('trials.scores')}
                </Label>
                <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {t('trials.score_zero_hint')}
                </span>
              </div>
              <div className="space-y-3">
                {attributes.map((attr) => {
                  const min = attr.minScore ?? 0;
                  const max = attr.maxScore ?? 5;
                  const defaultMid = Math.round(((min + max) / 2) * 2) / 2;
                  const currentScore = scoresMap[attr.id] ?? defaultMid;
                  const isZero = currentScore === min && min === 0;

                  return (
                    <div
                      key={attr.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold text-slate-900 block">
                            {i18n.language === 'th' ? attr.nameTh : attr.nameEn}
                          </span>
                          {(attr.descriptionTh || attr.descriptionEn) && (
                            <span className="text-[10px] text-slate-500 block line-clamp-1">
                              {i18n.language === 'th' ? attr.descriptionTh : attr.descriptionEn}
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            'font-bold text-xs px-2 py-0.5 rounded border shrink-0',
                            isZero
                              ? 'text-slate-600 bg-slate-100 border-slate-300'
                              : 'text-orange-600 bg-orange-50 border-orange-200'
                          )}
                        >
                          {isZero
                            ? `0 / ${max} (${t('trials.score_zero_label')})`
                            : `${currentScore.toFixed(1)} / ${max}`}
                        </span>
                      </div>
                      <Slider
                        value={[currentScore]}
                        min={min}
                        max={max}
                        step={0.5}
                        onValueChange={(val) => {
                          const v = val[0] ?? min;
                          setScoresMap((prev) => ({ ...prev, [attr.id]: v }));
                        }}
                      />
                      <div className="flex justify-between text-[10px] text-slate-600 px-0.5 font-medium">
                        <span>
                          {min} {min === 0 ? `(${t('trials.score_zero_label')})` : ''}
                        </span>
                        <span>
                          {max} ({t('trials.score_max_label')})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="overall-comment">{t('trials.taster_comment')}</Label>
              <Textarea
                id="overall-comment"
                placeholder={t('trials.taster_comment_placeholder')}
                value={overallComment}
                onChange={(e) => setOverallComment(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:pt-2 sm:border-t sm:border-slate-100">
            <Button variant="outline" onClick={() => setIsEvaluationModalOpen(false)} className="max-sm:hidden">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => addEvalMutation.mutate()}
              disabled={addEvalMutation.isPending || !tasterName.trim()}
            >
              {addEvalMutation.isPending ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
