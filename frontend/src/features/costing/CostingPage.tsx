import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Calculator,
  RotateCcw,
  Utensils,
  History,
  Save,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useCostCalculation } from './hooks/useCostCalculation';
import { useCreateCosting, useUpdateCosting, useUnits } from './hooks/useCostingApi';
import { CostingSummaryCards } from './components/CostingSummaryCards';
import { YieldAndShrinkageSection } from './components/YieldAndShrinkageSection';
import { IngredientsCostSection } from './components/IngredientsCostSection';
import { OperationsCostSection } from './components/OperationsCostSection';
import { SaucesCostSection } from './components/SaucesCostSection';
import { PackagingCostSection } from './components/PackagingCostSection';
import { PricingProfitSection } from './components/PricingProfitSection';
import { SaveCostingModal } from './components/SaveCostingModal';
import { ImportRecipeModal } from './components/ImportRecipeModal';
import { CostingHistoryModal } from './components/CostingHistoryModal';
import type { CostCalculation } from './types/costing';

export function CostingPage() {
  const { t } = useTranslation();

  const {
    formValues,
    calculation,
    updateFormField,
    addIngredient,
    updateIngredient,
    removeIngredient,
    addOperation,
    updateOperation,
    removeOperation,
    addSauce,
    updateSauce,
    removeSauce,
    addPackaging,
    updatePackaging,
    removePackaging,
    loadCalculation,
    resetDefaults,
  } = useCostCalculation();

  // Load units from master data
  const { data: units = [] } = useUnits();

  // Modals state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const { mutateAsync: createCosting, isPending: isCreating } = useCreateCosting();
  const { mutateAsync: updateCosting, isPending: isUpdating } = useUpdateCosting();

  const handleSaveSubmit = useCallback(
    async (name: string, notes?: string) => {
      try {
        const payload = {
          ...formValues,
          name,
          notes,
        };

        if (formValues.id && formValues.id !== 'draft-costing') {
          await updateCosting({ id: formValues.id, payload });
          toast.success(t('costing.save_modal.update_success'));
        } else {
          const created = await createCosting(payload);
          updateFormField('id', created.id);
          toast.success(t('costing.save_modal.save_success'));
        }
        setSaveModalOpen(false);
      } catch (err: unknown) {
        const error = err as Error;
        toast.error(error.message || t('common.error'));
      }
    },
    [formValues, createCosting, updateCosting, updateFormField, t],
  );

  const handleImportRecipe = useCallback(
    (imported: CostCalculation) => {
      loadCalculation(imported);
      toast.success(t('costing.import_modal.success_toast'));
    },
    [loadCalculation, t],
  );

  const handleSelectHistory = useCallback(
    (selected: CostCalculation) => {
      loadCalculation(selected);
      toast.success(t('costing.history_modal.loaded_toast'));
    },
    [loadCalculation, t],
  );

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-xs">
              <Calculator className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t('costing.title')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            {t('costing.subtitle')}
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="text-xs font-medium cursor-pointer shadow-2xs"
          >
            <Utensils className="h-3.5 w-3.5 mr-1 text-slate-500" />
            {t('costing.btn_import_recipe')}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHistoryModalOpen(true)}
            className="text-xs font-medium cursor-pointer shadow-2xs"
          >
            <History className="h-3.5 w-3.5 mr-1 text-slate-500" />
            {t('costing.btn_history')}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetDefaults}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {t('costing.btn_reset')}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setSaveModalOpen(true)}
            className="text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white cursor-pointer shadow-2xs"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {t('costing.btn_save')}
          </Button>
        </div>
      </div>

      {/* 1. Summary KPI Cards */}
      <CostingSummaryCards calculation={calculation} />

      {/* 2. Yield & Shrinkage Section */}
      <YieldAndShrinkageSection
        calculation={calculation}
        onChangeField={updateFormField}
      />

      {/* 3. Ingredients Section */}
      <IngredientsCostSection
        ingredients={formValues.ingredients}
        units={units}
        totalCost={calculation.ingredientsTotalCost}
        onAdd={() => addIngredient()}
        onUpdate={updateIngredient}
        onRemove={removeIngredient}
      />

      {/* 4. Operations Cost Section */}
      <OperationsCostSection
        operations={formValues.operations}
        totalCost={calculation.operationsTotalCost}
        onAdd={() => addOperation()}
        onUpdate={updateOperation}
        onRemove={removeOperation}
      />

      {/* 5. Sauces Cost Section */}
      <SaucesCostSection
        sauces={formValues.sauces || []}
        totalCost={calculation.saucesTotalCost || 0}
        onAdd={addSauce}
        onUpdate={updateSauce}
        onRemove={removeSauce}
      />

      {/* 6. Packaging Cost Section */}
      <PackagingCostSection
        packaging={formValues.packaging}
        totalCost={calculation.packagingTotalCost}
        onAdd={() => addPackaging()}
        onUpdate={updatePackaging}
        onRemove={removePackaging}
      />

      {/* 6. Pricing & Profit Analysis Section */}
      <PricingProfitSection
        calculation={calculation}
        onChangeField={updateFormField}
      />

      {/* Modals */}
      <SaveCostingModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        defaultName={formValues.name}
        defaultNotes={formValues.notes}
        isSaving={isCreating || isUpdating}
        onSave={handleSaveSubmit}
      />

      <ImportRecipeModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleImportRecipe}
      />

      <CostingHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        onSelect={handleSelectHistory}
      />
    </div>
  );
}

export default CostingPage;
