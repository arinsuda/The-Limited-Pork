import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Plus,
  Flame,
  Clock,
  RotateCw,
  History,
  FlaskConical,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Utensils,
  Wind,
  Scissors,
  Info,
  Sparkles,
  Timer,
  Scale,
  ChefHat,
  Trash2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function getStepIcon(iconName: string | null, code?: string) {
  const key = (iconName || code || '').toLowerCase();
  if (key.includes('flame') || key.includes('boil') || key.includes('fry') || key.includes('simmer')) {
    return <Flame className="h-3.5 w-3.5 text-amber-500" />;
  }
  if (key.includes('wind') || key.includes('dry')) {
    return <Wind className="h-3.5 w-3.5 text-cyan-500" />;
  }
  if (key.includes('clock') || key.includes('rest')) {
    return <Clock className="h-3.5 w-3.5 text-blue-500" />;
  }
  if (key.includes('scissors') || key.includes('cut') || key.includes('needle') || key.includes('score')) {
    return <Scissors className="h-3.5 w-3.5 text-indigo-500" />;
  }
  if (key.includes('utensils') || key.includes('prep') || key.includes('mix')) {
    return <Utensils className="h-3.5 w-3.5 text-emerald-500" />;
  }
  if (key.includes('sparkles') || key.includes('marinate') || key.includes('blend')) {
    return <Sparkles className="h-3.5 w-3.5 text-purple-500" />;
  }
  return <ChefHat className="h-3.5 w-3.5 text-orange-500" />;
}
import { http } from '@/shared/lib/http/client';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Skeleton } from '@/shared/ui/skeleton';
import { ConfirmModal } from '@/shared/ui/confirm-modal';
import { formatDateTime } from '@/shared/lib/utils';
import { RecipeFormModal } from './RecipeFormModal';
import { useAuthStore } from '@/features/auth/auth-store';
import { toast } from 'sonner';

interface RecipeDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'TESTING' | 'APPROVED' | 'ARCHIVED';
  version: number;
  coverUrl: string | null;
  tags?: Array<{
    id: string;
    code: string;
    nameTh: string;
    nameEn: string;
  }> | null;
  currentVersion: {
    id: string;
    versionNo: number;
    changeNote: string | null;
    inputQuantity: number | null;
    inputUnit: { symbol: string; nameTh: string; nameEn: string } | null;
    expectedOutputQuantity: number | null;
    expectedOutputUnit: { symbol: string; nameTh: string; nameEn: string } | null;
    expectedYieldPct: number | null;
    notes: string | null;
    ingredients: Array<{
      id: string;
      lineNo: number;
      ingredient: { nameTh: string; nameEn: string };
      quantity: number;
      unit: { symbol: string };
      preparationNote: string | null;
      isOptional: boolean;
    }>;
    steps: Array<{
      id: string;
      stepNo: number;
      roundNo: number | null;
      stepType: { code?: string; nameTh: string; nameEn: string; icon: string | null; isRepeatable: boolean };
      title: string | null;
      instruction: string | null;
      temperatureC: number | null;
      durationMinutes: number | null;
      orientation: { nameTh: string; nameEn: string } | null;
      params: Record<string, unknown>;
      notes: string | null;
    }>;
  };
}

interface VersionSummary {
  id: string;
  versionNo: number;
  changeNote: string | null;
  ingredientCount: number;
  stepCount: number;
  trialCount: number;
  createdAt: string;
}

interface ScoreTrendPoint {
  trialId: string;
  trialNo: number;
  trialDate: string;
  versionNo: number;
  overallScore: number | null;
  scores: Array<{ tasteAttributeId: string; average: number }>;
}

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  // Fetch Recipe Detail
  const { data: recipe, isLoading } = useQuery<RecipeDetail>({
    queryKey: ['recipes', 'detail', id],
    queryFn: () => http.get(`/recipes/${id}`),
    enabled: Boolean(id),
  });

  // Fetch Version History
  const { data: versions = [] } = useQuery<VersionSummary[]>({
    queryKey: ['recipes', 'versions', id],
    queryFn: () => http.get(`/recipes/${id}/versions`),
    enabled: Boolean(id),
  });

  // Fetch Score Trend
  const { data: scoreTrend = [] } = useQuery<ScoreTrendPoint[]>({
    queryKey: ['recipes', 'score-trend', id],
    queryFn: () => http.get(`/recipes/${id}/score-trend`),
    enabled: Boolean(id),
  });

  // Status Change Mutation
  const statusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      http.post(`/recipes/${id}/status`, {
        status: newStatus,
        version: recipe?.version,
      }),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Status change failed');
    },
  });

  // Restore Version Mutation
  const restoreMutation = useMutation({
    mutationFn: (versionId: string) =>
      http.post(`/recipes/${id}/versions/${versionId}/restore`),
    onSuccess: () => {
      toast.success(t('recipes.version_restored'));
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to restore version');
    },
  });

  // Delete Recipe State & Mutation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => http.delete(`/recipes/${id}`),
    onSuccess: () => {
      toast.success(t('recipes.recipe_deleted'));
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      navigate('/recipes');
    },
    onError: (err: any) => {
      toast.error(err.message || t('common.error'));
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>

        {/* Tabs Bar Skeleton */}
        <div className="border-b border-slate-200 pb-1">
          <Skeleton className="h-11 w-80 rounded-xl" />
        </div>

        {/* 3 Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-4 flex items-center gap-3.5 border-slate-200 bg-white">
              <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-28" />
              </div>
            </Card>
          ))}
        </div>

        {/* Ingredients & Steps Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 p-5 space-y-4 border-slate-200 bg-white">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="flex justify-between py-2 border-b border-slate-100">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-2 p-5 space-y-4 border-slate-200 bg-white">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-4 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{t('common.no_data')}</p>
        <Button onClick={() => navigate('/recipes')} className="mt-4" variant="outline">
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const current = recipe.currentVersion;
  const ingredients = current?.ingredients ?? [];
  const steps = current?.steps ?? [];

  const totalDurationMinutes = steps.reduce(
    (acc, st) => acc + (typeof st.durationMinutes === 'number' ? st.durationMinutes : 0),
    0,
  );

  const yieldPct = current?.expectedYieldPct
    ? current.expectedYieldPct
    : current?.inputQuantity && current?.expectedOutputQuantity && current.inputQuantity > 0
      ? Number(((current.expectedOutputQuantity / current.inputQuantity) * 100).toFixed(1))
      : null;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/recipes')}
            className="text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                {recipe.code}
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{recipe.name}</h1>
              <Badge
                variant={
                  recipe.status === 'APPROVED'
                    ? 'success'
                    : recipe.status === 'TESTING'
                      ? 'warning'
                      : 'outline'
                }
              >
                {t(`recipes.status_${recipe.status.toLowerCase()}`)}
              </Badge>
              {recipe.tags && recipe.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="bg-amber-100 text-amber-800 border-amber-200"
                >
                  {i18n.language === 'th' ? tag.nameTh : tag.nameEn}
                </Badge>
              ))}
            </div>
            {recipe.description && (
              <p className="text-xs text-slate-500 mt-1">{recipe.description}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Status Transitions */}
          {hasPermission('recipes.write') && recipe.status === 'DRAFT' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => statusMutation.mutate('TESTING')}
              disabled={statusMutation.isPending}
              className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <FlaskConical className="h-3.5 w-3.5 mr-1" />
              {t('recipes.action_mark_testing')}
            </Button>
          )}

          {hasPermission('recipes.approve') && recipe.status === 'TESTING' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => statusMutation.mutate('APPROVED')}
              disabled={statusMutation.isPending}
              className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {t('recipes.action_approve')}
            </Button>
          )}

          {/* Delete Recipe Button */}
          {hasPermission('recipes.write') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1 text-red-500" />
              {t('recipes.action_delete')}
            </Button>
          )}

          {/* New Version Button */}
          {hasPermission('recipes.write') && (
            <Button size="sm" onClick={() => setIsVersionModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t('recipes.create_new_version')}
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="steps" className="space-y-6">
        <div className="border-b border-slate-200/80 pb-1">
          <TabsList className="inline-flex h-11 items-center justify-start rounded-xl bg-slate-100/90 p-1 text-slate-600 gap-1 border border-slate-200/70 shadow-2xs">
            <TabsTrigger
              value="steps"
              className="text-xs sm:text-sm font-medium px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <Utensils className="h-4 w-4" />
              <span>{t('recipes.tab_steps_ingredients')} (v{current?.versionNo})</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-xs sm:text-sm font-medium px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              <span>{t('recipes.versions_history')} ({(versions ?? []).length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="trend"
              className="text-xs sm:text-sm font-medium px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>{t('recipes.score_trend')}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Current Version Details & Process Steps */}
        <TabsContent value="steps" className="space-y-6">
          {/* Yield & Target Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="overflow-hidden border border-amber-200/80 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent shadow-xs">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-orange-500/30 shrink-0">
                  %
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    {t('recipes.expected_yield')}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      {yieldPct !== null ? `${yieldPct}%` : '-'}
                    </span>
                    {yieldPct !== null && (
                      <span className="text-[11px] text-amber-700 font-medium">{t('recipes.target_metric')}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0 border border-slate-200/60">
                  <Scale className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    {t('recipes.input_quantity')}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      {current?.inputQuantity ?? '-'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {current?.inputUnit?.symbol ?? ''}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0 border border-emerald-200/60">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    {t('recipes.expected_output')}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      {current?.expectedOutputQuantity && current.expectedOutputQuantity > 0
                        ? current.expectedOutputQuantity
                        : '-'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {current?.expectedOutputQuantity && current.expectedOutputQuantity > 0
                        ? (current?.expectedOutputUnit?.symbol ?? '')
                        : ''}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ingredients Table */}
          <Card className="border border-slate-200 shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-orange-600" />
                  {t('recipes.ingredients')}
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('recipes.ingredients_subtitle')}
                </p>
              </div>
              <Badge variant="secondary" className="bg-white border border-slate-200 text-slate-700 shadow-2xs font-semibold text-xs px-2.5 py-1">
                {ingredients.length} {t('common.items')}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {ingredients.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {t('recipes.no_ingredients')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-slate-200/80">
                        <TableHead className="w-14 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">#</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {t('recipes.ingredients')}
                        </TableHead>
                        <TableHead className="w-40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {t('recipes.input_quantity')}
                        </TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {t('masterdata.prep_notes')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {ingredients.map((ing) => (
                        <TableRow key={ing.id} className="hover:bg-slate-50/60 transition-colors">
                          <TableCell className="text-center font-mono font-medium text-xs text-slate-400">
                            {ing.lineNo}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs sm:text-sm text-slate-900">
                                {i18n.language === 'th' ? ing.ingredient.nameTh : ing.ingredient.nameEn}
                              </span>
                              {ing.isOptional && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-400 border-slate-200">
                                  {t('recipes.optional')}
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {i18n.language === 'th' ? ing.ingredient.nameEn : ing.ingredient.nameTh}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-baseline gap-1 font-mono font-bold text-xs sm:text-sm text-slate-800">
                              {ing.quantity}
                              <span className="text-xs font-normal text-slate-500">{ing.unit.symbol}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {ing.preparationNote ? (
                              <span>{ing.preparationNote}</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Process Steps Timeline */}
          <Card className="border border-slate-200 shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-600" />
                  {t('recipes.steps_timeline')}
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('recipes.steps_subtitle')}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {totalDurationMinutes > 0 && (
                  <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 shadow-2xs font-semibold text-xs px-2.5 py-1 flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5 text-orange-600" />
                    <span>{t('recipes.total_duration')}: {totalDurationMinutes} {t('common.minutes')}</span>
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border border-orange-200/80 font-semibold text-xs px-2.5 py-1">
                  {t('recipes.steps_count', { count: steps.length })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              {steps.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  {t('recipes.no_steps')}
                </div>
              ) : (
                <div className="relative space-y-6 pt-1">
                  {steps.map((st, idx) => (
                    <div key={st.id} className="relative pl-12 sm:pl-14 group">
                      {/* Vertical Timeline connector line */}
                      {idx < steps.length - 1 && (
                        <div
                          className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-orange-400 via-orange-300 to-slate-200"
                          aria-hidden="true"
                        />
                      )}

                      {/* Timeline Step Number Icon */}
                      <div className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-black text-sm shadow-md shadow-orange-500/25 ring-4 ring-white shrink-0">
                        {st.stepNo}
                      </div>

                      {/* Step Card */}
                      <div className="rounded-xl border border-slate-200 bg-white shadow-xs hover:border-orange-200 hover:shadow-sm transition-all overflow-hidden">
                        {/* Step Card Header */}
                        <div className="bg-slate-50/70 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Step Type Badge */}
                              <Badge
                                variant="outline"
                                className="bg-white text-slate-700 border-slate-200 text-xs gap-1.5 font-medium shadow-2xs py-0.5"
                              >
                                {getStepIcon(st.stepType.icon, st.stepType.code)}
                                <span>{i18n.language === 'th' ? st.stepType.nameTh : st.stepType.nameEn}</span>
                              </Badge>

                              {/* Repeatable Round Badge */}
                              {st.roundNo && (
                                <Badge className="bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold text-xs border-0 shadow-xs py-0.5">
                                  {t('recipes.frying_round', { round: st.roundNo })}
                                </Badge>
                              )}
                            </div>

                            {/* Step Title */}
                            <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                              {st.title || (i18n.language === 'th' ? st.stepType.nameTh : st.stepType.nameEn)}
                            </h4>
                          </div>

                          {/* Quick Parameters Badges Strip */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {st.temperatureC !== null && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                                <Flame className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                <span>{st.temperatureC}°C</span>
                              </div>
                            )}
                            {st.durationMinutes !== null && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 shadow-2xs">
                                <Clock className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                                <span>{st.durationMinutes} {t('common.minutes')}</span>
                              </div>
                            )}
                            {st.orientation && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
                                <RotateCw className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                <span>{i18n.language === 'th' ? st.orientation.nameTh : st.orientation.nameEn}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Step Instruction */}
                        {st.instruction && (
                          <div className="p-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal bg-white">
                            <p>{st.instruction}</p>
                          </div>
                        )}

                        {/* Step Notes / Chef Tips Callout */}
                        {st.notes && (
                          <div className={`flex items-start gap-2.5 p-3 rounded-lg text-xs bg-amber-50/80 border border-amber-200/70 text-amber-900 ${st.instruction ? 'mx-4 mb-4' : 'm-4'}`}>
                            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="leading-relaxed">
                              <strong className="font-semibold text-amber-950 mr-1">{t('recipes.notes')}:</strong>
                              <span>{st.notes}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Version History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-orange-600" />
                {t('recipes.versions_history')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">{t('common.version')}</TableHead>
                    <TableHead>{t('recipes.change_note')}</TableHead>
                    <TableHead>{t('recipes.steps_and_ingredients')}</TableHead>
                    <TableHead>{t('common.created_at')}</TableHead>
                    <TableHead className="w-28 text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((v) => {
                    const isCurrent = v.versionNo === current?.versionNo;
                    return (
                      <TableRow key={v.id} className={isCurrent ? 'bg-orange-50/40' : ''}>
                        <TableCell className="font-bold text-sm text-slate-900 font-mono">
                          v{v.versionNo}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          {v.changeNote || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[11px] font-medium bg-slate-50 border-slate-200">
                              {t('recipes.steps_count', { count: v.stepCount ?? 0 })}
                            </Badge>
                            <Badge variant="outline" className="text-[11px] font-medium bg-slate-50 border-slate-200">
                              {t('recipes.ingredients_count', { count: v.ingredientCount ?? 0 })}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                          {formatDateTime(v.createdAt, i18n.language)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCurrent ? (
                            <Badge variant="success" className="text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {t('recipes.current_active')}
                            </Badge>
                          ) : (
                            hasPermission('recipes.write') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => restoreMutation.mutate(v.id)}
                                disabled={restoreMutation.isPending}
                                className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                {t('recipes.action_restore')}
                              </Button>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Score Trend Chart */}
        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                {t('recipes.score_trend')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {(scoreTrend ?? []).length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  {t('recipes.no_trend_data')}
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scoreTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="trialNo"
                        tickFormatter={(v) => t('trials.trial_round', { round: v })}
                        stroke="#94a3b8"
                        fontSize={12}
                      />
                      <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        formatter={(val: any) => [
                          val != null && !isNaN(Number(val)) ? `${Number(val).toFixed(2)} / 5` : '-',
                          t('recipes.trend_avg_score'),
                        ]}
                        labelFormatter={(label) => t('recipes.trend_round_label', { round: label })}
                      />
                      <Line
                        type="monotone"
                        dataKey="overallScore"
                        stroke="#ea580c"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#ea580c' }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal for creating a new version of this recipe */}
      <RecipeFormModal
        open={isVersionModalOpen}
        onOpenChange={setIsVersionModalOpen}
        recipeId={recipe.id}
        existingRecipeName={recipe.name}
      />

      {/* Reusable Delete Confirmation Modal */}
      <ConfirmModal
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={t('recipes.delete_confirm_title')}
        description={t('recipes.delete_confirm_desc', { name: recipe.name, code: recipe.code })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
