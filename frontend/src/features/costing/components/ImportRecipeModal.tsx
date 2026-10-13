import * as React from 'react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Utensils, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { useRecipesSelection, useRecipeCostingTemplate } from '../hooks/useCostingApi';
import type { CostCalculation } from '../types/costing';

interface ImportRecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (calculation: CostCalculation) => void;
}

export const ImportRecipeModal = React.memo(function ImportRecipeModal({
  open,
  onOpenChange,
  onImport,
}: ImportRecipeModalProps) {
  const { t } = useTranslation();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');

  const { data: recipes = [], isLoading: isLoadingRecipes } = useRecipesSelection();
  const { mutateAsync: fetchTemplate, isPending: isImporting } = useRecipeCostingTemplate();

  const handleConfirm = useCallback(async () => {
    if (!selectedRecipeId) return;
    try {
      const template = await fetchTemplate(selectedRecipeId);
      onImport(template);
      onOpenChange(false);
    } catch {
      // error handled by global toast / handler
    }
  }, [selectedRecipeId, fetchTemplate, onImport, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent mobileVariant="sheet" size="sm" className="sm:max-w-md">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Utensils className="h-4 w-4 text-orange-600" />
            {t('costing.import_modal.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-1.5">
            <Label htmlFor="recipe-select" className="text-xs font-semibold">
              {t('costing.import_modal.select_recipe')}
            </Label>
            {isLoadingRecipes ? (
              <div className="h-9 flex items-center text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                {t('common.loading')}
              </div>
            ) : (
              <select
                id="recipe-select"
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">{t('costing.import_modal.select_placeholder')}</option>
                {recipes.map((rec) => (
                  <option key={rec.id} value={rec.id}>
                    [{rec.code}] {rec.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            {t('costing.import_modal.hint')}
          </p>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isImporting}
              className="text-xs cursor-pointer"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isImporting || !selectedRecipeId}
              onClick={handleConfirm}
              className="text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  {t('common.loading')}
                </>
              ) : (
                t('costing.import_modal.import_btn')
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
});
