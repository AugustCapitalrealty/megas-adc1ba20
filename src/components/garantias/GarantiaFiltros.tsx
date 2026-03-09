import React, { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Download, ArrowUpDown } from 'lucide-react';
import { formatBR } from '@/lib/date-utils';
import { EMPREENDIMENTO_LABELS, TIPO_GARANTIA_LABELS } from '@/types';
import type { Empreendimento } from '@/types';
import type { GarantiaItem, StatusFiltro, TipoFiltro, OrdemFiltro } from '@/hooks/useGarantiasVigentes';

const EMPREENDIMENTOS: Empreendimento[] = ['mega_curitiba', 'mega_itajai', 'mega_esteio'];

const fmtDate = (d: Date | string) => formatBR(d, 'dd/MM/yyyy');

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function exportGarantiasXLSX(garantias: GarantiaItem[]) {
  const rows = garantias.map(g => {
    const primeiraGarantia = g.garantias[0];
    const segundaGarantia = g.garantias[1];
    return {
      'Protocolo': g.protocolo,
      'Empreendimento': EMPREENDIMENTO_LABELS[g.empreendimento] || g.empreendimento,
      'Fornecedor': g.fornecedor_nome_fantasia || g.fornecedor_razao_social || '-',
      'CNPJ': g.fornecedor_cnpj || '-',
      'Tipo Garantia': TIPO_GARANTIA_LABELS[g.tipo_garantia] || g.tipo_garantia,
      'Dias Serviço': g.dias_garantia_servico ?? (g.tipo_garantia === 'servico' ? g.dias_garantia : '-') ?? '-',
      'Dias Produto': g.dias_garantia_produto ?? (g.tipo_garantia === 'produto' ? g.dias_garantia : '-') ?? '-',
      'Data Conclusão': fmtDate(g.data_conclusao),
      'Expira em (1ª garantia)': primeiraGarantia ? fmtDate(primeiraGarantia.dataExpiracao) : '-',
      'Dias Restantes (1ª)': primeiraGarantia ? primeiraGarantia.diasRestantes : '-',
      'Expira em (2ª garantia)': segundaGarantia ? fmtDate(segundaGarantia.dataExpiracao) : '-',
      'Dias Restantes (2ª)': segundaGarantia ? segundaGarantia.diasRestantes : '-',
      'Valor (R$)': BRL(g.valor),
      'Status Geral': g.statusGeral,
      'Infraspeak': g.infraspeak_registrada ? 'Sim' : 'Não',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String((r as any)[key] || '').length).slice(0, 50)) + 2,
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Garantias');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `garantias_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

interface GarantiaFiltrosProps {
  busca: string;
  setBusca: (v: string) => void;
  filtroEmpreendimento: string;
  setFiltroEmpreendimento: (v: string) => void;
  filtroTipo: TipoFiltro;
  setFiltroTipo: (v: TipoFiltro) => void;
  filtroStatus: StatusFiltro;
  setFiltroStatus: (v: StatusFiltro) => void;
  ordem: OrdemFiltro;
  setOrdem: (v: OrdemFiltro) => void;
  garantias: GarantiaItem[]; // filtered list for export
}

export const GarantiaFiltros = React.memo(function GarantiaFiltros({
  busca, setBusca,
  filtroEmpreendimento, setFiltroEmpreendimento,
  filtroTipo, setFiltroTipo,
  filtroStatus, setFiltroStatus,
  ordem, setOrdem,
  garantias,
}: GarantiaFiltrosProps) {
  const handleExport = useCallback(() => {
    exportGarantiasXLSX(garantias);
  }, [garantias]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Row 1: search + selects + export */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por protocolo, descrição ou fornecedor..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filtroEmpreendimento} onValueChange={setFiltroEmpreendimento}>
              <SelectTrigger>
                <SelectValue placeholder="Empreendimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os empreendimentos</SelectItem>
                {EMPREENDIMENTOS.map(e => (
                  <SelectItem key={e} value={e}>{EMPREENDIMENTO_LABELS[e]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroTipo} onValueChange={v => setFiltroTipo(v as TipoFiltro)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de garantia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="servico">Serviço</SelectItem>
                <SelectItem value="produto">Produto</SelectItem>
                <SelectItem value="ambos">Serviço + Produto</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroStatus} onValueChange={v => setFiltroStatus(v as StatusFiltro)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="vigente">Vigentes</SelectItem>
                <SelectItem value="expirando">Expirando &lt;30d</SelectItem>
                <SelectItem value="expirando_breve">Expirando 30–60d</SelectItem>
                <SelectItem value="expirada">Expiradas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: order + export */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={ordem} onValueChange={v => setOrdem(v as OrdemFiltro)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expiracao_asc">Expiração (mais próxima)</SelectItem>
                  <SelectItem value="expiracao_desc">Expiração (mais distante)</SelectItem>
                  <SelectItem value="valor_desc">Maior valor</SelectItem>
                  <SelectItem value="recente">Conclusão mais recente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleExport}
                disabled={garantias.length === 0}
              >
                <Download className="h-4 w-4" />
                Exportar XLSX ({garantias.length})
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
