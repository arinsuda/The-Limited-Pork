import * as React from 'react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { getApiBaseUrl, setCustomApiBaseUrl } from '@/shared/config/env';

export const ServerConfigSection = React.memo(function ServerConfigSection() {
  const { t } = useTranslation();
  const [showConfig, setShowConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = useCallback(() => {
    setCustomApiBaseUrl(serverUrl);
    setServerUrl(getApiBaseUrl());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  }, [serverUrl]);

  const handleReset = useCallback(() => {
    setCustomApiBaseUrl(null);
    setServerUrl(getApiBaseUrl());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  }, []);

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col items-center">
      <button
        type="button"
        onClick={() => setShowConfig((prev) => !prev)}
        className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors cursor-pointer touch-target"
      >
        <Settings className="h-3 w-3" />
        <span>{t('auth.server_settings')}</span>
      </button>

      {showConfig && (
        <div className="w-full mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-2 animate-fade-in">
          <Label htmlFor="server-url-input" className="text-[11px] font-medium text-slate-600">
            {t('auth.server_url_label')}
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="server-url-input"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://the-limited-pork.onrender.com/api/v1"
              className="text-xs h-9 bg-white flex-1"
            />
            <div className="flex gap-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 text-xs font-medium cursor-pointer"
                onClick={handleSave}
              >
                {saveSuccess ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                    {t('auth.server_saved')}
                  </>
                ) : (
                  t('auth.save_server')
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 text-xs font-medium cursor-pointer text-slate-600 hover:text-slate-900"
                onClick={handleReset}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                {t('auth.reset_server')}
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            {t('auth.server_help')}
          </p>
        </div>
      )}
    </div>
  );
});
