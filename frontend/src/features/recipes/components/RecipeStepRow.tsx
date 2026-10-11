import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { StepAutocompleteInput } from './StepAutocompleteInput';
import type { StepType, Lookup, RecipeStepInput } from '../types/recipe-form';

interface RecipeStepRowProps {
  index: number;
  step: RecipeStepInput;
  stepTypes: StepType[];
  orientations: Lookup[];
  onUpdate: (index: number, field: keyof RecipeStepInput, value: any) => void;
  onRemove: (index: number) => void;
}

export const RecipeStepRow = React.memo(function RecipeStepRow({
  index,
  step,
  stepTypes,
  orientations,
  onUpdate,
  onRemove,
}: RecipeStepRowProps) {
  const { t, i18n } = useTranslation();

  // Matched base step type
  const currentStepType = useMemo(
    () => stepTypes.find((s) => s.id === step.stepTypeId),
    [stepTypes, step.stepTypeId],
  );

  // For custom steps without a preset step type:
  // Default to false (only instruction/details), unless user explicitly toggled it or has existing values
  const [showCustomControls, setShowCustomControls] = useState(
    Boolean(step.temperatureC !== '' || step.durationMinutes !== ''),
  );

  // Field visibility based on schema
  const usesTemp = currentStepType ? currentStepType.usesTemperature : showCustomControls;
  const usesDuration = currentStepType ? currentStepType.usesDuration : showCustomControls;
  const usesOrientation = currentStepType ? currentStepType.usesOrientation : false;

  const activeControlCount =
    (usesTemp ? 1 : 0) + (usesDuration ? 1 : 0) + (usesOrientation ? 1 : 0);

  const handleStepSelect = useCallback(
    (newTitle: string, newTypeId: string, selectedType?: StepType | null) => {
      onUpdate(index, 'title', newTitle);
      onUpdate(index, 'stepTypeId', newTypeId);

      // If switching to a step type that does NOT use temperature/duration/orientation,
      // clean up leftover values so junk data doesn't persist
      if (selectedType) {
        if (!selectedType.usesTemperature) onUpdate(index, 'temperatureC', '');
        if (!selectedType.usesDuration) onUpdate(index, 'durationMinutes', '');
        if (!selectedType.usesOrientation) onUpdate(index, 'orientationId', '');
      }
    },
    [index, onUpdate],
  );

  return (
    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 transition-all">
      {/* Row Header: Step Index + Merged Google-style Autocomplete Input + Delete */}
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-500 text-white text-xs font-bold shrink-0">
          {index + 1}
        </span>
        <StepAutocompleteInput
          value={step.title}
          stepTypeId={step.stepTypeId}
          stepTypes={stepTypes}
          onChange={handleStepSelect}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Dynamic Thermal & Timing Parameters: Only render if step uses them */}
      {activeControlCount > 0 && (
        <div
          className={`grid gap-2 ${
            activeControlCount === 3
              ? 'grid-cols-1 sm:grid-cols-3'
              : activeControlCount === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-1 max-w-xs'
          }`}
        >
          {usesTemp && (
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">{t('recipes.temperature')}</Label>
              <Input
                type="number"
                placeholder="180"
                value={step.temperatureC}
                onChange={(e) =>
                  onUpdate(index, 'temperatureC', e.target.value ? Number(e.target.value) : '')
                }
                className="h-8 text-xs bg-white"
              />
            </div>
          )}

          {usesDuration && (
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">{t('recipes.duration')}</Label>
              <Input
                type="number"
                placeholder="15"
                value={step.durationMinutes}
                onChange={(e) =>
                  onUpdate(index, 'durationMinutes', e.target.value ? Number(e.target.value) : '')
                }
                className="h-8 text-xs bg-white"
              />
            </div>
          )}

          {usesOrientation && (
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">{t('recipes.orientation')}</Label>
              <select
                className="w-full h-8 rounded-md border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                value={step.orientationId}
                onChange={(e) => onUpdate(index, 'orientationId', e.target.value)}
              >
                <option value="">{t('recipes.unspecified')}</option>
                {orientations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {i18n.language === 'th' ? o.nameTh : o.nameEn}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Instruction / Details Input */}
      <div className="space-y-1">
        <Input
          placeholder={t('recipes.step_instruction_placeholder')}
          value={step.instruction}
          onChange={(e) => onUpdate(index, 'instruction', e.target.value)}
          className="h-8 text-xs bg-white"
        />
      </div>

      {/* Optional toggle for custom steps (not based on default thermal steps) */}
      {!currentStepType && (
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] text-slate-400 italic">
            {t('recipes.step_details_only_hint')}
          </span>
          <button
            type="button"
            onClick={() => setShowCustomControls(!showCustomControls)}
            className="text-[11px] font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
          >
            <SlidersHorizontal className="h-3 w-3" />
            {showCustomControls
              ? t('recipes.step_hide_thermal_controls')
              : t('recipes.step_add_thermal_controls')}
          </button>
        </div>
      )}
    </div>
  );
});

RecipeStepRow.displayName = 'RecipeStepRow';
