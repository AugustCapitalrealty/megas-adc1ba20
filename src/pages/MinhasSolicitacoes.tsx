import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import { supabase } from '@/integrations/supabase/client';
import { 
  NATUREZA_ORCAMENTARIA_LABELS,
  ANEXO_LABELS,
  type Solicitacao,
  type NaturezaOrcamentaria,
  type Fornecedor,
  type DocumentoEmitido,
  type DocumentoFiscal,
} from '@/types';
import { Loader2, FileText, Edit, Send, AlertTriangle, Copy, XCircle, Download, FileCheck, CheckCircle, MessageSquare, RotateCcw, Receipt, Upload, User, Building2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { SolicitacaoTimeline } from '@/components/SolicitacaoTimeline';
import { FluigStatusCard } from '@/components/FluigStatusCard';
import { MultiFileUpload, type UploadedFile } from '@/components/FileUpload';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Design System Components
import { SolicitacaoCard, type SolicitacaoWithDetails } from '@/components/ui/SolicitacaoCard';
import { FilterBar, FilterBarSeparator, type TabGroup } from '@/components/ui/FilterBar';
import { ActionModal } from '@/components/ui/ActionModal';

const ATTACHMENT_TYPES = {
  chamado_preventiva: 'Chamado / Preventiva (Infraspeak)',
  escopo_detalhado: 'Escopo Detalhado',
  mapa_cotacao: 'Mapa de Cotação',
  orcamento_escolhido: 'Orçamento Escolhido',
  orcamento_concorrente_1: 'Orçamento Concorrente 1',
  orcamento_concorrente_2: 'Orçamento Concorrente 2',
} as const;

type FilterTab = 'todas' | 'com_backoffice' | 'correcoes' | 'oc_emitida' | 'aguardando_nf' | 'reprovadas' | 'concluidas';

interface SolicitacaoComFornecedor extends Solicitacao {
  fornecedor?: Fornecedor | null;
  documentoEmitido?: DocumentoEmitido | null;
  documentosFiscais?: DocumentoFiscal[];
  solicitante_nome?: string | null;
}

type ViewMode = 'minhas' | 'empreendimento';

interface RejectionInfo {
  solicitacao_id: string;
  motivo: string | null;
  created_at: string;
  anexos_com_problema?: string[] | null;
}

interface InfoRequest {
  solicitacao_id: string;
  motivo: string | null;
  created_at: string;
  anexos_com_problema?: string[] | null;
}

export default function MinhasSolicitacoes() {
  const { user, effectiveProfile, isImpersonating } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const effectiveUserId = (isImpersonating ? effectiveProfile?.id : user?.id) ?? user?.id;
  
  const { empreendimentos: userEmpreendimentos, hasAllAccess } = useUserEmpreendimentos(effectiveUserId);
  
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoComFornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('todas');
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, RejectionInfo>>({});
  const [infoRequests, setInfoRequests] = useState<Record<string, InfoRequest>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('minhas');
  
  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editingSolicitacao, setEditingSolicitacao] = useState<Solicitacao | null>(null);
  const [editDescricao, setEditDescricao] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editNaturezaOrcamentaria, setEditNaturezaOrcamentaria] = useState<NaturezaOrcamentaria | ''>('');
  const [editAnexos, setEditAnexos] = useState<Record<string, UploadedFile | null>>({});
  const [existingAnexos, setExistingAnexos] = useState<Array<{ id: string; tipo: string; nome_arquivo: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  // Aceite OC modal state
  const [aceiteOpen, setAceiteOpen] = useState(false);
  const [aceiteSolicitacao, setAceiteSolicitacao] = useState<SolicitacaoComFornecedor | null>(null);
  const [aceiteAjuste, setAceiteAjuste] = useState('');
  const [aceiteLoading, setAceiteLoading] = useState(false);

  // NF/Boleto modal state
  const [nfBoletoOpen, setNfBoletoOpen] = useState(false);
  const [nfBoletoSolicitacao, setNfBoletoSolicitacao] = useState<SolicitacaoComFornecedor | null>(null);
  const [nfFile, setNfFile] = useState<File | null>(null);
  const [boletoFile, setBoletoFile] = useState<File | null>(null);
  const [dataEmissaoNF, setDataEmissaoNF] = useState('');
  const [dataVencimentoBoleto, setDataVencimentoBoleto] = useState('');
  const [pagamentoAntecipado, setPagamentoAntecipado] = useState(false);
  const [justificativaAntecipado, setJustificativaAntecipado] = useState('');
  const [nfBoletoLoading, setNfBoletoLoading] = useState(false);

  useEffect(() => {
    if (effectiveUserId) {
      fetchSolicitacoes();
    }
  }, [effectiveUserId, viewMode]);

  const fetchSolicitacoes = async () => {
    if (!effectiveUserId) return;
    setLoading(true);

    let query = supabase
      .from('solicitacoes')
      .select(`
        *,
        fornecedor:fornecedores!solicitacoes_fornecedor_id_fkey(id, razao_social, nome_fantasia)
      `)
      .order('created_at', { ascending: false });

    if (viewMode === 'minhas') {
      query = query.eq('user_id', effectiveUserId);
    } else {
      if (!hasAllAccess && userEmpreendimentos.length > 0) {
        query = query.in('empreendimento', userEmpreendimentos);
      }
    }

    const { data, error } = await query;

    if (!error && data) {
      const userIds = viewMode === 'empreendimento' 
        ? [...new Set(data.map((s: any) => s.user_id))]
        : [];
      
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc: Record<string, string>, p: any) => {
            acc[p.id] = p.full_name || p.email || 'Usuário';
            return acc;
          }, {});
        }
      }

      const enrichedData = await Promise.all(
        data.map(async (sol: any) => {
          let documentoEmitido = null;
          let documentosFiscais: DocumentoFiscal[] = [];
          
          if (['oc_ac_emitida', 'concluida', 'aguardando_aceite', 'aguardando_nf_boleto', 'nf_boleto_enviados', 'enviado_pagamento'].includes(sol.status)) {
            const { data: docData } = await supabase
              .from('documentos_emitidos')
              .select('*')
              .eq('solicitacao_id', sol.id)
              .maybeSingle();
            documentoEmitido = docData;
          }

          const { data: fiscaisData } = await supabase
            .from('documentos_fiscais')
            .select('*')
            .eq('solicitacao_id', sol.id);
          if (fiscaisData) documentosFiscais = fiscaisData as DocumentoFiscal[];
          
          return { 
            ...sol, 
            documentoEmitido, 
            documentosFiscais,
            solicitante_nome: profilesMap[sol.user_id] || null
          } as SolicitacaoComFornecedor;
        })
      );
      
      setSolicitacoes(enrichedData);
      
      const needsCorrectionIds = data
        .filter((s: any) => s.status === 'rejeitado' || s.status === 'pendente_correcao')
        .map((s: any) => s.id);
      
      if (needsCorrectionIds.length > 0) {
        const { data: histData } = await supabase
          .from('historico_solicitacoes')
          .select('solicitacao_id, motivo, created_at, anexos_com_problema')
          .in('solicitacao_id', needsCorrectionIds)
          .in('status_novo', ['rejeitado', 'pendente_correcao'])
          .order('created_at', { ascending: false });
        
        if (histData) {
          const reasons: Record<string, RejectionInfo> = {};
          histData.forEach((h: any) => {
            if (!reasons[h.solicitacao_id]) {
              reasons[h.solicitacao_id] = h;
            }
          });
          setRejectionReasons(reasons);
        }
      }

      const infoIds = data
        .filter((s: any) => s.status === 'aguardando_informacoes')
        .map((s: any) => s.id);
      
      if (infoIds.length > 0) {
        const { data: infoData } = await supabase
          .from('historico_solicitacoes')
          .select('solicitacao_id, motivo, created_at, anexos_com_problema')
          .in('solicitacao_id', infoIds)
          .eq('status_novo', 'aguardando_informacoes')
          .order('created_at', { ascending: false });
        
        if (infoData) {
          const requests: Record<string, InfoRequest> = {};
          infoData.forEach((h: any) => {
            if (!requests[h.solicitacao_id]) {
              requests[h.solicitacao_id] = h;
            }
          });
          setInfoRequests(requests);
        }
      }
    }
    setLoading(false);
  };

  const sortedAndFilteredSolicitacoes = useMemo(() => {
    let filtered = [...solicitacoes];
    
    switch (activeTab) {
      case 'com_backoffice':
        filtered = filtered.filter(s => 
          s.status === 'recebido' || s.status === 'em_analise' || 
          s.status === 'aprovado' || s.status === 'em_processamento'
        );
        break;
      case 'correcoes':
        filtered = filtered.filter(s => 
          s.status === 'pendente_correcao' || s.status === 'aguardando_informacoes'
        );
        break;
      case 'oc_emitida':
        filtered = filtered.filter(s => s.status === 'aguardando_aceite');
        break;
      case 'aguardando_nf':
        filtered = filtered.filter(s => 
          s.status === 'aguardando_nf_boleto' || s.status === 'nf_boleto_enviados' || s.status === 'enviado_pagamento'
        );
        break;
      case 'reprovadas':
        filtered = filtered.filter(s => s.status === 'rejeitado');
        break;
      case 'concluidas':
        filtered = filtered.filter(s => s.status === 'concluida');
        break;
    }
    
    filtered.sort((a, b) => {
      const priorityStatuses = ['pendente_correcao', 'aguardando_informacoes', 'aguardando_aceite', 'aguardando_nf_boleto'];
      const aPriority = priorityStatuses.includes(a.status) ? 0 : 1;
      const bPriority = priorityStatuses.includes(b.status) ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return filtered;
  }, [solicitacoes, activeTab]);

  const statusCounts = useMemo(() => {
    return {
      todas: solicitacoes.length,
      com_backoffice: solicitacoes.filter(s => 
        s.status === 'recebido' || s.status === 'em_analise' || 
        s.status === 'aprovado' || s.status === 'em_processamento'
      ).length,
      correcoes: solicitacoes.filter(s => 
        s.status === 'pendente_correcao' || s.status === 'aguardando_informacoes'
      ).length,
      oc_emitida: solicitacoes.filter(s => s.status === 'aguardando_aceite').length,
      aguardando_nf: solicitacoes.filter(s => 
        s.status === 'aguardando_nf_boleto' || s.status === 'nf_boleto_enviados' || s.status === 'enviado_pagamento'
      ).length,
      reprovadas: solicitacoes.filter(s => s.status === 'rejeitado').length,
      concluidas: solicitacoes.filter(s => s.status === 'concluida').length,
    };
  }, [solicitacoes]);

  const formatCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const number = parseInt(digits) / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openEditModal = async (sol: Solicitacao) => {
    setEditingSolicitacao(sol);
    setEditDescricao(sol.descricao);
    setEditValor(String(Math.round(sol.valor * 100)));
    setEditNaturezaOrcamentaria(sol.natureza_orcamentaria);
    setEditAnexos({});
    setExistingAnexos([]);
    setEditOpen(true);
    
    const { data: anexosData } = await supabase
      .from('anexos')
      .select('id, tipo, nome_arquivo')
      .eq('solicitacao_id', sol.id);
    
    if (anexosData) {
      setExistingAnexos(anexosData);
    }
  };

  const handleDuplicate = (sol: SolicitacaoComFornecedor) => {
    navigate('/nova-solicitacao', { 
      state: { 
        duplicateFrom: {
          tipo: sol.tipo,
          empreendimento: sol.empreendimento,
          natureza_orcamentaria: sol.natureza_orcamentaria,
          tipo_contratacao: sol.tipo_contratacao,
          descricao: sol.descricao,
          valor: sol.valor,
          fornecedor_id: sol.fornecedor_id,
          origem_custo: sol.origem_custo,
          cliente_id: sol.cliente_id,
          emergencial: sol.emergencial,
        }
      }
    });
  };

  const getRequiredAttachments = (sol: Solicitacao) => {
    const isOC = sol.tipo === 'OC';
    const isAC = sol.tipo === 'AC';
    
    if (isOC) {
      return [
        { tipo: 'chamado_preventiva', label: ATTACHMENT_TYPES.chamado_preventiva, required: false },
        { tipo: 'orcamento_escolhido', label: ATTACHMENT_TYPES.orcamento_escolhido, required: false },
      ];
    }
    
    if (isAC && sol.emergencial) {
      return [
        { tipo: 'chamado_preventiva', label: ATTACHMENT_TYPES.chamado_preventiva, required: false },
        { tipo: 'orcamento_escolhido', label: ATTACHMENT_TYPES.orcamento_escolhido, required: false },
      ];
    }
    
    if (isAC && !sol.emergencial) {
      return [
        { tipo: 'chamado_preventiva', label: ATTACHMENT_TYPES.chamado_preventiva, required: false },
        { tipo: 'escopo_detalhado', label: ATTACHMENT_TYPES.escopo_detalhado, required: false },
        { tipo: 'mapa_cotacao', label: ATTACHMENT_TYPES.mapa_cotacao, required: false },
        { tipo: 'orcamento_escolhido', label: ATTACHMENT_TYPES.orcamento_escolhido, required: false },
        { tipo: 'orcamento_concorrente_1', label: ATTACHMENT_TYPES.orcamento_concorrente_1, required: false },
        { tipo: 'orcamento_concorrente_2', label: ATTACHMENT_TYPES.orcamento_concorrente_2, required: false },
      ];
    }
    
    return [];
  };

  const uploadNewAnexos = async (solicitacaoId: string) => {
    const filesToUpload = Object.entries(editAnexos).filter(([_, file]) => file !== null);
    
    if (filesToUpload.length === 0) return;
    
    const uploadPromises = filesToUpload.map(async ([tipo, uploadedFile]) => {
      if (!uploadedFile) return;
      
      const { file } = uploadedFile;
      const fileExt = file.name.split('.').pop();
      const filePath = `${solicitacaoId}/${tipo}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('anexos')
        .upload(filePath, file);
      
      if (uploadError) {
        throw new Error(`Erro no upload de ${ATTACHMENT_TYPES[tipo as keyof typeof ATTACHMENT_TYPES] || tipo}: ${uploadError.message}`);
      }
      
      const { error: dbError } = await supabase
        .from('anexos')
        .insert({
          solicitacao_id: solicitacaoId,
          tipo,
          nome_arquivo: file.name,
          storage_path: filePath,
          mime_type: file.type,
          tamanho_bytes: file.size,
        });
      
      if (dbError) {
        throw new Error(`Erro ao salvar registro de ${ATTACHMENT_TYPES[tipo as keyof typeof ATTACHMENT_TYPES] || tipo}: ${dbError.message}`);
      }
    });
    
    await Promise.all(uploadPromises);
  };

  const handleResubmit = async () => {
    if (!editingSolicitacao || !user) return;
    
    setSubmitting(true);
    
    try {
      const valorNumerico = parseFloat(editValor.replace(/\D/g, '')) / 100 || 0;
      const statusAnterior = editingSolicitacao.status;
      
      await uploadNewAnexos(editingSolicitacao.id);
      
      const { error: updateError } = await supabase
        .from('solicitacoes')
        .update({
          descricao: editDescricao,
          valor: valorNumerico,
          natureza_orcamentaria: editNaturezaOrcamentaria as any,
          status: 'recebido',
        })
        .eq('id', editingSolicitacao.id);

      if (updateError) throw new Error(`Erro ao atualizar solicitação: ${updateError.message}`);

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: editingSolicitacao.id,
        user_id: user.id,
        acao: statusAnterior === 'aguardando_informacoes' ? 'resposta_informacoes' : 'reenvio',
        status_anterior: statusAnterior,
        status_novo: 'recebido',
      });

      toast({
        title: 'Solicitação reenviada!',
        description: 'Sua correção foi enviada para análise.',
      });

      setEditOpen(false);
      fetchSolicitacoes();
    } catch (error: any) {
      toast({
        title: 'Erro ao reenviar',
        description: error?.message || 'Erro desconhecido.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadDocumentoEmitido = async (doc: DocumentoEmitido) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos-emitidos')
        .download(doc.storage_path);
      
      if (error) throw error;
      if (data) saveAs(data, doc.nome_arquivo);
    } catch (error) {
      toast({
        title: 'Erro ao baixar documento',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const openAceiteModal = (sol: SolicitacaoComFornecedor) => {
    setAceiteSolicitacao(sol);
    setAceiteAjuste('');
    setAceiteOpen(true);
  };

  const handleAceitarOC = async () => {
    if (!aceiteSolicitacao || !user) return;
    
    setAceiteLoading(true);
    try {
      await supabase
        .from('solicitacoes')
        .update({ status: 'aguardando_nf_boleto' as any })
        .eq('id', aceiteSolicitacao.id);

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: aceiteSolicitacao.id,
        user_id: user.id,
        acao: 'aceite_oc',
        status_anterior: 'aguardando_aceite',
        status_novo: 'aguardando_nf_boleto',
      });

      toast({
        title: 'OC Aceita!',
        description: 'Agora você pode incluir a NF e Boleto.',
      });

      setAceiteOpen(false);
      fetchSolicitacoes();
    } catch (error) {
      toast({
        title: 'Erro ao aceitar OC',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setAceiteLoading(false);
    }
  };

  const handleSolicitarAjuste = async () => {
    if (!aceiteSolicitacao || !user || !aceiteAjuste.trim()) return;
    
    setAceiteLoading(true);
    try {
      await supabase
        .from('solicitacoes')
        .update({ status: 'em_processamento' })
        .eq('id', aceiteSolicitacao.id);

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: aceiteSolicitacao.id,
        user_id: user.id,
        acao: 'ajuste_solicitado',
        status_anterior: 'aguardando_aceite',
        status_novo: 'em_processamento',
        motivo: aceiteAjuste,
      });

      toast({
        title: 'Ajuste solicitado',
        description: 'O backoffice receberá seu pedido de ajuste.',
      });

      setAceiteOpen(false);
      fetchSolicitacoes();
    } catch (error) {
      toast({
        title: 'Erro ao solicitar ajuste',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setAceiteLoading(false);
    }
  };

  const openNfBoletoModal = (sol: SolicitacaoComFornecedor) => {
    setNfBoletoSolicitacao(sol);
    setNfFile(null);
    setBoletoFile(null);
    setDataEmissaoNF('');
    setDataVencimentoBoleto('');
    setPagamentoAntecipado(false);
    setJustificativaAntecipado('');
    setNfBoletoOpen(true);
  };

  const handleEnviarNfBoleto = async () => {
    if (!nfBoletoSolicitacao || !user) return;
    
    if (!boletoFile) {
      toast({ title: 'Boleto obrigatório', description: 'É necessário anexar o boleto.', variant: 'destructive' });
      return;
    }

    if (!pagamentoAntecipado && !nfFile) {
      toast({ title: 'Nota Fiscal obrigatória', description: 'É necessário anexar a Nota Fiscal (ou marcar como pagamento antecipado).', variant: 'destructive' });
      return;
    }

    if (!dataVencimentoBoleto) {
      toast({ title: 'Data de vencimento obrigatória', description: 'Informe a data de vencimento do boleto.', variant: 'destructive' });
      return;
    }

    setNfBoletoLoading(true);
    
    try {
      if (nfFile) {
        const nfExt = nfFile.name.split('.').pop();
        const nfPath = `${user.id}/${nfBoletoSolicitacao.id}/nf_${Date.now()}.${nfExt}`;
        
        const { error: nfUploadError } = await supabase.storage
          .from('documentos-fiscais')
          .upload(nfPath, nfFile);
        
        if (nfUploadError) throw new Error(`Erro no upload da Nota Fiscal: ${nfUploadError.message}`);

        const { error: nfDbError } = await supabase.from('documentos_fiscais').insert({
          solicitacao_id: nfBoletoSolicitacao.id,
          tipo: 'nota_fiscal',
          storage_path: nfPath,
          nome_arquivo: nfFile.name,
          mime_type: nfFile.type,
          tamanho_bytes: nfFile.size,
          data_emissao_nf: dataEmissaoNF || null,
          pagamento_antecipado: false,
          user_id: user.id,
        });

        if (nfDbError) throw new Error(`Erro ao salvar registro da Nota Fiscal: ${nfDbError.message}`);
      }

      const boletoExt = boletoFile.name.split('.').pop();
      const boletoPath = `${user.id}/${nfBoletoSolicitacao.id}/boleto_${Date.now()}.${boletoExt}`;
      
      const { error: boletoUploadError } = await supabase.storage
        .from('documentos-fiscais')
        .upload(boletoPath, boletoFile);
      
      if (boletoUploadError) throw new Error(`Erro no upload do Boleto: ${boletoUploadError.message}`);

      const { error: boletoDbError } = await supabase.from('documentos_fiscais').insert({
        solicitacao_id: nfBoletoSolicitacao.id,
        tipo: 'boleto',
        storage_path: boletoPath,
        nome_arquivo: boletoFile.name,
        mime_type: boletoFile.type,
        tamanho_bytes: boletoFile.size,
        data_vencimento_boleto: dataVencimentoBoleto,
        pagamento_antecipado: pagamentoAntecipado,
        justificativa_antecipado: pagamentoAntecipado ? justificativaAntecipado : null,
        user_id: user.id,
      });

      if (boletoDbError) throw new Error(`Erro ao salvar registro do Boleto: ${boletoDbError.message}`);

      const { error: statusError } = await supabase
        .from('solicitacoes')
        .update({ status: 'nf_boleto_enviados' as any })
        .eq('id', nfBoletoSolicitacao.id);

      if (statusError) throw new Error(`Erro ao atualizar status: ${statusError.message}`);

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: nfBoletoSolicitacao.id,
        user_id: user.id,
        acao: pagamentoAntecipado ? 'nf_boleto_enviado_antecipado' : 'nf_boleto_enviado',
        status_anterior: 'aguardando_nf_boleto',
        status_novo: 'nf_boleto_enviados',
        motivo: pagamentoAntecipado ? `Pagamento antecipado: ${justificativaAntecipado}` : null,
      });

      toast({
        title: 'Documentos enviados!',
        description: 'NF e Boleto foram enviados para o financeiro.',
      });

      setNfBoletoOpen(false);
      fetchSolicitacoes();
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar documentos',
        description: error?.message || 'Erro desconhecido.',
        variant: 'destructive',
      });
    } finally {
      setNfBoletoLoading(false);
    }
  };

  const downloadDocumentoFiscal = async (doc: DocumentoFiscal) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos-fiscais')
        .download(doc.storage_path);
      
      if (error) throw error;
      if (data) saveAs(data, doc.nome_arquivo);
    } catch (error) {
      toast({
        title: 'Erro ao baixar documento',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Filter bar configuration using design system
  const tabGroups: TabGroup[] = [
    {
      id: 'em_andamento',
      tabs: [
        { id: 'todas', label: 'Todas', count: statusCounts.todas },
        { id: 'com_backoffice', label: 'Backoffice', count: statusCounts.com_backoffice },
        { id: 'oc_emitida', label: 'OC Emitida', count: statusCounts.oc_emitida, variant: 'success', showCountWhenZero: false },
        { id: 'aguardando_nf', label: 'NF/Boleto', count: statusCounts.aguardando_nf, variant: 'purple', showCountWhenZero: false },
      ],
    },
    {
      id: 'acoes_pendentes',
      icon: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
      tabs: [
        { id: 'correcoes', label: 'Correções', count: statusCounts.correcoes, variant: 'destructive', pulseWhenActive: true },
      ],
    },
    {
      id: 'finalizadas',
      tabs: [
        { id: 'reprovadas', label: 'Reprovadas', count: statusCounts.reprovadas },
        { id: 'concluidas', label: 'Concluídas', count: statusCounts.concluidas },
      ],
    },
  ];

  // Render action banner for a solicitacao
  const renderActionBanner = (sol: SolicitacaoComFornecedor, canTakeAction: boolean) => {
    if (!canTakeAction) return null;
    
    if (sol.status === 'aguardando_nf_boleto') {
      return (
        <div className="bg-[hsl(260,70%,50%)] text-white px-4 py-2 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            <span className="font-semibold">INCLUIR NF E BOLETO</span>
            <span className="text-sm opacity-90">- Anexe a Nota Fiscal e o Boleto</span>
          </div>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => openNfBoletoModal(sol)}
            className="bg-background hover:bg-background/90 text-foreground"
          >
            <Upload className="h-4 w-4 mr-1" />
            Incluir Documentos
          </Button>
        </div>
      );
    }
    
    if (sol.status === 'pendente_correcao') {
      return (
        <div className="bg-warning text-warning-foreground px-4 py-2 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">AÇÃO NECESSÁRIA</span>
            <span className="text-sm opacity-90">- Esta solicitação precisa de correção</span>
          </div>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => openEditModal(sol)}
            className="bg-white text-orange-700 hover:bg-white/90 border border-orange-300 shadow-sm"
          >
            <Edit className="h-4 w-4 mr-1" />
            Corrigir Agora
          </Button>
        </div>
      );
    }
    
    if (sol.status === 'aguardando_aceite') {
      return (
        <div className="bg-success text-success-foreground px-4 py-2 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">OC DISPONÍVEL</span>
            <span className="text-sm opacity-90">- Revise e aceite ou solicite ajuste</span>
          </div>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => openAceiteModal(sol)}
            className="bg-white text-green-700 hover:bg-white/90 border border-green-300 shadow-sm"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Revisar OC
          </Button>
        </div>
      );
    }
    
    if (sol.status === 'aguardando_informacoes') {
      return (
        <div className="bg-info text-info-foreground px-4 py-2 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <span className="font-semibold">INFORMAÇÕES SOLICITADAS</span>
            <span className="text-sm opacity-90">- O backoffice precisa de mais informações</span>
          </div>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => openEditModal(sol)}
            className="bg-white text-blue-700 hover:bg-white/90 border border-blue-300 shadow-sm"
          >
            <Edit className="h-4 w-4 mr-1" />
            Corrigir e Reenviar
          </Button>
        </div>
      );
    }
    
    return null;
  };

  // Render info alert for a solicitacao
  const renderInfoAlert = (sol: SolicitacaoComFornecedor) => {
    const rejectionInfo = rejectionReasons[sol.id];
    const infoRequest = infoRequests[sol.id];
    
    if (sol.status === 'rejeitado' && rejectionInfo?.motivo) {
      return (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-destructive">Motivo da Reprovação:</p>
              <p className="text-sm text-muted-foreground mt-1">{rejectionInfo.motivo}</p>
            </div>
          </div>
        </div>
      );
    }
    
    if (sol.status === 'aguardando_informacoes' && infoRequest?.motivo) {
      return (
        <div className="mb-4 p-3 bg-info/10 border border-info/20 rounded-lg">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-5 w-5 text-info mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-info">Informações solicitadas:</p>
              <p className="text-sm text-muted-foreground mt-1">{infoRequest.motivo}</p>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Render header actions for a solicitacao
  const renderHeaderActions = (sol: SolicitacaoComFornecedor) => {
    if (sol.status === 'rejeitado') {
      return (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleDuplicate(sol)}
          className="text-primary"
        >
          <Copy className="h-4 w-4 mr-1" />
          Duplicar
        </Button>
      );
    }
    return null;
  };

  // Render expanded content for a solicitacao
  const renderExpandedContent = (sol: SolicitacaoComFornecedor) => {
    const fiscalNf = sol.documentosFiscais?.find(d => d.tipo === 'nota_fiscal');
    const fiscalBoleto = sol.documentosFiscais?.find(d => d.tipo === 'boleto');
    
    return (
      <>
        {/* Download OC/AC if available */}
        {sol.documentoEmitido && (
          <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-success" />
                <span className="font-medium">
                  {sol.documentoEmitido.tipo_documento} #{sol.documentoEmitido.numero_documento}
                </span>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => downloadDocumentoEmitido(sol.documentoEmitido!)}
              >
                <Download className="h-4 w-4 mr-1" /> Baixar
              </Button>
            </div>
          </div>
        )}

        {/* Fiscal documents info */}
        {(fiscalNf || fiscalBoleto) && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <p className="font-medium text-sm">Documentos Fiscais Enviados:</p>
            {fiscalNf && (
              <div className="flex items-center justify-between text-sm">
                <span>Nota Fiscal: {fiscalNf.nome_arquivo}</span>
                <Button size="sm" variant="ghost" onClick={() => downloadDocumentoFiscal(fiscalNf)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
            {fiscalBoleto && (
              <div className="flex items-center justify-between text-sm">
                <span>Boleto: {fiscalBoleto.nome_arquivo}</span>
                <Button size="sm" variant="ghost" onClick={() => downloadDocumentoFiscal(fiscalBoleto)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Timeline */}
        <SolicitacaoTimeline solicitacaoId={sol.id} />
        
        {/* Fluig Status */}
        {sol.numero_chamado_fluig && sol.numero_chamado_fluig !== 'RM' && (
          <FluigStatusCard numeroChamadoFluig={sol.numero_chamado_fluig} />
        )}
      </>
    );
  };

  // Get card className based on status
  const getCardClassName = (sol: SolicitacaoComFornecedor, isOwner: boolean) => {
    const canTakeAction = isOwner;
    
    if (sol.status === 'pendente_correcao' && canTakeAction) {
      return 'border-2 border-warning bg-warning/5 shadow-lg';
    }
    if (sol.status === 'rejeitado') {
      return 'border-destructive/50';
    }
    if (sol.status === 'aguardando_aceite' && canTakeAction) {
      return 'border-2 border-success bg-success/5 shadow-lg';
    }
    if (sol.status === 'aguardando_informacoes' && canTakeAction) {
      return 'border-2 border-info bg-info/5 shadow-lg';
    }
    if (sol.status === 'aguardando_nf_boleto' && canTakeAction) {
      return 'border-2 border-[hsl(260,70%,50%)] bg-[hsl(260,70%,50%)]/5 shadow-lg';
    }
    if (!isOwner && viewMode === 'empreendimento') {
      return 'opacity-90';
    }
    
    return '';
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {viewMode === 'minhas' ? 'Minhas Solicitações' : 'Solicitações do Empreendimento'}
            </h1>
            <p className="text-muted-foreground">
              {viewMode === 'minhas' 
                ? 'Acompanhe o status das suas solicitações' 
                : 'Visualize e colabore em solicitações do seu empreendimento'}
            </p>
          </div>
          
          {userEmpreendimentos.length > 0 && (
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(val) => val && setViewMode(val as ViewMode)}
              className="bg-muted p-1 rounded-lg"
            >
              <ToggleGroupItem 
                value="minhas" 
                className="gap-2 data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
                aria-label="Ver minhas solicitações"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Minhas</span>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="empreendimento" 
                className="gap-2 data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
                aria-label="Ver solicitações do empreendimento"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Empreendimento</span>
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>

        {/* Filter Bar with Design System */}
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-2 lg:items-center">
          {tabGroups.map((group, groupIndex) => (
            <div key={group.id} className="flex flex-col gap-1.5">
              <span className={cn(
                "text-xs font-medium uppercase tracking-wider px-1 flex items-center gap-1",
                group.labelClassName || "text-muted-foreground"
              )}>
                {group.icon}
                {group.label}
              </span>
              <div className="flex gap-1 flex-wrap">
                {group.tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const showBadge = tab.showCountWhenZero !== false || tab.count > 0;
                  
                  let buttonVariant: 'default' | 'outline' | 'destructive' = 'outline';
                  if (isActive) {
                    buttonVariant = tab.variant === 'destructive' ? 'destructive' : 'default';
                  }
                  
                  const getBadgeClassName = () => {
                    if (!isActive && tab.count > 0) {
                      if (tab.variant === 'success') return 'bg-success text-success-foreground';
                      if (tab.variant === 'purple') return 'bg-[hsl(260,70%,50%)] text-white';
                      if (tab.variant === 'destructive') return cn('bg-destructive text-destructive-foreground', tab.pulseWhenActive && 'animate-pulse');
                    }
                    return '';
                  };
                  
                  const getBorderClassName = () => {
                    if (!isActive && tab.count > 0 && tab.variant === 'destructive') {
                      return 'border-destructive text-destructive hover:bg-destructive/10';
                    }
                    return '';
                  };
                  
                  return (
                    <Button
                      key={tab.id}
                      variant={buttonVariant}
                      size="sm"
                      onClick={() => setActiveTab(tab.id as FilterTab)}
                      className={cn("gap-1 text-xs h-8", getBorderClassName())}
                    >
                      {tab.label}
                      {showBadge && (
                        <Badge 
                          variant={isActive ? 'secondary' : (tab.variant === 'destructive' && tab.count > 0 ? 'destructive' : 'secondary')}
                          className={cn(
                            "ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center",
                            getBadgeClassName()
                          )}
                        >
                          {tab.count}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
              
              {groupIndex < tabGroups.length - 1 && <FilterBarSeparator />}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {sortedAndFilteredSolicitacoes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {activeTab === 'todas' && 'Você ainda não tem solicitações'}
                {activeTab === 'com_backoffice' && 'Nenhuma solicitação com o backoffice'}
                {activeTab === 'correcoes' && 'Nenhuma solicitação aguardando correção'}
                {activeTab === 'oc_emitida' && 'Nenhuma OC aguardando aceite'}
                {activeTab === 'aguardando_nf' && 'Nenhuma solicitação aguardando NF/Boleto'}
                {activeTab === 'reprovadas' && 'Nenhuma solicitação reprovada'}
                {activeTab === 'concluidas' && 'Nenhuma solicitação concluída'}
              </p>
              {activeTab === 'todas' && (
                <Button className="mt-4" onClick={() => navigate('/nova-solicitacao')}>
                  Criar Solicitação
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedAndFilteredSolicitacoes.map((sol) => {
              const isOwner = sol.user_id === effectiveUserId;
              const showOwnerBadge = viewMode === 'empreendimento' && !isOwner;
              const canTakeAction = isOwner;
              
              return (
                <SolicitacaoCard
                  key={sol.id}
                  solicitacao={sol as SolicitacaoWithDetails}
                  variant="detailed"
                  isExpanded={expandedId === sol.id}
                  onToggleExpand={() => toggleExpand(sol.id)}
                  showOwnerBadge={showOwnerBadge}
                  actionBanner={renderActionBanner(sol, canTakeAction)}
                  headerActions={renderHeaderActions(sol)}
                  infoAlert={renderInfoAlert(sol)}
                  expandedContent={renderExpandedContent(sol)}
                  className={getCardClassName(sol, isOwner)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
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

              {/* Info request reason */}
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
                <Textarea
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  rows={4}
                />
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
                <Select 
                  value={editNaturezaOrcamentaria} 
                  onValueChange={(v) => setEditNaturezaOrcamentaria(v as NaturezaOrcamentaria)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(NATUREZA_ORCAMENTARIA_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Existing attachments */}
              {existingAnexos.length > 0 && (
                <div className="space-y-2">
                  <Label>Anexos já enviados</Label>
                  <div className="space-y-2">
                    {(() => {
                      const anexosProblema = editingSolicitacao.status === 'aguardando_informacoes'
                        ? infoRequests[editingSolicitacao.id]?.anexos_com_problema || []
                        : rejectionReasons[editingSolicitacao.id]?.anexos_com_problema || [];
                      
                      return existingAnexos.map((anexo) => {
                        const hasProblema = anexosProblema.includes(anexo.tipo);
                        return (
                          <div 
                            key={anexo.id} 
                            className={cn(
                              "flex items-center gap-2 p-2 rounded",
                              hasProblema 
                                ? "bg-destructive/10 border border-destructive/30" 
                                : "bg-muted"
                            )}
                          >
                            {hasProblema ? (
                              <XCircle className="h-4 w-4 text-destructive" />
                            ) : (
                              <FileCheck className="h-4 w-4 text-success" />
                            )}
                            <span className="text-sm flex-1">{anexo.nome_arquivo}</span>
                            <Badge 
                              variant={hasProblema ? "destructive" : "outline"} 
                              className="text-xs"
                            >
                              {hasProblema ? 'PRECISA CORREÇÃO' : (ATTACHMENT_TYPES[anexo.tipo as keyof typeof ATTACHMENT_TYPES] || anexo.tipo)}
                            </Badge>
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
                      
                      return anexosProblema.length > 0
                        ? 'Substitua os anexos sinalizados com problema abaixo.'
                        : 'Estes anexos já foram enviados. Adicione novos apenas se necessário.';
                    })()}
                  </p>
                </div>
              )}

              <div>
                <Label className="mb-2 block">Adicionar Novos Anexos (opcional)</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Anexe novos documentos se necessário
                </p>
                <MultiFileUpload
                  requirements={getRequiredAttachments(editingSolicitacao)}
                  files={editAnexos}
                  onFilesChange={setEditAnexos}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Reenviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aceite OC Modal - Using ActionModal */}
      <ActionModal
        open={aceiteOpen}
        onOpenChange={setAceiteOpen}
        title={`Revisar OC #${aceiteSolicitacao?.protocolo}`}
        variant="confirm"
        loading={aceiteLoading}
        footer={
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setAceiteOpen(false)} disabled={aceiteLoading}>
              Cancelar
            </Button>
            <Button 
              variant="secondary"
              onClick={handleSolicitarAjuste} 
              disabled={aceiteLoading || !aceiteAjuste.trim()}
            >
              {aceiteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Solicitar Ajuste
            </Button>
            <Button onClick={handleAceitarOC} disabled={aceiteLoading}>
              {aceiteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Aceitar OC
            </Button>
          </DialogFooter>
        }
      >
        {aceiteSolicitacao?.documentoEmitido && (
          <div className="space-y-4">
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="h-5 w-5 text-success" />
                <span className="font-medium text-success">
                  {aceiteSolicitacao.documentoEmitido.tipo_documento} #{aceiteSolicitacao.documentoEmitido.numero_documento}
                </span>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => downloadDocumentoEmitido(aceiteSolicitacao.documentoEmitido!)}
              >
                <Download className="h-4 w-4 mr-1" /> Baixar OC
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Precisa de algum ajuste? (obrigatório para solicitar ajuste)</Label>
              <Textarea
                placeholder="Descreva o ajuste necessário..."
                value={aceiteAjuste}
                onChange={(e) => setAceiteAjuste(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}
      </ActionModal>

      {/* NF/Boleto Modal - Using ActionModal */}
      <ActionModal
        open={nfBoletoOpen}
        onOpenChange={setNfBoletoOpen}
        title={`Incluir NF e Boleto - #${nfBoletoSolicitacao?.protocolo}`}
        icon={Receipt}
        variant="form"
        loading={nfBoletoLoading}
        onConfirm={handleEnviarNfBoleto}
        confirmText="Enviar Documentos"
      >
        <div className="space-y-4">
          {/* Pagamento Antecipado */}
          <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
            <Checkbox
              id="pagamento_antecipado"
              checked={pagamentoAntecipado}
              onCheckedChange={(checked) => setPagamentoAntecipado(checked === true)}
            />
            <Label htmlFor="pagamento_antecipado" className="text-sm cursor-pointer">
              Pagamento antecipado (adiantamento)
            </Label>
          </div>

          {pagamentoAntecipado && (
            <div className="space-y-2">
              <Label>Justificativa do pagamento antecipado</Label>
              <Textarea
                placeholder="Explique o motivo do pagamento antecipado..."
                value={justificativaAntecipado}
                onChange={(e) => setJustificativaAntecipado(e.target.value)}
                rows={2}
              />
            </div>
          )}

          {/* Nota Fiscal */}
          {!pagamentoAntecipado && (
            <div className="space-y-2">
              <Label>Nota Fiscal (PDF/XML) *</Label>
              <Input
                type="file"
                accept=".pdf,.xml"
                onChange={(e) => setNfFile(e.target.files?.[0] || null)}
              />
              <div className="space-y-2">
                <Label>Data de emissão da NF</Label>
                <Input
                  type="date"
                  value={dataEmissaoNF}
                  onChange={(e) => setDataEmissaoNF(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Boleto */}
          <div className="space-y-2">
            <Label>Boleto (PDF) *</Label>
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => setBoletoFile(e.target.files?.[0] || null)}
            />
            <div className="space-y-2">
              <Label>Data de vencimento do boleto *</Label>
              <Input
                type="date"
                value={dataVencimentoBoleto}
                onChange={(e) => setDataVencimentoBoleto(e.target.value)}
              />
            </div>
          </div>
        </div>
      </ActionModal>
    </AppLayout>
  );
}
