import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import type { Ingredient, Unit, RecipeIngredientInput } from '../types/recipe-form';

interface RecipeIngredientRowProps {
  index: number;
  row: RecipeIngredientInput;
  ingredientsList: Ingredient[];
  units: Unit[];
  onUpdate: (index: number, field: keyof RecipeIngredientInput, value: any) => void;
  onRemove: (index: number) => void;
}

export const RecipeIngredientRow = React.memo(function RecipeIngredientRow({
  index,
  row,
  ingredientsList,
  units,
  onUpdate,
  onRemove,
}: RecipeIngredientRowProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
      <div className="flex-1 min-w-0">
        <select
          className="w-full h-8 rounded-md border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          value={row.ingredientId}
          onChange={(e) => onUpdate(index, 'ingredientId', e.target.value)}
        >
          {ingredientsList.map((ing) => (
            <option key={ing.id} value={ing.id}>
              {i18n.language === 'th' ? ing.nameTh : ing.nameEn}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <Input
          type="number"
          step="0.1"
          placeholder={t('recipes.quantity_placeholder')}
          value={row.quantity}
          onChange={(e) =>
            onUpdate(index, 'quantity', e.target.value ? Number(e.target.value) : '')
          }
          className="w-20 h-8 text-xs shrink-0"
        />

        <select
          className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs w-28 shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          value={row.unitId}
          onChange={(e) => onUpdate(index, 'unitId', e.target.value)}
        >
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.symbol} ({i18n.language === 'th' ? u.nameTh : u.nameEn})
            </option>
          ))}
        </select>

        <Input
          placeholder={t('recipes.ingredient_prep_placeholder')}
          value={row.preparationNote}
          onChange={(e) => onUpdate(index, 'preparationNote', e.target.value)}
          className="flex-1 min-w-[120px] h-8 text-xs"
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
    </div>
  );
});

RecipeIngredientRow.displayName = 'RecipeIngredientRow';
