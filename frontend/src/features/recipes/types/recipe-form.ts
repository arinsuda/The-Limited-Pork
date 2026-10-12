export interface Unit {
  id: string;
  code: string;
  symbol: string;
  nameTh: string;
  nameEn: string;
}

export interface Ingredient {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  defaultUnitId: string;
}

export interface StepType {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  usesTemperature: boolean;
  usesDuration: boolean;
  usesOrientation: boolean;
  isRepeatable: boolean;
}

export interface Lookup {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
}

export interface RecipeStepInput {
  clientId?: string;
  stepTypeId: string;
  title: string;
  instruction: string;
  temperatureC: number | '';
  durationMinutes: number | '';
  orientationId: string;
  notes: string;
  showCustomControls?: boolean;
}

export interface RecipeIngredientInput {
  clientId?: string;
  ingredientId: string;
  quantity: number | '';
  unitId: string;
  preparationNote: string;
  isOptional: boolean;
}

export interface RecipeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'create' | 'edit' | 'new_version';
  recipeId?: string;
  existingRecipeName?: string;
  initialRecipe?: any;
}
