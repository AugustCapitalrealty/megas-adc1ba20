import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCNPJ } from '@/hooks/useCNPJ';
import { supabase } from '@/integrations/supabase/client';
import { 
  EMPREENDIMENTO_LABELS, 
  NATUREZA_ORCAMENTARIA_LABELS,
  TIPO_CONTRATACAO_LABELS,
  ORIGEM_CUSTO_LABELS,
  TIPO_GARANTIA_LABELS,
  ANEXO_LABELS,
  type Empreendimento,
  type NaturezaOrcamentaria,
  type TipoContratacao,
  type OrigemCusto,
  type TipoGarantia,
  type Fornecedor,
} from '@/types';
import { ArrowLeft, ArrowRight, Check, Loader2, Search, AlertTriangle, ChevronDown, ChevronUp, FileText, Sparkles, DollarSign, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiFileUpload, OtherFilesUpload, type UploadedFile } from '@/components/FileUpload';
import { SupplierSearch } from '@/components/SupplierSearch';
import { ClienteSelect } from '@/components/ClienteSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDescriptionValidation } from '@/hooks/useDescriptionValidation';
import { notifyBackofficeNewSolicitacao } from '@/hooks/useNotificationEmail';
import { StepIndicator, type Step as StepIndicatorStep } from '@/components/StepIndicator';

type Step = 'empreendimento' | 'descricao' | 'tipo' | 'detalhes' | 'fornecedor' | 'anexos' | 'revisao';

// Naturezas orçamentárias isentas de Chamado/Preventiva (para AC)
const NATUREZAS_ISENTAS_ANEXOS: NaturezaOrcamentaria[] = [
  'agua',
  'energia_eletrica', 
  'telefone',
  'taxa_impostos',
  'material_consumo',
];

// Naturezas de Água e Energia (só rateio para OC)
const NATUREZAS_AGUA_ENERGIA: NaturezaOrcamentaria[] = ['agua', 'energia_eletrica'];

// Mapeamento de tipo_contratacao para natureza_orcamentaria (OC)
const TIPO_TO_NATUREZA: Record<string, NaturezaOrcamentaria> = {
  material_construcao: 'manutencao_imoveis',
  material_consumo: 'material_consumo',
  combustivel: 'servicos_diversos',
  taxas: 'taxa_impostos',
  agua: 'agua',
  energia: 'energia_eletrica',
};

interface DuplicateData {
  tipo?: string;
  empreendimento?: Empreendimento;
  natureza_orcamentaria?: NaturezaOrcamentaria;
  tipo_contratacao?: TipoContratacao;
  descricao?: string;
  valor?: number;
  fornecedor_id?: string;
  origem_custo?: OrigemCusto;
  cliente_id?: string;
  emergencial?: boolean;
}

export default function NovaSolicitacao() {
  const { user, effectiveProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatCNPJ, lookupCNPJ, loading: cnpjLoading, error: cnpjError } = useCNPJ();

  const effectiveUserId = effectiveProfile?.id ?? user?.id;

  // Check for duplicate data from navigation state
  const duplicateFrom = (location.state as { duplicateFrom?: DuplicateData })?.duplicateFrom;

  const [allowedEmpreendimentos, setAllowedEmpreendimentos] = useState<Empreendimento[]>([]);
  const [loadingEmpreendimentos, setLoadingEmpreendimentos] = useState(true);

  useEffect(() => {
    const fetchAllowedEmpreendimentos = async () => {
      if (!effectiveUserId) {
        setAllowedEmpreendimentos([]);
        setLoadingEmpreendimentos(false);
        return;
      }

      setLoadingEmpreendimentos(true);
      const { data, error } = await supabase
        .from('user_empreendimentos')
        .select('empreendimento')
        .eq('user_id', effectiveUserId);

      if (error) {
        console.error('Erro ao buscar empreendimentos do usuário:', error);
        setAllowedEmpreendimentos([]);
        setLoadingEmpreendimentos(false);
        return;
      }

      const userEmps = (data ?? []).map((d) => d.empreendimento as Empreendimento);
      const hasTodos = userEmps.includes('todos');
      const allOptions = Object.keys(EMPREENDIMENTO_LABELS) as Empreendimento[];
      const allowed = hasTodos ? allOptions : userEmps;

      setAllowedEmpreendimentos(allowed);
      setLoadingEmpreendimentos(false);

      // Ajusta seleção automaticamente
      setEmpreendimento((current) => {
        if (allowed.length === 1) return allowed[0];
        if (current && allowed.includes(current as Empreendimento)) return current;
        return '';
      });
    };

    fetchAllowedEmpreendimentos();
  }, [effectiveUserId]);

  const [currentStep, setCurrentStep] = useState<Step>('empreendimento');
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [empreendimento, setEmpreendimento] = useState<Empreendimento | ''>(duplicateFrom?.empreendimento || '');
  const [descricao, setDescricao] = useState(duplicateFrom?.descricao || '');
  const [valor, setValor] = useState(duplicateFrom?.valor ? String(Math.round(duplicateFrom.valor * 100)) : '');
  const [tipoContratacao, setTipoContratacao] = useState<TipoContratacao | ''>(duplicateFrom?.tipo_contratacao || '');
  const [naturezaOrcamentaria, setNaturezaOrcamentaria] = useState<NaturezaOrcamentaria | ''>(duplicateFrom?.natureza_orcamentaria || '');
  const [origemCusto, setOrigemCusto] = useState<OrigemCusto>(duplicateFrom?.origem_custo || 'empreendimento');
  
  // AC specific
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [contratoMensal, setContratoMensal] = useState(false);
  const [faturamentoDireto, setFaturamentoDireto] = useState(false);
  const [valorServico, setValorServico] = useState('');
  const [valorMaterial, setValorMaterial] = useState('');
  const [retencao6, setRetencao6] = useState(false);
  const [tipoGarantia, setTipoGarantia] = useState<TipoGarantia>('nenhuma');
  const [diasGarantia, setDiasGarantia] = useState('');
  const [diasGarantiaServico, setDiasGarantiaServico] = useState('');
  const [diasGarantiaProduto, setDiasGarantiaProduto] = useState('');
  const [custoCliente, setCustoCliente] = useState(false);
  const [emergencial, setEmergencial] = useState(duplicateFrom?.emergencial || false);

  // Fornecedores
  const [cnpj, setCnpj] = useState('');
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
  const [fornecedorConcorrente1, setFornecedorConcorrente1] = useState<Fornecedor | null>(null);
  const [fornecedorConcorrente2, setFornecedorConcorrente2] = useState<Fornecedor | null>(null);

  // Cliente (quando origem = cliente)
  const [clienteId, setClienteId] = useState<string | null>(duplicateFrom?.cliente_id || null);
  const [clienteNome, setClienteNome] = useState<string>('');

  // Exceção explícita para 3 fornecedores
  const [excecaoFornecedores, setExcecaoFornecedores] = useState(false);

  // Justificativa para exceção de 3 fornecedores
  const [justificativaFornecedores, setJustificativaFornecedores] = useState('');
  
  // Checkbox para Chamado Infraspeak (OC)
  const [temChamadoInfraspeak, setTemChamadoInfraspeak] = useState(false);
  
  // Flag para AC - "Chamado é uma corretiva?"
  const [chamadoCorretiva, setChamadoCorretiva] = useState(false);
  
  // Flags para AC - sem chamado/memorial com justificativa
  const [semChamado, setSemChamado] = useState(false);
  const [justificativaSemChamado, setJustificativaSemChamado] = useState('');
  const [semMemorial, setSemMemorial] = useState(false);
  const [justificativaSemMemorial, setJustificativaSemMemorial] = useState('');
  
  // AI Description Validation
  const { isValidating: isValidatingDescription, validationResult: descriptionValidation } = useDescriptionValidation(descricao);
  // Load fornecedor from duplicateFrom
  useEffect(() => {
    if (duplicateFrom?.fornecedor_id) {
      const fetchFornecedor = async () => {
        const { data } = await supabase
          .from('fornecedores')
          .select('*')
          .eq('id', duplicateFrom.fornecedor_id)
          .single();
        if (data) {
          // Import dbRowToFornecedor is needed - using inline conversion
          const fornecedor = {
            ...data,
            cnaes_secundarios: Array.isArray(data.cnaes_secundarios) 
              ? data.cnaes_secundarios.map((item: any) => ({ codigo: item.codigo ?? 0, descricao: item.descricao ?? '' }))
              : null
          } as Fornecedor;
          setFornecedor(fornecedor);
        }
      };
      fetchFornecedor();
    }
  }, [duplicateFrom?.fornecedor_id]);

  // Show toast if duplicating
  useEffect(() => {
    if (duplicateFrom) {
      toast({
        title: 'Solicitação duplicada',
        description: 'Os dados foram pré-preenchidos. Revise e ajuste antes de enviar.',
      });
    }
  }, []);

  // Fetch cliente nome when clienteId changes
  useEffect(() => {
    if (!clienteId) {
      setClienteNome('');
      return;
    }
    
    const fetchCliente = async () => {
      const { data } = await supabase
        .from('clientes')
        .select('nome')
        .eq('id', clienteId)
        .single();
      if (data) {
        setClienteNome(data.nome);
      }
    };
    fetchCliente();
  }, [clienteId]);

  // Anexos
  const [anexos, setAnexos] = useState<Record<string, UploadedFile | null>>({});
  const [outrosAnexos, setOutrosAnexos] = useState<UploadedFile[]>([]);

  // Derived values
  const valorNumerico = parseFloat(valor.replace(/\D/g, '')) / 100 || 0;
  const valorServicoNumerico = parseFloat(valorServico.replace(/\D/g, '')) / 100 || 0;
  const valorMaterialNumerico = parseFloat(valorMaterial.replace(/\D/g, '')) / 100 || 0;
  const isOC = valorNumerico <= 1000 || (valorNumerico > 1000 && tipoContratacao !== 'servicos');
  const isAC = valorNumerico > 1000 && tipoContratacao === 'servicos';
  
  // Auto-set natureza_orcamentaria for OC types ONLY when valor > 1000
  const isOCAbove1000 = valorNumerico > 1000 && tipoContratacao !== '' && tipoContratacao !== 'servicos';
  
  useEffect(() => {
    if (isOCAbove1000 && tipoContratacao) {
      const autoNatureza = TIPO_TO_NATUREZA[tipoContratacao];
      if (autoNatureza) {
        setNaturezaOrcamentaria(autoNatureza);
      }
    }
  }, [tipoContratacao, isOCAbove1000]);
  
  // Emergency checkbox should only appear for AC services (>= 1001)
  const showEmergencial = isAC;
  
  // Determine required attachments based on type
  const getRequiredAttachments = () => {
    const isNaturezaIsenta = naturezaOrcamentaria && NATUREZAS_ISENTAS_ANEXOS.includes(naturezaOrcamentaria);
    const isAguaEnergia = naturezaOrcamentaria && NATUREZAS_AGUA_ENERGIA.includes(naturezaOrcamentaria);
    let attachments: { tipo: string; label: string; required: boolean }[] = [];
    
    if (isOC) {
      // OC - Água e Energia: apenas rateio opcional
      if (isAguaEnergia) {
        attachments = [
          { tipo: 'rateio', label: ANEXO_LABELS.rateio, required: false },
        ];
      } else {
        // OC - Demais naturezas: Proposta obrigatória + Chamado opcional
        attachments = [
          { tipo: 'orcamento_escolhido', label: 'Proposta do Fornecedor (PDF)', required: true },
        ];
        if (temChamadoInfraspeak) {
          attachments.push({ tipo: 'chamado_preventiva', label: 'Chamado Infraspeak', required: false });
        }
      }
    } else if (isAC) {
      if (!isNaturezaIsenta) {
        if (emergencial) {
          // AC Emergencial: Proposta obrigatória + Chamado Infraspeak se corretiva
          attachments = [
            { tipo: 'orcamento_escolhido', label: ANEXO_LABELS.orcamento_escolhido, required: true },
          ];
          // Só adiciona chamado se for corretiva
          if (chamadoCorretiva) {
            attachments.unshift({ tipo: 'chamado_preventiva', label: ANEXO_LABELS.chamado_preventiva, required: true });
          }
        } else {
          // AC não emergencial: base attachments (Mapa de Cotação por último)
          attachments = [
            { tipo: 'escopo_detalhado', label: ANEXO_LABELS.escopo_detalhado, required: !semMemorial },
            { tipo: 'orcamento_escolhido', label: ANEXO_LABELS.orcamento_escolhido, required: true },
          ];
          // Só adiciona chamado se for corretiva
          if (chamadoCorretiva) {
            attachments.unshift({ tipo: 'chamado_preventiva', label: ANEXO_LABELS.chamado_preventiva, required: !semChamado });
          }
          
          // Cotações concorrentes e mapa só aparecem se NÃO tem exceção de fornecedores
          if (!excecaoFornecedores) {
            attachments.push(
              { tipo: 'orcamento_concorrente_1', label: ANEXO_LABELS.orcamento_concorrente_1, required: true },
              { tipo: 'orcamento_concorrente_2', label: ANEXO_LABELS.orcamento_concorrente_2, required: true },
              { tipo: 'mapa_cotacao', label: ANEXO_LABELS.mapa_cotacao, required: true }, // Mapa por último
            );
          } else {
            // Com justificativa, permite anexo de comprovação (opcional)
            attachments.push(
              { tipo: 'justificativa_anexo', label: 'Comprovação da Justificativa (ex: e-mail, aceite)', required: false },
            );
          }
        }
      }
      
      // Rateio opcional para naturezas Água ou Energia (AC)
      if (isAguaEnergia) {
        attachments.push({ tipo: 'rateio', label: ANEXO_LABELS.rateio, required: false });
      }
    }
    
    // Comunicado ao cliente obrigatório quando origem = cliente
    if (origemCusto === 'cliente') {
      attachments.push({ tipo: 'comunicado_cliente', label: ANEXO_LABELS.comunicado_cliente, required: true });
    }
    
    return attachments;
  };

  // Check if 3 CNPJs are required (AC services non-emergency, except for isentos)
  const isNaturezaIsenta = naturezaOrcamentaria && NATUREZAS_ISENTAS_ANEXOS.includes(naturezaOrcamentaria);
  const requires3CNPJs = isAC && !emergencial && !isNaturezaIsenta;

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const number = parseInt(digits) / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleCNPJSearch = async () => {
    const result = await lookupCNPJ(cnpj);
    if (result) {
      setFornecedor(result);
      toast({ title: 'Fornecedor encontrado', description: result.razao_social || result.cnpj });
    }
  };

  // Update parcelas default based on contrato mensal
  const handleContratoMensalChange = (checked: boolean) => {
    setContratoMensal(checked);
    if (checked) {
      setParcelas('12');
    } else {
      setParcelas('1');
    }
  };

  const uploadAnexos = async (solicitacaoId: string) => {
    // Upload anexos obrigatórios/padrão
    const uploadPromises = Object.entries(anexos)
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
    
    // Upload "outros anexos" (opcionais)
    const outrosPromises = outrosAnexos.map(async (uploadedFile, index) => {
      const { file } = uploadedFile;
      const fileExt = file.name.split('.').pop();
      const filePath = `${solicitacaoId}/outros_${Date.now()}_${index}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('anexos')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { error: dbError } = await supabase
        .from('anexos')
        .insert({
          solicitacao_id: solicitacaoId,
          tipo: 'outros',
          nome_arquivo: file.name,
          storage_path: filePath,
          mime_type: file.type,
          tamanho_bytes: file.size,
        });
      
      if (dbError) throw dbError;
    });
    
    await Promise.all([...uploadPromises, ...outrosPromises]);
  };

  const handleSubmit = async () => {
    if (!user || !empreendimento || !naturezaOrcamentaria || !fornecedor) return;

    // Validate FD values if enabled
    if (faturamentoDireto) {
      const sum = valorServicoNumerico + valorMaterialNumerico;
      if (Math.abs(sum - valorNumerico) > 0.01) {
        toast({
          title: 'Valores inválidos',
          description: 'A soma de Serviço + Material deve ser igual ao valor total.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate 3 CNPJs if required
    if (requires3CNPJs) {
      if (excecaoFornecedores && !justificativaFornecedores.trim()) {
        toast({
          title: 'Justificativa obrigatória',
          description: 'Informe a justificativa para não apresentar 3 fornecedores.',
          variant: 'destructive',
        });
        return;
      }
      if (!excecaoFornecedores && (!fornecedorConcorrente1 || !fornecedorConcorrente2)) {
        toast({
          title: 'Fornecedores obrigatórios',
          description: 'Informe os 3 fornecedores ou selecione a opção de exceção.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate required attachments
    const requiredAttachments = getRequiredAttachments();
    const missingAttachments = requiredAttachments
      .filter(att => att.required && !anexos[att.tipo])
      .map(att => att.label);
    
    if (missingAttachments.length > 0) {
      toast({
        title: 'Anexos obrigatórios',
        description: `Faltando: ${missingAttachments.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Protocolo is generated automatically by the database trigger set_protocolo
      const insertData = {
        user_id: user.id,
        empreendimento: empreendimento as "mega_curitiba" | "mega_itajai" | "mega_esteio" | "todos",
        descricao,
        valor: valorNumerico,
        valor_servico: faturamentoDireto && valorServicoNumerico > 0 ? valorServicoNumerico : null,
        valor_material: faturamentoDireto && valorMaterialNumerico > 0 ? valorMaterialNumerico : null,
        tipo: (isAC ? 'AC' : 'OC') as "AC" | "OC",
        natureza_orcamentaria: naturezaOrcamentaria as "materiais_informatica" | "seguranca_vigilancia" | "assistencia_informatica" | "limpeza_conservacao" | "material_consumo" | "telefone" | "energia_eletrica" | "agua" | "manutencao_imoveis" | "material_expediente" | "servicos_diversos" | "propaganda_publicidade" | "taxa_impostos" | "manutencao_maquinas_equipamentos" | "despesas_pessoal" | "despesas_administrador",
        origem_custo: origemCusto,
        cliente_id: origemCusto === 'cliente' ? clienteId : null,
        fornecedor_id: fornecedor.id,
        fornecedor_concorrente_1_id: !excecaoFornecedores ? fornecedorConcorrente1?.id || null : null,
        fornecedor_concorrente_2_id: !excecaoFornecedores ? fornecedorConcorrente2?.id || null : null,
        justificativa_fornecedores: requires3CNPJs && excecaoFornecedores ? justificativaFornecedores.trim() : null,
        excecao_fornecedores: requires3CNPJs && excecaoFornecedores,
        tipo_contratacao: (tipoContratacao || null) as "servicos" | "material_construcao" | "material_consumo" | "combustivel" | "taxas" | null,
        data_inicio: dataInicio || null,
        data_fim: dataFim || null,
        parcelas: parseInt(parcelas) || 1,
        contrato_mensal: contratoMensal,
        faturamento_direto: faturamentoDireto,
        retencao_6_porcento: retencao6,
        tipo_garantia: tipoGarantia,
        dias_garantia: tipoGarantia !== 'ambos' && diasGarantia ? parseInt(diasGarantia) : null,
        dias_garantia_servico: tipoGarantia === 'ambos' && diasGarantiaServico ? parseInt(diasGarantiaServico) : null,
        dias_garantia_produto: tipoGarantia === 'ambos' && diasGarantiaProduto ? parseInt(diasGarantiaProduto) : null,
        custo_cliente: custoCliente,
        emergencial,
        justificativa_sem_chamado: semChamado && justificativaSemChamado.trim() ? justificativaSemChamado.trim() : null,
        justificativa_sem_memorial: semMemorial && justificativaSemMemorial.trim() ? justificativaSemMemorial.trim() : null,
      };
      
      const { data, error } = await supabase
        .from('solicitacoes')
        .insert(insertData as any) // protocolo is generated by database trigger
        .select('id, protocolo')
        .single();

      if (error) throw error;

      // Upload attachments
      await uploadAnexos(data.id);

      // Create history entry
      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: data.id,
        user_id: user.id,
        acao: 'criacao',
        status_novo: 'recebido',
      });

      // Get current user profile for solicitante info
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Send email notification to backoffice users with email notifications enabled
      try {
        console.log('[EMAIL] Iniciando envio de e-mail para backoffice...');
        const emailResult = await notifyBackofficeNewSolicitacao({
          protocolo: data.protocolo,
          descricao: descricao.substring(0, 200),
          valor: valorNumerico,
          empreendimento: EMPREENDIMENTO_LABELS[empreendimento as Empreendimento],
          solicitacao_id: data.id,
          solicitante_nome: userProfile?.full_name || userProfile?.email || 'Solicitante',
          solicitante_email: userProfile?.email || undefined,
        });
        console.log('[EMAIL] Resultado do envio:', emailResult);
        
        if (!emailResult.success) {
          console.error('[EMAIL] Falha ao enviar e-mail:', emailResult.error);
        }
      } catch (emailError) {
        console.error('[EMAIL] Erro ao enviar notificação:', emailError);
      }

      toast({
        title: 'Solicitação criada!',
        description: `Protocolo: ${data.protocolo}`,
      });
      navigate('/minhas-solicitacoes');
    } catch (error) {
      console.error('Error creating solicitacao:', error);
      toast({
        title: 'Erro ao criar solicitação',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const steps: { id: Step; label: string; show: boolean }[] = [
    { id: 'empreendimento', label: 'Local', show: true },
    { id: 'descricao', label: 'Descrição', show: true },
    { id: 'tipo', label: 'Tipo', show: valorNumerico > 1000 },
    { id: 'detalhes', label: 'Detalhes', show: true },
    { id: 'fornecedor', label: 'Fornecedor', show: true },
    { id: 'anexos', label: 'Anexos', show: true },
    { id: 'revisao', label: 'Enviar', show: true },
  ];

  const visibleSteps = steps.filter((s) => s.show);
  const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'empreendimento': return !!empreendimento;
      case 'descricao': return !!descricao && valorNumerico > 0;
      case 'tipo': return valorNumerico <= 1000 || !!tipoContratacao;
      case 'detalhes': {
        if (!naturezaOrcamentaria) return false;
        if (origemCusto === 'cliente' && !clienteId) return false;
        // FD validation: sum must equal total
        if (faturamentoDireto) {
          const sum = valorServicoNumerico + valorMaterialNumerico;
          if (Math.abs(sum - valorNumerico) > 0.01) return false;
        }
        return true;
      }
      case 'fornecedor': {
        if (!fornecedor) return false;
        // If using exception, require justification
        if (requires3CNPJs && excecaoFornecedores && !justificativaFornecedores.trim()) return false;
        // If NOT using exception, require 3 suppliers
        if (requires3CNPJs && !excecaoFornecedores && (!fornecedorConcorrente1 || !fornecedorConcorrente2)) return false;
        return true;
      }
      case 'anexos': {
        const requiredAttachments = getRequiredAttachments();
        const attachmentsOk = requiredAttachments.every(att => !att.required || !!anexos[att.tipo]);
        // Se marcou sem chamado, precisa justificar
        if (semChamado && !justificativaSemChamado.trim()) return false;
        // Se marcou sem memorial, precisa justificar
        if (semMemorial && !justificativaSemMemorial.trim()) return false;
        return attachmentsOk;
      }
      default: return true;
    }
  };

  const goNext = () => {
    if (currentIndex < visibleSteps.length - 1) {
      setCurrentStep(visibleSteps[currentIndex + 1].id);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(visibleSteps[currentIndex - 1].id);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Nova Solicitação</h1>
          <p className="text-muted-foreground">Preencha os dados para criar uma solicitação</p>
        </div>

        {/* Step Indicator - Novo componente melhorado */}
        <StepIndicator
          steps={visibleSteps.map(s => ({ 
            id: s.id, 
            label: s.label 
          })) as StepIndicatorStep[]}
          currentStepIndex={currentIndex}
          onStepClick={(index) => {
            // Permite navegar apenas para passos anteriores já concluídos
            if (index < currentIndex) {
              setCurrentStep(visibleSteps[index].id);
            }
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>{visibleSteps[currentIndex]?.label}</CardTitle>
            {currentStep === 'fornecedor' && requires3CNPJs && (
              <CardDescription className="text-warning flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                AC de serviços requer 3 fornecedores
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStep === 'empreendimento' && (
              <div className="space-y-3">
                {loadingEmpreendimentos ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando empreendimentos...
                  </div>
                ) : allowedEmpreendimentos.length === 0 ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum empreendimento está vinculado a este usuário. Peça ao admin para configurar o empreendimento.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <RadioGroup
                    value={empreendimento}
                    onValueChange={(v) => setEmpreendimento(v as Empreendimento)}
                  >
                    {allowedEmpreendimentos.map((value) => (
                      <div
                        key={value}
                        className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                      >
                        <RadioGroupItem value={value} id={value} />
                        <Label htmlFor={value} className="flex-1 cursor-pointer">
                          {EMPREENDIMENTO_LABELS[value]}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            )}

            {currentStep === 'descricao' && (
              <div className="space-y-6">
                {/* Campo Descrição - Redesign */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="descricao" className="text-base font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      O que você precisa?
                    </Label>
                    {isValidatingDescription && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        Analisando...
                      </span>
                    )}
                  </div>
                  
                  {/* Exemplos em Collapsible - Fora do campo */}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary hover:bg-transparent gap-1">
                        <Sparkles className="h-3 w-3" />
                        Ver exemplos de boa descrição
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                        <AlertDescription className="text-sm space-y-2">
                          <p className="text-blue-800 dark:text-blue-200">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ Bom:</span> "Aquisição de 4 luminárias para troca das atuais que estão queimadas. Será 2 para a portaria, 1 para o quiosque e 1 sala administrativa."
                          </p>
                          <p className="text-blue-800 dark:text-blue-200">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ Bom:</span> "Contratação de serviço de reparo do ar-condicionado da sala administrativa, pois o equipamento apresentou falha e não está refrigerando."
                          </p>
                        </AlertDescription>
                      </Alert>
                    </CollapsibleContent>
                  </Collapsible>
                  
                  {/* Textarea com borda destacada */}
                  <Textarea
                    id="descricao"
                    placeholder="Descreva detalhadamente o serviço ou material necessário, incluindo quantidade, localização e motivo..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={5}
                    className={cn(
                      "min-h-[120px] border-2 transition-colors",
                      descricao.length > 0 && descriptionValidation?.isVague 
                        ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20" 
                        : descricao.length >= 50 
                          ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                          : "border-muted focus:border-primary focus:ring-primary/20"
                    )}
                  />
                  
                  {/* Contador de caracteres */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{descricao.length} caracteres</span>
                    {descricao.length < 50 && descricao.length > 0 && (
                      <span className="text-amber-600">Mínimo recomendado: 50 caracteres</span>
                    )}
                    {descricao.length >= 50 && !descriptionValidation?.isVague && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Descrição adequada
                      </span>
                    )}
                  </div>
                  
                  {/* AI Validation Alert */}
                  {descriptionValidation?.isVague && !isValidatingDescription && (
                    <Alert className="bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800 dark:text-amber-200">
                        <span className="font-medium">Descrição pode estar incompleta</span>
                        <p className="text-sm mt-1 text-amber-700 dark:text-amber-300">
                          {descriptionValidation.suggestion}
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Campo Valor */}
                <div className="space-y-2">
                  <Label htmlFor="valor" className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Qual o valor?
                  </Label>
                  <Input
                    id="valor"
                    placeholder="R$ 0,00"
                    value={valor ? formatCurrency(valor) : ''}
                    onChange={(e) => setValor(e.target.value.replace(/\D/g, ''))}
                    className="text-lg font-medium"
                  />
                  {valorNumerico > 0 && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {valorNumerico <= 1000 ? 'Fluxo: OC (até R$ 1.000)' : 'Fluxo: Definir tipo de contratação'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {currentStep === 'tipo' && valorNumerico > 1000 && (
              <div className="space-y-4">
                <RadioGroup value={tipoContratacao} onValueChange={(v) => setTipoContratacao(v as TipoContratacao)}>
                  {Object.entries(TIPO_CONTRATACAO_LABELS).map(([value, label]) => (
                    <div key={value} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                      <RadioGroupItem value={value} id={value} />
                      <Label htmlFor={value} className="flex-1 cursor-pointer">
                        {label}
                        {value === 'servicos' && <span className="text-sm text-muted-foreground ml-2">(AC)</span>}
                        {value !== 'servicos' && <span className="text-sm text-muted-foreground ml-2">(OC)</span>}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Emergency checkbox - only for services */}
                {tipoContratacao === 'servicos' && (
                  <Alert className="bg-warning/10 border-warning">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Marque se for uma contratação emergencial</span>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="emergencial"
                          checked={emergencial}
                          onCheckedChange={(checked) => setEmergencial(!!checked)}
                        />
                        <Label htmlFor="emergencial" className="font-medium cursor-pointer">
                          Emergencial
                        </Label>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {emergencial && (
                  <Alert>
                    <Check className="h-4 w-4 text-success" />
                    <AlertDescription>
                      <strong>Emergencial:</strong> Dispensa mapa de cotação e orçamentos concorrentes.
                      Apenas chamado e orçamento escolhido serão exigidos.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {currentStep === 'detalhes' && (
              <div className="space-y-4">
                {/* Natureza Orçamentária - Show for AC OR for OC <= 1000 */}
                {(isAC || (isOC && valorNumerico <= 1000)) && (
                  <div>
                    <Label>Natureza Orçamentária</Label>
                    <Select value={naturezaOrcamentaria} onValueChange={(v) => setNaturezaOrcamentaria(v as NaturezaOrcamentaria)}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(NATUREZA_ORCAMENTARIA_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* For OC > 1000, show the auto-assigned natureza */}
                {isOCAbove1000 && naturezaOrcamentaria && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Label className="text-muted-foreground text-sm">Natureza Orçamentária (automática)</Label>
                    <p className="font-medium">{NATUREZA_ORCAMENTARIA_LABELS[naturezaOrcamentaria]}</p>
                  </div>
                )}
                <div>
                  <Label>Origem do Custo</Label>
                  <Select 
                    value={origemCusto} 
                    onValueChange={(v) => {
                      setOrigemCusto(v as OrigemCusto);
                      if (v !== 'cliente') {
                        setClienteId(null);
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORIGEM_CUSTO_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {origemCusto === 'cliente' && (
                  <ClienteSelect
                    empreendimento={empreendimento}
                    value={clienteId}
                    onChange={setClienteId}
                    required
                  />
                )}
                {isAC && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Data Início</Label>
                        <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                      </div>
                      <div>
                        <Label>Data Fim</Label>
                        <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="contratoMensal"
                        checked={contratoMensal}
                        onCheckedChange={(checked) => handleContratoMensalChange(!!checked)}
                      />
                      <Label htmlFor="contratoMensal" className="cursor-pointer">Contrato Mensal</Label>
                    </div>
                    <div>
                      <Label>Parcelas (máx. 12)</Label>
                      <Select value={parcelas} onValueChange={setParcelas}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[...Array(12)].map((_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="retencao6"
                          checked={retencao6}
                          onCheckedChange={(checked) => setRetencao6(!!checked)}
                        />
                        <Label htmlFor="retencao6" className="cursor-pointer">Retenção de 6%</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="faturamentoDireto"
                          checked={faturamentoDireto}
                          onCheckedChange={(checked) => {
                            setFaturamentoDireto(!!checked);
                            if (!checked) {
                              setValorServico('');
                              setValorMaterial('');
                            }
                          }}
                        />
                        <Label htmlFor="faturamentoDireto" className="cursor-pointer">Faturamento Direto</Label>
                      </div>
                    </div>
                    {faturamentoDireto && (
                      <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Informe os valores separados de serviço e material.
                          <strong className="block mt-1">A soma deve ser igual ao valor total informado ({formatCurrency(valor)}).</strong>
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Valor do Serviço (R$)</Label>
                            <Input
                              placeholder="R$ 0,00"
                              value={valorServico ? formatCurrency(valorServico) : ''}
                              onChange={(e) => setValorServico(e.target.value.replace(/\D/g, ''))}
                            />
                          </div>
                          <div>
                            <Label>Valor do Material (R$)</Label>
                            <Input
                              placeholder="R$ 0,00"
                              value={valorMaterial ? formatCurrency(valorMaterial) : ''}
                              onChange={(e) => setValorMaterial(e.target.value.replace(/\D/g, ''))}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm font-medium">Total (FD):</span>
                          <span className={cn(
                            "font-bold",
                            Math.abs((valorServicoNumerico + valorMaterialNumerico) - valorNumerico) > 0.01 
                              ? "text-destructive" 
                              : "text-success"
                          )}>
                            {(valorServicoNumerico + valorMaterialNumerico).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        {Math.abs((valorServicoNumerico + valorMaterialNumerico) - valorNumerico) > 0.01 && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              A soma de Serviço + Material deve ser exatamente igual ao valor total ({formatCurrency(valor)}).
                              Diferença: {formatCurrency(String(Math.round(Math.abs((valorServicoNumerico + valorMaterialNumerico) - valorNumerico) * 100)))}.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                    {/* Flag: Chamado é uma corretiva? */}
                    <div className="flex items-center space-x-2 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                      <Checkbox
                        id="chamadoCorretiva"
                        checked={chamadoCorretiva}
                        onCheckedChange={(checked) => setChamadoCorretiva(!!checked)}
                      />
                      <Label htmlFor="chamadoCorretiva" className="cursor-pointer text-amber-800 dark:text-amber-200">
                        Chamado é uma corretiva?
                      </Label>
                    </div>
                    
                    {/* Tipo de Garantia - Estilizado com tema âmbar */}
                    <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 space-y-3">
                      <Label className="text-amber-800 dark:text-amber-200">Tipo de Garantia</Label>
                      <Select value={tipoGarantia} onValueChange={(v) => setTipoGarantia(v as TipoGarantia)}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIPO_GARANTIA_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {tipoGarantia !== 'nenhuma' && tipoGarantia !== 'ambos' && (
                        <div>
                          <Label className="text-amber-800 dark:text-amber-200">Dias de Garantia</Label>
                          <Input
                            type="number"
                            value={diasGarantia}
                            onChange={(e) => setDiasGarantia(e.target.value)}
                            placeholder="Ex: 90"
                            className="bg-background"
                          />
                        </div>
                      )}
                      {tipoGarantia === 'ambos' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-amber-800 dark:text-amber-200">Dias de Garantia (Serviço)</Label>
                            <Input
                              type="number"
                              value={diasGarantiaServico}
                              onChange={(e) => setDiasGarantiaServico(e.target.value)}
                              placeholder="Ex: 90"
                              className="bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-amber-800 dark:text-amber-200">Dias de Garantia (Produto)</Label>
                            <Input
                              type="number"
                              value={diasGarantiaProduto}
                              onChange={(e) => setDiasGarantiaProduto(e.target.value)}
                              placeholder="Ex: 365"
                              className="bg-background"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {currentStep === 'fornecedor' && (
              <div className="space-y-6">
                <SupplierSearch
                  label="Fornecedor Principal"
                  required
                  value={fornecedor}
                  onChange={setFornecedor}
                />

                {requires3CNPJs && (
                  <div className="p-4 rounded-lg bg-muted/30 border space-y-4">
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Concorrência com 3 fornecedores?</Label>
                      <p className="text-sm text-muted-foreground">
                        AC de serviços não emergencial normalmente requer 3 fornecedores com cotações.
                      </p>
                      <RadioGroup 
                        value={excecaoFornecedores ? 'nao' : 'sim'} 
                        onValueChange={(v) => {
                          setExcecaoFornecedores(v === 'nao');
                          if (v === 'sim') {
                            setJustificativaFornecedores('');
                          }
                        }}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id="3forn-sim" />
                          <Label htmlFor="3forn-sim" className="cursor-pointer">Sim, tenho 3 fornecedores</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id="3forn-nao" />
                          <Label htmlFor="3forn-nao" className="cursor-pointer">Não (exceção)</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {!excecaoFornecedores && (
                      <>
                        <SupplierSearch
                          label="Fornecedor Concorrente 1"
                          required
                          value={fornecedorConcorrente1}
                          onChange={setFornecedorConcorrente1}
                        />
                        <SupplierSearch
                          label="Fornecedor Concorrente 2"
                          required
                          value={fornecedorConcorrente2}
                          onChange={setFornecedorConcorrente2}
                        />
                      </>
                    )}
                    
                    {excecaoFornecedores && (
                      <div className="pt-4 border-t">
                        <Label htmlFor="justificativa" className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          Justificativa para exceção (obrigatória)
                        </Label>
                        <Textarea
                          id="justificativa"
                          placeholder="Explique por que não foi possível obter 3 orçamentos de fornecedores diferentes..."
                          value={justificativaFornecedores}
                          onChange={(e) => setJustificativaFornecedores(e.target.value)}
                          rows={3}
                          className="mt-2"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {currentStep === 'anexos' && (
              <div className="space-y-4">
                {/* OC - Água/Energia info */}
                {isOC && (naturezaOrcamentaria === 'agua' || naturezaOrcamentaria === 'energia_eletrica') && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Água/Energia:</strong> Você pode anexar a planilha de rateio (opcional).
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* OC - Demais naturezas */}
                {isOC && !(naturezaOrcamentaria === 'agua' || naturezaOrcamentaria === 'energia_eletrica') && (
                  <>
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Proposta do Fornecedor:</strong> Anexe a proposta do fornecedor em PDF (obrigatório).
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                      <Checkbox
                        id="temChamado"
                        checked={temChamadoInfraspeak}
                        onCheckedChange={(checked) => setTemChamadoInfraspeak(!!checked)}
                      />
                      <Label htmlFor="temChamado" className="cursor-pointer">
                        Existe chamado Infraspeak?
                      </Label>
                    </div>
                  </>
                )}
                
                {/* AC info */}
                {isAC && isNaturezaIsenta && (
                  <Alert>
                    <Check className="h-4 w-4 text-success" />
                    <AlertDescription>
                      <strong>Natureza orçamentária isenta:</strong> Esta natureza ({naturezaOrcamentaria && NATUREZA_ORCAMENTARIA_LABELS[naturezaOrcamentaria]}) não requer anexos obrigatórios de cotação.
                    </AlertDescription>
                  </Alert>
                )}
                
                {isAC && !isNaturezaIsenta && !emergencial && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Anexe os documentos em formato PDF (máx. 100MB cada)
                    </p>
                    
                    {/* Flag: Sem Chamado - só aparece se marcou "Chamado é uma corretiva" */}
                    {chamadoCorretiva && (
                      <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="semChamado"
                            checked={semChamado}
                            onCheckedChange={(checked) => {
                              setSemChamado(!!checked);
                              if (!checked) setJustificativaSemChamado('');
                            }}
                          />
                          <Label htmlFor="semChamado" className="cursor-pointer text-sm">
                            Não tenho chamado Infraspeak para esta solicitação
                          </Label>
                        </div>
                        {semChamado && (
                          <Textarea
                            placeholder="Justifique por que não possui chamado Infraspeak..."
                            value={justificativaSemChamado}
                            onChange={(e) => setJustificativaSemChamado(e.target.value)}
                            rows={2}
                            className="mt-2"
                          />
                        )}
                      </div>
                    )}
                    
                    {/* Flag: Sem Memorial */}
                    <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="semMemorial"
                          checked={semMemorial}
                          onCheckedChange={(checked) => {
                            setSemMemorial(!!checked);
                            if (!checked) setJustificativaSemMemorial('');
                          }}
                        />
                        <Label htmlFor="semMemorial" className="cursor-pointer text-sm">
                          Não tenho memorial descritivo/escopo para esta solicitação
                        </Label>
                      </div>
                      {semMemorial && (
                        <Textarea
                          placeholder="Justifique por que não possui memorial descritivo/escopo..."
                          value={justificativaSemMemorial}
                          onChange={(e) => setJustificativaSemMemorial(e.target.value)}
                          rows={2}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>
                )}
                
                {isAC && !isNaturezaIsenta && emergencial && (
                  <p className="text-sm text-muted-foreground">
                    Anexe os documentos obrigatórios em formato PDF (máx. 100MB cada)
                  </p>
                )}
                
                {/* AC - Água/Energia rateio */}
                {isAC && (naturezaOrcamentaria === 'agua' || naturezaOrcamentaria === 'energia_eletrica') && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Rateio:</strong> Para solicitações de Água ou Energia, você pode anexar a planilha de rateio (opcional).
                    </AlertDescription>
                  </Alert>
                )}
                
                {origemCusto === 'cliente' && (
                  <Alert className="bg-warning/10 border-warning">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription>
                      <strong>Origem Cliente:</strong> É obrigatório anexar o comunicado ao cliente.
                    </AlertDescription>
                  </Alert>
                )}
                
                <MultiFileUpload
                  requirements={getRequiredAttachments()}
                  files={anexos}
                  onFilesChange={setAnexos}
                />
                
                {/* Outros Anexos (opcional) */}
                <OtherFilesUpload
                  files={outrosAnexos}
                  onFilesChange={setOutrosAnexos}
                  maxFiles={5}
                />
              </div>
            )}

            {currentStep === 'revisao' && (
              <div className="space-y-4">
                {/* Descrição com expand/collapse */}
                <Collapsible defaultOpen className="rounded-lg border p-3 bg-muted/30">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <span className="font-medium text-sm">Descrição do Serviço/Material</span>
                    <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <p className="text-sm whitespace-pre-wrap">{descricao}</p>
                  </CollapsibleContent>
                </Collapsible>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Tipo</span>
                    <span className="font-medium">
                      {isAC ? 'AC - Autorização de Contratação' : 'OC - Ordem de Compra'}
                      {emergencial && <span className="ml-2 text-warning">(Emergencial)</span>}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Empreendimento</span>
                    <span>{empreendimento && EMPREENDIMENTO_LABELS[empreendimento]}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Valor Total</span>
                    <span className="font-medium">
                      {faturamentoDireto 
                        ? (valorServicoNumerico + valorMaterialNumerico).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : formatCurrency(valor)
                      }
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Natureza Orçamentária</span>
                    <span>{naturezaOrcamentaria && NATUREZA_ORCAMENTARIA_LABELS[naturezaOrcamentaria]}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Origem do Custo</span>
                    <span>{ORIGEM_CUSTO_LABELS[origemCusto]}</span>
                  </div>
                  {origemCusto === 'cliente' && clienteNome && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Cliente</span>
                      <span className="font-medium">{clienteNome}</span>
                    </div>
                  )}
                  {tipoContratacao && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Tipo de Contratação</span>
                      <span>{TIPO_CONTRATACAO_LABELS[tipoContratacao]}</span>
                    </div>
                  )}
                  
                  {/* Detalhes do AC */}
                  {isAC && (
                    <>
                      {dataInicio && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Data de Início</span>
                          <span>{new Date(dataInicio).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                      {dataFim && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Data de Término</span>
                          <span>{new Date(dataFim).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">Parcelas</span>
                        <span>{parcelas}x</span>
                      </div>
                      {contratoMensal && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Contrato Mensal</span>
                          <span className="text-success">Sim</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Flag Faturamento Direto */}
                  {faturamentoDireto && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Faturamento Direto</span>
                      <span className="text-success font-medium">Sim</span>
                    </div>
                  )}
                  {retencao6 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Retenção 6%</span>
                      <span className="text-success">Sim</span>
                    </div>
                  )}
                  {custoCliente && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Custo do Cliente</span>
                      <span className="text-success">Sim</span>
                    </div>
                  )}

                  {/* Garantia */}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Garantia</span>
                    <span>
                      {TIPO_GARANTIA_LABELS[tipoGarantia]}
                      {tipoGarantia !== 'nenhuma' && tipoGarantia !== 'ambos' && diasGarantia && (
                        <span className="ml-1">({diasGarantia} dias)</span>
                      )}
                      {tipoGarantia === 'ambos' && (
                        <span className="ml-1">
                          (Serviço: {diasGarantiaServico || '—'} dias, Produto: {diasGarantiaProduto || '—'} dias)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Fornecedores */}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Fornecedor</span>
                    <span>{fornecedor?.razao_social || fornecedor?.cnpj}</span>
                  </div>
                  {requires3CNPJs && (
                    <>
                      {fornecedorConcorrente1 && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Concorrente 1</span>
                          <span>{fornecedorConcorrente1?.razao_social || fornecedorConcorrente1?.cnpj}</span>
                        </div>
                      )}
                      {fornecedorConcorrente2 && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Concorrente 2</span>
                          <span>{fornecedorConcorrente2?.razao_social || fornecedorConcorrente2?.cnpj}</span>
                        </div>
                      )}
                      {justificativaFornecedores.trim() && (
                        <div className="py-2 border-b">
                          <span className="text-muted-foreground text-sm flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-warning" />
                            Justificativa (exceção 3 fornecedores)
                          </span>
                          <p className="text-sm mt-1">{justificativaFornecedores}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Lista de anexos */}
                  <div className="pt-2">
                    <span className="text-muted-foreground text-sm">Anexos ({Object.values(anexos).filter(Boolean).length})</span>
                    <div className="mt-2 space-y-1">
                      {Object.entries(anexos)
                        .filter(([_, file]) => file !== null)
                        .map(([tipo, file]) => (
                          <div key={tipo} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 truncate">{file?.file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {((file?.file.size || 0) / 1024).toFixed(0)} KB
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={goBack} disabled={currentIndex === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          {currentStep === 'revisao' ? (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Enviar Solicitação
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!canProceed()}>
              Próximo <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}