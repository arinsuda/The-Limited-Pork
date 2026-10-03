import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Database,
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
import { Card, CardContent } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { useAuthStore } from '@/features/auth/auth-store';
import { toast } from 'sonner';

export function MasterDataPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  // Queries
  const { data: units = [] } = useQuery<any[]>({
    queryKey: ['masterdata', 'units', 'all'],
    queryFn: () => http.get('/units?includeInactive=true'),
  });

  const { data: tasteAttributes = [] } = useQuery<any[]>({
    queryKey: ['masterdata', 'taste-attributes', 'all'],
    queryFn: () => http.get('/taste-attributes?includeInactive=true'),
  });

  const { data: stepTypes = [] } = useQuery<any[]>({
    queryKey: ['masterdata', 'step-types', 'all'],
    queryFn: () => http.get('/process-step-types?includeInactive=true'),
  });

  const { data: lookups = [] } = useQuery<any[]>({
    queryKey: ['masterdata', 'lookups', 'all'],
    queryFn: () => http.get('/lookups?includeInactive=true'),
  });

  const { data: ingredientsResp } = useQuery<any>({
    queryKey: ['masterdata', 'ingredients', 'all'],
    queryFn: () => http.get('/ingredients?pageSize=100&includeInactive=true'),
  });
  const ingredients = ingredientsResp?.data ?? [];

  const { data: settings = [] } = useQuery<any[]>({
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Database className="h-6 w-6 text-orange-600" />
          {t('masterdata.title')}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          จัดการข้อมูลตั้งต้นของระบบ ทั้งหน่วยวัด มิติรสชาติ ขั้นตอนการทำ และวัตถุดิบ ปราศจากการ Hardcode
        </p>
      </div>

      <Tabs defaultValue="units" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
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

        {/* Units Tab */}
        <TabsContent value="units">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('masterdata.unit_code')}</TableHead>
                    <TableHead>{t('masterdata.unit_symbol')}</TableHead>
                    <TableHead>ชื่อไทย / อังกฤษ</TableHead>
                    <TableHead>{t('masterdata.unit_dimension')}</TableHead>
                    <TableHead>{t('masterdata.factor_to_base')}</TableHead>
                    <TableHead className="w-20 text-center">สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-800">
                        {u.code}
                      </TableCell>
                      <TableCell className="font-bold text-xs text-orange-600">{u.symbol}</TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {u.nameTh} / {u.nameEn}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline">{u.dimension}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{u.factorToBase}</TableCell>
                      <TableCell className="text-center">
                        {u.isActive ? (
                          <Badge variant="success" className="text-[10px]">
                            เปิด
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            ปิด
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Taste Attributes Tab */}
        <TabsContent value="taste">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัสมิติ</TableHead>
                    <TableHead>ชื่อมิติรสชาติ</TableHead>
                    <TableHead>ช่วงคะแนน</TableHead>
                    <TableHead>{t('masterdata.color')}</TableHead>
                    <TableHead className="w-20 text-center">สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasteAttributes.map((ta) => (
                    <TableRow key={ta.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-800">
                        {ta.code}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">
                        {ta.nameTh} ({ta.nameEn})
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {ta.minScore} ถึง {ta.maxScore}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-full border border-slate-300"
                            style={{ backgroundColor: ta.color }}
                          />
                          {ta.color}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {ta.isActive ? (
                          <Badge variant="success" className="text-[10px]">
                            เปิด
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            ปิด
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step Types Tab */}
        <TabsContent value="steps">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัสขั้นตอน</TableHead>
                    <TableHead>ชื่อประเภทขั้นตอน</TableHead>
                    <TableHead>อุณหภูมิ</TableHead>
                    <TableHead>ระยะเวลา</TableHead>
                    <TableHead>ทิศทางหมู</TableHead>
                    <TableHead>ทำซ้ำหลายรอบ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stepTypes.map((st) => (
                    <TableRow key={st.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-800">
                        {st.code}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-900">
                        {st.nameTh} ({st.nameEn})
                      </TableCell>
                      <TableCell className="text-xs">
                        {st.usesTemperature ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <X className="h-4 w-4 text-slate-300" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {st.usesDuration ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <X className="h-4 w-4 text-slate-300" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {st.usesOrientation ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <X className="h-4 w-4 text-slate-300" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {st.isRepeatable ? (
                          <Badge variant="warning" className="text-[10px]">
                            รองรับรอบ 1, 2...
                          </Badge>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lookups Tab */}
        <TabsContent value="lookups">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('masterdata.lookup_category')}</TableHead>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อไทย / อังกฤษ</TableHead>
                    <TableHead className="w-20 text-center">สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lookups.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs font-bold text-slate-500">
                        {l.category}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-slate-800">
                        {l.code}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {l.nameTh} / {l.nameEn}
                      </TableCell>
                      <TableCell className="text-center">
                        {l.isActive ? (
                          <Badge variant="success" className="text-[10px]">
                            เปิด
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            ปิด
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ingredients Tab */}
        <TabsContent value="ingredients">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัสวัตถุดิบ</TableHead>
                    <TableHead>ชื่อวัตถุดิบ</TableHead>
                    <TableHead>หน่วยมาตรฐาน</TableHead>
                    <TableHead>คำแนะนำ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredients.map((ing: any) => (
                    <TableRow key={ing.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-800">
                        {ing.code}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-900">
                        {ing.nameTh} ({ing.nameEn})
                      </TableCell>
                      <TableCell className="text-xs text-orange-600 font-bold">
                        {ing.defaultUnit?.symbol}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{ing.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('masterdata.setting_key')}</TableHead>
                    <TableHead>คำอธิบาย</TableHead>
                    <TableHead>{t('masterdata.setting_value')}</TableHead>
                    <TableHead className="w-24 text-right">แก้ไข</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.map((s: any) => (
                    <TableRow key={s.key}>
                      <TableCell className="font-mono text-xs font-bold text-slate-800">
                        {s.key}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {i18n.language === 'th' ? s.descriptionTh : s.descriptionEn}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-orange-600">
                        {JSON.stringify(s.value)}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasPermission('settings.write') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSetting(s);
                              setSettingValue(
                                typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value),
                              );
                            }}
                            className="text-xs text-orange-600"
                          >
                            แก้ไข
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Setting Dialog */}
      {editingSetting && (
        <Dialog open={Boolean(editingSetting)} onOpenChange={() => setEditingSetting(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>แก้ไขการตั้งค่า: {editingSetting.key}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="set-val">ค่าการตั้งค่า ({editingSetting.valueType})</Label>
              <Input
                id="set-val"
                value={settingValue}
                onChange={(e) => setSettingValue(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSetting(null)}>
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
    </div>
  );
}
