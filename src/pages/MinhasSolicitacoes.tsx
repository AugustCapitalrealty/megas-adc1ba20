import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import { useDebounce } from '@/hooks/useDebounce';
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
import { Loader2, FileText, Edit, Send, AlertTriangle, Copy, XCircle, Download, FileCheck, CheckCircle, MessageSquare, RotateCcw, Receipt, Upload, User, Building2, Trash2, UserCheck } from 'lucide-react';
import { saveAs } from 'file-saver';
import { SolicitacaoTimeline } from '@/components/SolicitacaoTimeline';
import { FluigStatusCard } from '@/components/FluigStatusCard';
import { AnexoCard } from '@/components/AnexoCard';
import { MultiFileUpload, type UploadedFile } from '@/components/FileUpload';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { TransferOwnershipModal } from '@/components/TransferOwnershipModal';

// Design System Components
import { SolicitacaoCard, type SolicitacaoWithDetails } from '@/components/ui/SolicitacaoCard';
import { FilterBar, type StatusTabConfig, type TabGroup } from '@/components/ui/FilterBar';
import { ActionModal } from '@/components/ui/ActionModal';
import { PendingActionsCard } from '@/components/PendingActionsCard';

const ATTACHMENT_TYPES = {
  chamado_preventiva: 'Chamado / Preventiva (Infraspeak)',
  escopo_detalhado: 'Escopo Detalhado',
  mapa_cotacao: 'Mapa de Cotação',
  orcamento_escolhido: 'Orçamento Escolhido',
  orcamento_concorrente_1: 'Orçamento Concorrente 1',
  orcamento_concorrente_2: 'Orçamento Concorrente 2',
} as const;

type FilterTab = 'todas' | 'com_backoffice' | 'correcoes' | 'oc_emitida' | 'liberadas' | 'reprovadas' | 'concluidas';

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
  const [searchParams] = useSearchParams();
  const effectiveUserId = (isImpersonating ? effectiveProfile?.id : user?.id) ?? user?.id;
  
  const { empreendimentos: userEmpreendimentos, hasAllAccess } = useUserEmpreendimentos(effectiveUserId);

  // Read URL params
  const urlSearch = searchParams.get('search') || '';
  const urlFilter = searchParams.get('filter') || '';
  
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoComFornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>(urlFilter ? (urlFilter as FilterTab) : 'todas');
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, RejectionInfo>>({});
  const [infoRequests, setInfoRequests] = useState<Record<string, InfoRequest>>({});
  const [viewMode, setViewMode] = useState<ViewMode>((urlSearch || urlFilter) ? 'empreendimento' : 'minhas');
  
  // Search state with debounce
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editingSolicitacao, setEditingSolicitacao] = useState<Solicitacao | null>(null);
  const [editDescricao, setEditDescricao] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editNaturezaOrcamentaria, setEditNaturezaOrcamentaria] = useState<NaturezaOrcamentaria | ''>('');
  const [editEscopoDetalhado, setEditEscopoDetalhado] = useState('');
  const [editAnexos, setEditAnexos] = useState<Record<string, UploadedFile | null>>({});
  const [existingAnexos, setExistingAnexos] = useState<Array<{ id: string; tipo: string; nome_arquivo: string; storage_path: string }>>([]);
  const [anexosParaExcluir, setAnexosParaExcluir] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Supplier swap state
  const [trocarFornecedor, setTrocarFornecedor] = useState(false);
  const [novoFornecedorEscolhido, setNovoFornecedorEscolhido] = useState<'concorrente1' | 'concorrente2' | null>(null);
  const [fornecedoresInfo, setFornecedoresInfo] = useState<{
    principal: { id: string; cnpj: string; razao_social: string | null } | null;
    concorrente1: { id: string; cnpj: string; razao_social: string | null } | null;
    concorrente2: { id: string; cnpj: string; razao_social: string | null } | null;
  }>({ principal: null, concorrente1: null, concorrente2: null });

  // Cancel modal state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelSolicitacao, setCancelSolicitacao] = useState<Solicitacao | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Anexos visualization state
  const [anexosExpanded, setAnexosExpanded] = useState<Record<string, Array<{ id: string; tipo: string; nome_arquivo: string; storage_path: string; mime_type: string | null; tamanho_bytes: number | null }>>>({});
  
  // Anexos view dialog state
  const [anexosViewSolicitacao, setAnexosViewSolicitacao] = useState<SolicitacaoComFornecedor | null>(null);

  // Aceite OC modal state (now "Liberar para Fornecedor")
  const [aceiteOpen, setAceiteOpen] = useState(false);
  const [aceiteSolicitacao, setAceiteSolicitacao] = useState<SolicitacaoComFornecedor | null>(null);
  const [aceiteAjuste, setAceiteAjuste] = useState('');
  const [aceiteLoading, setAceiteLoading] = useState(false);
  const [aceiteStep, setAceiteStep] = useState<'revisar' | 'decidir' | 'confirmar'>('revisar');
  const [fornecedorEmailContato, setFornecedorEmailContato] = useState('');
  const [fornecedorTelefoneContato, setFornecedorTelefoneContato] = useState('');
  const [showAjusteField, setShowAjusteField] = useState(false);

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

  // Transfer modal state
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferSolicitacao, setTransferSolicitacao] = useState<SolicitacaoComFornecedor | null>(null);

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
        id, protocolo, descricao, tipo, status, empreendimento, valor, valor_servico, valor_material,
        faturamento_direto, emergencial, created_at, updated_at, user_id, fornecedor_id,
        fornecedor_concorrente_1_id, fornecedor_concorrente_2_id, natureza_orcamentaria,
        numero_chamado_fluig, data_pendente_correcao, cancelamento_pendente, contrato_mensal,
        tipo_contratacao, data_conclusao, data_inicio, data_fim, parcelas, dias_garantia,
        tipo_garantia, dias_garantia_produto, dias_garantia_servico, instrumento_juridico,
        escopo_detalhado_minuta, cliente_id, custo_cliente, origem_custo, infraspeak_registrada,
        justificativa_sem_chamado, fornecimento_exclusivo, justificativa_exclusividade,
        excecao_fornecedores, justificativa_fornecedores, justificativa_sem_memorial,
        numero_projuris, fornecedor_email_contato, fornecedor_telefone_contato,
        data_enviado_fornecedor, enviado_fornecedor_por, data_liberado_fornecedor,
        liberado_fornecedor_por, resposta_informacoes, retencao_6_porcento,
        requer_retencao_tecnica, prazo_liberacao_retencao_dias, rateio_valores, tipo_rateio,
        natureza_servico_altura_risco, natureza_servico_fossa_filtro, natureza_servico_obra_civil,
        natureza_servico_preco_variavel, due_diligence_confirmada, due_diligence_numero_projuris,
        ia_cnae_status, ia_cnae_justificativa, ia_cnae_avaliado_em,
        ia_descricao_vaga, ia_descricao_sugestao, ia_descricao_avaliado_em,
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

      // Batch fetch documents instead of N+1 queries
      const allIds = data.map((s: any) => s.id);
      const statusesNeedingDocs = ['oc_ac_emitida', 'concluida', 'aguardando_aceite', 'aguardando_nf_boleto', 'nf_boleto_enviados', 'enviado_pagamento', 'liberado_fornecedor', 'enviado_fornecedor'];
      const idsNeedingDocs = data.filter((s: any) => statusesNeedingDocs.includes(s.status)).map((s: any) => s.id);

      // Fetch all documents in 2 batch queries
      let docsMap: Record<string, any> = {};
      let fiscaisMap: Record<string, DocumentoFiscal[]> = {};

      const [docsResult, fiscaisResult] = await Promise.all([
        idsNeedingDocs.length > 0 
          ? supabase.from('documentos_emitidos').select('*').in('solicitacao_id', idsNeedingDocs)
          : Promise.resolve({ data: [] }),
        supabase.from('documentos_fiscais').select('*').in('solicitacao_id', allIds),
      ]);

      if (docsResult.data) {
        for (const doc of docsResult.data) {
          if (!docsMap[doc.solicitacao_id]) docsMap[doc.solicitacao_id] = doc;
        }
      }
      if (fiscaisResult.data) {
        for (const doc of fiscaisResult.data) {
          if (!fiscaisMap[doc.solicitacao_id]) fiscaisMap[doc.solicitacao_id] = [];
          fiscaisMap[doc.solicitacao_id].push(doc as DocumentoFiscal);
        }
      }

      const enrichedData = data.map((sol: any) => ({
        ...sol,
        documentoEmitido: docsMap[sol.id] || null,
        documentosFiscais: fiscaisMap[sol.id] || [],
        solicitante_nome: profilesMap[sol.user_id] || null,
      } as SolicitacaoComFornecedor));
      
      setSolicitacoes(enrichedData);
      
      // Parallelize correction reasons and info requests fetches
      const needsCorrectionIds = data
        .filter((s: any) => s.status === 'rejeitado' || s.status === 'pendente_correcao')
        .map((s: any) => s.id);
      
      const infoIds = data
        .filter((s: any) => s.status === 'aguardando_informacoes')
        .map((s: any) => s.id);

      const [correctionResult, infoResult] = await Promise.all([
        needsCorrectionIds.length > 0
          ? supabase
              .from('historico_solicitacoes')
              .select('solicitacao_id, motivo, created_at, anexos_com_problema')
              .in('solicitacao_id', needsCorrectionIds)
              .in('status_novo', ['rejeitado', 'pendente_correcao'])
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: null }),
        infoIds.length > 0
          ? supabase
              .from('historico_solicitacoes')
              .select('solicitacao_id, motivo, created_at, anexos_com_problema')
              .in('solicitacao_id', infoIds)
              .eq('status_novo', 'aguardando_informacoes')
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: null }),
      ]);

      if (correctionResult.data) {
        const reasons: Record<string, RejectionInfo> = {};
        correctionResult.data.forEach((h: any) => {
          if (!reasons[h.solicitacao_id]) {
            reasons[h.solicitacao_id] = h;
          }
        });
        setRejectionReasons(reasons);
      }

      if (infoResult.data) {
        const requests: Record<string, InfoRequest> = {};
        infoResult.data.forEach((h: any) => {
          if (!requests[h.solicitacao_id]) {
            requests[h.solicitacao_id] = h;
          }
        });
        setInfoRequests(requests);
      }
    }
    setLoading(false);
  };

  const sortedAndFilteredSolicitacoes = useMemo(() => {
    let filtered = [...solicitacoes];
    
    // Apply search filter (local filter with debounced value)
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(s => 
        s.protocolo.toLowerCase().includes(searchLower) ||
        s.descricao.toLowerCase().includes(searchLower) ||
        s.fornecedor?.razao_social?.toLowerCase().includes(searchLower) ||
        s.fornecedor?.nome_fantasia?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply tab filter
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
      case 'liberadas':
        filtered = filtered.filter(s => 
          s.status === 'liberado_fornecedor' || s.status === 'enviado_fornecedor' ||
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
      const priorityStatuses = ['pendente_correcao', 'aguardando_informacoes', 'aguardando_aceite', 'liberado_fornecedor'];
      const aPriority = priorityStatuses.includes(a.status) ? 0 : 1;
      const bPriority = priorityStatuses.includes(b.status) ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return filtered;
  }, [solicitacoes, activeTab, debouncedSearch]);

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
      liberadas: solicitacoes.filter(s => 
        s.status === 'liberado_fornecedor' || s.status === 'enviado_fornecedor' ||
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
    setEditEscopoDetalhado((sol as any).escopo_detalhado_minuta || '');
    setEditAnexos({});
    setExistingAnexos([]);
    setAnexosParaExcluir([]);
    setTrocarFornecedor(false);
    setNovoFornecedorEscolhido(null);
    setFornecedoresInfo({ principal: null, concorrente1: null, concorrente2: null });
    setEditOpen(true);
    
    // Fetch anexos
    const { data: anexosData } = await supabase
      .from('anexos')
      .select('id, tipo, nome_arquivo, storage_path')
      .eq('solicitacao_id', sol.id);
    
    if (anexosData) {
      setExistingAnexos(anexosData);
    }
    
    // Fetch fornecedores info for swap functionality
    const fornecedorIds = [sol.fornecedor_id, sol.fornecedor_concorrente_1_id, sol.fornecedor_concorrente_2_id].filter(Boolean) as string[];
    
    if (fornecedorIds.length > 0) {
      const { data: fornecedoresData } = await supabase
        .from('fornecedores')
        .select('id, cnpj, razao_social')
        .in('id', fornecedorIds);
      
      if (fornecedoresData) {
        const fornecedoresMap = Object.fromEntries(fornecedoresData.map(f => [f.id, f]));
        setFornecedoresInfo({
          principal: sol.fornecedor_id ? fornecedoresMap[sol.fornecedor_id] || null : null,
          concorrente1: sol.fornecedor_concorrente_1_id ? fornecedoresMap[sol.fornecedor_concorrente_1_id] || null : null,
          concorrente2: sol.fornecedor_concorrente_2_id ? fornecedoresMap[sol.fornecedor_concorrente_2_id] || null : null,
        });
      }
    }
  };

  const openCancelModal = (sol: Solicitacao) => {
    setCancelSolicitacao(sol);
    setMotivoCancelamento('');
    setCancelOpen(true);
  };

  // Post-OC statuses that require approval for cancellation
  const POST_OC_STATUSES = ['oc_ac_emitida', 'aguardando_aceite', 'liberado_fornecedor', 'enviado_fornecedor', 'aguardando_nf_boleto', 'nf_boleto_enviados', 'enviado_pagamento'];

  const isPostOCStatus = (status: string) => POST_OC_STATUSES.includes(status);

  const handleCancelar = async () => {
    if (!cancelSolicitacao || !user) return;
    
    setCancelLoading(true);
    try {
      if (isPostOCStatus(cancelSolicitacao.status)) {
        // Post-OC: request cancellation approval instead of canceling directly
        const { error: updateError } = await supabase
          .from('solicitacoes')
          .update({ cancelamento_pendente: true } as any)
          .eq('id', cancelSolicitacao.id);

        if (updateError) throw updateError;

        // Register in oc_acompanhamento
        await supabase.from('oc_acompanhamento' as any).insert({
          solicitacao_id: cancelSolicitacao.id,
          tipo_acao: 'cancelamento_solicitado',
          justificativa: motivoCancelamento.trim() || 'Cancelamento solicitado pelo solicitante',
          user_id: user.id,
        } as any);

        await supabase.from('historico_solicitacoes').insert({
          solicitacao_id: cancelSolicitacao.id,
          user_id: user.id,
          acao: 'cancelamento_solicitado',
          status_anterior: cancelSolicitacao.status,
          status_novo: cancelSolicitacao.status,
          motivo: motivoCancelamento.trim() || 'Cancelamento solicitado - aguardando aprovação do backoffice',
        });

        toast({
          title: 'Cancelamento solicitado',
          description: 'Sua solicitação de cancelamento foi enviada para aprovação do Backoffice.',
        });
      } else {
        // Pre-OC: cancel directly
        const { error: updateError } = await supabase
          .from('solicitacoes')
          .update({ status: 'cancelado' as any })
          .eq('id', cancelSolicitacao.id);

        if (updateError) throw updateError;

        await supabase.from('historico_solicitacoes').insert({
          solicitacao_id: cancelSolicitacao.id,
          user_id: user.id,
          acao: 'cancelamento',
          status_anterior: cancelSolicitacao.status,
          status_novo: 'cancelado',
          motivo: motivoCancelamento.trim() || 'Cancelado pelo solicitante',
        });

        toast({
          title: 'Solicitação cancelada',
          description: 'A solicitação foi cancelada com sucesso.',
        });
      }

      setCancelOpen(false);
      fetchSolicitacoes();
    } catch (error: any) {
      toast({
        title: 'Erro ao cancelar',
        description: error?.message || 'Não foi possível cancelar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const fetchAnexosSolicitacao = async (solicitacaoId: string) => {
    if (anexosExpanded[solicitacaoId]) return; // Already loaded
    
    const { data } = await supabase
      .from('anexos')
      .select('id, tipo, nome_arquivo, storage_path, mime_type, tamanho_bytes')
      .eq('solicitacao_id', solicitacaoId)
      .order('created_at');
    
    if (data) {
      setAnexosExpanded(prev => ({ ...prev, [solicitacaoId]: data }));
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
      
      // Excluir anexos marcados para exclusão
      if (anexosParaExcluir.length > 0) {
        const anexosParaRemover = existingAnexos.filter(a => anexosParaExcluir.includes(a.id));
        const storagePaths = anexosParaRemover.map(a => a.storage_path);
        
        // Remove from storage
        if (storagePaths.length > 0) {
          await supabase.storage.from('anexos').remove(storagePaths);
        }
        
        // Remove from database
        await supabase.from('anexos').delete().in('id', anexosParaExcluir);
      }
      
      await uploadNewAnexos(editingSolicitacao.id);
      
      // Build update object with potential supplier swap
      const updateData: Record<string, any> = {
        descricao: editDescricao,
        valor: valorNumerico,
        natureza_orcamentaria: editNaturezaOrcamentaria as any,
        status: 'recebido',
        // Salvar escopo detalhado se preenchido
        escopo_detalhado_minuta: editEscopoDetalhado.trim() || null,
      };
      
      // Handle supplier swap if requested
      if (trocarFornecedor && novoFornecedorEscolhido) {
        const antigoFornecedorId = editingSolicitacao.fornecedor_id;
        
        if (novoFornecedorEscolhido === 'concorrente1' && fornecedoresInfo.concorrente1) {
          updateData.fornecedor_id = editingSolicitacao.fornecedor_concorrente_1_id;
          updateData.fornecedor_concorrente_1_id = antigoFornecedorId;
        } else if (novoFornecedorEscolhido === 'concorrente2' && fornecedoresInfo.concorrente2) {
          updateData.fornecedor_id = editingSolicitacao.fornecedor_concorrente_2_id;
          updateData.fornecedor_concorrente_2_id = antigoFornecedorId;
        }
      }
      
      const { error: updateError } = await supabase
        .from('solicitacoes')
        .update(updateData)
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
      setAnexosParaExcluir([]);
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
    setAceiteStep('revisar');
    setShowAjusteField(false);
    // Pre-fill contact info from supplier if available
    setFornecedorEmailContato(sol.fornecedor?.email || '');
    setFornecedorTelefoneContato(sol.fornecedor?.telefone || '');
    setAceiteOpen(true);
  };

  const openOCInNewTab = async (doc: DocumentoEmitido) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos-emitidos')
        .createSignedUrl(doc.storage_path, 60);
      
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      toast({
        title: 'Erro ao abrir documento',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleAceitarOC = async () => {
    if (!aceiteSolicitacao || !user) return;
    
    setAceiteLoading(true);
    try {
      console.log('[LIBERAR_FORNECEDOR] Iniciando liberação para solicitacao:', aceiteSolicitacao.id);
      
      // Build update data with contact info
      const updateData: Record<string, any> = { 
        status: 'liberado_fornecedor' as any,
        data_liberado_fornecedor: new Date().toISOString(),
        liberado_fornecedor_por: user.id,
      };
      
      // Save contact info if provided
      if (fornecedorEmailContato.trim()) {
        updateData.fornecedor_email_contato = fornecedorEmailContato.trim();
      }
      if (fornecedorTelefoneContato.trim()) {
        updateData.fornecedor_telefone_contato = fornecedorTelefoneContato.trim();
      }
      
      const { data: updatedRows, error: updateError } = await supabase
        .from('solicitacoes')
        .update(updateData)
        .eq('id', aceiteSolicitacao.id)
        .select('id, status');

      // IMPORTANT: With RLS, PostgREST can return success with 0 updated rows.
      if (updateError || !updatedRows || updatedRows.length === 0) {
        const reason = updateError?.message || 'Atualização bloqueada por permissão (nenhuma linha atualizada).';
        console.error('[LIBERAR_FORNECEDOR] Update bloqueado:', {
          reason,
          error: updateError,
          updatedRowsCount: updatedRows?.length ?? 0,
          solicitacaoId: aceiteSolicitacao.id,
          userId: user.id,
          statusAtual: aceiteSolicitacao.status,
        });
        throw new Error(reason);
      }

      // Build history motivo with contact info
      const contatoInfo = fornecedorEmailContato || fornecedorTelefoneContato 
        ? `Contato fornecedor: ${fornecedorEmailContato || '-'} | ${fornecedorTelefoneContato || '-'}`
        : null;

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: aceiteSolicitacao.id,
        user_id: user.id,
        acao: 'liberacao_fornecedor',
        status_anterior: 'aguardando_aceite',
        status_novo: 'liberado_fornecedor',
        motivo: contatoInfo,
      });

      toast({
        title: 'OC Liberada para o Fornecedor!',
        description: 'O Backoffice poderá enviar a OC formalmente ao fornecedor.',
      });

      setAceiteOpen(false);
      fetchSolicitacoes();
    } catch (error: any) {
      console.error('[LIBERAR_FORNECEDOR] Falha completa:', error);
      toast({
        title: 'Erro ao liberar OC',
        description: error?.message || 'Tente novamente.',
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
      const { data: updatedRows, error: updateError } = await supabase
        .from('solicitacoes')
        .update({ status: 'em_processamento' as any })
        .eq('id', aceiteSolicitacao.id)
        .select('id, status');

      // IMPORTANT: With RLS, PostgREST can return success with 0 updated rows.
      if (updateError || !updatedRows || updatedRows.length === 0) {
        const reason = updateError?.message || 'Atualização bloqueada por permissão (nenhuma linha atualizada).';
        console.error('[SOLICITAR_AJUSTE] Update bloqueado:', {
          reason,
          error: updateError,
          updatedRowsCount: updatedRows?.length ?? 0,
          solicitacaoId: aceiteSolicitacao.id,
          userId: user.id,
          statusAtual: aceiteSolicitacao.status,
        });
        throw new Error(reason);
      }

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
      setAceiteAjuste('');
      fetchSolicitacoes();
    } catch (error: any) {
      console.error('[SOLICITAR_AJUSTE] Falha completa:', error);
      toast({
        title: 'Erro ao solicitar ajuste',
        description: error?.message || 'Tente novamente.',
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

  // Pending actions counts for the card
  const pendingCounts = useMemo(() => ({
    corrections: solicitacoes.filter(s => 
      s.status === 'pendente_correcao' || s.status === 'aguardando_informacoes'
    ).length,
    acceptance: solicitacoes.filter(s => s.status === 'aguardando_aceite').length,
    nfBoleto: 0, // Deprecated - keep for compatibility
  }), [solicitacoes]);

  // Tab groups for organized filter bar with visual separation
  const filterTabGroups: TabGroup[] = [
    {
      id: 'em_andamento',
      label: 'Em Andamento',
      tabs: [
        { id: 'todas', label: 'Todas', count: statusCounts.todas, icon: <FileText className="h-3.5 w-3.5" /> },
        { id: 'com_backoffice', label: 'Com Backoffice', count: statusCounts.com_backoffice },
      ],
    },
    {
      id: 'acoes_pendentes',
      label: 'Ações Pendentes',
      icon: <AlertTriangle className="h-3 w-3" />,
      labelClassName: 'text-warning',
      tabs: [
        { id: 'correcoes', label: 'Correções', count: statusCounts.correcoes, variant: 'warning' as const, icon: <AlertTriangle className="h-3.5 w-3.5" />, showCountWhenZero: false },
        { id: 'oc_emitida', label: 'OC/AC Emitida', count: statusCounts.oc_emitida, variant: 'success' as const, showCountWhenZero: false },
        { id: 'liberadas', label: 'Liberadas', count: statusCounts.liberadas, variant: 'default' as const, showCountWhenZero: false },
      ],
    },
    {
      id: 'finalizadas',
      label: 'Finalizadas',
      tabs: [
        { id: 'reprovadas', label: 'Não Aprovadas', count: statusCounts.reprovadas, showCountWhenZero: false },
        { id: 'concluidas', label: 'Finalizadas', count: statusCounts.concluidas, variant: 'success' as const, showCountWhenZero: false },
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
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => openCancelModal(sol)}
              className="bg-white/80 text-destructive hover:bg-white/90 border border-destructive/30 shadow-sm"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
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
        </div>
      );
    }
    
    if (sol.status === 'aguardando_aceite') {
      return (
        <div className="bg-success text-success-foreground px-4 py-2 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">OC DISPONÍVEL</span>
            <span className="text-sm opacity-90">- Visualize e libere para o fornecedor</span>
          </div>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => openAceiteModal(sol)}
            className="bg-white text-green-700 hover:bg-white/90 border border-green-300 shadow-sm"
          >
            <FileText className="h-4 w-4 mr-1" />
            Visualizar OC
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
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => openCancelModal(sol)}
              className="bg-white/80 text-destructive hover:bg-white/90 border border-destructive/30 shadow-sm"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
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
    const actions: React.ReactNode[] = [];
    
    // Ver Anexos button (always visible)
    actions.push(
      <Button
        key="anexos"
        variant="ghost"
        size="sm"
        onClick={() => {
          setAnexosViewSolicitacao(sol);
          if (!anexosExpanded[sol.id]) {
            fetchAnexosSolicitacao(sol.id);
          }
        }}
        className="text-muted-foreground"
      >
        <FileText className="h-4 w-4 mr-1" />
        Anexos
      </Button>
    );
    
    if (sol.status === 'rejeitado') {
      actions.push(
        <Button 
          key="duplicar"
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

    // Transfer button - visible for empreendimento mode or always
    if (viewMode === 'empreendimento' || sol.user_id === effectiveUserId) {
      actions.push(
        <Button
          key="transferir"
          variant="ghost"
          size="sm"
          onClick={() => {
            setTransferSolicitacao(sol);
            setTransferOpen(true);
          }}
          className="text-muted-foreground"
        >
          <UserCheck className="h-4 w-4 mr-1" />
          Transferir
        </Button>
      );
    }

    return <>{actions}</>;
  };

  // Render expanded content for a solicitacao
  const renderExpandedContent = (sol: SolicitacaoComFornecedor) => {
    const fiscalNf = sol.documentosFiscais?.find(d => d.tipo === 'nota_fiscal');
    const fiscalBoleto = sol.documentosFiscais?.find(d => d.tipo === 'boleto');
    const solAnexos = anexosExpanded[sol.id];
    
    // Fetch anexos when expanding if not already loaded
    if (!solAnexos) {
      fetchAnexosSolicitacao(sol.id);
    }
    
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

        {/* Anexos da solicitação */}
        {solAnexos && solAnexos.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Anexos da Solicitação ({solAnexos.length})
            </p>
            <div className="grid gap-2">
              {solAnexos.map((anexo) => (
                <AnexoCard key={anexo.id} anexo={anexo} showTipo />
              ))}
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

        {/* Cancel button for owner */}
        {sol.user_id === effectiveUserId && !['concluida', 'rejeitado', 'cancelado'].includes(sol.status) && (
          <div className="pt-2 border-t">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => openCancelModal(sol)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar Solicitação
            </Button>
          </div>
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
      <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header with improved view selector */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Solicitações</h1>
              <p className="text-muted-foreground text-sm">
                Acompanhe o andamento e tome ações nas suas solicitações
              </p>
            </div>
          </div>
          
          {/* Improved View Mode Selector - more prominent */}
          {userEmpreendimentos.length > 0 && (
            <div className="flex gap-2">
              <Button 
                variant={viewMode === 'minhas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('minhas')}
                className="gap-2"
              >
                <User className="h-4 w-4" />
                Minhas Solicitações
              </Button>
              <Button 
                variant={viewMode === 'empreendimento' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('empreendimento')}
                className="gap-2"
              >
                <Building2 className="h-4 w-4" />
                Por Empreendimento
              </Button>
            </div>
          )}
        </div>

        {/* Pending Actions Card - only shows when there are pending actions */}
        {viewMode === 'minhas' && (
          <PendingActionsCard
            pendingCorrections={pendingCounts.corrections}
            pendingAcceptance={pendingCounts.acceptance}
            pendingNfBoleto={pendingCounts.nfBoleto}
            onViewPending={(filter) => setActiveTab(filter as FilterTab)}
          />
        )}

        {/* Unified Filter Bar with Groups and Search */}
        <FilterBar
          showSearch
          searchPlaceholder="Buscar por protocolo, descrição ou fornecedor..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          tabGroups={filterTabGroups}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as FilterTab)}
        />

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
                {activeTab === 'liberadas' && 'Nenhuma solicitação liberada'}
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

              {/* Campo Escopo Detalhado para Minuta - aparece quando instrumento jurídico não é OC */}
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
                      <span className="text-amber-600">
                        Faltam {100 - editEscopoDetalhado.length} caracteres
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Supplier swap section - only show if there are competitors */}
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
                          <div 
                            className={cn(
                              "p-3 rounded-md border cursor-pointer transition-colors",
                              novoFornecedorEscolhido === 'concorrente1' 
                                ? "border-primary bg-primary/5" 
                                : "hover:bg-muted/50"
                            )}
                            onClick={() => setNovoFornecedorEscolhido('concorrente1')}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                novoFornecedorEscolhido === 'concorrente1' ? "border-primary" : "border-muted-foreground"
                              )}>
                                {novoFornecedorEscolhido === 'concorrente1' && (
                                  <div className="w-2 h-2 rounded-full bg-primary" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{fornecedoresInfo.concorrente1.razao_social || 'Sem razão social'}</p>
                                <p className="text-xs text-muted-foreground">
                                  CNPJ: {fornecedoresInfo.concorrente1.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">Concorrente 1</Badge>
                            </div>
                          </div>
                        )}
                        
                        {fornecedoresInfo.concorrente2 && (
                          <div 
                            className={cn(
                              "p-3 rounded-md border cursor-pointer transition-colors",
                              novoFornecedorEscolhido === 'concorrente2' 
                                ? "border-primary bg-primary/5" 
                                : "hover:bg-muted/50"
                            )}
                            onClick={() => setNovoFornecedorEscolhido('concorrente2')}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                novoFornecedorEscolhido === 'concorrente2' ? "border-primary" : "border-muted-foreground"
                              )}>
                                {novoFornecedorEscolhido === 'concorrente2' && (
                                  <div className="w-2 h-2 rounded-full bg-primary" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{fornecedoresInfo.concorrente2.razao_social || 'Sem razão social'}</p>
                                <p className="text-xs text-muted-foreground">
                                  CNPJ: {fornecedoresInfo.concorrente2.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">Concorrente 2</Badge>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {novoFornecedorEscolhido && (
                        <p className="text-xs text-muted-foreground mt-2">
                          ℹ️ O fornecedor atual será movido para a posição de concorrente
                        </p>
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
                            <span className={cn(
                              "text-sm flex-1",
                              markedForDeletion && "line-through text-muted-foreground"
                            )}>
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
                            
                            {/* Botão de excluir/restaurar */}
                            {markedForDeletion ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setAnexosParaExcluir(prev => prev.filter(id => id !== anexo.id))}
                                className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Restaurar
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
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

      {/* Aceite OC Modal - Two Step Flow */}
      <Dialog open={aceiteOpen} onOpenChange={(open) => {
        setAceiteOpen(open);
        if (!open) {
          setAceiteStep('revisar');
          setShowAjusteField(false);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-success" />
              {aceiteStep === 'revisar' ? 'Visualizar OC' : aceiteStep === 'decidir' ? 'Liberar para Fornecedor' : 'Confirmar Liberação'} - #{aceiteSolicitacao?.protocolo}
            </DialogTitle>
          </DialogHeader>

          {aceiteSolicitacao?.documentoEmitido && (
            <div className="space-y-4 py-2">
              {/* Step 1: Review OC */}
              {aceiteStep === 'revisar' && (
                <>
                  <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-success" />
                        <span className="font-medium text-success">
                          {aceiteSolicitacao.documentoEmitido.tipo_documento} #{aceiteSolicitacao.documentoEmitido.numero_documento}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-4">
                      <p>Valor: <span className="font-medium text-foreground">
                        {aceiteSolicitacao.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span></p>
                      {aceiteSolicitacao.fornecedor && (
                        <p>Fornecedor: <span className="font-medium text-foreground">
                          {aceiteSolicitacao.fornecedor.nome_fantasia || aceiteSolicitacao.fornecedor.razao_social}
                        </span></p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => openOCInNewTab(aceiteSolicitacao.documentoEmitido!)}
                      >
                        <FileText className="h-4 w-4 mr-1" /> Visualizar OC
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => downloadDocumentoEmitido(aceiteSolicitacao.documentoEmitido!)}
                      >
                        <Download className="h-4 w-4 mr-1" /> Baixar OC
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg border">
                    <p className="text-sm text-muted-foreground">
                      <strong>Importante:</strong> Revise a OC com atenção antes de prosseguir. 
                      Verifique se os dados, valores e condições estão corretos.
                    </p>
                  </div>
                </>
              )}

              {/* Step 2: Decide */}
              {aceiteStep === 'decidir' && (
                <>
                  <div className="grid gap-4">
                    {/* Accept Option - renamed to "Liberar para Fornecedor" */}
                    <div 
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        !showAjusteField 
                          ? "border-success bg-success/5" 
                          : "border-muted hover:border-success/50"
                      )}
                      onClick={() => setShowAjusteField(false)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          !showAjusteField ? "border-success bg-success" : "border-muted"
                        )}>
                          {!showAjusteField && <CheckCircle className="h-3 w-3 text-white" />}
                        </div>
                        <div>
                          <p className="font-medium text-success">Liberar para o Fornecedor</p>
                          <p className="text-sm text-muted-foreground">Autorizo o envio formal desta OC ao fornecedor</p>
                        </div>
                      </div>
                    </div>

                    {/* Adjustment Option */}
                    <div 
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        showAjusteField 
                          ? "border-warning bg-warning/5" 
                          : "border-muted hover:border-warning/50"
                      )}
                      onClick={() => setShowAjusteField(true)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          showAjusteField ? "border-warning bg-warning" : "border-muted"
                        )}>
                          {showAjusteField && <RotateCcw className="h-3 w-3 text-white" />}
                        </div>
                        <div>
                          <p className="font-medium text-warning">Solicitar Revisão</p>
                          <p className="text-sm text-muted-foreground">A OC precisa de correções antes do envio</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Adjustment text field - only visible when adjustment is selected */}
                  {showAjusteField && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <Label>Descreva o ajuste necessário *</Label>
                      <Textarea
                        placeholder="Ex: O valor está incorreto, deveria ser R$ X..."
                        value={aceiteAjuste}
                        onChange={(e) => setAceiteAjuste(e.target.value)}
                        rows={3}
                        autoFocus
                      />
                    </div>
                  )}
                </>
              )}

              {/* Step 3: Final Confirmation - "Liberar para Fornecedor" */}
              {aceiteStep === 'confirmar' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 bg-success/10 border border-success/20 rounded-lg text-center">
                    <Send className="h-12 w-12 text-success mx-auto mb-3" />
                    <h3 className="font-semibold text-lg mb-2">Liberar para o Fornecedor</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Você está autorizando o Backoffice a enviar formalmente esta Ordem de Compra para o fornecedor.
                    </p>
                    
                    <div className="bg-background p-3 rounded-lg text-left text-sm space-y-1">
                      <p><span className="text-muted-foreground">Documento:</span> <span className="font-medium">{aceiteSolicitacao?.documentoEmitido?.tipo_documento} #{aceiteSolicitacao?.documentoEmitido?.numero_documento}</span></p>
                      <p><span className="text-muted-foreground">Valor:</span> <span className="font-medium">{aceiteSolicitacao?.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
                      {aceiteSolicitacao?.fornecedor && (
                        <p><span className="text-muted-foreground">Fornecedor:</span> <span className="font-medium">{aceiteSolicitacao.fornecedor.nome_fantasia || aceiteSolicitacao.fornecedor.razao_social}</span></p>
                      )}
                    </div>
                  </div>

                  {/* Supplier Contact Info (optional) */}
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <Label className="font-medium">Dados de Contato do Fornecedor (opcional)</Label>
                    </div>
                    <div className="grid gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="fornecedor_email" className="text-sm text-muted-foreground">E-mail</Label>
                        <Input
                          id="fornecedor_email"
                          type="email"
                          placeholder="fornecedor@empresa.com"
                          value={fornecedorEmailContato}
                          onChange={(e) => setFornecedorEmailContato(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="fornecedor_telefone" className="text-sm text-muted-foreground">Telefone</Label>
                        <Input
                          id="fornecedor_telefone"
                          type="tel"
                          placeholder="(XX) XXXXX-XXXX"
                          value={fornecedorTelefoneContato}
                          onChange={(e) => setFornecedorTelefoneContato(e.target.value)}
                        />
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
                <Button variant="outline" onClick={() => setAceiteOpen(false)}>
                  Fechar
                </Button>
                <Button onClick={() => setAceiteStep('decidir')}>
                  Liberar para Fornecedor
                </Button>
              </>
            )}
            
            {aceiteStep === 'decidir' && (
              <>
                <Button variant="outline" onClick={() => setAceiteStep('revisar')} disabled={aceiteLoading}>
                  Voltar
                </Button>
                {showAjusteField ? (
                  <Button 
                    variant="default"
                    className="bg-warning hover:bg-warning/90 text-warning-foreground"
                    onClick={handleSolicitarAjuste} 
                    disabled={aceiteLoading || !aceiteAjuste.trim()}
                  >
                    {aceiteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                    Solicitar Ajuste
                  </Button>
                ) : (
                  <Button 
                    className="bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => setAceiteStep('confirmar')}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Liberar para Fornecedor
                  </Button>
                )}
              </>
            )}
            
            {aceiteStep === 'confirmar' && (
              <>
                <Button variant="outline" onClick={() => setAceiteStep('decidir')} disabled={aceiteLoading}>
                  Voltar
                </Button>
                <Button 
                  className="bg-success hover:bg-success/90 text-success-foreground"
                  onClick={handleAceitarOC} 
                  disabled={aceiteLoading}
                >
                  {aceiteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Confirmar Liberação
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Cancel Modal */}
      <ActionModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
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
                <p className="text-sm font-medium text-warning">
                  ⚠️ Esta solicitação já possui OC emitida
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  O cancelamento será enviado para aprovação do Backoffice antes de ser efetivado.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Motivo do cancelamento (obrigatório)</Label>
                <Textarea
                  placeholder="Informe o motivo do cancelamento..."
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja cancelar esta solicitação? Esta ação não pode ser desfeita.
              </p>
              <div className="space-y-2">
                <Label>Motivo do cancelamento (opcional)</Label>
                <Textarea
                  placeholder="Informe o motivo do cancelamento..."
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}
        </div>
      </ActionModal>

      {/* Anexos View Dialog (read-only) */}
      <Dialog open={!!anexosViewSolicitacao} onOpenChange={(open) => !open && setAnexosViewSolicitacao(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Anexos - #{anexosViewSolicitacao?.protocolo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {anexosViewSolicitacao && anexosExpanded[anexosViewSolicitacao.id] ? (
              anexosExpanded[anexosViewSolicitacao.id].length > 0 ? (
                anexosExpanded[anexosViewSolicitacao.id].map((anexo) => (
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

      {/* Transfer Ownership Modal */}
      {transferSolicitacao && (
        <TransferOwnershipModal
          open={transferOpen}
          onOpenChange={setTransferOpen}
          solicitacaoId={transferSolicitacao.id}
          solicitacaoProtocolo={transferSolicitacao.protocolo}
          currentUserId={transferSolicitacao.user_id}
          currentUserName={transferSolicitacao.solicitante_nome || 'Solicitante'}
          empreendimento={transferSolicitacao.empreendimento}
          onTransferred={fetchSolicitacoes}
        />
      )}
    </>
  );
}
