import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Scale,
  Sparkles,
  Workflow,
  ListFilter,
  Package,
  Settings as SettingsIcon,
  Check,
  X,
} from 'lucide-react';
import { http } from '@/shared/lib/http/client';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Page, PageHeader } from '@/shared/ui/page';
import { DataTable, type DataColumn } from '@/shared/ui/data-table';
import { useAuthStore } from '@/features/auth/auth-store';
import { toast } from 'sonner';

export function MasterDataPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  // Queries
  const { data: units = [], isLoading: isLoadingUnits } = useQuery<any[]>({
    queryKey: ['masterdata', 'units', 'all'],
    queryFn: () => http.get('/units?includeInactive=true'),
  });

  const { data: tasteAttributes = [], isLoading: isLoadingTaste } = useQuery<any[]>({
    queryKey: ['masterdata', 'taste-attributes', 'all'],
    queryFn: () => http.get('/taste-attributes?includeInactive=true'),
  });

  const { data: stepTypes = [], isLoading: isLoadingSteps } = useQuery<any[]>({
    queryKey: ['masterdata', 'step-types', 'all'],
    queryFn: () => http.get('/process-step-types?includeInactive=true'),
  });

  const { data: lookups = [], isLoading: isLoadingLookups } = useQuery<any[]>({
    queryKey: ['masterdata', 'lookups', 'all'],
    queryFn: () => http.get('/lookups?includeInactive=true'),
  });

  const { data: ingredientsResp, isLoading: isLoadingIngredients } = useQuery<any>({
    queryKey: ['masterdata', 'ingredients', 'all'],
    queryFn: () => http.get('/ingredients?pageSize=100&includeInactive=true'),
  });
  const ingredients = ingredientsResp?.data ?? [];

  const { data: settings = [], isLoading: isLoadingSettings } = useQuery<any[]>({
    queryKey: ['masterdata', 'settings'],
    queryFn: () => http.get('/settings'),
  });

  // Setting Edit Dialog State
  const [editingSetting, setEditingSetting] = useState<any>(null);
  const [settingValue, setSettingValue] = useState('');

  const updateSettingMutation = useMutation({
    mutationFn: async () => {
      let parsedValue: any = settingValue;
      if (editingSetting.valueType === 'number') parsedValue = Number(settingValue);
      if (editingSetting.valueType === 'boolean') parsedValue = settingValue === 'true';

      return http.put(`/settings/${editingSetting.key}`, {
        value: parsedValue,
        version: editingSetting.version,
      });
    },
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['masterdata', 'settings'] });
      setEditingSetting(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Update failed');
    },
  });

  // Units Columns
  const unitColumns: DataColumn<any>[] = [
    {
      key: 'code',
      header: t('masterdata.unit_code'),
      cell: (u) => <span className="font-mono text-xs font-bold text-slate-800">{u.code}</span>,
      mobile: 'badge',
    },
    {
      key: 'name',
      header: t('masterdata.name_th_en'),
      cell: (u) => (
        <div>
          <span className="font-semibold text-xs text-slate-900">{u.nameTh}</span>
          <span className="text-xs text-slate-500 ml-1">({u.nameEn})</span>
        </div>
      ),
      mobile: 'title',
    },
    {
      key: 'symbol',
      header: t('masterdata.unit_symbol'),
      cell: (u) => <span className="font-bold text-xs text-orange-600">{u.symbol}</span>,
      mobile: 'subtitle',
    },
    {
      key: 'dimension',
      header: t('masterdata.unit_dimension'),
      cell: (u) => <Badge variant="outline">{u.dimension}</Badge>,
      mobile: 'field',
    },
    {
      key: 'factorToBase',
      header: t('masterdata.factor_to_base'),
      cell: (u) => <span className="text-xs text-slate-600">{u.factorToBase}</span>,
      mobile: 'field',
    },
    {
      key: 'status',
      header: t('common.status'),
      className: 'w-20 text-center',
      cell: (u) =>
        u.isActive ? (
          <Badge variant="success" className="text-[10px]">
            {t('masterdata.status_active')}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">
            {t('masterdata.status_inactive')}
          </Badge>
        ),
      mobile: 'field',
    },
  ];

  // Taste Attributes Columns
  const tasteColumns: DataColumn<any>[] = [
    {
      key: 'code',
      header: t('masterdata.attribute_code'),
      cell: (ta) => <span className="font-mono text-xs font-bold text-slate-800">{ta.code}</span>,
      mobile: 'badge',
    },
    {
      key: 'name',
      header: t('masterdata.attribute_name'),
      cell: (ta) => (
        <span className="text-xs font-medium text-slate-900">
          {ta.nameTh} ({ta.nameEn})
        </span>
      ),
      mobile: 'title',
    },
    {
      key: 'scoreRange',
      header: t('masterdata.score_range'),
      cell: (ta) => (
        <span className="text-xs text-slate-600 font-mono">
          {ta.minScore} - {ta.maxScore}
        </span>
      ),
      mobile: 'field',
    },
    {
      key: 'color',
      header: t('masterdata.color'),
      cell: (ta) => (
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span
            className="inline-block h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0"
            style={{ backgroundColor: ta.color }}
          />
          {ta.color}
        </div>
      ),
      mobile: 'field',
    },
    {
      key: 'status',
      header: t('common.status'),
      className: 'w-20 text-center',
      cell: (ta) =>
        ta.isActive ? (
          <Badge variant="success" className="text-[10px]">
            {t('masterdata.status_active')}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">
            {t('masterdata.status_inactive')}
          </Badge>
        ),
      mobile: 'field',
    },
  ];

  // Step Types Columns
  const stepColumns: DataColumn<any>[] = [
    {
      key: 'code',
      header: t('masterdata.step_code'),
      cell: (st) => <span className="font-mono text-xs font-bold text-slate-800">{st.code}</span>,
      mobile: 'badge',
    },
    {
      key: 'name',
      header: t('masterdata.step_type_name'),
      cell: (st) => (
        <span className="text-xs font-semibold text-slate-900">
          {st.nameTh} ({st.nameEn})
        </span>
      ),
      mobile: 'title',
    },
    {
      key: 'temperature',
      header: t('recipes.temperature'),
      cell: (st) =>
        st.usesTemperature ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <X className="h-4 w-4 text-slate-300" />
        ),
      mobile: 'field',
    },
    {
      key: 'duration',
      header: t('recipes.duration'),
      cell: (st) =>
        st.usesDuration ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <X className="h-4 w-4 text-slate-300" />
        ),
      mobile: 'field',
    },
    {
      key: 'orientation',
      header: t('recipes.orientation'),
      cell: (st) =>
        st.usesOrientation ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <X className="h-4 w-4 text-slate-300" />
        ),
      mobile: 'field',
    },
    {
      key: 'repeatable',
      header: t('masterdata.repeatable_label'),
      cell: (st) =>
        st.isRepeatable ? (
          <Badge variant="warning" className="text-[10px]">
            {t('masterdata.repeatable_badge')}
          </Badge>
        ) : (
          <span className="text-slate-300 text-xs">-</span>
        ),
      mobile: 'field',
    },
  ];

  // Lookups Columns
  const lookupColumns: DataColumn<any>[] = [
    {
      key: 'code',
      header: t('masterdata.lookup_code'),
      cell: (l) => <span className="font-mono text-xs font-semibold text-slate-800">{l.code}</span>,
      mobile: 'badge',
    },
    {
      key: 'name',
      header: t('masterdata.name_th_en'),
      cell: (l) => (
        <span className="text-xs font-medium text-slate-800">
          {l.nameTh} / {l.nameEn}
        </span>
      ),
      mobile: 'title',
    },
    {
      key: 'category',
      header: t('masterdata.lookup_category'),
      cell: (l) => <Badge variant="outline" className="text-[11px] font-bold text-slate-600">{l.category}</Badge>,
      mobile: 'subtitle',
    },
    {
      key: 'status',
      header: t('common.status'),
      className: 'w-20 text-center',
      cell: (l) =>
        l.isActive ? (
          <Badge variant="success" className="text-[10px]">
            {t('masterdata.status_active')}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">
            {t('masterdata.status_inactive')}
          </Badge>
        ),
      mobile: 'field',
    },
  ];

  // Ingredients Columns
  const ingredientColumns: DataColumn<any>[] = [
    {
      key: 'code',
      header: t('masterdata.ingredient_code'),
      cell: (ing) => <span className="font-mono text-xs font-bold text-slate-800">{ing.code}</span>,
      mobile: 'badge',
    },
    {
      key: 'name',
      header: t('masterdata.ingredient_name'),
      cell: (ing) => (
        <span className="text-xs font-semibold text-slate-900">
          {ing.nameTh} ({ing.nameEn})
        </span>
      ),
      mobile: 'title',
    },
    {
      key: 'unit',
      header: t('masterdata.standard_unit'),
      cell: (ing) => <span className="text-xs text-orange-600 font-bold">{ing.defaultUnit?.symbol}</span>,
      mobile: 'field',
    },
    {
      key: 'notes',
      header: t('masterdata.prep_notes'),
      cell: (ing) => <span className="text-xs text-slate-500">{ing.notes || '-'}</span>,
      mobile: 'field',
    },
  ];

  // Settings Columns
  const settingColumns: DataColumn<any>[] = [
    {
      key: 'key',
      header: t('masterdata.setting_key'),
      cell: (s) => <span className="font-mono text-xs font-bold text-slate-800">{s.key}</span>,
      mobile: 'title',
    },
    {
      key: 'description',
      header: t('masterdata.description'),
      cell: (s) => (
        <span className="text-xs text-slate-600">
          {i18n.language === 'th' ? s.descriptionTh : s.descriptionEn}
        </span>
      ),
      mobile: 'subtitle',
    },
    {
      key: 'value',
      header: t('masterdata.setting_value'),
      cell: (s) => (
        <span className="text-xs font-bold text-orange-600 font-mono break-all">
          {JSON.stringify(s.value)}
        </span>
      ),
      mobile: 'field',
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'w-24 text-right',
      cell: (s) =>
        hasPermission('settings.write') ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingSetting(s);
              setSettingValue(
                typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value),
              );
            }}
            className="text-xs text-orange-600 hover:text-orange-700"
          >
            {t('masterdata.edit_setting')}
          </Button>
        ) : null,
      mobile: 'actions',
    },
  ];

  return (
    <Page className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('masterdata.title')}
        description={t('masterdata.subtitle')}
      />

      <Tabs defaultValue="units" className="space-y-4">
        <div className="border-b border-slate-200/80 pb-1 overflow-x-auto scroll-x-touch scrollbar-none">
          <TabsList className="inline-flex h-11 items-center justify-start rounded-xl bg-slate-100/90 p-1 text-slate-600 gap-1 border border-slate-200/70 shadow-2xs whitespace-nowrap">
            <TabsTrigger value="units" className="text-xs">
              <Scale className="h-3.5 w-3.5 mr-1" />
              {t('masterdata.units')} ({units.length})
            </TabsTrigger>
            <TabsTrigger value="taste" className="text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {t('masterdata.taste_attributes')} ({tasteAttributes.length})
            </TabsTrigger>
            <TabsTrigger value="steps" className="text-xs">
              <Workflow className="h-3.5 w-3.5 mr-1" />
              {t('masterdata.process_step_types')} ({stepTypes.length})
            </TabsTrigger>
            <TabsTrigger value="lookups" className="text-xs">
              <ListFilter className="h-3.5 w-3.5 mr-1" />
              {t('masterdata.lookups')} ({lookups.length})
            </TabsTrigger>
            <TabsTrigger value="ingredients" className="text-xs">
              <Package className="h-3.5 w-3.5 mr-1" />
              {t('masterdata.ingredients')} ({ingredients.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              <SettingsIcon className="h-3.5 w-3.5 mr-1" />
              {t('masterdata.settings')} ({settings.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Units Tab */}
        <TabsContent value="units">
          <DataTable
            columns={unitColumns}
            data={units}
            isLoading={isLoadingUnits}
            rowKey={(u) => u.id}
          />
        </TabsContent>

        {/* Taste Attributes Tab */}
        <TabsContent value="taste">
          <DataTable
            columns={tasteColumns}
            data={tasteAttributes}
            isLoading={isLoadingTaste}
            rowKey={(ta) => ta.id}
          />
        </TabsContent>

        {/* Step Types Tab */}
        <TabsContent value="steps">
          <DataTable
            columns={stepColumns}
            data={stepTypes}
            isLoading={isLoadingSteps}
            rowKey={(st) => st.id}
          />
        </TabsContent>

        {/* Lookups Tab */}
        <TabsContent value="lookups">
          <DataTable
            columns={lookupColumns}
            data={lookups}
            isLoading={isLoadingLookups}
            rowKey={(l) => l.id}
          />
        </TabsContent>

        {/* Ingredients Tab */}
        <TabsContent value="ingredients">
          <DataTable
            columns={ingredientColumns}
            data={ingredients}
            isLoading={isLoadingIngredients}
            rowKey={(ing) => ing.id}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <DataTable
            columns={settingColumns}
            data={settings}
            isLoading={isLoadingSettings}
            rowKey={(s) => s.key}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Setting Dialog */}
      {editingSetting && (
        <Dialog open={Boolean(editingSetting)} onOpenChange={() => setEditingSetting(null)}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>
                {t('masterdata.edit_setting_title', { key: editingSetting.key })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 p-4 sm:p-0 sm:py-2 w-full max-w-full overflow-x-hidden">
              <Label htmlFor="set-val">
                {t('masterdata.setting_val_type', { type: editingSetting.valueType })}
              </Label>
              <Input
                id="set-val"
                value={settingValue}
                onChange={(e) => setSettingValue(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSetting(null)} className="max-sm:hidden">
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => updateSettingMutation.mutate()}
                disabled={updateSettingMutation.isPending}
              >
                {t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Page>
  );
}
