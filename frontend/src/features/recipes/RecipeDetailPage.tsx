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
import { http } from '@/shared/lib/http/client';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Skeleton } from '@/shared/ui/skeleton';
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
      stepType: { nameTh: string; nameEn: string; icon: string | null; isRepeatable: boolean };
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
      toast.success(i18n.language === 'th' ? 'กู้คืนเวอร์ชันสำเร็จ' : 'Version restored');
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to restore version');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
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
              เปลี่ยนเป็น {t('recipes.status_testing')}
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
              {t('recipes.status_approved')}
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
      <Tabs defaultValue="steps" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="steps" className="text-xs">
            {t('recipes.steps')} & วัตถุดิบ (v{current?.versionNo})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            {t('recipes.versions_history')} ({(versions ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="trend" className="text-xs">
            {t('recipes.score_trend')}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Current Version Details & Process Steps */}
        <TabsContent value="steps" className="space-y-6">
          {/* Yield & Target Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-orange-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold">
                  %
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    {t('recipes.expected_yield')}
                  </span>
                  <span className="text-xl font-bold text-orange-700">
                    {current?.expectedYieldPct ? `${current.expectedYieldPct}%` : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  IN
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    {t('recipes.input_quantity')}
                  </span>
                  <span className="text-lg font-bold text-slate-800">
                    {current?.inputQuantity ?? '-'} {current?.inputUnit?.symbol ?? ''}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  OUT
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    {t('recipes.expected_output')}
                  </span>
                  <span className="text-lg font-bold text-slate-800">
                    {current?.expectedOutputQuantity ?? '-'} {current?.expectedOutputUnit?.symbol ?? ''}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ingredients Table */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                {t('recipes.ingredients')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ingredients.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">ไม่มีวัตถุดิบเสริมระบุไว้</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>วัตถุดิบ</TableHead>
                      <TableHead>ปริมาณ</TableHead>
                      <TableHead>การเตรียม / หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingredients.map((ing) => (
                      <TableRow key={ing.id}>
                        <TableCell className="text-center font-medium text-xs text-slate-400">
                          {ing.lineNo}
                        </TableCell>
                        <TableCell className="font-medium text-xs text-slate-900">
                          {i18n.language === 'th' ? ing.ingredient.nameTh : ing.ingredient.nameEn}
                          {ing.isOptional && (
                            <span className="ml-1.5 text-[10px] text-slate-400">(ไม่บังคับ)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800">
                          {ing.quantity} {ing.unit.symbol}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {ing.preparationNote || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Process Steps Timeline (with repeatable frying rounds) */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                {t('recipes.steps')} (ขั้นตอนกระบวนการทำ)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {steps.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">ยังไม่มีขั้นตอนระบุไว้</div>
              ) : (
                <div className="relative border-l-2 border-orange-200 ml-4 pl-6 space-y-6">
                  {steps.map((st) => (
                    <div key={st.id} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-[11px] font-bold text-white shadow">
                        {st.stepNo}
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {st.title || (i18n.language === 'th' ? st.stepType.nameTh : st.stepType.nameEn)}
                            </span>
                            {st.roundNo && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                                {i18n.language === 'th'
                                  ? `ทอดรอบที่ ${st.roundNo}`
                                  : `Frying Round ${st.roundNo}`}
                              </span>
                            )}
                          </div>

                          {/* Quick Parameters Badges */}
                          <div className="flex items-center gap-2">
                            {st.temperatureC !== null && (
                              <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50/50">
                                <Flame className="h-3 w-3 mr-1" />
                                {st.temperatureC}°C
                              </Badge>
                            )}
                            {st.durationMinutes !== null && (
                              <Badge variant="outline" className="text-slate-700 bg-slate-50">
                                <Clock className="h-3 w-3 mr-1" />
                                {st.durationMinutes} นาที
                              </Badge>
                            )}
                            {st.orientation && (
                              <Badge variant="secondary" className="text-slate-800">
                                <RotateCw className="h-3 w-3 mr-1" />
                                {i18n.language === 'th' ? st.orientation.nameTh : st.orientation.nameEn}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {st.instruction && (
                          <p className="text-xs text-slate-700 leading-relaxed font-normal">
                            {st.instruction}
                          </p>
                        )}
                        {st.notes && (
                          <p className="text-[11px] text-slate-400 italic">
                            หมายเหตุ: {st.notes}
                          </p>
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
                    <TableHead className="w-20">เวอร์ชัน</TableHead>
                    <TableHead>บันทึกการเปลี่ยนแปลง (Change Note)</TableHead>
                    <TableHead>ขั้นตอน / วัตถุดิบ</TableHead>
                    <TableHead>สร้างเมื่อ</TableHead>
                    <TableHead className="w-24 text-right">การจัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((v) => {
                    const isCurrent = v.versionNo === current?.versionNo;
                    return (
                      <TableRow key={v.id} className={isCurrent ? 'bg-orange-50/40' : ''}>
                        <TableCell className="font-bold text-xs text-slate-900">
                          v{v.versionNo} {isCurrent && <Badge variant="default" className="ml-1 text-[10px] scale-90">ปัจจุบัน</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          {v.changeNote || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {v.stepCount} ขั้นตอน • {v.ingredientCount} วัตถุดิบ
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          {formatDateTime(v.createdAt, i18n.language)}
                        </TableCell>
                        <TableCell className="text-right">
                          {!isCurrent && hasPermission('recipes.write') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => restoreMutation.mutate(v.id)}
                              disabled={restoreMutation.isPending}
                              className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              {t('recipes.restore_version')}
                            </Button>
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
                {t('recipes.score_trend')} (คะแนนการทดสอบแต่ละรอบ)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {(scoreTrend ?? []).length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  ยังไม่มีผลการทดสอบสำหรับสูตรนี้ ไปที่หน้า &quot;ผลการทดสอบ (R&D)&quot; เพื่อเริ่มบันทึกผล
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scoreTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="trialNo"
                        tickFormatter={(v) => `รอบ ${v}`}
                        stroke="#94a3b8"
                        fontSize={12}
                      />
                      <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        formatter={(val: any) => [`${Number(val).toFixed(2)} / 5`, 'คะแนนเฉลี่ย']}
                        labelFormatter={(label) => `ผลทดสอบรอบที่ ${label}`}
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
    </div>
  );
}
