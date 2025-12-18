import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  EMPREENDIMENTO_LABELS, 
  NATUREZA_ORCAMENTARIA_LABELS,
  TIPO_CONTRATACAO_LABELS,
  type Solicitacao,
  type NaturezaOrcamentaria,
  type Fornecedor,
  type DocumentoEmitido,
  type DocumentoFiscal,
} from '@/types';
import { Loader2, FileText, ChevronDown, ChevronUp, Edit, Send, History, AlertTriangle, Copy, XCircle, Download, FileCheck, CheckCircle, MessageSquare, RotateCcw, Receipt, Upload, CreditCard } from 'lucide-react';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SolicitacaoTimeline } from '@/components/SolicitacaoTimeline';
import { MultiFileUpload, type UploadedFile } from '@/components/FileUpload';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
}

interface RejectionInfo {
  solicitacao_id: string;
  motivo: string | null;
  created_at: string;
}

interface InfoRequest {
  solicitacao_id: string;
  motivo: string | null;
  created_at: string;
}

export default function MinhasSolicitacoes() {
  const { user, effectiveProfile, isImpersonating } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const effectiveUserId = (isImpersonating ? effectiveProfile?.id : user?.id) ?? user?.id;
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoComFornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('todas');
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, RejectionInfo>>({});
  const [infoRequests, setInfoRequests] = useState<Record<string, InfoRequest>>({});
  
  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editingSolicitacao, setEditingSolicitacao] = useState<Solicitacao | null>(null);
  const [editDescricao, setEditDescricao] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editNaturezaOrcamentaria, setEditNaturezaOrcamentaria] = useState<NaturezaOrcamentaria | ''>('');
  const [editAnexos, setEditAnexos] = useState<Record<string, UploadedFile | null>>({});
  const [submitting, setSubmitting] = useState(false);

  // Aceite OC modal state
  const [aceiteOpen, setAceiteOpen] = useState(false);
  const [aceiteSolicitacao, setAceiteSolicitacao] = useState<SolicitacaoComFornecedor | null>(null);
  const [aceiteAjuste, setAceiteAjuste] = useState('');
  const [aceiteLoading, setAceiteLoading] = useState(false);

  // Resposta informações modal state
  const [respostaOpen, setRespostaOpen] = useState(false);
  const [respostaSolicitacao, setRespostaSolicitacao] = useState<SolicitacaoComFornecedor | null>(null);
  const [respostaTexto, setRespostaTexto] = useState('');
  const [respostaLoading, setRespostaLoading] = useState(false);

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
  }, [effectiveUserId]);

  const fetchSolicitacoes = async () => {
    if (!effectiveUserId) return;

    // First, fetch user's assigned empreendimentos
    const { data: empData } = await supabase
      .from('user_empreendimentos')
      .select('empreendimento')
      .eq('user_id', effectiveUserId);

    const userEmps = empData?.map(e => e.empreendimento) || [];
    const hasTodos = userEmps.includes('todos');

    // Fetch solicitações - RLS cuida da permissão por empreendimento
    // Usuários verão todas as solicitações dos empreendimentos aos quais estão vinculados
    let query = supabase
      .from('solicitacoes')
      .select(`
        *,
        fornecedor:fornecedores!solicitacoes_fornecedor_id_fkey(id, razao_social, nome_fantasia)
      `)
      .order('created_at', { ascending: false });

    // Filtro adicional por empreendimento no cliente (caso RLS permita mais do que necessário)
    if (!hasTodos && userEmps.length > 0) {
      query = query.in('empreendimento', userEmps);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Enrich with documentos emitidos e fiscais
      const enrichedData = await Promise.all(
        data.map(async (sol: any) => {
          let documentoEmitido = null;
          let documentosFiscais: DocumentoFiscal[] = [];
          
          // Fetch documento emitido if status allows
          if (['oc_ac_emitida', 'concluida', 'aguardando_aceite', 'aguardando_nf_boleto', 'nf_boleto_enviados', 'enviado_pagamento'].includes(sol.status)) {
            const { data: docData } = await supabase
              .from('documentos_emitidos')
              .select('*')
              .eq('solicitacao_id', sol.id)
              .maybeSingle();
            documentoEmitido = docData;
          }

          // Fetch documentos fiscais if they exist
          const { data: fiscaisData } = await supabase
            .from('documentos_fiscais')
            .select('*')
            .eq('solicitacao_id', sol.id);
          if (fiscaisData) documentosFiscais = fiscaisData as DocumentoFiscal[];
          
          return { ...sol, documentoEmitido, documentosFiscais } as SolicitacaoComFornecedor;
        })
      );
      
      setSolicitacoes(enrichedData);
      
      // Fetch rejection reasons for rejected solicitações
      const rejectedIds = data
        .filter((s: any) => s.status === 'rejeitado')
        .map((s: any) => s.id);
      
      if (rejectedIds.length > 0) {
        const { data: histData } = await supabase
          .from('historico_solicitacoes')
          .select('solicitacao_id, motivo, created_at')
          .in('solicitacao_id', rejectedIds)
          .eq('status_novo', 'rejeitado')
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

      // Fetch info requests for aguardando_informacoes
      const infoIds = data
        .filter((s: any) => s.status === 'aguardando_informacoes')
        .map((s: any) => s.id);
      
      if (infoIds.length > 0) {
        const { data: infoData } = await supabase
          .from('historico_solicitacoes')
          .select('solicitacao_id, motivo, created_at')
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

  // Sort and filter solicitações
  const sortedAndFilteredSolicitacoes = useMemo(() => {
    let filtered = [...solicitacoes];
    
    // Filter by tab
    switch (activeTab) {
      case 'com_backoffice':
        // Solicitações que estão com o backoffice (em análise ou processamento)
        filtered = filtered.filter(s => 
          s.status === 'recebido' || s.status === 'em_analise' || 
          s.status === 'aprovado' || s.status === 'em_processamento'
        );
        break;
      case 'correcoes':
        // Solicitações que precisam de ação do solicitante
        filtered = filtered.filter(s => 
          s.status === 'pendente_correcao' || s.status === 'aguardando_informacoes'
        );
        break;
      case 'oc_emitida':
        // OC emitida aguardando aceite
        filtered = filtered.filter(s => s.status === 'aguardando_aceite');
        break;
      case 'aguardando_nf':
        // Aguardando NF/Boleto ou já enviados
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
    
    // Sort: action required first, then by date
    filtered.sort((a, b) => {
      const priorityStatuses = ['pendente_correcao', 'aguardando_informacoes', 'aguardando_aceite', 'aguardando_nf_boleto'];
      const aPriority = priorityStatuses.includes(a.status) ? 0 : 1;
      const bPriority = priorityStatuses.includes(b.status) ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return filtered;
  }, [solicitacoes, activeTab]);

  // Count by status for tabs
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const number = parseInt(digits) / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openEditModal = (sol: Solicitacao) => {
    setEditingSolicitacao(sol);
    setEditDescricao(sol.descricao);
    setEditValor(String(Math.round(sol.valor * 100)));
    setEditNaturezaOrcamentaria(sol.natureza_orcamentaria);
    setEditAnexos({});
    setEditOpen(true);
  };

  const handleDuplicate = (sol: SolicitacaoComFornecedor) => {
    // Navigate to NovaSolicitacao with pre-filled data
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
    const uploadPromises = Object.entries(editAnexos)
      .filter(([_, file]) => file !== null)
      .map(async ([tipo, uploadedFile]) => {
        if (!uploadedFile) return;
        
        const { file } = uploadedFile;
        const fileExt = file.name.split('.').pop();
        const filePath = `${solicitacaoId}/${tipo}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('anexos')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
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
        
        if (dbError) throw dbError;
      });
    
    await Promise.all(uploadPromises);
  };

  const handleResubmit = async () => {
    if (!editingSolicitacao || !user) return;
    
    setSubmitting(true);
    try {
      const valorNumerico = parseFloat(editValor.replace(/\D/g, '')) / 100 || 0;
      
      const { error: updateError } = await supabase
        .from('solicitacoes')
        .update({
          descricao: editDescricao,
          valor: valorNumerico,
          natureza_orcamentaria: editNaturezaOrcamentaria as any,
          status: 'recebido',
        })
        .eq('id', editingSolicitacao.id);

      if (updateError) throw updateError;

      await uploadNewAnexos(editingSolicitacao.id);

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: editingSolicitacao.id,
        user_id: user.id,
        acao: 'reenvio',
        status_anterior: 'pendente_correcao',
        status_novo: 'recebido',
      });

      toast({
        title: 'Solicitação reenviada!',
        description: 'Sua correção foi enviada para análise.',
      });

      setEditOpen(false);
      fetchSolicitacoes();
    } catch (error) {
      console.error('Error resubmitting:', error);
      toast({
        title: 'Erro ao reenviar',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getFornecedorNome = (sol: SolicitacaoComFornecedor) => {
    if (!sol.fornecedor) return null;
    return sol.fornecedor.nome_fantasia || sol.fornecedor.razao_social || null;
  };

  const truncateDescription = (desc: string, maxLength = 80) => {
    if (desc.length <= maxLength) return desc;
    return desc.substring(0, maxLength).trim() + '...';
  };

  const downloadDocumentoEmitido = async (doc: DocumentoEmitido) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos-emitidos')
        .download(doc.storage_path);
      
      if (error) throw error;
      if (data) saveAs(data, doc.nome_arquivo);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Erro ao baixar documento',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Aceite OC handlers
  const openAceiteModal = (sol: SolicitacaoComFornecedor) => {
    setAceiteSolicitacao(sol);
    setAceiteAjuste('');
    setAceiteOpen(true);
  };

  const handleAceitarOC = async () => {
    if (!aceiteSolicitacao || !user) return;
    
    setAceiteLoading(true);
    try {
      // Muda para aguardando_nf_boleto em vez de concluida
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
      console.error('Error accepting OC:', error);
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
      console.error('Error requesting adjustment:', error);
      toast({
        title: 'Erro ao solicitar ajuste',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setAceiteLoading(false);
    }
  };

  // Resposta informações handlers
  const openRespostaModal = (sol: SolicitacaoComFornecedor) => {
    setRespostaSolicitacao(sol);
    setRespostaTexto('');
    setRespostaOpen(true);
  };

  const handleResponderInformacoes = async () => {
    if (!respostaSolicitacao || !user || !respostaTexto.trim()) return;
    
    setRespostaLoading(true);
    try {
      await supabase
        .from('solicitacoes')
        .update({ 
          status: 'em_processamento',
          resposta_informacoes: respostaTexto,
        })
        .eq('id', respostaSolicitacao.id);

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: respostaSolicitacao.id,
        user_id: user.id,
        acao: 'resposta_informacoes',
        status_anterior: 'aguardando_informacoes',
        status_novo: 'em_processamento',
        motivo: respostaTexto,
      });

      toast({
        title: 'Resposta enviada!',
        description: 'Sua resposta foi enviada ao backoffice.',
      });

      setRespostaOpen(false);
      fetchSolicitacoes();
    } catch (error) {
      console.error('Error responding:', error);
      toast({
        title: 'Erro ao enviar resposta',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setRespostaLoading(false);
    }
  };

  // NF/Boleto handlers
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
    
    // Validação: precisa de boleto sempre, NF apenas se não for pagamento antecipado
    if (!boletoFile) {
      toast({
        title: 'Boleto obrigatório',
        description: 'É necessário anexar o boleto.',
        variant: 'destructive',
      });
      return;
    }

    if (!pagamentoAntecipado && !nfFile) {
      toast({
        title: 'Nota Fiscal obrigatória',
        description: 'É necessário anexar a Nota Fiscal (ou marcar como pagamento antecipado).',
        variant: 'destructive',
      });
      return;
    }

    if (!dataVencimentoBoleto) {
      toast({
        title: 'Data de vencimento obrigatória',
        description: 'Informe a data de vencimento do boleto.',
        variant: 'destructive',
      });
      return;
    }

    setNfBoletoLoading(true);
    try {
      // Upload NF (se existir)
      if (nfFile) {
        const nfExt = nfFile.name.split('.').pop();
        const nfPath = `${user.id}/${nfBoletoSolicitacao.id}/nf_${Date.now()}.${nfExt}`;
        
        const { error: nfUploadError } = await supabase.storage
          .from('documentos-fiscais')
          .upload(nfPath, nfFile);
        
        if (nfUploadError) throw nfUploadError;

        await supabase.from('documentos_fiscais').insert({
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
      }

      // Upload Boleto
      const boletoExt = boletoFile.name.split('.').pop();
      const boletoPath = `${user.id}/${nfBoletoSolicitacao.id}/boleto_${Date.now()}.${boletoExt}`;
      
      const { error: boletoUploadError } = await supabase.storage
        .from('documentos-fiscais')
        .upload(boletoPath, boletoFile);
      
      if (boletoUploadError) throw boletoUploadError;

      await supabase.from('documentos_fiscais').insert({
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

      // Update status
      await supabase
        .from('solicitacoes')
        .update({ status: 'nf_boleto_enviados' as any })
        .eq('id', nfBoletoSolicitacao.id);

      // Create history entry
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
    } catch (error) {
      console.error('Error uploading NF/Boleto:', error);
      toast({
        title: 'Erro ao enviar documentos',
        description: 'Tente novamente.',
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
      console.error('Error downloading fiscal document:', error);
      toast({
        title: 'Erro ao baixar documento',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
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
        <div>
          <h1 className="text-2xl font-bold">Minhas Solicitações</h1>
          <p className="text-muted-foreground">Acompanhe o status das suas solicitações</p>
        </div>

        {/* Grouped Filter Tabs */}
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-2 lg:items-center">
          {/* Em Andamento */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Em Andamento</span>
            <div className="flex gap-1">
              <Button
                variant={activeTab === 'todas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('todas')}
                className="gap-1 text-xs h-8"
              >
                Todas
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center">{statusCounts.todas}</Badge>
              </Button>
              <Button
                variant={activeTab === 'com_backoffice' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('com_backoffice')}
                className="gap-1 text-xs h-8"
              >
                Backoffice
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center">{statusCounts.com_backoffice}</Badge>
              </Button>
              <Button
                variant={activeTab === 'oc_emitida' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('oc_emitida')}
                className="gap-1 text-xs h-8"
              >
                OC Emitida
                {statusCounts.oc_emitida > 0 && (
                  <Badge variant="default" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center bg-success">{statusCounts.oc_emitida}</Badge>
                )}
              </Button>
              <Button
                variant={activeTab === 'aguardando_nf' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('aguardando_nf')}
                className="gap-1 text-xs h-8"
              >
                NF/Boleto
                {statusCounts.aguardando_nf > 0 && (
                  <Badge variant="default" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center bg-[hsl(260,70%,50%)]">{statusCounts.aguardando_nf}</Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Separator */}
          <div className="hidden lg:block w-px h-12 bg-border mx-2" />
          <div className="lg:hidden h-px w-full bg-border" />

          {/* Ações Pendentes */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-destructive uppercase tracking-wider px-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Ações Pendentes
            </span>
            <div className="flex gap-1">
              <Button
                variant={activeTab === 'correcoes' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('correcoes')}
                className={cn(
                  "gap-1 text-xs h-8",
                  activeTab !== 'correcoes' && statusCounts.correcoes > 0 && "border-destructive text-destructive hover:bg-destructive/10"
                )}
              >
                Correções
                {statusCounts.correcoes > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center animate-pulse">{statusCounts.correcoes}</Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Separator */}
          <div className="hidden lg:block w-px h-12 bg-border mx-2" />
          <div className="lg:hidden h-px w-full bg-border" />

          {/* Finalizadas */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Finalizadas</span>
            <div className="flex gap-1">
              <Button
                variant={activeTab === 'reprovadas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('reprovadas')}
                className="gap-1 text-xs h-8"
              >
                Reprovadas
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center">{statusCounts.reprovadas}</Badge>
              </Button>
              <Button
                variant={activeTab === 'concluidas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('concluidas')}
                className="gap-1 text-xs h-8"
              >
                Concluídas
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center">{statusCounts.concluidas}</Badge>
              </Button>
            </div>
          </div>
        </div>

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
              const isPendingCorrection = sol.status === 'pendente_correcao';
              const isRejected = sol.status === 'rejeitado';
              const isAguardandoAceite = sol.status === 'aguardando_aceite';
              const isAguardandoInfo = sol.status === 'aguardando_informacoes';
              const isAguardandoNfBoleto = sol.status === 'aguardando_nf_boleto';
              const isNfBoletoEnviados = sol.status === 'nf_boleto_enviados' || sol.status === 'enviado_pagamento';
              const fornecedorNome = getFornecedorNome(sol);
              const rejectionInfo = rejectionReasons[sol.id];
              const infoRequest = infoRequests[sol.id];
              
              return (
                <Card 
                  key={sol.id} 
                  className={cn(
                    'transition-all',
                    isPendingCorrection && 'border-2 border-warning bg-warning/5 shadow-lg',
                    isRejected && 'border-destructive/50',
                    isAguardandoAceite && 'border-2 border-success bg-success/5 shadow-lg',
                    isAguardandoInfo && 'border-2 border-info bg-info/5 shadow-lg',
                    isAguardandoNfBoleto && 'border-2 border-[hsl(260,70%,50%)] bg-[hsl(260,70%,50%)]/5 shadow-lg'
                  )}
                >
                  {/* Banner for NF/Boleto needed */}
                  {isAguardandoNfBoleto && (
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
                  )}

                  {/* Action Required Banner for pending correction */}
                  {isPendingCorrection && (
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
                        className="bg-background hover:bg-background/90"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Corrigir Agora
                      </Button>
                    </div>
                  )}

                  {/* Banner for OC awaiting acceptance */}
                  {isAguardandoAceite && (
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
                        className="bg-background hover:bg-background/90"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Revisar OC
                      </Button>
                    </div>
                  )}

                  {/* Banner for info request */}
                  {isAguardandoInfo && (
                    <div className="bg-info text-info-foreground px-4 py-2 flex items-center justify-between rounded-t-lg">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        <span className="font-semibold">INFORMAÇÕES SOLICITADAS</span>
                        <span className="text-sm opacity-90">- O backoffice precisa de mais informações</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => openRespostaModal(sol)}
                        className="bg-background hover:bg-background/90"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Responder
                      </Button>
                    </div>
                  )}
                  
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-lg">#{sol.protocolo}</CardTitle>
                        <StatusBadge status={sol.status} />
                        {sol.emergencial && (
                          <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                            Emergencial
                          </span>
                        )}
                        {sol.numero_chamado_fluig && sol.numero_chamado_fluig === 'RM' && (
                          <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                            RM
                          </Badge>
                        )}
                        {sol.numero_chamado_fluig && sol.numero_chamado_fluig !== 'RM' && (
                          <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            Fluig: {sol.numero_chamado_fluig}
                          </Badge>
                        )}
                        {sol.tipo_contratacao && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                            {TIPO_CONTRATACAO_LABELS[sol.tipo_contratacao]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isRejected && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDuplicate(sol)}
                            className="text-primary"
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Duplicar
                          </Button>
                        )}
                        {isPendingCorrection && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => openEditModal(sol)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Corrigir
                          </Button>
                        )}
                        {isAguardandoAceite && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => openAceiteModal(sol)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aceitar OC
                          </Button>
                        )}
                        {isAguardandoInfo && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => openRespostaModal(sol)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Responder
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(sol.id)}
                        >
                          {expandedId === sol.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Rejection reason banner */}
                    {isRejected && rejectionInfo?.motivo && (
                      <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-destructive">Motivo da Reprovação:</p>
                            <p className="text-sm text-muted-foreground mt-1">{rejectionInfo.motivo}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Info request banner */}
                    {isAguardandoInfo && infoRequest?.motivo && (
                      <div className="mb-4 p-3 bg-info/10 border border-info/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-5 w-5 text-info mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-info">Informações solicitadas:</p>
                            <p className="text-sm text-muted-foreground mt-1">{infoRequest.motivo}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo</span>
                        <span className="font-medium">{sol.tipo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Empreendimento</span>
                        <span>{EMPREENDIMENTO_LABELS[sol.empreendimento]}</span>
                      </div>
                      {fornecedorNome && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fornecedor</span>
                          <span className="text-right max-w-[60%] truncate">{fornecedorNome}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor Total</span>
                        <span className="font-medium">
                          {sol.faturamento_direto && sol.valor_servico !== null && sol.valor_material !== null
                            ? formatCurrency((sol.valor_servico || 0) + (sol.valor_material || 0))
                            : formatCurrency(sol.valor)
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data</span>
                        <span>{format(new Date(sol.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                      <div className="pt-2 border-t mt-2">
                        <p className="text-muted-foreground text-sm">
                          {truncateDescription(sol.descricao)}
                        </p>
                      </div>
                    </div>

                    {/* Documento Emitido - OC disponível para download */}
                    {sol.documentoEmitido && (
                      <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5 text-success" />
                            <div>
                              <p className="font-medium text-success">
                                {sol.documentoEmitido.tipo_documento} #{sol.documentoEmitido.numero_documento}
                              </p>
                              <p className="text-xs text-muted-foreground">Documento disponível para download</p>
                            </div>
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

                    {/* Expanded content - Timeline */}
                    {expandedId === sol.id && (
                      <div className="mt-6 pt-4 border-t">
                        <div className="flex items-center gap-2 mb-4">
                          <History className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium">Histórico</h4>
                        </div>
                        <SolicitacaoTimeline solicitacaoId={sol.id} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal for Returned Requests */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Corrigir Solicitação #{editingSolicitacao?.protocolo}</DialogTitle>
          </DialogHeader>
          
          {editingSolicitacao && (
            <div className="space-y-4">
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

      {/* Aceite OC Modal */}
      <Dialog open={aceiteOpen} onOpenChange={setAceiteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Revisar OC #{aceiteSolicitacao?.protocolo}</DialogTitle>
          </DialogHeader>
          
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

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setAceiteOpen(false)} disabled={aceiteLoading}>
              Cancelar
            </Button>
            <Button 
              variant="secondary"
              onClick={handleSolicitarAjuste} 
              disabled={aceiteLoading || !aceiteAjuste.trim()}
            >
              {aceiteLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Solicitar Ajuste
            </Button>
            <Button onClick={handleAceitarOC} disabled={aceiteLoading}>
              {aceiteLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Aceitar OC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resposta Informações Modal */}
      <Dialog open={respostaOpen} onOpenChange={setRespostaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Responder Solicitação #{respostaSolicitacao?.protocolo}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {infoRequests[respostaSolicitacao?.id || '']?.motivo && (
              <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
                <p className="font-medium text-info mb-1">Informações solicitadas:</p>
                <p className="text-sm text-muted-foreground">
                  {infoRequests[respostaSolicitacao?.id || '']?.motivo}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="resposta">Sua resposta *</Label>
              <Textarea
                id="resposta"
                placeholder="Digite sua resposta às informações solicitadas..."
                value={respostaTexto}
                onChange={(e) => setRespostaTexto(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRespostaOpen(false)} disabled={respostaLoading}>
              Cancelar
            </Button>
            <Button onClick={handleResponderInformacoes} disabled={respostaLoading || !respostaTexto.trim()}>
              {respostaLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NF/Boleto Modal */}
      <Dialog open={nfBoletoOpen} onOpenChange={setNfBoletoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Incluir NF e Boleto - #{nfBoletoSolicitacao?.protocolo}
            </DialogTitle>
          </DialogHeader>
          
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setNfBoletoOpen(false)} disabled={nfBoletoLoading}>
              Cancelar
            </Button>
            <Button onClick={handleEnviarNfBoleto} disabled={nfBoletoLoading}>
              {nfBoletoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Documentos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
