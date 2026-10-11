import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { RecipeIngredientRow } from './RecipeIngredientRow';
import type { Ingredient, Unit, RecipeIngredientInput } from '../types/recipe-form';

interface RecipeIngredientsSectionProps {
  recipeIngredients: RecipeIngredientInput[];
  ingredientsList: Ingredient[];
  units: Unit[];
  onAdd: () => void;
  onUpdate: (index: number, field: keyof RecipeIngredientInput, value: any) => void;
  onRemove: (index: number) => void;
}

export const RecipeIngredientsSection = React.memo(function RecipeIngredientsSection({
  recipeIngredients,
  ingredientsList,
  units,
  onAdd,
  onUpdate,
  onRemove,
}: RecipeIngredientsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">{t('recipes.ingredients')}</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="text-xs h-7"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t('recipes.add_ingredient')}
        </Button>
      </div>

      {recipeIngredients.length === 0 ? (
        <p className="text-xs text-slate-400 italic">{t('recipes.no_extra_ingredients_hint')}</p>
      ) : (
        <div className="space-y-2">
          {recipeIngredients.map((row, idx) => (
            <RecipeIngredientRow
              key={idx}
              index={idx}
              row={row}
              ingredientsList={ingredientsList}
              units={units}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
});

RecipeIngredientsSection.displayName = 'RecipeIngredientsSection';
