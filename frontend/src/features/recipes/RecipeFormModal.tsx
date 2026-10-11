import { useTranslation } from 'react-i18next';
import { Plus, Loader2, Sparkles, Pencil } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/shared/ui/dialog';
import { useRecipeForm } from './hooks/useRecipeForm';
import { RecipeBasicInfoSection } from './components/RecipeBasicInfoSection';
import { RecipeBatchSizeSection } from './components/RecipeBatchSizeSection';
import { RecipeIngredientsSection } from './components/RecipeIngredientsSection';
import { RecipeStepsSection } from './components/RecipeStepsSection';
import type { RecipeFormModalProps } from './types/recipe-form';

export type { RecipeFormModalProps };

export function RecipeFormModal({
  open,
  onOpenChange,
  mode = 'create',
  recipeId,
  existingRecipeName,
  initialRecipe,
}: RecipeFormModalProps) {
  const { t } = useTranslation();

  const {
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
    isSubmitting,
  } = useRecipeForm({
    open,
    mode,
    recipeId,
    initialRecipe,
    onOpenChange,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        mobileVariant="fullPage"
        className="sm:max-h-[88dvh] sm:flex sm:flex-col sm:p-0 sm:gap-0"
      >
        <DialogHeader className="sm:p-5 sm:border-b sm:border-slate-100 sm:bg-white sm:shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {isEditing ? (
              <>
                <Pencil className="h-5 w-5 text-amber-500" />
                {t('recipes.edit_recipe')}: {existingRecipeName || name}
              </>
            ) : isCreatingVersion ? (
              <>
                <Sparkles className="h-5 w-5 text-amber-500" />
                {t('recipes.create_new_version')}: {existingRecipeName}
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-amber-500" />
                {t('recipes.create_recipe')}
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-0.5">
            {isEditing
              ? t('recipes.edit_recipe_subtitle')
              : isCreatingVersion
                ? t('recipes.change_note')
                : t('recipes.create_recipe_subtitle')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <DialogBody className="space-y-6 p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 overscroll-contain">
            {/* Section 1: Basic Information */}
            <RecipeBasicInfoSection
              isEditing={isEditing}
              isCreatingVersion={isCreatingVersion}
              name={name}
              setName={setName}
              code={code}
              setCode={setCode}
              description={description}
              setDescription={setDescription}
              sourceUrl={sourceUrl}
              setSourceUrl={setSourceUrl}
              changeNote={changeNote}
              setChangeNote={setChangeNote}
              tags={tags}
              selectedTagIds={selectedTagIds}
              onToggleTag={handleToggleTag}
            />

            {/* Section 2: Expected Yield & Batch Size */}
            <RecipeBatchSizeSection
              specifyPorkQuantity={specifyPorkQuantity}
              onToggleSpecifyPork={setSpecifyPorkQuantity}
              inputQuantity={inputQuantity}
              setInputQuantity={setInputQuantity}
              inputUnitId={inputUnitId}
              setInputUnitId={setInputUnitId}
              expectedOutputQuantity={expectedOutputQuantity}
              setExpectedOutputQuantity={setExpectedOutputQuantity}
              expectedOutputUnitId={expectedOutputUnitId}
              setExpectedOutputUnitId={setExpectedOutputUnitId}
              units={units}
            />

            {/* Section 3: Ingredients */}
            <RecipeIngredientsSection
              recipeIngredients={recipeIngredients}
              ingredientsList={ingredients}
              units={units}
              onAdd={addIngredientRow}
              onUpdate={updateIngredientRow}
              onRemove={removeIngredientRow}
            />

            {/* Section 4: Steps */}
            <RecipeStepsSection
              recipeSteps={recipeSteps}
              stepTypes={stepTypes}
              orientations={lookups}
              onAdd={addStepRow}
              onClear={clearSteps}
              onUpdate={updateStepRow}
              onRemove={removeStepRow}
            />

            {/* Section 5: General Notes */}
            <div className="space-y-1">
              <Label htmlFor="recipe-notes" className="text-xs font-semibold text-slate-700">
                {t('recipes.notes')}
              </Label>
              <textarea
                id="recipe-notes"
                rows={2}
                placeholder={t('recipes.notes_placeholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </DialogBody>

          <DialogFooter className="sm:p-4 sm:border-t sm:border-slate-100 sm:bg-slate-50/80 sm:shrink-0 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : isEditing ? (
                t('recipes.action_save_changes')
              ) : isCreatingVersion ? (
                t('recipes.create_new_version')
              ) : (
                t('recipes.action_create_recipe')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
