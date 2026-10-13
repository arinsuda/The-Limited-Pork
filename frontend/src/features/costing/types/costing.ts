export interface IngredientCostItem {
  id: string;
  ingredientId?: string;
  ingredientName: string;
  quantity: number;
  unitId?: string;
  unitName: string;
  unitPrice: number;
  trimLossPct: number;
  totalCost: number;
}

export interface OperationCostItem {
  id: string;
  name: string;
  category: 'GAS' | 'ELECTRICITY' | 'LABOR' | 'OTHER' | string;
  rate: number;
  usage: number;
  totalCost: number;
}

export interface PackagingCostItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalCost: number;
}

export interface CostCalculation {
  id: string;
  name: string;
  recipeId?: string;
  recipeVersionId?: string;
  recipeName?: string;
  notes?: string;

  // Raw & Cooking Yield Parameters
  rawWeightKg: number;
  cookedWeightKg: number;
  yieldPct: number;
  shrinkagePct: number;
  wastagePct: number;

  // Itemized lists
  ingredients: IngredientCostItem[];
  operations: OperationCostItem[];
  packaging: PackagingCostItem[];

  // Calculated Cost Breakdown
  ingredientsTotalCost: number;
  operationsTotalCost: number;
  packagingTotalCost: number;
  wastageTotalCost: number;
  totalBatchCost: number;
  costPerRawKg: number;
  costPerCookedKg: number;

  // Portioning & Pricing Analysis
  portionWeightG: number;
  totalPortions: number;
  costPerPortion: number;
  targetFoodCostPct: number;
  recommendedPriceByFoodCost: number;
  targetMarginPct: number;
  recommendedPriceByMargin: number;
  actualPricePerPortion: number;
  grossProfitPerPortion: number;
  grossProfitMarginPct: number;
  actualFoodCostPct: number;
  totalBatchRevenue: number;
  totalBatchGrossProfit: number;
  breakEvenPortions: number;

  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CostingFormValues {
  id?: string;
  name: string;
  recipeId?: string;
  recipeVersionId?: string;
  recipeName?: string;
  notes?: string;
  rawWeightKg: number;
  cookedWeightKg: number;
  yieldPct: number;
  wastagePct: number;
  ingredients: IngredientCostItem[];
  operations: OperationCostItem[];
  packaging: PackagingCostItem[];
  portionWeightG: number;
  targetFoodCostPct: number;
  targetMarginPct: number;
  actualPricePerPortion: number;
}
