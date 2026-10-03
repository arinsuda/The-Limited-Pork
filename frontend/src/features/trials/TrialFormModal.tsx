import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Loader2, FlaskConical } from 'lucide-react';
import { http } from '@/shared/lib/http/client';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { toast } from 'sonner';

interface RecipeOption {
  id: string;
  code: string;
  name: string;
  currentVersionNo: number;
}

interface Unit {
  id: string;
  code: string;
  symbol: string;
}

interface StepType {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  usesTemperature: boolean;
  usesDuration: boolean;
  usesOrientation: boolean;
  isRepeatable: boolean;
}

interface Lookup {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
}

interface StepInput {
  stepTypeId: string;
  title: string;
  instruction: string;
  temperatureC: number | '';
  durationMinutes: number | '';
  orientationId: string;
  notes: string;
}

interface TrialFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRecipeId?: string;
}

export function TrialFormModal({
  open,
  onOpenChange,
  defaultRecipeId,
}: TrialFormModalProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const todayStr = new Date().toISOString().split('T')[0];

  const [recipeId, setRecipeId] = useState(defaultRecipeId || '');
  const [trialDate, setTrialDate] = useState(todayStr);
  const [title, setTitle] = useState('');
  const [inputQuantity, setInputQuantity] = useState<number | ''>(1);
  const [inputUnitId, setInputUnitId] = useState('');
  const [outputQuantity, setOutputQuantity] = useState<number | ''>(650);
  const [outputUnitId, setOutputUnitId] = useState('');
  const [ambientTempC, setAmbientTempC] = useState<number | ''>(32);
  const [humidityPct, setHumidityPct] = useState<number | ''>(65);
  const [weatherId, setWeatherId] = useState('');
  const [summary, setSummary] = useState('');
  const [issues, setIssues] = useState('');
  const [nextActions, setNextActions] = useState('');

  // Steps state
  const [trialSteps, setTrialSteps] = useState<StepInput[]>([]);

  // Queries
  const { data: recipesResp } = useQuery<{ data: RecipeOption[] }>({
    queryKey: ['recipes', 'select-options'],
    queryFn: () => http.get('/recipes?pageSize=100'),
    enabled: open,
  });
  const recipes = recipesResp?.data ?? [];

  // Auto select first recipe if none
  React.useEffect(() => {
    if (recipes.length > 0 && !recipeId && recipes[0]) {
      setRecipeId(recipes[0].id);
    }
  }, [recipes, recipeId]);

  // Query selected recipe detail to grab its current version steps
  const { data: selectedRecipe } = useQuery<any>({
    queryKey: ['recipes', 'detail', recipeId],
    queryFn: () => http.get(`/recipes/${recipeId}`),
    enabled: open && Boolean(recipeId),
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['masterdata', 'units'],
    queryFn: () => http.get('/units'),
    enabled: open,
  });

  const { data: stepTypes = [] } = useQuery<StepType[]>({
    queryKey: ['masterdata', 'step-types'],
    queryFn: () => http.get('/process-step-types'),
    enabled: open,
  });

  const { data: orientations = [] } = useQuery<Lookup[]>({
    queryKey: ['masterdata', 'lookups', 'PIG_ORIENTATION'],
    queryFn: () => http.get('/lookups?category=PIG_ORIENTATION'),
    enabled: open,
  });

  const { data: weathers = [] } = useQuery<Lookup[]>({
    queryKey: ['masterdata', 'lookups', 'WEATHER'],
    queryFn: () => http.get('/lookups?category=WEATHER'),
    enabled: open,
  });

  // Default units setup
  React.useEffect(() => {
    if (units.length > 0 && !inputUnitId) {
      const kg = units.find((u) => u.code === 'KG') || units[0];
      const g = units.find((u) => u.code === 'G') || units[0];
      if (kg) setInputUnitId(kg.id);
      if (g) setOutputUnitId(g.id);
    }
  }, [units, inputUnitId]);

  // When selected recipe changes, prefill steps from current version
  React.useEffect(() => {
    if (selectedRecipe?.currentVersion) {
      const ver = selectedRecipe.currentVersion;
      if (ver.inputQuantity) setInputQuantity(ver.inputQuantity);
      if (ver.inputUnit?.id) setInputUnitId(ver.inputUnit.id);
      if (ver.expectedOutputQuantity) setOutputQuantity(ver.expectedOutputQuantity);
      if (ver.expectedOutputUnit?.id) setOutputUnitId(ver.expectedOutputUnit.id);

      if (ver.steps && ver.steps.length > 0) {
        setTrialSteps(
          ver.steps.map((st: any) => ({
            stepTypeId: st.stepType.id,
            title: st.title || '',
            instruction: st.instruction || '',
            temperatureC: st.temperatureC ?? '',
            durationMinutes: st.durationMinutes ?? '',
            orientationId: st.orientation?.id || '',
            notes: st.notes || '',
          })),
        );
      }
    }
  }, [selectedRecipe]);

  const addStepRow = () => {
    const defaultSt = stepTypes.find((s) => s.code === 'FRY') || stepTypes[0];
    setTrialSteps((prev) => [
      ...prev,
      {
        stepTypeId: defaultSt ? defaultSt.id : '',
        title: '',
        instruction: '',
        temperatureC: defaultSt?.usesTemperature ? 180 : '',
        durationMinutes: defaultSt?.usesDuration ? 10 : '',
        orientationId: '',
        notes: '',
      },
    ]);
  };

  const removeStepRow = (idx: number) => {
    setTrialSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const getStepRoundLabel = (stepIdx: number) => {
    const step = trialSteps[stepIdx];
    if (!step) return '';
    const st = stepTypes.find((s) => s.id === step.stepTypeId);
    if (!st || !st.isRepeatable) return '';

    let round = 1;
    for (let i = 0; i < stepIdx; i++) {
      if (trialSteps[i]?.stepTypeId === step.stepTypeId) {
        round++;
      }
    }
    return i18n.language === 'th' ? `(ทอดรอบที่ ${round})` : `(Round ${round})`;
  };

  // Submit
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payloadSteps = trialSteps.map((s) => ({
        stepTypeId: s.stepTypeId,
        title: s.title ? s.title : null,
        instruction: s.instruction ? s.instruction : null,
        temperatureC: s.temperatureC !== '' ? Number(s.temperatureC) : null,
        durationMinutes: s.durationMinutes !== '' ? Number(s.durationMinutes) : null,
        orientationId: s.orientationId ? s.orientationId : null,
        params: {},
        notes: s.notes ? s.notes : null,
      }));

      return http.post('/trials', {
        recipeId,
        recipeVersionId: selectedRecipe?.currentVersion?.id,
        trialDate,
        title: title ? title : null,
        inputQuantity: inputQuantity !== '' ? Number(inputQuantity) : null,
        inputUnitId: inputUnitId ? inputUnitId : null,
        outputQuantity: outputQuantity !== '' ? Number(outputQuantity) : null,
        outputUnitId: outputUnitId ? outputUnitId : null,
        ambientTempC: ambientTempC !== '' ? Number(ambientTempC) : null,
        humidityPct: humidityPct !== '' ? Number(humidityPct) : null,
        weatherId: weatherId ? weatherId : null,
        summary: summary ? summary : null,
        issues: issues ? issues : null,
        nextActions: nextActions ? nextActions : null,
        steps: payloadSteps,
        ingredients: [],
      });
    },
    onSuccess: () => {
      toast.success(i18n.language === 'th' ? 'บันทึกผลทดสอบสำเร็จ' : 'Trial recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['trials'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error recording trial');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-orange-600" />
            {t('trials.create_button')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Recipe and Date Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-orange-50/50 border border-orange-100">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="recipe-select">{t('trials.recipe')}</Label>
              <select
                id="recipe-select"
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900"
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
              >
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.code}] {r.name} (v{r.currentVersionNo})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trial-date">{t('trials.date')}</Label>
              <Input
                id="trial-date"
                type="date"
                required
                value={trialDate}
                onChange={(e) => setTrialDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="trial-title">หัวข้อการทดสอบรอบนี้</Label>
              <Input
                id="trial-title"
                placeholder="เช่น ทดสอบอุณหภูมิ 200°C หงายหนังขึ้น 5 นาที"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>

          {/* Actual Weights & Environmental Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="space-y-1">
              <Label className="text-xs">{t('trials.raw_weight')}</Label>
              <Input
                type="number"
                step="0.1"
                value={inputQuantity}
                onChange={(e) => setInputQuantity(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">หน่วยหมูสด</Label>
              <select
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-xs"
                value={inputUnitId}
                onChange={(e) => setInputUnitId(e.target.value)}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('trials.fried_weight')}</Label>
              <Input
                type="number"
                step="1"
                value={outputQuantity}
                onChange={(e) => setOutputQuantity(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">หน่วยหมูกรอบ</Label>
              <select
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-xs"
                value={outputUnitId}
                onChange={(e) => setOutputUnitId(e.target.value)}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('trials.ambient_temp')}</Label>
              <Input
                type="number"
                value={ambientTempC}
                onChange={(e) => setAmbientTempC(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('trials.humidity')}</Label>
              <Input
                type="number"
                value={humidityPct}
                onChange={(e) => setHumidityPct(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">{t('trials.weather')}</Label>
              <select
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-xs"
                value={weatherId}
                onChange={(e) => setWeatherId(e.target.value)}
              >
                <option value="">-- ไม่ระบุ --</option>
                {weathers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {i18n.language === 'th' ? w.nameTh : w.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actual Process Steps in this Trial */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{t('trials.frying_steps')}</h4>
                <p className="text-[11px] text-slate-500">
                  ปรับอุณหภูมิ เวลา และทิศทางหมูที่ทำจริงในรอบนี้
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addStepRow} className="text-xs h-7">
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('recipes.add_step')}
              </Button>
            </div>

            <div className="space-y-3">
              {trialSteps.map((step, idx) => {
                const st = stepTypes.find((s) => s.id === step.stepTypeId);
                const roundLabel = getStepRoundLabel(idx);

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
                          {idx + 1}
                        </span>
                        <select
                          className="h-8 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900"
                          value={step.stepTypeId}
                          onChange={(e) => {
                            const newTypeId = e.target.value;
                            setTrialSteps((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, stepTypeId: newTypeId } : s)),
                            );
                          }}
                        >
                          {stepTypes.map((stItem) => (
                            <option key={stItem.id} value={stItem.id}>
                              {i18n.language === 'th' ? stItem.nameTh : stItem.nameEn}
                            </option>
                          ))}
                        </select>
                        {roundLabel && (
                          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                            {roundLabel}
                          </span>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStepRow(idx)}
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-3">
                        <Input
                          placeholder="ชื่อขั้นตอน เช่น ทอดรอบแรกไฟกลาง หนังคว่ำลง"
                          className="h-8 text-xs"
                          value={step.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTrialSteps((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, title: val } : s)),
                            );
                          }}
                        />
                      </div>

                      {st?.usesTemperature && (
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-600">{t('recipes.temperature')}</Label>
                          <Input
                            type="number"
                            placeholder="เช่น 160"
                            className="h-8 text-xs"
                            value={step.temperatureC}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : '';
                              setTrialSteps((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, temperatureC: val } : s)),
                              );
                            }}
                          />
                        </div>
                      )}

                      {st?.usesDuration && (
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-600">{t('recipes.duration')}</Label>
                          <Input
                            type="number"
                            placeholder="เช่น 15"
                            className="h-8 text-xs"
                            value={step.durationMinutes}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : '';
                              setTrialSteps((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, durationMinutes: val } : s)),
                              );
                            }}
                          />
                        </div>
                      )}

                      {st?.usesOrientation && (
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-600">{t('recipes.orientation')}</Label>
                          <select
                            className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-xs"
                            value={step.orientationId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTrialSteps((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, orientationId: val } : s)),
                              );
                            }}
                          >
                            <option value="">-- ไม่ระบุ --</option>
                            {orientations.map((l) => (
                              <option key={l.id} value={l.id}>
                                {i18n.language === 'th' ? l.nameTh : l.nameEn}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes: Summary, Issues & Next Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('trials.summary')}</Label>
              <Textarea
                placeholder="สรุปผลโดยรวมของรอบนี้"
                className="text-xs h-20"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('trials.issues')}</Label>
              <Textarea
                placeholder="เช่น หนังพองไม่สม่ำเสมอ, น้ำมันกระเด็น"
                className="text-xs h-20"
                value={issues}
                onChange={(e) => setIssues(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('trials.next_actions')}</Label>
              <Textarea
                placeholder="เช่น รอบหน้าจะจิ้มหนังให้ถี่ขึ้นและตากให้นานขึ้น"
                className="text-xs h-20"
                value={nextActions}
                onChange={(e) => setNextActions(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !recipeId}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('common.loading')}
              </>
            ) : (
              t('common.save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
