import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ACCESS_PRESETS,
  APP_DEFINITIONS,
  APP_ROLE_LABELS,
  type AppAccessMap,
  type AppKey,
  type AppRoleLevel,
} from '@/lib/app-access';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName: string;
  access: AppAccessMap;
  onSaved: (userId: string, access: AppAccessMap) => void;
}

export function AppAccessDialog({ open, onOpenChange, userId, userName, access, onSaved }: Props) {
  const [draft, setDraft] = useState<AppAccessMap>(access);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft(access);
  }, [open, access]);

  const toggleApp = (app: AppKey, ativo: boolean) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (ativo) {
        next[app] = APP_DEFINITIONS.find((a) => a.key === app)!.papelPadrao;
      } else {
        delete next[app];
      }
      return next;
    });
  };

  const setPapel = (app: AppKey, papel: AppRoleLevel) =>
    setDraft((prev) => ({ ...prev, [app]: papel }));

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const rows = (Object.keys(draft) as AppKey[]).map((app) => ({
        user_id: userId,
        app,
        papel: draft[app]!,
      }));
      const { error: delError } = await supabase
        .from('user_app_access')
        .delete()
        .eq('user_id', userId);
      if (delError) throw delError;

      if (rows.length > 0) {
        const { error } = await supabase.from('user_app_access').insert(rows);
        if (error) throw error;
      }

      onSaved(userId, draft);
      toast.success('Acessos atualizados');
      onOpenChange(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Não foi possível salvar os acessos';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Acessos aos aplicativos</DialogTitle>
          <DialogDescription>
            Defina quais apps do Hub {userName} enxerga e o papel dele dentro de cada um.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Perfis rápidos</p>
          <div className="flex flex-wrap gap-2">
            {ACCESS_PRESETS.map((preset) => (
              <Button
                key={preset.key}
                type="button"
                variant="outline"
                size="sm"
                title={preset.description}
                onClick={() => setDraft(preset.access)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {APP_DEFINITIONS.map((app) => {
            const Icon = app.icon;
            const ativo = draft[app.key] !== undefined;
            return (
              <div key={app.key} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{app.name}</p>
                      <p className="text-sm text-muted-foreground">{app.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={ativo}
                    onCheckedChange={(v) => toggleApp(app.key, v)}
                    aria-label={`Liberar ${app.name}`}
                  />
                </div>

                {ativo && (
                  <div className="pl-8 space-y-1">
                    <Select
                      value={draft[app.key]}
                      onValueChange={(v) => setPapel(app.key, v as AppRoleLevel)}
                    >
                      <SelectTrigger className="w-full sm:w-72">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {app.papeis.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {app.papeis.find((p) => p.value === draft[app.key])?.description}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <span className="text-muted-foreground">Resumo: </span>
          {Object.keys(draft).length === 0 ? (
            <span>sem acesso a nenhum app do Hub.</span>
          ) : (
            <span className="inline-flex flex-wrap gap-1 align-middle">
              {(Object.keys(draft) as AppKey[]).map((app) => (
                <Badge key={app} variant="secondary">
                  {APP_DEFINITIONS.find((a) => a.key === app)?.name} · {APP_ROLE_LABELS[draft[app]!]}
                </Badge>
              ))}
            </span>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar acessos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
