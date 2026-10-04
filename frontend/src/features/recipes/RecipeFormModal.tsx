import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Loader2, Sparkles } from 'lucide-react';
import { http } from '@/shared/lib/http/client';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { toast } from 'sonner';

interface Unit {
  id: string;
  code: string;
  symbol: string;
  nameTh: string;
  nameEn: string;
}

interface Ingredient {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  defaultUnitId: string;
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

interface IngredientInput {
  ingredientId: string;
  quantity: number | '';
  unitId: string;
  preparationNote: string;
  isOptional: boolean;
}

interface RecipeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId?: string; // If provided, creates a new version for existing recipe
  existingRecipeName?: string;
}

export function RecipeFormModal({
  open,
  onOpenChange,
  recipeId,
  existingRecipeName,
}: RecipeFormModalProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isCreatingVersion = Boolean(recipeId);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [inputQuantity, setInputQuantity] = useState<number | ''>(1);
  const [inputUnitId, setInputUnitId] = useState('');
  const [expectedOutputQuantity, setExpectedOutputQuantity] = useState<number | ''>(650);
  const [expectedOutputUnitId, setExpectedOutputUnitId] = useState('');
  const [notes] = useState('');

  // Master data queries
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

  const { data: lookups = [] } = useQuery<Lookup[]>({
    queryKey: ['masterdata', 'lookups', 'PIG_ORIENTATION'],
    queryFn: () => http.get('/lookups?category=PIG_ORIENTATION'),
    enabled: open,
  });

  const { data: recipeTags = [] } = useQuery<Lookup[]>({
    queryKey: ['masterdata', 'lookups', 'RECIPE_TAG'],
    queryFn: () => http.get('/lookups?category=RECIPE_TAG'),
    enabled: open,
  });

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const { data: ingredientsList } = useQuery<{ data: Ingredient[] }>({
    queryKey: ['masterdata', 'ingredients'],
    queryFn: () => http.get('/ingredients?pageSize=100'),
    enabled: open,
  });

  const ingredients = ingredientsList?.data ?? [];

  // Default unit setup
  React.useEffect(() => {
    if (units.length > 0 && !inputUnitId) {
      const kg = units.find((u) => u.code === 'KG') || units[0];
      const g = units.find((u) => u.code === 'G') || units[0];
      if (kg) setInputUnitId(kg.id);
      if (g) setExpectedOutputUnitId(g.id);
    }
  }, [units, inputUnitId]);

  // Ingredients state
  const [recipeIngredients, setRecipeIngredients] = useState<IngredientInput[]>([]);

  // Steps state
  const [recipeSteps, setRecipeSteps] = useState<StepInput[]>([]);

  // Preset initial steps if empty
  React.useEffect(() => {
    if (open && recipeSteps.length === 0 && stepTypes.length > 0) {
      const boil = stepTypes.find((s) => s.code === 'BOIL');
      const dry = stepTypes.find((s) => s.code === 'DRY');
      const fry = stepTypes.find((s) => s.code === 'FRY');
      const skinDown = lookups.find((l) => l.code === 'SKIN_DOWN');
      const skinUp = lookups.find((l) => l.code === 'SKIN_UP');

      const initial: StepInput[] = [];
      if (boil) {
        initial.push({
          stepTypeId: boil.id,
          title: 'ต้มหมูสามชั้น',
          instruction: 'ต้มในน้ำเดือดให้หนังเริ่มสุกนิ่ม',
          temperatureC: 100,
          durationMinutes: 20,
          orientationId: skinDown ? skinDown.id : '',
          notes: '',
        });
      }
      if (dry) {
        initial.push({
          stepTypeId: dry.id,
          title: 'พักผึ่งหนังให้แห้งสนิท',
          instruction: 'ทาเกลือและน้ำส้มสายชูบนหนังหมู แล้วผึ่งแดดหรือแช่ตู้เย็น',
          temperatureC: '',
          durationMinutes: 120,
          orientationId: skinUp ? skinUp.id : '',
          notes: '',
        });
      }
      if (fry) {
        // Fry Round 1
        initial.push({
          stepTypeId: fry.id,
          title: 'ทอดรอบที่ 1 (ทำให้เนื้อสุกทั่ว)',
          instruction: 'ทอดไฟกลาง หนังคว่ำลงในน้ำมัน',
          temperatureC: 160,
          durationMinutes: 15,
          orientationId: skinDown ? skinDown.id : '',
          notes: '',
        });
        // Fry Round 2
        initial.push({
          stepTypeId: fry.id,
          title: 'ทอดรอบที่ 2 (เร่งไฟให้หนังพูกรอบ)',
          instruction: 'เร่งไฟแรง หนังหงายขึ้นหรือตะแคงให้หนังฟูระเบิดกรอบ',
          temperatureC: 200,
          durationMinutes: 5,
          orientationId: skinUp ? skinUp.id : '',
          notes: '',
        });
      }
      setRecipeSteps(initial);
    }
  }, [open, stepTypes, lookups, recipeSteps.length]);

  const addIngredientRow = () => {
    const firstIng = ingredients[0];
    setRecipeIngredients((prev) => [
      ...prev,
      {
        ingredientId: firstIng ? firstIng.id : '',
        quantity: 10,
        unitId: firstIng ? firstIng.defaultUnitId : inputUnitId,
        preparationNote: '',
        isOptional: false,
      },
    ]);
  };

  const removeIngredientRow = (idx: number) => {
    setRecipeIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const addStepRow = () => {
    const defaultSt = stepTypes.find((s) => s.code === 'FRY') || stepTypes[0];
    setRecipeSteps((prev) => [
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
    setRecipeSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  // Compute repeatable round labels
  const getStepRoundLabel = (stepIdx: number) => {
    const step = recipeSteps[stepIdx];
    if (!step) return '';
    const st = stepTypes.find((s) => s.id === step.stepTypeId);
    if (!st || !st.isRepeatable) return '';

    let round = 1;
    for (let i = 0; i < stepIdx; i++) {
      if (recipeSteps[i]?.stepTypeId === step.stepTypeId) {
        round++;
      }
    }
    return i18n.language === 'th' ? `(รอบที่ ${round})` : `(Round ${round})`;
  };

  // Submit mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payloadSteps = recipeSteps.map((s) => ({
        stepTypeId: s.stepTypeId,
        title: s.title ? s.title : null,
        instruction: s.instruction ? s.instruction : null,
        temperatureC: s.temperatureC !== '' ? Number(s.temperatureC) : null,
        durationMinutes: s.durationMinutes !== '' ? Number(s.durationMinutes) : null,
        orientationId: s.orientationId ? s.orientationId : null,
        params: {},
        notes: s.notes ? s.notes : null,
      }));

      const payloadIngredients = recipeIngredients.map((ing) => ({
        ingredientId: ing.ingredientId,
        quantity: Number(ing.quantity) || 0,
        unitId: ing.unitId,
        preparationNote: ing.preparationNote ? ing.preparationNote : null,
        isOptional: ing.isOptional,
      }));

      const versionPayload = {
        changeNote: changeNote ? changeNote : null,
        inputQuantity: inputQuantity !== '' ? Number(inputQuantity) : null,
        inputUnitId: inputUnitId ? inputUnitId : null,
        expectedOutputQuantity: expectedOutputQuantity !== '' ? Number(expectedOutputQuantity) : null,
        expectedOutputUnitId: expectedOutputUnitId ? expectedOutputUnitId : null,
        notes: notes ? notes : null,
        ingredients: payloadIngredients,
        steps: payloadSteps,
      };

      if (isCreatingVersion && recipeId) {
        return http.post(`/recipes/${recipeId}/versions`, versionPayload);
      } else {
        return http.post('/recipes', {
          code: code ? code : null,
          name,
          description: description ? description : null,
          tagIds: selectedTagIds,
          initialVersion: versionPayload,
        });
      }
    },
    onSuccess: () => {
      toast.success(
        isCreatingVersion
          ? i18n.language === 'th'
            ? 'สร้างเวอร์ชันใหม่สำเร็จ'
            : 'New version created'
          : i18n.language === 'th'
            ? 'สร้างสูตรสำเร็จ'
            : 'Recipe created successfully',
      );
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error saving recipe');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-600" />
            {isCreatingVersion
              ? `${t('recipes.create_new_version')} — ${existingRecipeName}`
              : t('recipes.create_button')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Recipe Info (if creating new recipe) */}
          {!isCreatingVersion && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-orange-50/50 border border-orange-100">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="rec-name">
                  {t('recipes.name')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rec-name"
                  required
                  placeholder="เช่น สูตรหนังฟูกรอบไม่อมน้ำมัน (Signature)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rec-code">
                  {t('recipes.code')} <span className="text-xs text-slate-400">(เว้นว่างเพื่อสร้างอัตโนมัติ)</span>
                </Label>
                <Input
                  id="rec-code"
                  placeholder="เช่น RCP-0001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rec-desc">{t('recipes.description')}</Label>
                <Input
                  id="rec-desc"
                  placeholder="คำอธิบายจุดเด่นของสูตร"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>{i18n.language === 'th' ? 'แท็ก / หมวดหมู่สูตร' : 'Recipe Tags'}</Label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {recipeTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          setSelectedTagIds((prev) =>
                            isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
                          );
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors border ${
                          isSelected
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {i18n.language === 'th' ? tag.nameTh : tag.nameEn}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {isCreatingVersion && (
            <div className="space-y-1.5 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <Label htmlFor="change-note">{t('recipes.change_note')}</Label>
              <Input
                id="change-note"
                placeholder="เช่น ปรับอุณหภูมิทอดรอบ 2 จาก 190°C เป็น 200°C เพื่อให้หนังฟูขึ้น"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
              />
            </div>
          )}

          {/* Expected Yield & Batch Size */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="space-y-1">
              <Label className="text-xs">{t('recipes.input_quantity')}</Label>
              <Input
                type="number"
                step="0.1"
                value={inputQuantity}
                onChange={(e) => setInputQuantity(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">หน่วยเริ่มต้น</Label>
              <select
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-xs"
                value={inputUnitId}
                onChange={(e) => setInputUnitId(e.target.value)}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.symbol} ({i18n.language === 'th' ? u.nameTh : u.nameEn})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('recipes.expected_output')}</Label>
              <Input
                type="number"
                step="1"
                value={expectedOutputQuantity}
                onChange={(e) => setExpectedOutputQuantity(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">หน่วยเป้าหมาย</Label>
              <select
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-xs"
                value={expectedOutputUnitId}
                onChange={(e) => setExpectedOutputUnitId(e.target.value)}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.symbol} ({i18n.language === 'th' ? u.nameTh : u.nameEn})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">{t('recipes.ingredients')}</h4>
              <Button type="button" variant="outline" size="sm" onClick={addIngredientRow} className="text-xs h-7">
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('recipes.add_ingredient')}
              </Button>
            </div>

            {recipeIngredients.length === 0 ? (
              <p className="text-xs text-slate-400 italic">ยังไม่มีวัตถุดิบเสริม (สามารถเพิ่มเกลือ, น้ำส้มสายชู ฯลฯ ได้)</p>
            ) : (
              <div className="space-y-2">
                {recipeIngredients.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-200">
                    <select
                      className="flex-1 h-8 rounded border border-slate-300 bg-white px-2 text-xs"
                      value={row.ingredientId}
                      onChange={(e) => {
                        const val = e.target.value;
                        const ing = ingredients.find((i) => i.id === val);
                        setRecipeIngredients((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? { ...r, ingredientId: val, unitId: ing ? ing.defaultUnitId : r.unitId }
                              : r,
                          ),
                        );
                      }}
                    >
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {i18n.language === 'th' ? ing.nameTh : ing.nameEn}
                        </option>
                      ))}
                    </select>

                    <Input
                      type="number"
                      step="0.1"
                      className="w-20 h-8 text-xs"
                      placeholder="จำนวน"
                      value={row.quantity}
                      onChange={(e) => {
                        const q = e.target.value ? Number(e.target.value) : '';
                        setRecipeIngredients((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, quantity: q } : r)),
                        );
                      }}
                    />

                    <select
                      className="w-24 h-8 rounded border border-slate-300 bg-white px-2 text-xs"
                      value={row.unitId}
                      onChange={(e) => {
                        const u = e.target.value;
                        setRecipeIngredients((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, unitId: u } : r)),
                        );
                      }}
                    >
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.symbol}
                        </option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredientRow(idx)}
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Process Steps Section (Repeatable Frying Rounds Support) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{t('recipes.steps')}</h4>
                <p className="text-[11px] text-slate-500">
                  รองรับการทอดหลายรอบ อุณหภูมิ ระยะเวลา และทิศทางการวางหนังหมู
                </p>
              </div>
              <div className="flex items-center gap-2">
                {recipeSteps.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRecipeSteps([])}
                    className="text-xs h-7 text-slate-500 hover:text-red-600"
                  >
                    {i18n.language === 'th' ? 'ล้างขั้นตอน' : 'Clear steps'}
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={addStepRow} className="text-xs h-7">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {t('recipes.add_step')}
                </Button>
              </div>
            </div>

            {recipeSteps.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                {i18n.language === 'th'
                  ? 'ยังไม่มีขั้นตอน คลิก "เพิ่มขั้นตอน" เพื่อระบุขั้นตอนการปรุง/การเคี่ยว/การทอด'
                  : 'No steps yet. Click "Add Step" to define cooking/mixing/frying steps.'}
              </div>
            ) : (
              <div className="space-y-3">
              {recipeSteps.map((step, idx) => {
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
                            setRecipeSteps((prev) =>
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
                      <div className="sm:col-span-3 space-y-1">
                        <Input
                          placeholder="ชื่อขั้นตอน เช่น ทอดรอบแรกไฟกลาง"
                          className="h-8 text-xs"
                          value={step.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRecipeSteps((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, title: val } : s)),
                            );
                          }}
                        />
                      </div>

                      {/* Temperature */}
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
                              setRecipeSteps((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, temperatureC: val } : s)),
                              );
                            }}
                          />
                        </div>
                      )}

                      {/* Duration */}
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
                              setRecipeSteps((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, durationMinutes: val } : s)),
                              );
                            }}
                          />
                        </div>
                      )}

                      {/* Orientation */}
                      {st?.usesOrientation && (
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-600">{t('recipes.orientation')}</Label>
                          <select
                            className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-xs"
                            value={step.orientationId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRecipeSteps((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, orientationId: val } : s)),
                              );
                            }}
                          >
                            <option value="">-- ไม่ระบุ --</option>
                            {lookups.map((l) => (
                              <option key={l.id} value={l.id}>
                                {i18n.language === 'th' ? l.nameTh : l.nameEn}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <Input
                      placeholder="คำแนะนำในการทำขั้นตอนนี้"
                      className="h-8 text-xs"
                      value={step.instruction}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRecipeSteps((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, instruction: val } : s)),
                        );
                      }}
                    />
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (!isCreatingVersion && !name.trim())}
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
