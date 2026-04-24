import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SolicitacaoCardSkeletonList } from '@/components/ui/SolicitacaoCardSkeleton';
import { Button } from '@/components/ui/button';
import { VirtualizedList } from '@/components/ui/VirtualizedList';

import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';
import { 
  NATUREZA_ORCAMENTARIA_LABELS,
  ANEXO_LABELS,
  EMPREENDIMENTO_LABELS,
  type Solicitacao,
  type NaturezaOrcamentaria,
  type Fornecedor,
  type DocumentoEmitido,
  type DocumentoFiscal,
} from '@/types';
import { Loader2, FileText, AlertTriangle, User, Building2, Download, CheckCircle, X, PartyPopper } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContextualEmptyState } from '@/components/ui/ContextualEmptyState';
import { saveAs } from 'file-saver';
import type { UploadedFile } from '@/components/FileUpload';
import { useToast } from '@/hooks/use-toast';
import { TransferOwnershipModal } from '@/components/TransferOwnershipModal';
import { exportToExcel } from '@/lib/export-utils';
import { useFavorites } from '@/hooks/useFavorites';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

// Design System Components
import { FilterBar, type TabGroup } from '@/components/ui/FilterBar';
import { PendingHeaderChips } from '@/components/solicitante/PendingHeaderChips';

// Extracted components
// SolicitanteKPIs removed — FilterBar tabs provide the same info
import { SolicitanteModals } from '@/components/solicitante/SolicitanteModals';
import { SolicitanteSolicitacaoCard } from '@/components/solicitante/SolicitanteSolicitacaoCard';
import type { SolicitacaoComFornecedor, RejectionInfo, InfoRequest } from '@/components/solicitante/types';

const ATTACHMENT_TYPES = {
  chamado_preventiva: 'Chamado / Preventiva (Infraspeak)',
  escopo_detalhado: 'Escopo Detalhado',
  mapa_cotacao: 'Mapa de Cotação',
  orcamento_escolhido: 'Orçamento Escolhido',
  orcamento_concorrente_1: 'Orçamento Concorrente 1',
  orcamento_concorrente_2: 'Orçamento Concorrente 2',
} as const;

type FilterTab = 'todas' | 'com_backoffice' | 'correcoes' | 'informacoes' | 'oc_emitida' | 'liberadas' | 'enviadas' | 'canceladas' | 'ciencia' | 'concluidas';
type ViewMode = 'minhas' | 'empreendimento';

export default function MinhasSolicitacoes() {
  const { user, effectiveProfile, isImpersonating } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const effectiveUserId = (isImpersonating ? effectiveProfile?.id : user?.id) ?? user?.id;
  
  const { empreendimentos: userEmpreendimentos, hasAllAccess } = useUserEmpreendimentos(effectiveUserId);
  const { favoriteSet, toggleFavorite, sortWithFavorites } = useFavorites();

  const urlSearch = searchParams.get('search') || '';
  const urlFilter = searchParams.get('filter') || '';
  const createdProtocolo = searchParams.get('created') || '';
  
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoComFornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>(urlFilter ? (urlFilter as FilterTab) : 'todas');
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, RejectionInfo>>({});
  const [infoRequests, setInfoRequests] = useState<Record<string, InfoRequest>>({});
  const [viewMode, setViewMode] = useState<ViewMode>((urlSearch || urlFilter) ? 'empreendimento' : 'minhas');
  
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [empreendimentoFilter, setEmpreendimentoFilter] = useState('todos');
  const [showCreatedBanner, setShowCreatedBanner] = useState(!!createdProtocolo);
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at'>('updated_at');

  // Auto-dismiss success banner
  useEffect(() => {
    if (createdProtocolo) {
      setShowCreatedBanner(true);
      const timer = setTimeout(() => setShowCreatedBanner(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [createdProtocolo]);

  // Keyboard shortcut: "/" focuses the search input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      const input = document.querySelector<HTMLInputElement>(
        'input[placeholder^="Buscar por protocolo"]'
      );
      if (input) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  
  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editingSolicitacao, setEditingSolicitacao] = useState<Solicitacao | null>(null);
  const [editDescricao, setEditDescricao] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editNaturezaOrcamentaria, setEditNaturezaOrcamentaria] = useState<NaturezaOrcamentaria | ''>('');
  const [editEscopoDetalhado, setEditEscopoDetalhado] = useState('');
  const [editAnexos, setEditAnexos] = useState<Record<string, UploadedFile | null>>({});
  const [editOutrosAnexos, setEditOutrosAnexos] = useState<UploadedFile[]>([]);
  const [existingAnexos, setExistingAnexos] = useState<Array<{ id: string; tipo: string; nome_arquivo: string; storage_path: string }>>([]);
  const [anexosParaExcluir, setAnexosParaExcluir] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editMensagemCorrecao, setEditMensagemCorrecao] = useState('');
  
  // Supplier swap state
  const [trocarFornecedor, setTrocarFornecedor] = useState(false);
  const [novoFornecedorEscolhido, setNovoFornecedorEscolhido] = useState<'concorrente1' | 'concorrente2' | 'novo' | null>(null);
  const [novoFornecedorBuscado, setNovoFornecedorBuscado] = useState<Fornecedor | null>(null);
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

  // Anexos state
  const [anexosExpanded, setAnexosExpanded] = useState<Record<string, Array<{ id: string; tipo: string; nome_arquivo: string; storage_path: string; mime_type: string | null; tamanho_bytes: number | null }>>>({});
  const [anexosViewSolicitacao, setAnexosViewSolicitacao] = useState<SolicitacaoComFornecedor | null>(null);

  // Aceite OC modal state
  const [aceiteOpen, setAceiteOpen] = useState(false);
  const [aceiteSolicitacao, setAceiteSolicitacao] = useState<SolicitacaoComFornecedor | null>(null);
  const [aceiteAjuste, setAceiteAjuste] = useState('');
  const [aceiteLoading, setAceiteLoading] = useState(false);
  const [aceiteStep, setAceiteStep] = useState<'revisar' | 'tipo_entrega' | 'confirmar'>('revisar');
  const [fornecedorEmailContato, setFornecedorEmailContato] = useState('');
  const [fornecedorTelefoneContato, setFornecedorTelefoneContato] = useState('');
  const [showAjusteField, setShowAjusteField] = useState(false);
  const [tipoEntrega, setTipoEntrega] = useState<'produto' | 'servico' | null>(null);
  const [dataExecucaoServico, setDataExecucaoServico] = useState('');
  const [evidenciaFile, setEvidenciaFile] = useState<File | null>(null);
  const [motivoOCAntes, setMotivoOCAntes] = useState('');

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

  // ==================== Data Fetching ====================

  useEffect(() => {
    if (effectiveUserId) fetchSolicitacoes();
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
        cancelamento_ciencia_em,
        fornecedor:fornecedores!solicitacoes_fornecedor_id_fkey(id, razao_social, nome_fantasia)
      `)
      .order('created_at', { ascending: false })
      .limit(500);

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
        ? [...new Set(data.map((s: any) => s.user_id))] : [];
      
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles').select('id, full_name').in('id', userIds);
        if (profiles) {
          profilesMap = profiles.reduce((acc: Record<string, string>, p: any) => {
            acc[p.id] = p.full_name || p.email || 'Usuário';
            return acc;
          }, {});
        }
      }

      const allIds = data.map((s: any) => s.id);
      const statusesNeedingDocs = ['oc_ac_emitida', 'concluida', 'aguardando_aceite', 'aguardando_nf_boleto', 'nf_boleto_enviados', 'enviado_pagamento', 'liberado_fornecedor', 'enviado_fornecedor'];
      const idsNeedingDocs = data.filter((s: any) => statusesNeedingDocs.includes(s.status)).map((s: any) => s.id);

      let docsMap: Record<string, any> = {};
      let docsArrayMap: Record<string, any[]> = {};
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
          if (!docsArrayMap[doc.solicitacao_id]) docsArrayMap[doc.solicitacao_id] = [];
          docsArrayMap[doc.solicitacao_id].push(doc);
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
        documentosEmitidos: docsArrayMap[sol.id] || [],
        documentosFiscais: fiscaisMap[sol.id] || [],
        solicitante_nome: profilesMap[sol.user_id] || null,
      } as SolicitacaoComFornecedor));
      
      setSolicitacoes(enrichedData);
      
      const needsCorrectionIds = data.filter((s: any) => s.status === 'rejeitado' || s.status === 'pendente_correcao' || s.status === 'cancelado').map((s: any) => s.id);
      const infoIds = data.filter((s: any) => s.status === 'aguardando_informacoes').map((s: any) => s.id);

      const [correctionResult, infoResult] = await Promise.all([
        needsCorrectionIds.length > 0
          ? supabase.from('historico_solicitacoes').select('solicitacao_id, motivo, created_at, anexos_com_problema')
              .in('solicitacao_id', needsCorrectionIds).in('status_novo', ['rejeitado', 'pendente_correcao', 'cancelado'])
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: null }),
        infoIds.length > 0
          ? supabase.from('historico_solicitacoes').select('solicitacao_id, motivo, created_at, anexos_com_problema')
              .in('solicitacao_id', infoIds).eq('status_novo', 'aguardando_informacoes')
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: null }),
      ]);

      if (correctionResult.data) {
        const reasons: Record<string, RejectionInfo> = {};
        correctionResult.data.forEach((h: any) => { if (!reasons[h.solicitacao_id]) reasons[h.solicitacao_id] = h; });
        setRejectionReasons(reasons);
      }
      if (infoResult.data) {
        const requests: Record<string, InfoRequest> = {};
        infoResult.data.forEach((h: any) => { if (!requests[h.solicitacao_id]) requests[h.solicitacao_id] = h; });
        setInfoRequests(requests);
      }
    }
    setLoading(false);
  };

  // ==================== Filtering & Sorting ====================

  const sortedAndFilteredSolicitacoes = useMemo(() => {
    let filtered = [...solicitacoes];

    // Empreendimento filter (when in empreendimento view mode)
    if (viewMode === 'empreendimento' && empreendimentoFilter !== 'todos') {
      filtered = filtered.filter(s => s.empreendimento === empreendimentoFilter);
    }
    
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(s => 
        s.protocolo.toLowerCase().includes(searchLower) ||
        s.descricao.toLowerCase().includes(searchLower) ||
        s.fornecedor?.razao_social?.toLowerCase().includes(searchLower) ||
        s.fornecedor?.nome_fantasia?.toLowerCase().includes(searchLower)
      );
    }
    
    switch (activeTab) {
      case 'com_backoffice':
        filtered = filtered.filter(s => ['recebido', 'em_analise', 'aprovado', 'em_processamento'].includes(s.status));
        break;
      case 'correcoes':
        filtered = filtered.filter(s => s.status === 'pendente_correcao');
        break;
      case 'informacoes':
        filtered = filtered.filter(s => s.status === 'aguardando_informacoes');
        break;
      case 'oc_emitida':
        filtered = filtered.filter(s => s.status === 'aguardando_aceite' || s.status === 'oc_ac_emitida');
        break;
      case 'liberadas':
        filtered = filtered.filter(s => s.status === 'liberado_fornecedor' || s.status === 'aguardando_execucao');
        break;
      case 'enviadas':
        filtered = filtered.filter(s => ['enviado_fornecedor', 'aguardando_nf_boleto', 'nf_boleto_enviados'].includes(s.status));
        break;
      case 'canceladas':
        filtered = filtered.filter(s => s.status === 'rejeitado' || s.status === 'cancelado');
        break;
      case 'ciencia':
        filtered = filtered.filter(s => s.status === 'cancelado' && !(s as any).cancelamento_ciencia_em);
        break;
      case 'concluidas':
        filtered = filtered.filter(s => s.status === 'concluida' || s.status === 'enviado_pagamento');
        break;
    }
    
    filtered.sort((a, b) => {
      const priorityStatuses = ['pendente_correcao', 'aguardando_informacoes', 'aguardando_aceite', 'liberado_fornecedor'];
      const aPriority = priorityStatuses.includes(a.status) ? 0 : 1;
      const bPriority = priorityStatuses.includes(b.status) ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b[sortBy]).getTime() - new Date(a[sortBy]).getTime();
    });
    
    return sortWithFavorites(filtered);
  }, [solicitacoes, activeTab, debouncedSearch, sortWithFavorites, viewMode, empreendimentoFilter, sortBy]);

  // Base filtered (search + empreendimento) — used for tab counts so they reflect active filters
  const solicitacoesFiltradasBase = useMemo(() => {
    let filtered = [...solicitacoes];
    if (viewMode === 'empreendimento' && empreendimentoFilter !== 'todos') {
      filtered = filtered.filter(s => s.empreendimento === empreendimentoFilter);
    }
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(s =>
        s.protocolo.toLowerCase().includes(searchLower) ||
        s.descricao.toLowerCase().includes(searchLower) ||
        s.fornecedor?.razao_social?.toLowerCase().includes(searchLower) ||
        s.fornecedor?.nome_fantasia?.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [solicitacoes, viewMode, empreendimentoFilter, debouncedSearch]);

  const statusCounts = useMemo(() => ({
    todas: solicitacoesFiltradasBase.length,
    com_backoffice: solicitacoesFiltradasBase.filter(s => ['recebido', 'em_analise', 'aprovado', 'em_processamento'].includes(s.status)).length,
    correcoes: solicitacoesFiltradasBase.filter(s => s.status === 'pendente_correcao').length,
    informacoes: solicitacoesFiltradasBase.filter(s => s.status === 'aguardando_informacoes').length,
    oc_emitida: solicitacoesFiltradasBase.filter(s => s.status === 'aguardando_aceite' || s.status === 'oc_ac_emitida').length,
    liberadas: solicitacoesFiltradasBase.filter(s => s.status === 'liberado_fornecedor' || s.status === 'aguardando_execucao').length,
    enviadas: solicitacoesFiltradasBase.filter(s => ['enviado_fornecedor', 'aguardando_nf_boleto', 'nf_boleto_enviados'].includes(s.status)).length,
    canceladas: solicitacoesFiltradasBase.filter(s => s.status === 'rejeitado' || s.status === 'cancelado').length,
    ciencia: solicitacoesFiltradasBase.filter(s => s.status === 'cancelado' && !(s as any).cancelamento_ciencia_em).length,
    concluidas: solicitacoesFiltradasBase.filter(s => s.status === 'concluida' || s.status === 'enviado_pagamento').length,
  }), [solicitacoesFiltradasBase]);

  // ==================== Unread Messages ====================

  const solicitacaoIds = useMemo(() => solicitacoes.map(s => s.id), [solicitacoes]);
  const { unreadMap, markAsRead } = useUnreadMessages({
    solicitacaoIds,
    userId: effectiveUserId,
    isBackoffice: false,
  });

  // ==================== Helpers ====================

  const formatCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const number = parseInt(digits) / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const toggleExpand = (id: string) => {
    const newExpanded = expandedId === id ? null : id;
    setExpandedId(newExpanded);
    if (newExpanded && unreadMap[id]) markAsRead(id);
  };

  const POST_OC_STATUSES = ['oc_ac_emitida', 'aguardando_aceite', 'liberado_fornecedor', 'enviado_fornecedor', 'aguardando_nf_boleto', 'nf_boleto_enviados', 'enviado_pagamento'];
  const isPostOCStatus = (status: string) => POST_OC_STATUSES.includes(status);

  const getRequiredAttachments = (sol: Solicitacao) => {
    if (sol.tipo === 'OC') {
      return [
        { tipo: 'chamado_preventiva', label: ATTACHMENT_TYPES.chamado_preventiva, required: false },
        { tipo: 'orcamento_escolhido', label: ATTACHMENT_TYPES.orcamento_escolhido, required: false },
      ];
    }
    if (sol.tipo === 'AC' && sol.emergencial) {
      return [
        { tipo: 'chamado_preventiva', label: ATTACHMENT_TYPES.chamado_preventiva, required: false },
        { tipo: 'orcamento_escolhido', label: ATTACHMENT_TYPES.orcamento_escolhido, required: false },
      ];
    }
    if (sol.tipo === 'AC' && !sol.emergencial) {
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

  // ==================== Handlers ====================

  const openEditModal = async (sol: Solicitacao) => {
    setEditingSolicitacao(sol);
    setEditDescricao(sol.descricao);
    setEditValor(String(Math.round(sol.valor * 100)));
    setEditNaturezaOrcamentaria(sol.natureza_orcamentaria);
    setEditEscopoDetalhado((sol as any).escopo_detalhado_minuta || '');
    setEditAnexos({});
    setEditOutrosAnexos([]);
    setExistingAnexos([]);
    setAnexosParaExcluir([]);
    setTrocarFornecedor(false);
    setNovoFornecedorEscolhido(null);
    setNovoFornecedorBuscado(null);
    setFornecedoresInfo({ principal: null, concorrente1: null, concorrente2: null });
    setEditOpen(true);
    
    const { data: anexosData } = await supabase
      .from('anexos').select('id, tipo, nome_arquivo, storage_path').eq('solicitacao_id', sol.id);
    if (anexosData) setExistingAnexos(anexosData);
    
    const fornecedorIds = [sol.fornecedor_id, sol.fornecedor_concorrente_1_id, sol.fornecedor_concorrente_2_id].filter(Boolean) as string[];
    if (fornecedorIds.length > 0) {
      const { data: fornecedoresData } = await supabase
        .from('fornecedores').select('id, cnpj, razao_social').in('id', fornecedorIds);
      if (fornecedoresData) {
        const map = Object.fromEntries(fornecedoresData.map(f => [f.id, f]));
        setFornecedoresInfo({
          principal: sol.fornecedor_id ? map[sol.fornecedor_id] || null : null,
          concorrente1: sol.fornecedor_concorrente_1_id ? map[sol.fornecedor_concorrente_1_id] || null : null,
          concorrente2: sol.fornecedor_concorrente_2_id ? map[sol.fornecedor_concorrente_2_id] || null : null,
        });
      }
    }
  };

  const openCancelModal = (sol: Solicitacao) => {
    setCancelSolicitacao(sol);
    setMotivoCancelamento('');
    setCancelOpen(true);
  };

  const handleCancelar = async () => {
    if (!cancelSolicitacao || !user) return;
    setCancelLoading(true);
    try {
      await supabase.from('solicitacoes').update({ cancelamento_pendente: true } as any).eq('id', cancelSolicitacao.id);
      await supabase.from('oc_acompanhamento' as any).insert({
        solicitacao_id: cancelSolicitacao.id, tipo_acao: 'cancelamento_solicitado',
        justificativa: motivoCancelamento.trim(), user_id: user.id,
      } as any);
      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: cancelSolicitacao.id, user_id: user.id, acao: 'cancelamento_solicitado',
        status_anterior: cancelSolicitacao.status, status_novo: cancelSolicitacao.status,
        motivo: motivoCancelamento.trim(),
      });
      toast({ title: 'Cancelamento solicitado', description: 'Sua solicitação de cancelamento foi enviada para aprovação do Backoffice.' });
      setCancelOpen(false);
      fetchSolicitacoes();
    } catch (error: any) {
      toast({ title: 'Erro ao cancelar', description: error?.message || 'Não foi possível cancelar a solicitação.', variant: 'destructive' });
    } finally {
      setCancelLoading(false);
    }
  };

  const fetchAnexosSolicitacao = async (solicitacaoId: string) => {
    if (anexosExpanded[solicitacaoId]) return;
    const { data } = await supabase.from('anexos')
      .select('id, tipo, nome_arquivo, storage_path, mime_type, tamanho_bytes')
      .eq('solicitacao_id', solicitacaoId).order('created_at');
    if (data) setAnexosExpanded(prev => ({ ...prev, [solicitacaoId]: data }));
  };

  const handleDuplicate = (sol: SolicitacaoComFornecedor) => {
    navigate('/nova-solicitacao', { 
      state: { duplicateFrom: {
        tipo: sol.tipo, empreendimento: sol.empreendimento, natureza_orcamentaria: sol.natureza_orcamentaria,
        tipo_contratacao: sol.tipo_contratacao, descricao: sol.descricao, valor: sol.valor,
        fornecedor_id: sol.fornecedor_id, origem_custo: sol.origem_custo, cliente_id: sol.cliente_id, emergencial: sol.emergencial,
      }}
    });
  };

  const uploadNewAnexos = async (solicitacaoId: string) => {
    const filesToUpload = Object.entries(editAnexos).filter(([_, file]) => file !== null);
    const allUploads = filesToUpload.map(async ([tipo, uploadedFile]) => {
      if (!uploadedFile) return;
      const { file } = uploadedFile;
      const fileExt = file.name.split('.').pop();
      const filePath = `${solicitacaoId}/${tipo}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('anexos').upload(filePath, file);
      if (uploadError) throw new Error(`Erro no upload de ${ATTACHMENT_TYPES[tipo as keyof typeof ATTACHMENT_TYPES] || tipo}: ${uploadError.message}`);
      const { error: dbError } = await supabase.from('anexos').insert({
        solicitacao_id: solicitacaoId, tipo, nome_arquivo: file.name, storage_path: filePath, mime_type: file.type, tamanho_bytes: file.size,
      });
      if (dbError) throw new Error(`Erro ao salvar registro: ${dbError.message}`);
    });

    // Upload "outros anexos" extras
    const outrosUploads = editOutrosAnexos.map(async (uploadedFile, index) => {
      const { file } = uploadedFile;
      const fileExt = file.name.split('.').pop();
      const tipo = `outros_${Date.now()}_${index}`;
      const filePath = `${solicitacaoId}/${tipo}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('anexos').upload(filePath, file);
      if (uploadError) throw new Error(`Erro no upload de ${file.name}: ${uploadError.message}`);
      const { error: dbError } = await supabase.from('anexos').insert({
        solicitacao_id: solicitacaoId, tipo, nome_arquivo: file.name, storage_path: filePath, mime_type: file.type, tamanho_bytes: file.size,
      });
      if (dbError) throw new Error(`Erro ao salvar registro: ${dbError.message}`);
    });

    await Promise.all([...allUploads, ...outrosUploads]);
  };

  const handleResubmit = async () => {
    if (!editingSolicitacao || !user) return;
    if (['pendente_correcao', 'aguardando_informacoes'].includes(editingSolicitacao.status) && !editMensagemCorrecao.trim()) {
      toast({ title: 'Mensagem obrigatória', description: 'Descreva o que foi corrigido antes de reenviar.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const valorNumerico = parseFloat(editValor.replace(/\D/g, '')) / 100 || 0;
      const statusAnterior = editingSolicitacao.status;
      
      if (anexosParaExcluir.length > 0) {
        const storagePaths = existingAnexos.filter(a => anexosParaExcluir.includes(a.id)).map(a => a.storage_path);
        if (storagePaths.length > 0) await supabase.storage.from('anexos').remove(storagePaths);
        await supabase.from('anexos').delete().in('id', anexosParaExcluir);
      }
      
      await uploadNewAnexos(editingSolicitacao.id);
      
      const updateData: Record<string, any> = {
        descricao: editDescricao, valor: valorNumerico,
        natureza_orcamentaria: editNaturezaOrcamentaria as any, status: 'recebido',
        escopo_detalhado_minuta: editEscopoDetalhado.trim() || null,
      };
      
      if (trocarFornecedor && novoFornecedorEscolhido) {
        const antigoFornecedorId = editingSolicitacao.fornecedor_id;
        if (novoFornecedorEscolhido === 'concorrente1' && fornecedoresInfo.concorrente1) {
          updateData.fornecedor_id = editingSolicitacao.fornecedor_concorrente_1_id;
          updateData.fornecedor_concorrente_1_id = antigoFornecedorId;
        } else if (novoFornecedorEscolhido === 'concorrente2' && fornecedoresInfo.concorrente2) {
          updateData.fornecedor_id = editingSolicitacao.fornecedor_concorrente_2_id;
          updateData.fornecedor_concorrente_2_id = antigoFornecedorId;
        } else if (novoFornecedorEscolhido === 'novo' && novoFornecedorBuscado) {
          updateData.fornecedor_id = novoFornecedorBuscado.id;
          if (!editingSolicitacao.fornecedor_concorrente_1_id) updateData.fornecedor_concorrente_1_id = antigoFornecedorId;
          else if (!editingSolicitacao.fornecedor_concorrente_2_id) updateData.fornecedor_concorrente_2_id = antigoFornecedorId;
        }
      }
      
      const { error: updateError } = await supabase.from('solicitacoes').update(updateData).eq('id', editingSolicitacao.id);
      if (updateError) throw new Error(`Erro ao atualizar solicitação: ${updateError.message}`);

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: editingSolicitacao.id, user_id: user.id,
        acao: statusAnterior === 'aguardando_informacoes' ? 'resposta_informacoes' : 'reenvio',
        status_anterior: statusAnterior, status_novo: 'recebido',
      });

      if (editMensagemCorrecao.trim()) {
        await supabase.from('solicitacao_mensagens').insert({
          solicitacao_id: editingSolicitacao.id, user_id: user.id, mensagem: editMensagemCorrecao.trim(),
        });
      }

      // Notify Google Chat spaces (solicitação corrigida)
      try {
        await supabase.functions.invoke('gchat-notify-oc', {
          body: {
            tipo: 'solicitacao_corrigida',
            protocolo: editingSolicitacao.protocolo,
            descricao: editDescricao.substring(0, 200),
            empreendimento: editingSolicitacao.empreendimento,
            solicitacao_id: editingSolicitacao.id,
          },
        });
      } catch (gchatError) {
        console.error('[GCHAT] Erro ao notificar correção:', gchatError);
      }

      toast({ title: 'Solicitação reenviada!', description: 'Sua correção foi enviada para análise.' });
      setEditOpen(false);
      setAnexosParaExcluir([]);
      setEditMensagemCorrecao('');
      fetchSolicitacoes();
    } catch (error: any) {
      toast({ title: 'Erro ao reenviar', description: error?.message || 'Erro desconhecido.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadDocumentoEmitido = async (doc: DocumentoEmitido) => {
    try {
      const { data, error } = await supabase.storage.from('documentos-emitidos').download(doc.storage_path);
      if (error) throw error;
      if (data) saveAs(data, doc.nome_arquivo);
    } catch {
      toast({ title: 'Erro ao baixar documento', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  const openAceiteModal = (sol: SolicitacaoComFornecedor) => {
    setAceiteSolicitacao(sol);
    setAceiteAjuste('');
    setAceiteStep('revisar');
    setShowAjusteField(false);
    setFornecedorEmailContato(sol.fornecedor?.email || '');
    setFornecedorTelefoneContato(sol.fornecedor?.telefone || '');
    setAceiteOpen(true);
  };

  const openOCInNewTab = async (doc: DocumentoEmitido) => {
    try {
      const { data, error } = await supabase.storage.from('documentos-emitidos').createSignedUrl(doc.storage_path, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch {
      toast({ title: 'Erro ao abrir documento', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleAceitarOC = async () => {
    if (!aceiteSolicitacao || !user) return;
    setAceiteLoading(true);
    try {
      const isServico = tipoEntrega === 'servico';
      const targetStatus = isServico ? 'aguardando_execucao' : 'liberado_fornecedor';
      
      const updateData: Record<string, any> = { 
        status: targetStatus as any,
        data_liberado_fornecedor: new Date().toISOString(),
        liberado_fornecedor_por: user.id,
        tipo_entrega: tipoEntrega,
      };
      if (isServico && dataExecucaoServico) {
        updateData.data_execucao_servico = dataExecucaoServico;
      }
      if (fornecedorEmailContato.trim()) updateData.fornecedor_email_contato = fornecedorEmailContato.trim();
      if (fornecedorTelefoneContato.trim()) updateData.fornecedor_telefone_contato = fornecedorTelefoneContato.trim();
      
      const { data: updatedRows, error: updateError } = await supabase
        .from('solicitacoes').update(updateData).eq('id', aceiteSolicitacao.id).select('id, status');

      if (updateError || !updatedRows || updatedRows.length === 0) {
        throw new Error(updateError?.message || 'Atualização bloqueada por permissão.');
      }

      // Upload evidence file for service
      if (isServico && evidenciaFile) {
        const fileExt = evidenciaFile.name.split('.').pop();
        const storagePath = `${aceiteSolicitacao.id}/evidencia_servico_${Date.now()}.${fileExt}`;
        await supabase.storage.from('anexos').upload(storagePath, evidenciaFile);
        await supabase.from('anexos').insert({
          solicitacao_id: aceiteSolicitacao.id,
          tipo: 'evidencia_servico',
          nome_arquivo: evidenciaFile.name,
          storage_path: storagePath,
          mime_type: evidenciaFile.type,
          tamanho_bytes: evidenciaFile.size,
        });
      }

      const contatoInfo = fornecedorEmailContato || fornecedorTelefoneContato 
        ? `Contato fornecedor: ${fornecedorEmailContato || '-'} | ${fornecedorTelefoneContato || '-'}` : null;
      const motivoOCAntesPart = motivoOCAntes.trim() ? ` | Motivo OC antecipada: ${motivoOCAntes.trim()}` : '';
      const motivoText = isServico 
        ? `Tipo: Serviço | Data execução: ${dataExecucaoServico || '-'}${motivoOCAntesPart}${contatoInfo ? ` | ${contatoInfo}` : ''}`
        : `Tipo: Produto${contatoInfo ? ` | ${contatoInfo}` : ''}`;

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: aceiteSolicitacao.id, user_id: user.id, acao: 'liberacao_fornecedor',
        status_anterior: 'aguardando_aceite', status_novo: targetStatus, motivo: motivoText,
      });

      toast({ 
        title: isServico ? 'Serviço Registrado!' : 'OC Liberada para o Fornecedor!', 
        description: isServico 
          ? 'A evidência foi enviada. O Backoffice verificará e enviará a OC.'
          : 'O Backoffice poderá enviar a OC formalmente ao fornecedor.' 
      });
      setAceiteOpen(false);
      setTipoEntrega(null);
      setDataExecucaoServico('');
      setEvidenciaFile(null);
      setMotivoOCAntes('');
      fetchSolicitacoes();
    } catch (error: any) {
      toast({ title: 'Erro ao liberar OC', description: error?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setAceiteLoading(false);
    }
  };

  const handleSolicitarAjuste = async () => {
    if (!aceiteSolicitacao || !user || !aceiteAjuste.trim()) return;
    setAceiteLoading(true);
    try {
      const { data: updatedRows, error: updateError } = await supabase
        .from('solicitacoes').update({ status: 'recebido' as any }).eq('id', aceiteSolicitacao.id).select('id, status');

      if (updateError || !updatedRows || updatedRows.length === 0) {
        throw new Error(updateError?.message || 'Atualização bloqueada por permissão.');
      }

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: aceiteSolicitacao.id, user_id: user.id, acao: 'ajuste_solicitado',
        status_anterior: 'aguardando_aceite', status_novo: 'recebido', motivo: aceiteAjuste,
      });

      toast({ title: 'Ajuste solicitado', description: 'O backoffice receberá seu pedido de ajuste.' });
      setAceiteOpen(false);
      setAceiteAjuste('');
      fetchSolicitacoes();
    } catch (error: any) {
      toast({ title: 'Erro ao solicitar ajuste', description: error?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setAceiteLoading(false);
    }
  };

  const openNfBoletoModal = (sol: SolicitacaoComFornecedor) => {
    setNfBoletoSolicitacao(sol);
    setNfFile(null); setBoletoFile(null);
    setDataEmissaoNF(''); setDataVencimentoBoleto('');
    setPagamentoAntecipado(false); setJustificativaAntecipado('');
    setNfBoletoOpen(true);
  };

  const handleEnviarNfBoleto = async () => {
    if (!nfBoletoSolicitacao || !user) return;
    if (!boletoFile) { toast({ title: 'Boleto obrigatório', variant: 'destructive' }); return; }
    if (!pagamentoAntecipado && !nfFile) { toast({ title: 'NF obrigatória', variant: 'destructive' }); return; }
    if (!dataVencimentoBoleto) { toast({ title: 'Data de vencimento obrigatória', variant: 'destructive' }); return; }

    setNfBoletoLoading(true);
    try {
      if (nfFile) {
        const nfPath = `${user.id}/${nfBoletoSolicitacao.id}/nf_${Date.now()}.${nfFile.name.split('.').pop()}`;
        const { error: nfUploadError } = await supabase.storage.from('documentos-fiscais').upload(nfPath, nfFile);
        if (nfUploadError) throw new Error(`Erro no upload da NF: ${nfUploadError.message}`);
        const { error: nfDbError } = await supabase.from('documentos_fiscais').insert({
          solicitacao_id: nfBoletoSolicitacao.id, tipo: 'nota_fiscal', storage_path: nfPath,
          nome_arquivo: nfFile.name, mime_type: nfFile.type, tamanho_bytes: nfFile.size,
          data_emissao_nf: dataEmissaoNF || null, pagamento_antecipado: false, user_id: user.id,
        });
        if (nfDbError) throw new Error(`Erro ao salvar NF: ${nfDbError.message}`);
      }

      const boletoPath = `${user.id}/${nfBoletoSolicitacao.id}/boleto_${Date.now()}.${boletoFile.name.split('.').pop()}`;
      const { error: boletoUploadError } = await supabase.storage.from('documentos-fiscais').upload(boletoPath, boletoFile);
      if (boletoUploadError) throw new Error(`Erro no upload do Boleto: ${boletoUploadError.message}`);

      const { error: boletoDbError } = await supabase.from('documentos_fiscais').insert({
        solicitacao_id: nfBoletoSolicitacao.id, tipo: 'boleto', storage_path: boletoPath,
        nome_arquivo: boletoFile.name, mime_type: boletoFile.type, tamanho_bytes: boletoFile.size,
        data_vencimento_boleto: dataVencimentoBoleto, pagamento_antecipado: pagamentoAntecipado,
        justificativa_antecipado: pagamentoAntecipado ? justificativaAntecipado : null, user_id: user.id,
      });
      if (boletoDbError) throw new Error(`Erro ao salvar Boleto: ${boletoDbError.message}`);

      await supabase.from('solicitacoes').update({ status: 'nf_boleto_enviados' as any }).eq('id', nfBoletoSolicitacao.id);

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: nfBoletoSolicitacao.id, user_id: user.id,
        acao: pagamentoAntecipado ? 'nf_boleto_enviado_antecipado' : 'nf_boleto_enviado',
        status_anterior: 'aguardando_nf_boleto', status_novo: 'nf_boleto_enviados',
        motivo: pagamentoAntecipado ? `Pagamento antecipado: ${justificativaAntecipado}` : null,
      });

      toast({ title: 'Documentos enviados!', description: 'NF e Boleto foram enviados para o financeiro.' });
      setNfBoletoOpen(false);
      fetchSolicitacoes();
    } catch (error: any) {
      toast({ title: 'Erro ao enviar documentos', description: error?.message || 'Erro desconhecido.', variant: 'destructive' });
    } finally {
      setNfBoletoLoading(false);
    }
  };

  const downloadDocumentoFiscal = async (doc: DocumentoFiscal) => {
    try {
      const { data, error } = await supabase.storage.from('documentos-fiscais').download(doc.storage_path);
      if (error) throw error;
      if (data) saveAs(data, doc.nome_arquivo);
    } catch {
      toast({ title: 'Erro ao baixar documento', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleDarCiencia = async () => {
    if (!effectiveUserId) return;
    const ids = pendingCiencia.map(s => s.id);
    if (ids.length === 0) return;
    try {
      // Update all pending ciencia
      const { error } = await supabase
        .from('solicitacoes')
        .update({ cancelamento_ciencia_em: new Date().toISOString() } as any)
        .in('id', ids);
      if (error) throw error;
      // Insert history for each
      for (const sol of pendingCiencia) {
        await supabase.from('historico_solicitacoes').insert({
          solicitacao_id: sol.id,
          user_id: effectiveUserId,
          acao: 'ciencia_cancelamento',
          motivo: 'Solicitante confirmou ciência do cancelamento automático',
        });
      }
      toast({ title: 'Ciência confirmada', description: `${ids.length} solicitação(ões) confirmada(s).` });
      fetchSolicitacoes();
    } catch (error: any) {
      toast({ title: 'Erro', description: error?.message || 'Erro ao confirmar ciência.', variant: 'destructive' });
    }
  };

  const handleDarCienciaSingle = async (solId: string) => {
    if (!effectiveUserId) return;
    try {
      const { error } = await supabase
        .from('solicitacoes')
        .update({ cancelamento_ciencia_em: new Date().toISOString() } as any)
        .eq('id', solId);
      if (error) throw error;
      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: solId,
        user_id: effectiveUserId,
        acao: 'ciencia_cancelamento',
        motivo: 'Solicitante confirmou ciência do cancelamento automático',
      });
      toast({ title: 'Ciência confirmada' });
      fetchSolicitacoes();
    } catch (error: any) {
      toast({ title: 'Erro', description: error?.message || 'Erro ao confirmar ciência.', variant: 'destructive' });
    }
  };


  const pendingCiencia = useMemo(() => {
    return solicitacoes.filter(s => {
      if (s.status !== 'cancelado') return false;
      if ((s as any).cancelamento_ciencia_em) return false;
      const reason = rejectionReasons[s.id];
      if (!reason?.motivo) return false;
      return reason.motivo.includes('prazo') && reason.motivo.includes('expirou');
    });
  }, [solicitacoes, rejectionReasons]);

  const pendingCounts = useMemo(() => ({
    corrections: solicitacoes.filter(s => s.status === 'pendente_correcao' || s.status === 'aguardando_informacoes').length,
    acceptance: solicitacoes.filter(s => s.status === 'aguardando_aceite').length,
    nfBoleto: 0,
    ciencia: pendingCiencia.length,
  }), [solicitacoes, pendingCiencia]);

  const filterTabGroups: TabGroup[] = [
    {
      id: 'em_andamento', label: 'Em Andamento',
      tabs: [
        { id: 'todas', label: 'Todas', count: statusCounts.todas, icon: <FileText className="h-3.5 w-3.5" /> },
        { id: 'com_backoffice', label: 'Com Backoffice', count: statusCounts.com_backoffice },
      ],
    },
    {
      id: 'acoes_pendentes', label: 'Ações Pendentes',
      icon: <AlertTriangle className="h-3 w-3" />, labelClassName: 'text-warning',
      tabs: [
        { id: 'correcoes', label: 'Correções', count: statusCounts.correcoes, variant: 'warning' as const, icon: <AlertTriangle className="h-3.5 w-3.5" />, showCountWhenZero: false },
        { id: 'informacoes', label: 'Informações', count: statusCounts.informacoes, variant: 'warning' as const, showCountWhenZero: false },
        { id: 'oc_emitida', label: 'OC/AC Emitida', count: statusCounts.oc_emitida, variant: 'success' as const, showCountWhenZero: false },
        { id: 'liberadas', label: 'Liberadas', count: statusCounts.liberadas, variant: 'default' as const, showCountWhenZero: false },
        { id: 'enviadas', label: 'Enviadas', count: statusCounts.enviadas, variant: 'purple' as const, showCountWhenZero: false },
      ],
    },
    {
      id: 'finalizadas', label: 'Finalizadas',
      tabs: [
        { id: 'ciencia', label: 'Aguardando Ciência', count: statusCounts.ciencia, variant: 'warning' as const, showCountWhenZero: false },
        { id: 'canceladas', label: 'Canceladas', count: statusCounts.canceladas, showCountWhenZero: false },
        { id: 'concluidas', label: 'Finalizadas', count: statusCounts.concluidas, variant: 'success' as const, showCountWhenZero: false },
      ],
    },
  ];

  // ==================== Render ====================

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40 mt-2" />
          </div>
          <Skeleton className="h-10 w-40 rounded-md" />
        </div>
        <SolicitacaoCardSkeletonList count={4} />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Success Banner */}
        {showCreatedBanner && createdProtocolo && (
          <div className="bg-success border-l-4 border-success/70 text-success-foreground px-5 py-4 rounded-lg flex items-center justify-between animate-slide-up shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-full bg-background/20 shrink-0">
                <PartyPopper className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-bold">
                  Solicitação #{createdProtocolo} criada com sucesso!
                </p>
                <p className="text-sm opacity-90">O backoffice foi notificado e iniciará a análise em breve.</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-success-foreground hover:bg-background/20 rounded-full" onClick={() => setShowCreatedBanner(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Solicitações</h1>
              <p className="text-muted-foreground text-sm">Acompanhe o andamento e tome ações nas suas solicitações</p>
            </div>
          </div>
          
          {userEmpreendimentos.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant={viewMode === 'minhas' ? 'default' : 'outline'} size="sm"
                onClick={() => setViewMode('minhas')} className="gap-2">
                <User className="h-4 w-4" /> Minhas Solicitações
              </Button>
              <Button variant={viewMode === 'empreendimento' ? 'default' : 'outline'} size="sm"
                onClick={() => setViewMode('empreendimento')} className="gap-2">
                <Building2 className="h-4 w-4" /> Por Empreendimento
              </Button>
              {viewMode === 'empreendimento' && (
                <Select value={empreendimentoFilter} onValueChange={setEmpreendimentoFilter}>
                  <SelectTrigger className="h-8 w-[220px] text-sm">
                    <SelectValue placeholder="Empreendimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os empreendimentos</SelectItem>
                    {userEmpreendimentos
                      .filter(e => e !== 'todos')
                      .map(emp => (
                        <SelectItem key={emp} value={emp}>
                          {EMPREENDIMENTO_LABELS[emp] || emp}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>


        {/* Pending Header Chips (compact) */}
        {viewMode === 'minhas' && (
          <PendingHeaderChips
            pendingCorrections={solicitacoes.filter(s => s.status === 'pendente_correcao').length}
            pendingInfoRequests={solicitacoes.filter(s => s.status === 'aguardando_informacoes').length}
            pendingAcceptance={pendingCounts.acceptance}
            pendingNfBoleto={solicitacoes.filter(s => s.status === 'aguardando_nf_boleto').length}
            pendingCiencia={pendingCounts.ciencia}
            onViewPending={(filter) => setActiveTab(filter as FilterTab)}
            onDarCiencia={() => setActiveTab('ciencia')}
          />
        )}

        {/* Filter Bar */}
        <FilterBar
          showSearch
          searchPlaceholder="Buscar por protocolo, descrição ou fornecedor..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          tabGroups={filterTabGroups}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab as FilterTab);
            document.getElementById('solicitacoes-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          rightSlot={
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'created_at' | 'updated_at')}>
                <SelectTrigger className="h-8 w-[180px] text-xs" aria-label="Ordenar por">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at">Última alteração</SelectItem>
                  <SelectItem value="created_at">Data de abertura</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToExcel(sortedAndFilteredSolicitacoes as any, 'minhas_solicitacoes')}
                disabled={sortedAndFilteredSolicitacoes.length === 0}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          }
        />

        {/* Content */}
        <div id="solicitacoes-list"></div>
        {sortedAndFilteredSolicitacoes.length === 0 ? (
          <ContextualEmptyState
            tab={activeTab}
            variant="solicitante"
            action={activeTab === 'todas' ? {
              label: 'Criar Solicitação',
              onClick: () => navigate('/nova-solicitacao'),
            } : undefined}
          />
        ) : (
          <VirtualizedList
            items={sortedAndFilteredSolicitacoes}
            getItemKey={(sol) => sol.id}
            estimateSize={200}
            overscan={5}
            renderItem={(sol) => (
              <SolicitanteSolicitacaoCard
                sol={sol}
                isFavorite={favoriteSet.has(sol.id)}
                onToggleFavorite={() => toggleFavorite(sol.id)}
                isExpanded={expandedId === sol.id}
                onToggleExpand={() => toggleExpand(sol.id)}
                isOwner={sol.user_id === effectiveUserId}
                viewMode={viewMode}
                effectiveUserId={effectiveUserId}
                unreadInfo={unreadMap[sol.id] || null}
                rejectionReasons={rejectionReasons}
                infoRequests={infoRequests}
                anexosExpanded={anexosExpanded}
                fetchAnexosSolicitacao={fetchAnexosSolicitacao}
                openEditModal={openEditModal}
                openCancelModal={openCancelModal}
                openAceiteModal={openAceiteModal}
                openNfBoletoModal={openNfBoletoModal}
                handleDuplicate={handleDuplicate}
                downloadDocumentoEmitido={downloadDocumentoEmitido}
                downloadDocumentoFiscal={downloadDocumentoFiscal}
                setAnexosViewSolicitacao={setAnexosViewSolicitacao}
                setTransferSolicitacao={setTransferSolicitacao}
                setTransferOpen={setTransferOpen}
                onDarCiencia={handleDarCienciaSingle}
              />
            )}
          />
        )}
      </div>

      {/* All Modals */}
      <SolicitanteModals
        editOpen={editOpen}
        setEditOpen={setEditOpen}
        editModalProps={{
          editingSolicitacao, editDescricao, setEditDescricao, editValor, setEditValor,
          editNaturezaOrcamentaria, setEditNaturezaOrcamentaria: (v) => setEditNaturezaOrcamentaria(v),
          editEscopoDetalhado, setEditEscopoDetalhado, editAnexos, setEditAnexos, editOutrosAnexos, setEditOutrosAnexos,
          existingAnexos, anexosParaExcluir, setAnexosParaExcluir,
          editMensagemCorrecao, setEditMensagemCorrecao, submitting, handleResubmit,
          formatCurrencyInput, getRequiredAttachments, rejectionReasons, infoRequests,
          trocarFornecedor, setTrocarFornecedor, novoFornecedorEscolhido, setNovoFornecedorEscolhido,
          novoFornecedorBuscado, setNovoFornecedorBuscado, fornecedoresInfo,
        }}
        aceiteOpen={aceiteOpen}
        setAceiteOpen={setAceiteOpen}
        aceiteModalProps={{
          aceiteSolicitacao, aceiteStep, setAceiteStep, showAjusteField, setShowAjusteField,
          aceiteAjuste, setAceiteAjuste, aceiteLoading,
          fornecedorEmailContato, setFornecedorEmailContato,
          fornecedorTelefoneContato, setFornecedorTelefoneContato,
          tipoEntrega, setTipoEntrega, dataExecucaoServico, setDataExecucaoServico,
          evidenciaFile, setEvidenciaFile,
          motivoOCAntes, setMotivoOCAntes,
          handleAceitarOC, handleSolicitarAjuste, openOCInNewTab, downloadDocumentoEmitido,
        }}
        nfBoletoOpen={nfBoletoOpen}
        setNfBoletoOpen={setNfBoletoOpen}
        nfBoletoModalProps={{
          nfBoletoSolicitacao, nfBoletoLoading, handleEnviarNfBoleto,
          nfFile, setNfFile, boletoFile, setBoletoFile,
          dataEmissaoNF, setDataEmissaoNF, dataVencimentoBoleto, setDataVencimentoBoleto,
          pagamentoAntecipado, setPagamentoAntecipado, justificativaAntecipado, setJustificativaAntecipado,
        }}
        cancelOpen={cancelOpen}
        setCancelOpen={setCancelOpen}
        cancelModalProps={{
          cancelSolicitacao, cancelLoading, handleCancelar,
          motivoCancelamento, setMotivoCancelamento, isPostOCStatus,
        }}
        anexosViewOpen={!!anexosViewSolicitacao}
        setAnexosViewOpen={(open) => !open && setAnexosViewSolicitacao(null)}
        anexosViewSolicitacao={anexosViewSolicitacao}
        anexosExpanded={anexosExpanded}
      />

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
