import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ActionModal } from '@/components/ui/ActionModal';
import { AnexoCard } from '@/components/AnexoCard';
import { MultiFileUpload, type UploadedFile } from '@/components/FileUpload';
import { SupplierSearch } from '@/components/SupplierSearch';
import {
  NATUREZA_ORCAMENTARIA_LABELS,
  ANEXO_LABELS,
  type NaturezaOrcamentaria,
  type Solicitacao,
  type Fornecedor,
  type DocumentoEmitido,
} from '@/types';
import {
  Loader2, FileText, Edit, Send, AlertTriangle, XCircle, Download,
  FileCheck, CheckCircle, MessageSquare, RotateCcw, Receipt, Upload,
  Building2, Trash2, Calendar as CalendarIcon, Package, Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SolicitacaoComFornecedor, RejectionInfo, InfoRequest } from './types';

// ==================== Edit Modal ====================

interface EditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSolicitacao: Solicitacao | null;
  editDescricao: string;
  setEditDescricao: (v: string) => void;
  editValor: string;
  setEditValor: (v: string) => void;
  editNaturezaOrcamentaria: NaturezaOrcamentaria | '';
  setEditNaturezaOrcamentaria: (v: NaturezaOrcamentaria) => void;
  editEscopoDetalhado: string;
  setEditEscopoDetalhado: (v: string) => void;
  editAnexos: Record<string, UploadedFile | null>;
  setEditAnexos: (v: Record<string, UploadedFile | null>) => void;
  existingAnexos: Array<{ id: string; tipo: string; nome_arquivo: string; storage_path: string }>;
  anexosParaExcluir: string[];
  setAnexosParaExcluir: React.Dispatch<React.SetStateAction<string[]>>;
  editMensagemCorrecao: string;
  setEditMensagemCorrecao: (v: string) => void;
  submitting: boolean;
  handleResubmit: () => void;
  formatCurrencyInput: (value: string) => string;
  getRequiredAttachments: (sol: Solicitacao) => Array<{ tipo: string; label: string; required: boolean }>;
  rejectionReasons: Record<string, RejectionInfo>;
  infoRequests: Record<string, InfoRequest>;
  // Supplier swap
  trocarFornecedor: boolean;
  setTrocarFornecedor: (v: boolean) => void;
  novoFornecedorEscolhido: 'concorrente1' | 'concorrente2' | 'novo' | null;
  setNovoFornecedorEscolhido: (v: 'concorrente1' | 'concorrente2' | 'novo' | null) => void;
  novoFornecedorBuscado: Fornecedor | null;
  setNovoFornecedorBuscado: (v: Fornecedor | null) => void;
  fornecedoresInfo: {
    principal: { id: string; cnpj: string; razao_social: string | null } | null;
    concorrente1: { id: string; cnpj: string; razao_social: string | null } | null;
    concorrente2: { id: string; cnpj: string; razao_social: string | null } | null;
  };
}

function EditModal(props: EditModalProps) {
  const {
    open, onOpenChange, editingSolicitacao, editDescricao, setEditDescricao,
    editValor, setEditValor, editNaturezaOrcamentaria, setEditNaturezaOrcamentaria,
    editEscopoDetalhado, setEditEscopoDetalhado, editAnexos, setEditAnexos,
    existingAnexos, anexosParaExcluir, setAnexosParaExcluir,
    editMensagemCorrecao, setEditMensagemCorrecao, submitting, handleResubmit,
    formatCurrencyInput, getRequiredAttachments, rejectionReasons, infoRequests,
    trocarFornecedor, setTrocarFornecedor, novoFornecedorEscolhido, setNovoFornecedorEscolhido,
    novoFornecedorBuscado, setNovoFornecedorBuscado, fornecedoresInfo,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingSolicitacao?.status === 'aguardando_informacoes'
              ? 'Responder Solicitação de Informações'
              : 'Corrigir e Reenviar Solicitação'
            }
          </DialogTitle>
        </DialogHeader>

        {editingSolicitacao && (
          <div className="space-y-4 py-2">
            {/* Correction reason */}
            {editingSolicitacao.status === 'pendente_correcao' && rejectionReasons[editingSolicitacao.id]?.motivo && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="font-medium text-warning flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Motivo da correção:
                </p>
                <p className="text-sm mt-1">{rejectionReasons[editingSolicitacao.id].motivo}</p>
              </div>
            )}

            {editingSolicitacao.status === 'aguardando_informacoes' && infoRequests[editingSolicitacao.id]?.motivo && (
              <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
                <p className="font-medium text-info flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Informações solicitadas:
                </p>
                <p className="text-sm mt-1">{infoRequests[editingSolicitacao.id].motivo}</p>
              </div>
            )}

            <div>
              <Label>Descrição</Label>
              <Textarea value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} rows={4} />
            </div>

            <div>
              <Label>Valor (R$)</Label>
              <Input
                value={editValor ? formatCurrencyInput(editValor) : ''}
                onChange={(e) => setEditValor(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div>
              <Label>Natureza Orçamentária</Label>
              <Select value={editNaturezaOrcamentaria} onValueChange={(v) => setEditNaturezaOrcamentaria(v as NaturezaOrcamentaria)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NATUREZA_ORCAMENTARIA_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Escopo Detalhado for non-OC instruments */}
            {(editingSolicitacao as any)?.instrumento_juridico &&
             (editingSolicitacao as any).instrumento_juridico !== 'oc' && (
              <div className="space-y-2">
                <Label>Escopo Detalhado para Minuta</Label>
                <Textarea
                  value={editEscopoDetalhado}
                  onChange={(e) => setEditEscopoDetalhado(e.target.value)}
                  placeholder="Descreva as etapas do serviço, prazos esperados, materiais envolvidos..."
                  rows={5}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className={editEscopoDetalhado.length >= 100 ? 'text-green-600' : 'text-muted-foreground'}>
                    {editEscopoDetalhado.length}/100 caracteres mínimos
                  </span>
                  {editEscopoDetalhado.length < 100 && editEscopoDetalhado.length > 0 && (
                    <span className="text-amber-600">Faltam {100 - editEscopoDetalhado.length} caracteres</span>
                  )}
                </div>
              </div>
            )}

            {/* Supplier swap */}
            {(fornecedoresInfo.concorrente1 || fornecedoresInfo.concorrente2) && fornecedoresInfo.principal && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Fornecedor Atual
                  </Label>
                </div>
                <div className="p-3 bg-background rounded-md border">
                  <p className="font-medium">{fornecedoresInfo.principal.razao_social || 'Sem razão social'}</p>
                  <p className="text-sm text-muted-foreground">
                    CNPJ: {fornecedoresInfo.principal.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="trocarFornecedor"
                    checked={trocarFornecedor}
                    onCheckedChange={(checked) => {
                      setTrocarFornecedor(!!checked);
                      if (!checked) setNovoFornecedorEscolhido(null);
                    }}
                  />
                  <Label htmlFor="trocarFornecedor" className="text-sm cursor-pointer">
                    Desejo trocar o fornecedor escolhido
                  </Label>
                </div>

                {trocarFornecedor && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-sm text-muted-foreground">Selecione o novo fornecedor:</Label>
                    <div className="space-y-2">
                      {fornecedoresInfo.concorrente1 && (
                        <SupplierOption
                          selected={novoFornecedorEscolhido === 'concorrente1'}
                          onClick={() => setNovoFornecedorEscolhido('concorrente1')}
                          razaoSocial={fornecedoresInfo.concorrente1.razao_social}
                          cnpj={fornecedoresInfo.concorrente1.cnpj}
                          badge="Concorrente 1"
                        />
                      )}
                      {fornecedoresInfo.concorrente2 && (
                        <SupplierOption
                          selected={novoFornecedorEscolhido === 'concorrente2'}
                          onClick={() => setNovoFornecedorEscolhido('concorrente2')}
                          razaoSocial={fornecedoresInfo.concorrente2.razao_social}
                          cnpj={fornecedoresInfo.concorrente2.cnpj}
                          badge="Concorrente 2"
                        />
                      )}
                      <SupplierOption
                        selected={novoFornecedorEscolhido === 'novo'}
                        onClick={() => setNovoFornecedorEscolhido('novo')}
                        razaoSocial="Buscar outro fornecedor"
                        cnpj=""
                        badge="Novo"
                        subtitle="Pesquisar por CNPJ ou razão social"
                      />
                    </div>

                    {novoFornecedorEscolhido === 'novo' && (
                      <div className="mt-3">
                        <SupplierSearch label="Novo fornecedor" required value={novoFornecedorBuscado} onChange={setNovoFornecedorBuscado} compact />
                      </div>
                    )}

                    {novoFornecedorEscolhido && novoFornecedorEscolhido !== 'novo' && (
                      <p className="text-xs text-muted-foreground mt-2">ℹ️ O fornecedor atual será movido para a posição de concorrente</p>
                    )}
                    {novoFornecedorEscolhido === 'novo' && novoFornecedorBuscado && (
                      <p className="text-xs text-muted-foreground mt-2">ℹ️ O fornecedor atual será movido para a posição de concorrente (se houver vaga)</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Existing attachments */}
            {existingAnexos.length > 0 && (
              <div className="space-y-2">
                <Label>Anexos já enviados</Label>
                <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded px-3 py-1.5">
                  💡 Clique em <strong>Excluir</strong> para remover anexos incorretos e adicione novos abaixo.
                </p>
                <div className="space-y-2">
                  {(() => {
                    const anexosProblema = editingSolicitacao.status === 'aguardando_informacoes'
                      ? infoRequests[editingSolicitacao.id]?.anexos_com_problema || []
                      : rejectionReasons[editingSolicitacao.id]?.anexos_com_problema || [];

                    return existingAnexos.map((anexo) => {
                      const hasProblema = anexosProblema.includes(anexo.tipo);
                      const markedForDeletion = anexosParaExcluir.includes(anexo.id);

                      return (
                        <div
                          key={anexo.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded transition-all",
                            markedForDeletion
                              ? "bg-destructive/5 border border-destructive/20 opacity-60"
                              : hasProblema
                                ? "bg-destructive/10 border border-destructive/30"
                                : "bg-muted"
                          )}
                        >
                          {markedForDeletion ? (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          ) : hasProblema ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <FileCheck className="h-4 w-4 text-success" />
                          )}
                          <span className={cn("text-sm flex-1", markedForDeletion && "line-through text-muted-foreground")}>
                            {anexo.nome_arquivo}
                          </span>
                          <Badge
                            variant={markedForDeletion ? "secondary" : hasProblema ? "destructive" : "outline"}
                            className="text-xs"
                          >
                            {markedForDeletion
                              ? 'SERÁ EXCLUÍDO'
                              : hasProblema
                                ? `${ANEXO_LABELS[anexo.tipo] || anexo.tipo} - CORREÇÃO`
                                : (ANEXO_LABELS[anexo.tipo] || anexo.tipo)}
                          </Badge>

                          {markedForDeletion ? (
                            <Button
                              type="button" variant="ghost" size="sm"
                              onClick={() => setAnexosParaExcluir(prev => prev.filter(id => id !== anexo.id))}
                              className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Restaurar
                            </Button>
                          ) : (
                            <Button
                              type="button" variant="destructive" size="sm"
                              onClick={() => setAnexosParaExcluir(prev => [...prev, anexo.id])}
                              className="h-7 px-2"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Excluir
                            </Button>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const anexosProblema = editingSolicitacao.status === 'aguardando_informacoes'
                      ? infoRequests[editingSolicitacao.id]?.anexos_com_problema || []
                      : rejectionReasons[editingSolicitacao.id]?.anexos_com_problema || [];
                    if (anexosParaExcluir.length > 0) {
                      return `${anexosParaExcluir.length} anexo(s) marcado(s) para exclusão. Adicione novos anexos se necessário.`;
                    }
                    return anexosProblema.length > 0
                      ? 'Substitua os anexos sinalizados com problema. Clique em "Excluir" para remover.'
                      : 'Clique em "Excluir" para remover anexos que precisam ser substituídos.';
                  })()}
                </p>
              </div>
            )}

            <div>
              <Label className="mb-2 block">Adicionar Novos Anexos (opcional)</Label>
              <p className="text-sm text-muted-foreground mb-4">Anexe novos documentos se necessário</p>
              <MultiFileUpload
                requirements={getRequiredAttachments(editingSolicitacao)}
                files={editAnexos}
                onFilesChange={setEditAnexos}
              />
            </div>
          </div>
        )}

        {editingSolicitacao?.status && ['pendente_correcao', 'aguardando_informacoes'].includes(editingSolicitacao.status) && (
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="mensagem-correcao" className="text-sm font-medium">
              O que foi corrigido? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="mensagem-correcao"
              placeholder="Descreva as correções realizadas..."
              value={editMensagemCorrecao}
              onChange={(e) => setEditMensagemCorrecao(e.target.value)}
              className="min-h-[80px]"
            />
            {!editMensagemCorrecao.trim() && (
              <p className="text-xs text-destructive">É obrigatório descrever o que foi corrigido antes de reenviar.</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleResubmit}
            disabled={submitting || (editingSolicitacao?.status && ['pendente_correcao', 'aguardando_informacoes'].includes(editingSolicitacao.status) && !editMensagemCorrecao.trim())}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Reenviar Solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Supplier Option Helper ====================

function SupplierOption({ selected, onClick, razaoSocial, cnpj, badge, subtitle }: {
  selected: boolean;
  onClick: () => void;
  razaoSocial: string | null;
  cnpj: string;
  badge: string;
  subtitle?: string;
}) {
  return (
    <div
      className={cn(
        "p-3 rounded-md border cursor-pointer transition-colors",
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
          selected ? "border-primary" : "border-muted-foreground"
        )}>
          {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">{razaoSocial || 'Sem razão social'}</p>
          {cnpj && (
            <p className="text-xs text-muted-foreground">
              CNPJ: {cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
            </p>
          )}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <Badge variant="outline" className="text-xs">{badge}</Badge>
      </div>
    </div>
  );
}

// ==================== Aceite OC Modal ====================

interface AceiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aceiteSolicitacao: SolicitacaoComFornecedor | null;
  aceiteStep: 'revisar' | 'decidir' | 'tipo_entrega' | 'confirmar';
  setAceiteStep: (v: 'revisar' | 'decidir' | 'tipo_entrega' | 'confirmar') => void;
  showAjusteField: boolean;
  setShowAjusteField: (v: boolean) => void;
  aceiteAjuste: string;
  setAceiteAjuste: (v: string) => void;
  aceiteLoading: boolean;
  fornecedorEmailContato: string;
  setFornecedorEmailContato: (v: string) => void;
  fornecedorTelefoneContato: string;
  setFornecedorTelefoneContato: (v: string) => void;
  tipoEntrega: 'produto' | 'servico' | null;
  setTipoEntrega: (v: 'produto' | 'servico' | null) => void;
  dataExecucaoServico: string;
  setDataExecucaoServico: (v: string) => void;
  evidenciaFile: File | null;
  setEvidenciaFile: (v: File | null) => void;
  handleAceitarOC: () => void;
  handleSolicitarAjuste: () => void;
  openOCInNewTab: (doc: DocumentoEmitido) => void;
  downloadDocumentoEmitido: (doc: DocumentoEmitido) => void;
}

function AceiteModal(props: AceiteModalProps) {
  const {
    open, onOpenChange, aceiteSolicitacao, aceiteStep, setAceiteStep,
    showAjusteField, setShowAjusteField, aceiteAjuste, setAceiteAjuste,
    aceiteLoading, fornecedorEmailContato, setFornecedorEmailContato,
    fornecedorTelefoneContato, setFornecedorTelefoneContato,
    tipoEntrega, setTipoEntrega, dataExecucaoServico, setDataExecucaoServico,
    evidenciaFile, setEvidenciaFile,
    handleAceitarOC, handleSolicitarAjuste, openOCInNewTab, downloadDocumentoEmitido,
  } = props;

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) { setAceiteStep('revisar'); setShowAjusteField(false); }
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-success" />
            {aceiteStep === 'revisar' ? 'Revisar OC' : aceiteStep === 'decidir' ? 'Liberar para Fornecedor' : aceiteStep === 'tipo_entrega' ? 'Tipo de Entrega' : 'Confirmar Liberação'} - #{aceiteSolicitacao?.protocolo}
          </DialogTitle>
        </DialogHeader>

        {aceiteSolicitacao?.documentosEmitidos && aceiteSolicitacao.documentosEmitidos.length > 0 && (
          <div className="space-y-4 py-2">
            {aceiteStep === 'revisar' && (
              <>
                <div className="text-sm text-muted-foreground mb-2">
                  <p>Valor: <span className="font-medium text-foreground">
                    {aceiteSolicitacao.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span></p>
                  {aceiteSolicitacao.fornecedor && (
                    <p>Fornecedor: <span className="font-medium text-foreground">
                      {(aceiteSolicitacao.fornecedor as any).nome_fantasia || aceiteSolicitacao.fornecedor.razao_social}
                    </span></p>
                  )}
                </div>

                {aceiteSolicitacao.documentosEmitidos.map((doc: DocumentoEmitido) => (
                  <div key={doc.id} className="p-4 bg-success/10 border border-success/20 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-success" />
                        <span className="font-medium text-success">{doc.tipo_documento} #{doc.numero_documento}</span>
                      </div>
                    </div>
                    {doc.observacao && (
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium text-foreground">Observação do Backoffice:</span> {doc.observacao}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="default" onClick={() => openOCInNewTab(doc)}>
                        <FileText className="h-4 w-4 mr-1" /> Visualizar OC
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => downloadDocumentoEmitido(doc)}>
                        <Download className="h-4 w-4 mr-1" /> Baixar OC
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="bg-muted/50 p-3 rounded-lg border">
                  <p className="text-sm text-muted-foreground">
                    <strong>Importante:</strong> Revise a OC com atenção antes de prosseguir. Verifique se os dados, valores e condições estão corretos.
                  </p>
                </div>
              </>
            )}

            {aceiteStep === 'decidir' && (
              <>
                <div className="grid gap-4">
                  <div
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all",
                      !showAjusteField ? "border-success bg-success/5" : "border-muted hover:border-success/50"
                    )}
                    onClick={() => setShowAjusteField(false)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", !showAjusteField ? "border-success bg-success" : "border-muted")}>
                        {!showAjusteField && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <div>
                        <p className="font-medium text-success">Liberar para o Fornecedor</p>
                        <p className="text-sm text-muted-foreground">Autorizo o envio formal desta OC ao fornecedor</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all",
                      showAjusteField ? "border-warning bg-warning/5" : "border-muted hover:border-warning/50"
                    )}
                    onClick={() => setShowAjusteField(true)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", showAjusteField ? "border-warning bg-warning" : "border-muted")}>
                        {showAjusteField && <RotateCcw className="h-3 w-3 text-white" />}
                      </div>
                      <div>
                        <p className="font-medium text-warning">Solicitar Revisão</p>
                        <p className="text-sm text-muted-foreground">A OC precisa de correções antes do envio</p>
                      </div>
                    </div>
                  </div>
                </div>

                {showAjusteField && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <Label>Descreva o ajuste necessário *</Label>
                    <Textarea
                      placeholder="Informe o que precisa ser ajustado na OC..."
                      value={aceiteAjuste}
                      onChange={(e) => setAceiteAjuste(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </>
            )}

            {aceiteStep === 'tipo_entrega' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Selecione o tipo de entrega para definir o fluxo correto:</p>
                <div className="grid gap-4">
                  <div
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all",
                      tipoEntrega === 'produto' ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                    )}
                    onClick={() => setTipoEntrega('produto')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", tipoEntrega === 'produto' ? "border-primary bg-primary" : "border-muted")}>
                        {tipoEntrega === 'produto' && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Produto / Material</p>
                          <p className="text-sm text-muted-foreground">O fornecedor precisa da OC <strong>antes</strong> da entrega</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all",
                      tipoEntrega === 'servico' ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10" : "border-muted hover:border-amber-500/50"
                    )}
                    onClick={() => setTipoEntrega('servico')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", tipoEntrega === 'servico' ? "border-amber-500 bg-amber-500" : "border-muted")}>
                        {tipoEntrega === 'servico' && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-amber-600" />
                        <div>
                          <p className="font-medium">Serviço</p>
                          <p className="text-sm text-muted-foreground">O serviço será executado <strong>antes</strong> do envio da OC</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {tipoEntrega === 'servico' && (
                  <div className="space-y-3 animate-in slide-in-from-top-2 duration-200 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Evidência do Serviço Executado
                    </p>
                    <div>
                      <Label htmlFor="data_execucao" className="text-sm">Data da execução do serviço *</Label>
                      <Input
                        id="data_execucao"
                        type="date"
                        value={dataExecucaoServico}
                        onChange={(e) => setDataExecucaoServico(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Evidência (foto/documento) *</Label>
                      <div className="mt-1">
                        {evidenciaFile ? (
                          <div className="flex items-center gap-2 p-2 bg-background rounded border">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate flex-1">{evidenciaFile.name}</span>
                            <Button variant="ghost" size="sm" onClick={() => setEvidenciaFile(null)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                            <Upload className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Clique para anexar evidência</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf,.doc,.docx"
                              onChange={(e) => setEvidenciaFile(e.target.files?.[0] || null)}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {aceiteStep === 'confirmar' && (
              <div className="space-y-4">
                <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-sm font-medium text-success flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Confirmação de Liberação
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tipoEntrega === 'servico' 
                      ? 'Ao confirmar, o Backoffice verificará a evidência e enviará a OC ao fornecedor.'
                      : 'Ao confirmar, o Backoffice poderá enviar formalmente a OC ao fornecedor.'}
                  </p>
                </div>

                {tipoEntrega && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-sm flex items-center gap-2">
                      {tipoEntrega === 'produto' ? <Package className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                      <span className="font-medium">
                        {tipoEntrega === 'produto' ? 'Produto/Material' : 'Serviço'}
                      </span>
                      {tipoEntrega === 'servico' && dataExecucaoServico && (
                        <span className="text-muted-foreground">— Executado em {dataExecucaoServico}</span>
                      )}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Dados de contato do fornecedor (opcional)</Label>
                  <div className="grid gap-3">
                    <div>
                      <Label htmlFor="fornecedor_email" className="text-sm text-muted-foreground">E-mail</Label>
                      <Input id="fornecedor_email" type="email" placeholder="fornecedor@empresa.com"
                        value={fornecedorEmailContato} onChange={(e) => setFornecedorEmailContato(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="fornecedor_telefone" className="text-sm text-muted-foreground">Telefone</Label>
                      <Input id="fornecedor_telefone" type="tel" placeholder="(XX) XXXXX-XXXX"
                        value={fornecedorTelefoneContato} onChange={(e) => setFornecedorTelefoneContato(e.target.value)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                    <AlertTriangle className="h-3 w-3" />
                    Confira se os dados estão corretos para envio da OC
                  </p>
                </div>

                <div className="bg-warning/10 border border-warning/20 p-3 rounded-lg">
                  <p className="text-sm text-warning font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Esta ação não pode ser desfeita
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {aceiteStep === 'revisar' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
              <Button onClick={() => setAceiteStep('decidir')}>Liberar para Fornecedor</Button>
            </>
          )}
          {aceiteStep === 'decidir' && (
            <>
              <Button variant="outline" onClick={() => setAceiteStep('revisar')} disabled={aceiteLoading}>Voltar</Button>
              {showAjusteField ? (
                <Button variant="default" className="bg-warning hover:bg-warning/90 text-warning-foreground"
                  onClick={handleSolicitarAjuste} disabled={aceiteLoading || !aceiteAjuste.trim()}>
                  {aceiteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                  Solicitar Ajuste
                </Button>
              ) : (
                <Button className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => setAceiteStep('tipo_entrega')}>
                  <Send className="h-4 w-4 mr-2" />
                  Liberar para Fornecedor
                </Button>
              )}
            </>
          )}
          {aceiteStep === 'tipo_entrega' && (
            <>
              <Button variant="outline" onClick={() => setAceiteStep('decidir')} disabled={aceiteLoading}>Voltar</Button>
              <Button 
                className="bg-success hover:bg-success/90 text-success-foreground" 
                onClick={() => setAceiteStep('confirmar')}
                disabled={!tipoEntrega || (tipoEntrega === 'servico' && (!dataExecucaoServico || !evidenciaFile))}
              >
                <Send className="h-4 w-4 mr-2" />
                Continuar
              </Button>
            </>
          )}
          {aceiteStep === 'confirmar' && (
            <>
              <Button variant="outline" onClick={() => setAceiteStep('tipo_entrega')} disabled={aceiteLoading}>Voltar</Button>
              <Button className="bg-success hover:bg-success/90 text-success-foreground" onClick={handleAceitarOC} disabled={aceiteLoading}>
                {aceiteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Confirmar Liberação
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== NF/Boleto Modal ====================

interface NfBoletoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nfBoletoSolicitacao: SolicitacaoComFornecedor | null;
  nfBoletoLoading: boolean;
  handleEnviarNfBoleto: () => void;
  nfFile: File | null;
  setNfFile: (f: File | null) => void;
  boletoFile: File | null;
  setBoletoFile: (f: File | null) => void;
  dataEmissaoNF: string;
  setDataEmissaoNF: (v: string) => void;
  dataVencimentoBoleto: string;
  setDataVencimentoBoleto: (v: string) => void;
  pagamentoAntecipado: boolean;
  setPagamentoAntecipado: (v: boolean) => void;
  justificativaAntecipado: string;
  setJustificativaAntecipado: (v: string) => void;
}

function NfBoletoModal(props: NfBoletoModalProps) {
  const {
    open, onOpenChange, nfBoletoSolicitacao, nfBoletoLoading, handleEnviarNfBoleto,
    nfFile, setNfFile, boletoFile, setBoletoFile, dataEmissaoNF, setDataEmissaoNF,
    dataVencimentoBoleto, setDataVencimentoBoleto, pagamentoAntecipado, setPagamentoAntecipado,
    justificativaAntecipado, setJustificativaAntecipado,
  } = props;

  return (
    <ActionModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Incluir NF e Boleto - #${nfBoletoSolicitacao?.protocolo}`}
      icon={Receipt}
      variant="form"
      loading={nfBoletoLoading}
      onConfirm={handleEnviarNfBoleto}
      confirmText="Enviar Documentos"
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
          <Checkbox id="pagamento_antecipado" checked={pagamentoAntecipado}
            onCheckedChange={(checked) => setPagamentoAntecipado(checked === true)} />
          <Label htmlFor="pagamento_antecipado" className="text-sm cursor-pointer">Pagamento antecipado (adiantamento)</Label>
        </div>

        {pagamentoAntecipado && (
          <div className="space-y-2">
            <Label>Justificativa do pagamento antecipado</Label>
            <Textarea placeholder="Explique o motivo do pagamento antecipado..." value={justificativaAntecipado}
              onChange={(e) => setJustificativaAntecipado(e.target.value)} rows={2} />
          </div>
        )}

        {!pagamentoAntecipado && (
          <div className="space-y-2">
            <Label>Nota Fiscal (PDF/XML) *</Label>
            <Input type="file" accept=".pdf,.xml" onChange={(e) => setNfFile(e.target.files?.[0] || null)} />
            <div className="space-y-2">
              <Label>Data de emissão da NF</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dataEmissaoNF && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataEmissaoNF ? format(parseISO(dataEmissaoNF), 'dd/MM/yyyy') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataEmissaoNF ? parseISO(dataEmissaoNF) : undefined}
                    onSelect={(date) => setDataEmissaoNF(date ? format(date, 'yyyy-MM-dd') : '')}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Boleto (PDF) *</Label>
          <Input type="file" accept=".pdf" onChange={(e) => setBoletoFile(e.target.files?.[0] || null)} />
          <div className="space-y-2">
            <Label>Data de vencimento do boleto *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dataVencimentoBoleto && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataVencimentoBoleto ? format(parseISO(dataVencimentoBoleto), 'dd/MM/yyyy') : 'Selecionar'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataVencimentoBoleto ? parseISO(dataVencimentoBoleto) : undefined}
                  onSelect={(date) => setDataVencimentoBoleto(date ? format(date, 'yyyy-MM-dd') : '')}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </ActionModal>
  );
}

// ==================== Cancel Modal ====================

interface CancelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cancelSolicitacao: Solicitacao | null;
  cancelLoading: boolean;
  handleCancelar: () => void;
  motivoCancelamento: string;
  setMotivoCancelamento: (v: string) => void;
  isPostOCStatus: (status: string) => boolean;
}

function CancelModal(props: CancelModalProps) {
  const { open, onOpenChange, cancelSolicitacao, cancelLoading, handleCancelar,
    motivoCancelamento, setMotivoCancelamento, isPostOCStatus } = props;

  return (
    <ActionModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Cancelar Solicitação #${cancelSolicitacao?.protocolo}`}
      icon={XCircle}
      variant="destructive"
      loading={cancelLoading}
      onConfirm={handleCancelar}
      confirmText={cancelSolicitacao && isPostOCStatus(cancelSolicitacao.status) ? 'Solicitar Cancelamento' : 'Confirmar Cancelamento'}
    >
      <div className="space-y-4">
        {cancelSolicitacao && isPostOCStatus(cancelSolicitacao.status) ? (
          <>
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
              <p className="text-sm font-medium text-warning">⚠️ Esta solicitação já possui OC emitida</p>
              <p className="text-xs text-muted-foreground mt-1">
                O cancelamento será enviado para aprovação do Backoffice antes de ser efetivado.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Motivo do cancelamento (obrigatório)</Label>
              <Textarea placeholder="Informe o motivo do cancelamento..." value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)} rows={3} />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Tem certeza que deseja cancelar esta solicitação? Esta ação não pode ser desfeita.</p>
            <div className="space-y-2">
              <Label>Motivo do cancelamento (opcional)</Label>
              <Textarea placeholder="Informe o motivo do cancelamento..." value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)} rows={3} />
            </div>
          </>
        )}
      </div>
    </ActionModal>
  );
}

// ==================== Anexos View Modal ====================

interface AnexosViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacao: SolicitacaoComFornecedor | null;
  anexosExpanded: Record<string, Array<{ id: string; tipo: string; nome_arquivo: string; storage_path: string; mime_type: string | null; tamanho_bytes: number | null }>>;
}

function AnexosViewModal({ open, onOpenChange, solicitacao, anexosExpanded }: AnexosViewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Anexos - #{solicitacao?.protocolo}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {solicitacao && anexosExpanded[solicitacao.id] ? (
            anexosExpanded[solicitacao.id].length > 0 ? (
              anexosExpanded[solicitacao.id].map((anexo) => (
                <AnexoCard key={anexo.id} anexo={anexo} showTipo />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum anexo encontrado</p>
            )
          ) : (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Exported Composite ====================

export interface SolicitanteModalsProps {
  // Edit modal
  editOpen: boolean;
  setEditOpen: (open: boolean) => void;
  editModalProps: Omit<EditModalProps, 'open' | 'onOpenChange'>;
  // Aceite modal
  aceiteOpen: boolean;
  setAceiteOpen: (open: boolean) => void;
  aceiteModalProps: Omit<AceiteModalProps, 'open' | 'onOpenChange'>;
  // NF/Boleto modal
  nfBoletoOpen: boolean;
  setNfBoletoOpen: (open: boolean) => void;
  nfBoletoModalProps: Omit<NfBoletoModalProps, 'open' | 'onOpenChange'>;
  // Cancel modal
  cancelOpen: boolean;
  setCancelOpen: (open: boolean) => void;
  cancelModalProps: Omit<CancelModalProps, 'open' | 'onOpenChange'>;
  // Anexos view
  anexosViewOpen: boolean;
  setAnexosViewOpen: (open: boolean) => void;
  anexosViewSolicitacao: SolicitacaoComFornecedor | null;
  anexosExpanded: Record<string, Array<{ id: string; tipo: string; nome_arquivo: string; storage_path: string; mime_type: string | null; tamanho_bytes: number | null }>>;
}

export function SolicitanteModals(props: SolicitanteModalsProps) {
  return (
    <>
      <EditModal open={props.editOpen} onOpenChange={props.setEditOpen} {...props.editModalProps} />
      <AceiteModal open={props.aceiteOpen} onOpenChange={props.setAceiteOpen} {...props.aceiteModalProps} />
      <NfBoletoModal open={props.nfBoletoOpen} onOpenChange={props.setNfBoletoOpen} {...props.nfBoletoModalProps} />
      <CancelModal open={props.cancelOpen} onOpenChange={props.setCancelOpen} {...props.cancelModalProps} />
      <AnexosViewModal
        open={props.anexosViewOpen}
        onOpenChange={props.setAnexosViewOpen}
        solicitacao={props.anexosViewSolicitacao}
        anexosExpanded={props.anexosExpanded}
      />
    </>
  );
}
