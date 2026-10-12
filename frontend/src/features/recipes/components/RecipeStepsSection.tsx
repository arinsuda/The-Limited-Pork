import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { RecipeStepRow } from './RecipeStepRow';
import type { StepType, Lookup, RecipeStepInput } from '../types/recipe-form';

interface RecipeStepsSectionProps {
  recipeSteps: RecipeStepInput[];
  stepTypes: StepType[];
  orientations: Lookup[];
  onAdd: () => void;
  onClear: () => void;
  onUpdate: (index: number, fieldOrPatch: keyof RecipeStepInput | Partial<RecipeStepInput>, value?: any) => void;
  onRemove: (index: number) => void;
}

export const RecipeStepsSection = React.memo(function RecipeStepsSection({
  recipeSteps,
  stepTypes,
  orientations,
  onAdd,
  onClear,
  onUpdate,
  onRemove,
}: RecipeStepsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{t('recipes.steps')}</h4>
          <p className="text-[11px] text-slate-400">{t('recipes.steps_hint')}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {recipeSteps.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-xs h-7 text-slate-400 hover:text-red-600"
            >
              {t('recipes.clear_steps')}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdd}
            className="text-xs h-7"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t('recipes.add_step')}
          </Button>
        </div>
      </div>

      {recipeSteps.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
          <p className="text-xs text-slate-400">{t('recipes.no_steps_hint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recipeSteps.map((step, idx) => (
            <RecipeStepRow
              key={step.clientId || idx}
              index={idx}
              step={step}
              stepTypes={stepTypes}
              orientations={orientations}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
});

RecipeStepsSection.displayName = 'RecipeStepsSection';
