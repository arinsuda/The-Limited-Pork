import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { http } from '@/shared/lib/http/client';
import type {
  Unit,
  StepType,
  Lookup,
  Ingredient,
  RecipeStepInput,
  RecipeIngredientInput,
} from '../types/recipe-form';

interface Tag {
  id: string;
  nameTh: string;
  nameEn: string;
}

let clientIdCounter = 1;
function generateClientId(prefix: string): string {
  return `${prefix}_${Date.now()}_${clientIdCounter++}`;
}

interface UseRecipeFormOptions {
  open: boolean;
  mode: 'create' | 'edit' | 'new_version';
  recipeId?: string;
  initialRecipe?: any;
  onOpenChange: (open: boolean) => void;
}

export function useRecipeForm({
  open,
  mode,
  recipeId,
  initialRecipe,
  onOpenChange,
}: UseRecipeFormOptions) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditing = mode === 'edit';
  const isCreatingVersion = mode === 'new_version' || (!mode && Boolean(recipeId) && !isEditing);

  const cur = initialRecipe?.currentVersion;
  const initialSpecifyPork =
    isEditing || isCreatingVersion
      ? typeof cur?.inputQuantity === 'number'
      : true;

  // Form states initialized synchronously from initialRecipe
  const [name, setName] = useState(
    () => (isEditing && initialRecipe ? initialRecipe.name || '' : ''),
  );
  const [code, setCode] = useState(
    () => (isEditing && initialRecipe ? initialRecipe.code || '' : ''),
  );
  const [description, setDescription] = useState(
    () => (isEditing && initialRecipe ? initialRecipe.description || '' : ''),
  );
  const [sourceUrl, setSourceUrl] = useState(
    () => (isEditing && initialRecipe ? initialRecipe.sourceUrl || '' : ''),
  );
  const [changeNote, setChangeNote] = useState(
    () => (isEditing && cur ? cur.changeNote || '' : ''),
  );
  const [specifyPorkQuantity, setSpecifyPorkQuantity] = useState(initialSpecifyPork);
  const [inputQuantity, setInputQuantity] = useState<number | ''>(() => {
    if ((isEditing || isCreatingVersion) && cur) {
      return typeof cur.inputQuantity === 'number' ? cur.inputQuantity : '';
    }
    return 1;
  });
  const [inputUnitId, setInputUnitId] = useState(() => cur?.inputUnitId || '');
  const [expectedOutputQuantity, setExpectedOutputQuantity] = useState<number | ''>(() => {
    if ((isEditing || isCreatingVersion) && cur) {
      return typeof cur.expectedOutputQuantity === 'number'
        ? cur.expectedOutputQuantity
        : '';
    }
    return 650;
  });
  const [expectedOutputUnitId, setExpectedOutputUnitId] = useState(
    () => cur?.expectedOutputUnitId || '',
  );
  const [notes, setNotes] = useState(() => (isEditing && cur ? cur.notes || '' : ''));
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => {
    if (isEditing && initialRecipe?.tags) {
      return initialRecipe.tags.map((tag: any) => tag.id);
    }
    return [];
  });
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredientInput[]>(() => {
    if ((isEditing || isCreatingVersion) && cur?.ingredients && cur.ingredients.length > 0) {
      return cur.ingredients.map((ing: any) => ({
        clientId: generateClientId('ing'),
        ingredientId: ing.ingredientId || ing.ingredient?.id || '',
        quantity: ing.quantity,
        unitId: ing.unitId || '',
        preparationNote: ing.preparationNote || '',
        isOptional: Boolean(ing.isOptional),
      }));
    }
    return [];
  });
  const [recipeSteps, setRecipeSteps] = useState<RecipeStepInput[]>(() => {
    if ((isEditing || isCreatingVersion) && cur?.steps && cur.steps.length > 0) {
      return cur.steps.map((st: any) => ({
        clientId: generateClientId('step'),
        stepTypeId: st.stepTypeId || st.stepType?.id || '',
        title: st.title || '',
        instruction: st.instruction || '',
        temperatureC: typeof st.temperatureC === 'number' ? st.temperatureC : '',
        durationMinutes: typeof st.durationMinutes === 'number' ? st.durationMinutes : '',
        orientationId: st.orientationId || st.orientation?.id || '',
        notes: st.notes || '',
        showCustomControls: Boolean(
          (typeof st.temperatureC === 'number' && st.temperatureC > 0) ||
          (typeof st.durationMinutes === 'number' && st.durationMinutes > 0),
        ),
      }));
    }
    return [];
  });

  // Master data queries
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['masterdata', 'units'],
    queryFn: () => http.get('/units'),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const { data: stepTypes = [] } = useQuery<StepType[]>({
    queryKey: ['masterdata', 'step-types'],
    queryFn: () => http.get('/process-step-types'),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const { data: lookups = [] } = useQuery<Lookup[]>({
    queryKey: ['masterdata', 'lookups', 'PIG_ORIENTATION'],
    queryFn: () => http.get('/lookups?category=PIG_ORIENTATION'),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ['masterdata', 'lookups', 'RECIPE_TAG'],
    queryFn: () => http.get('/lookups?category=RECIPE_TAG'),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const { data: ingredientsList } = useQuery<{ data: Ingredient[] }>({
    queryKey: ['masterdata', 'ingredients'],
    queryFn: () => http.get('/ingredients?pageSize=100'),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const ingredients = ingredientsList?.data ?? [];

  // Default unit setup
  useEffect(() => {
    if (units.length > 0 && !inputUnitId) {
      const kg = units.find((u) => u.code === 'KG') || units[0];
      const g = units.find((u) => u.code === 'G') || units[0];
      if (kg) setInputUnitId(kg.id);
      if (g) setExpectedOutputUnitId(g.id);
    }
  }, [units, inputUnitId]);



  // Default preset steps on fresh create
  useEffect(() => {
    if (
      open &&
      recipeSteps.length === 0 &&
      stepTypes.length > 0 &&
      !isEditing &&
      !isCreatingVersion
    ) {
      const boil = stepTypes.find((s) => s.code === 'BOIL');
      const dry = stepTypes.find((s) => s.code === 'DRY');
      const fry = stepTypes.find((s) => s.code === 'FRY');
      const skinDown = lookups.find((l) => l.code === 'SKIN_DOWN');
      const skinUp = lookups.find((l) => l.code === 'SKIN_UP');

      const initial: RecipeStepInput[] = [];
      if (boil) {
        initial.push({
          clientId: generateClientId('step'),
          stepTypeId: boil.id,
          title: 'ต้ม / ลวกเนื้อหมู',
          instruction: 'ต้มหมูในน้ำเดือดใส่เกลือจนสุกระดับหนึ่ง',
          temperatureC: 100,
          durationMinutes: 20,
          orientationId: skinDown?.id ?? '',
          notes: '',
        });
      }
      if (dry) {
        initial.push({
          clientId: generateClientId('step'),
          stepTypeId: dry.id,
          title: 'ตาก / อบไล่ความชื้น',
          instruction: 'บั้งหนังหมูและทาเกลือ/น้ำส้มสายชู อบไล่ความชื้น',
          temperatureC: 80,
          durationMinutes: 90,
          orientationId: skinUp?.id ?? '',
          notes: '',
        });
      }
      if (fry) {
        initial.push({
          clientId: generateClientId('step'),
          stepTypeId: fry.id,
          title: 'ทอดรอบแรก (สุกทั่วถึง)',
          instruction: 'ทอดไฟกลางให้น้ำมันท่วมจนเหลืองทอง',
          temperatureC: 160,
          durationMinutes: 15,
          orientationId: skinDown?.id ?? '',
          notes: '',
        });
      }
      if (initial.length > 0) {
        setRecipeSteps(initial);
      }
    }
  }, [open, stepTypes, lookups, isEditing, isCreatingVersion, recipeSteps.length]);

  // Memoized handlers for minimal re-renders and low INP
  const handleToggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  }, []);

  const addIngredientRow = useCallback(() => {
    const firstIng = ingredients[0];
    const defaultUnit = units.find((u) => u.code === 'G') || units[0];
    setRecipeIngredients((prev) => [
      ...prev,
      {
        clientId: generateClientId('ing'),
        ingredientId: firstIng?.id ?? '',
        quantity: 10,
        unitId: firstIng?.defaultUnitId || defaultUnit?.id || '',
        preparationNote: '',
        isOptional: false,
      },
    ]);
  }, [ingredients, units]);

  const removeIngredientRow = useCallback((index: number) => {
    setRecipeIngredients((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateIngredientRow = useCallback(
    (index: number, field: keyof RecipeIngredientInput, value: any) => {
      setRecipeIngredients((prev) =>
        prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
      );
    },
    [],
  );

  const addStepRow = useCallback(() => {
    const defaultSt = stepTypes.find((s) => s.code === 'FRY') || stepTypes[0];
    setRecipeSteps((prev) => [
      ...prev,
      {
        clientId: generateClientId('step'),
        stepTypeId: defaultSt?.id ?? '',
        title: '',
        instruction: '',
        temperatureC: 180,
        durationMinutes: 15,
        orientationId: '',
        notes: '',
        showCustomControls: true,
      },
    ]);
  }, [stepTypes]);

  const removeStepRow = useCallback((index: number) => {
    setRecipeSteps((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateStepRow = useCallback(
    (index: number, fieldOrPatch: keyof RecipeStepInput | Partial<RecipeStepInput>, value?: any) => {
      setRecipeSteps((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item;
          if (typeof fieldOrPatch === 'object' && fieldOrPatch !== null) {
            return { ...item, ...fieldOrPatch };
          }
          return { ...item, [fieldOrPatch]: value };
        }),
      );
    },
    [],
  );

  const clearSteps = useCallback(() => {
    setRecipeSteps([]);
  }, []);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Auto-create new process step types for any custom step names if not already in masterdata
      let hasCreatedNewStepType = false;
      const payloadSteps = await Promise.all(
        recipeSteps.map(async (s, idx) => {
          let stepTypeId = s.stepTypeId;

          const existingById = stepTypes.find((st) => st.id === stepTypeId);
          let matchedType = existingById;

          if (!existingById && s.title && s.title.trim()) {
            const trimmedTitle = s.title.trim();
            const existingByName = stepTypes.find(
              (st) =>
                (st.nameTh || '').trim().toLowerCase() === trimmedTitle.toLowerCase() ||
                (st.nameEn || '').trim().toLowerCase() === trimmedTitle.toLowerCase(),
            );

            if (existingByName) {
              stepTypeId = existingByName.id;
              matchedType = existingByName;
            } else {
              const hasTemp = s.temperatureC !== '';
              const hasDuration = s.durationMinutes !== '';
              const usesTemp = Boolean(s.showCustomControls ?? (hasTemp || hasDuration));
              const usesDuration = Boolean(s.showCustomControls ?? (hasTemp || hasDuration));

              try {
                const created = await http.post<StepType>('/process-step-types', {
                  code: `STEP_${Date.now().toString(36).toUpperCase()}_${idx}`,
                  nameTh: trimmedTitle,
                  nameEn: trimmedTitle,
                  usesTemperature: usesTemp,
                  usesDuration: usesDuration,
                  usesOrientation: false,
                  isRepeatable: false,
                });
                stepTypeId = created.id;
                matchedType = created;
                hasCreatedNewStepType = true;
              } catch {
                stepTypeId = stepTypes[0]?.id || '';
                matchedType = stepTypes[0];
              }
            }
          } else if (!existingById) {
            stepTypeId = stepTypes[0]?.id || '';
            matchedType = stepTypes[0];
          }

          // Determine whether thermal / timing / orientation parameters are active
          const isCustom = !matchedType;
          const isThermalActive = isCustom
            ? Boolean(s.showCustomControls ?? (s.temperatureC !== '' || s.durationMinutes !== ''))
            : true;
          const usesTemp = matchedType ? matchedType.usesTemperature : isThermalActive;
          const usesDuration = matchedType ? matchedType.usesDuration : isThermalActive;
          const usesOrientation = matchedType ? matchedType.usesOrientation : false;

          return {
            stepOrder: idx + 1,
            stepTypeId,
            title: s.title || null,
            instruction: s.instruction || null,
            temperatureC: usesTemp && s.temperatureC !== '' ? Number(s.temperatureC) : null,
            durationMinutes: usesDuration && s.durationMinutes !== '' ? Number(s.durationMinutes) : null,
            orientationId: usesOrientation && s.orientationId ? s.orientationId : null,
            params: {},
            notes: s.notes ? s.notes : null,
          };
        }),
      );

      if (hasCreatedNewStepType) {
        queryClient.invalidateQueries({ queryKey: ['masterdata', 'step-types'] });
      }

      const payloadIngredients = recipeIngredients.map((ing) => ({
        ingredientId: ing.ingredientId,
        quantity: Number(ing.quantity) || 0,
        unitId: ing.unitId,
        preparationNote: ing.preparationNote ? ing.preparationNote : null,
        isOptional: ing.isOptional,
      }));

      const versionPayload = {
        changeNote: changeNote ? changeNote : null,
        inputQuantity: specifyPorkQuantity && inputQuantity !== '' ? Number(inputQuantity) : null,
        inputUnitId: specifyPorkQuantity && inputUnitId ? inputUnitId : null,
        expectedOutputQuantity:
          specifyPorkQuantity && expectedOutputQuantity !== ''
            ? Number(expectedOutputQuantity)
            : null,
        expectedOutputUnitId: specifyPorkQuantity && expectedOutputUnitId ? expectedOutputUnitId : null,
        notes: notes ? notes : null,
        ingredients: payloadIngredients,
        steps: payloadSteps,
      };

      if (isEditing && recipeId) {
        return http.put(`/recipes/${recipeId}`, {
          name,
          description: description ? description : null,
          sourceUrl: sourceUrl ? sourceUrl : null,
          tagIds: selectedTagIds,
          version: initialRecipe?.version ?? 1,
          currentVersion: versionPayload,
        });
      } else if (isCreatingVersion && recipeId) {
        return http.post(`/recipes/${recipeId}/versions`, versionPayload);
      } else {
        return http.post('/recipes', {
          code: code ? code : null,
          name,
          description: description ? description : null,
          sourceUrl: sourceUrl ? sourceUrl : null,
          tagIds: selectedTagIds,
          initialVersion: versionPayload,
        });
      }
    },
    onSuccess: () => {
      toast.success(
        isEditing
          ? t('recipes.recipe_updated')
          : isCreatingVersion
            ? t('recipes.version_created')
            : t('recipes.recipe_created'),
      );
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error saving recipe');
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      saveMutation.mutate();
    },
    [name, saveMutation],
  );

  return {
    isEditing,
    isCreatingVersion,
    name,
    setName,
    code,
    setCode,
    description,
    setDescription,
    sourceUrl,
    setSourceUrl,
    changeNote,
    setChangeNote,
    specifyPorkQuantity,
    setSpecifyPorkQuantity,
    inputQuantity,
    setInputQuantity,
    inputUnitId,
    setInputUnitId,
    expectedOutputQuantity,
    setExpectedOutputQuantity,
    expectedOutputUnitId,
    setExpectedOutputUnitId,
    notes,
    setNotes,
    selectedTagIds,
    handleToggleTag,
    tags,
    units,
    stepTypes,
    lookups,
    ingredients,
    recipeIngredients,
    addIngredientRow,
    removeIngredientRow,
    updateIngredientRow,
    recipeSteps,
    addStepRow,
    removeStepRow,
    updateStepRow,
    clearSteps,
    handleSubmit,
    isSubmitting: saveMutation.isPending,
  };
}
