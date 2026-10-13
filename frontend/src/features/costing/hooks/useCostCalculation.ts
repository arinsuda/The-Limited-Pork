import { useState, useMemo, useCallback } from 'react';
import type {
  CostCalculation,
  CostingFormValues,
  IngredientCostItem,
  OperationCostItem,
  PackagingCostItem,
  SauceCostItem,
} from '../types/costing';

export const DEFAULT_CRISPY_PORK_COSTING: CostingFormValues = {
  name: 'หมูกรอบสูตรมาตรฐาน (Batch 10 กก.)',
  rawWeightKg: 10.0,
  cookedWeightKg: 6.0,
  yieldPct: 60.0,
  wastagePct: 3.0,
  portionWeightG: 150.0,
  targetFoodCostPct: 35.0,
  targetMarginPct: 65.0,
  actualPricePerPortion: 120.0,
  ingredients: [
    {
      id: 'ing-1',
      ingredientName: 'หมูสามชั้นเส้นสวย (คัดพิเศษ)',
      quantity: 10.0,
      unitName: 'กก.',
      unitPrice: 160.0,
      trimLossPct: 5.0,
      totalCost: 1680.0,
    },
    {
      id: 'ing-2',
      ingredientName: 'น้ำมันปาล์มสำหรับทอด',
      quantity: 2.0,
      unitName: 'ลิตร',
      unitPrice: 45.0,
      trimLossPct: 0.0,
      totalCost: 90.0,
    },
    {
      id: 'ing-3',
      ingredientName: 'เกลือสมุทรป่น',
      quantity: 0.1,
      unitName: 'กก.',
      unitPrice: 15.0,
      trimLossPct: 0.0,
      totalCost: 1.5,
    },
    {
      id: 'ing-4',
      ingredientName: 'น้ำส้มสายชูกลั่น 5%',
      quantity: 0.15,
      unitName: 'ลิตร',
      unitPrice: 25.0,
      trimLossPct: 0.0,
      totalCost: 3.75,
    },
  ],
  operations: [
    {
      id: 'ops-1',
      name: 'แก๊สหุงต้ม LPG สำหรับต้มและทอด',
      category: 'GAS',
      rate: 25.0,
      usage: 2.5,
      totalCost: 62.5,
    },
    {
      id: 'ops-2',
      name: 'ค่าไฟฟ้าเตาอบลมร้อน Convection Oven',
      category: 'ELECTRICITY',
      rate: 5.0,
      usage: 3.0,
      totalCost: 15.0,
    },
  ],
  sauces: [
    {
      id: 'sauce-1',
      name: 'น้ำจิ้มซีอิ๊วดำหวานพริกดอง (สูตรโบราณ)',
      portionSize: '30 ml',
      unitCost: 2.5,
      quantity: 40.0,
      totalCost: 100.0,
    },
    {
      id: 'sauce-2',
      name: 'น้ำจิ้มซีฟู้ดมะนาวสดแท้ (ตัดเลี่ยน)',
      portionSize: '30 ml',
      unitCost: 3.2,
      quantity: 40.0,
      totalCost: 128.0,
    },
  ],
  packaging: [
    {
      id: 'pkg-1',
      name: 'กล่องกระดาษคราฟท์ฟู้ดเกรด + กระดาษซับมัน',
      unitPrice: 3.5,
      quantity: 40.0,
      totalCost: 140.0,
    },
    {
      id: 'pkg-2',
      name: 'ถ้วยน้ำจิ้ม 2oz + ฝาปิด',
      unitPrice: 1.0,
      quantity: 40.0,
      totalCost: 40.0,
    },
    {
      id: 'pkg-3',
      name: 'สติ๊กเกอร์โลโก้แบรนด์ หมูกรอบ มี จำกัด',
      unitPrice: 0.5,
      quantity: 40.0,
      totalCost: 20.0,
    },
  ],
};

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function useCostCalculation(initialValues: CostingFormValues = DEFAULT_CRISPY_PORK_COSTING) {
  const [formValues, setFormValues] = useState<CostingFormValues>(initialValues);

  // Pure mathematical recalculation (Memoized, instantaneous INP < 16ms)
  const calculation = useMemo<CostCalculation>(() => {
    // 1. Ingredients Cost
    const ingredients: IngredientCostItem[] = formValues.ingredients.map((ing) => {
      const effQty = ing.quantity * (1.0 + (ing.trimLossPct || 0) / 100.0);
      const totalCost = round2(effQty * (ing.unitPrice || 0));
      return { ...ing, totalCost };
    });
    const ingredientsTotalCost = round2(
      ingredients.reduce((sum, item) => sum + item.totalCost, 0),
    );

    // 2. Yield & Weights
    const rawWeightKg = Math.max(0, formValues.rawWeightKg || 0);
    let cookedWeightKg = Math.max(0, formValues.cookedWeightKg || 0);
    let yieldPct = Math.max(0, formValues.yieldPct || 0);

    if (rawWeightKg > 0) {
      if (cookedWeightKg === 0 && yieldPct > 0) {
        cookedWeightKg = round2(rawWeightKg * (yieldPct / 100.0));
      } else if (cookedWeightKg > 0) {
        yieldPct = round2((cookedWeightKg / rawWeightKg) * 100.0);
      }
    }
    const shrinkagePct = round2(Math.max(0, 100.0 - yieldPct));
    const costPerRawKg = rawWeightKg > 0 ? round2(ingredientsTotalCost / rawWeightKg) : 0;
    const costPerCookedKg = cookedWeightKg > 0 ? round2(ingredientsTotalCost / cookedWeightKg) : 0;

    // 3. Operations Cost
    const operations: OperationCostItem[] = formValues.operations.map((op) => {
      const totalCost = round2((op.rate || 0) * (op.usage || 0));
      return { ...op, totalCost };
    });
    const operationsTotalCost = round2(
      operations.reduce((sum, item) => sum + item.totalCost, 0),
    );

    // 4. Sauces Cost
    const sauces: SauceCostItem[] = (formValues.sauces || []).map((s) => {
      const totalCost = round2((s.unitCost || 0) * (s.quantity || 0));
      return { ...s, totalCost };
    });
    const saucesTotalCost = round2(
      sauces.reduce((sum, item) => sum + item.totalCost, 0),
    );

    // 5. Packaging Cost
    const packaging: PackagingCostItem[] = formValues.packaging.map((pkg) => {
      const totalCost = round2((pkg.unitPrice || 0) * (pkg.quantity || 0));
      return { ...pkg, totalCost };
    });
    const packagingTotalCost = round2(
      packaging.reduce((sum, item) => sum + item.totalCost, 0),
    );

    // 6. Wastage & Total Batch Cost
    const wastagePct = Math.max(0, formValues.wastagePct || 0);
    const wastageTotalCost = round2(
      (ingredientsTotalCost + operationsTotalCost) * (wastagePct / 100.0),
    );
    const totalBatchCost = round2(
      ingredientsTotalCost + operationsTotalCost + packagingTotalCost + saucesTotalCost + wastageTotalCost,
    );

    // 7. Portioning
    const portionWeightG = Math.max(1, formValues.portionWeightG || 150);
    const totalPortions = cookedWeightKg > 0 ? round2((cookedWeightKg * 1000.0) / portionWeightG) : 0;
    const costPerPortion = totalPortions > 0 ? round2(totalBatchCost / totalPortions) : 0;

    // 8. Pricing Recommendations
    const targetFoodCostPct = Math.max(1, formValues.targetFoodCostPct || 35);
    const recommendedPriceByFoodCost =
      costPerPortion > 0 ? round2(costPerPortion / (targetFoodCostPct / 100.0)) : 0;

    const targetMarginPct = Math.min(99, Math.max(1, formValues.targetMarginPct || 65));
    const recommendedPriceByMargin =
      costPerPortion > 0 ? round2(costPerPortion / (1.0 - targetMarginPct / 100.0)) : 0;

    // 9. Actual Price & Margins
    const actualPrice = Math.max(0, formValues.actualPricePerPortion || 0);
    const grossProfitPerPortion = actualPrice > 0 ? round2(actualPrice - costPerPortion) : 0;
    const grossProfitMarginPct =
      actualPrice > 0 ? round2((grossProfitPerPortion / actualPrice) * 100.0) : 0;
    const actualFoodCostPct = actualPrice > 0 ? round2((costPerPortion / actualPrice) * 100.0) : 0;
    const totalBatchRevenue = round2(totalPortions * actualPrice);
    const totalBatchGrossProfit = round2(totalBatchRevenue - totalBatchCost);
    const breakEvenPortions = actualPrice > 0 ? round2(totalBatchCost / actualPrice) : 0;

    return {
      id: formValues.id || 'draft-costing',
      name: formValues.name,
      recipeId: formValues.recipeId,
      recipeVersionId: formValues.recipeVersionId,
      recipeName: formValues.recipeName,
      notes: formValues.notes,
      rawWeightKg,
      cookedWeightKg,
      yieldPct,
      shrinkagePct,
      wastagePct,
      ingredients,
      operations,
      sauces,
      packaging,
      ingredientsTotalCost,
      operationsTotalCost,
      saucesTotalCost,
      packagingTotalCost,
      wastageTotalCost,
      totalBatchCost,
      costPerRawKg,
      costPerCookedKg,
      portionWeightG,
      totalPortions,
      costPerPortion,
      targetFoodCostPct,
      recommendedPriceByFoodCost,
      targetMarginPct,
      recommendedPriceByMargin,
      actualPricePerPortion: actualPrice,
      grossProfitPerPortion,
      grossProfitMarginPct,
      actualFoodCostPct,
      totalBatchRevenue,
      totalBatchGrossProfit,
      breakEvenPortions,
    };
  }, [formValues]);

  // Field updates
  const updateFormField = useCallback(<K extends keyof CostingFormValues>(
    field: K,
    value: CostingFormValues[K],
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Ingredient mutations
  const addIngredient = useCallback((item?: Partial<IngredientCostItem>) => {
    setFormValues((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          id: `ing-${Date.now()}`,
          ingredientName: item?.ingredientName || '',
          quantity: item?.quantity || 1.0,
          unitName: item?.unitName || 'กก.',
          unitPrice: item?.unitPrice || 0,
          trimLossPct: item?.trimLossPct || 0,
          totalCost: 0,
          ...item,
        },
      ],
    }));
  }, []);

  const updateIngredient = useCallback((id: string, updates: Partial<IngredientCostItem>) => {
    setFormValues((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    }));
  }, []);

  const removeIngredient = useCallback((id: string) => {
    setFormValues((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((item) => item.id !== id),
    }));
  }, []);

  // Operation mutations
  const addOperation = useCallback((item?: Partial<OperationCostItem>) => {
    setFormValues((prev) => ({
      ...prev,
      operations: [
        ...prev.operations,
        {
          id: `ops-${Date.now()}`,
          name: item?.name || '',
          category: item?.category || 'OTHER',
          rate: item?.rate || 0,
          usage: item?.usage || 1.0,
          totalCost: 0,
          ...item,
        },
      ],
    }));
  }, []);

  const updateOperation = useCallback((id: string, updates: Partial<OperationCostItem>) => {
    setFormValues((prev) => ({
      ...prev,
      operations: prev.operations.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    }));
  }, []);

  const removeOperation = useCallback((id: string) => {
    setFormValues((prev) => ({
      ...prev,
      operations: prev.operations.filter((item) => item.id !== id),
    }));
  }, []);

  // Packaging mutations
  const addPackaging = useCallback((item?: Partial<PackagingCostItem>) => {
    setFormValues((prev) => ({
      ...prev,
      packaging: [
        ...prev.packaging,
        {
          id: `pkg-${Date.now()}`,
          name: item?.name || '',
          unitPrice: item?.unitPrice || 0,
          quantity: item?.quantity || 40.0,
          totalCost: 0,
          ...item,
        },
      ],
    }));
  }, []);

  const updatePackaging = useCallback((id: string, updates: Partial<PackagingCostItem>) => {
    setFormValues((prev) => ({
      ...prev,
      packaging: prev.packaging.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    }));
  }, []);

  const removePackaging = useCallback((id: string) => {
    setFormValues((prev) => ({
      ...prev,
      packaging: prev.packaging.filter((item) => item.id !== id),
    }));
  }, []);

  // Sauce mutations
  const addSauce = useCallback((item?: Partial<SauceCostItem>) => {
    setFormValues((prev) => ({
      ...prev,
      sauces: [
        ...(prev.sauces || []),
        {
          id: `sauce-${Date.now()}`,
          name: item?.name || '',
          portionSize: item?.portionSize || '30 ml',
          unitCost: item?.unitCost || 0,
          quantity: item?.quantity || 40.0,
          totalCost: 0,
          ...item,
        },
      ],
    }));
  }, []);

  const updateSauce = useCallback((id: string, updates: Partial<SauceCostItem>) => {
    setFormValues((prev) => ({
      ...prev,
      sauces: (prev.sauces || []).map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    }));
  }, []);

  const removeSauce = useCallback((id: string) => {
    setFormValues((prev) => ({
      ...prev,
      sauces: (prev.sauces || []).filter((item) => item.id !== id),
    }));
  }, []);

  // Load calculation
  const loadCalculation = useCallback((data: CostingFormValues | CostCalculation) => {
    setFormValues({
      id: data.id,
      name: data.name,
      recipeId: data.recipeId,
      recipeVersionId: data.recipeVersionId,
      recipeName: data.recipeName,
      notes: data.notes,
      rawWeightKg: data.rawWeightKg,
      cookedWeightKg: data.cookedWeightKg,
      yieldPct: data.yieldPct,
      wastagePct: data.wastagePct,
      ingredients: data.ingredients || [],
      operations: data.operations || [],
      sauces: data.sauces || [],
      packaging: data.packaging || [],
      portionWeightG: data.portionWeightG,
      targetFoodCostPct: data.targetFoodCostPct,
      targetMarginPct: data.targetMarginPct,
      actualPricePerPortion: data.actualPricePerPortion,
    });
  }, []);

  const resetDefaults = useCallback(() => {
    setFormValues(DEFAULT_CRISPY_PORK_COSTING);
  }, []);

  return {
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
  };
}
