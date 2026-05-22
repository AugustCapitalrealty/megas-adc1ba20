import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseFluigXLSX, type ParseResult } from '@/lib/fluig-parser';
import type { FluigSnapshot, FluigRowData, FluigImportResult } from '@/types/fluig';
import { isRetornoParaCorrecao, isAprovacaoReal, CAMPO_APROVACAO_LABELS } from '@/lib/fluig-utils';

export interface FluigFilters {
  search?: string;
  empreendimento?: string;
  situacao?: string;
  localizacao?: string;
  responsavel?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

export function useFluigSnapshots(filters?: FluigFilters) {
  const [snapshots, setSnapshots] = useState<FluigSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const PAGE = 1000;
      const allSnapshots: FluigSnapshot[] = [];
      let from = 0;

      const buildQuery = () => {
        let query: any = supabase
          .from('fluig_painel_snapshot')
          .select('*')
          .order('data_lancamento', { ascending: true, nullsFirst: false });
        
        if (filters?.search) {
          query = query.or(`solicitacao_fluig.ilike.%${filters.search}%,fornecedor.ilike.%${filters.search}%,servico.ilike.%${filters.search}%`);
        }
        
        if (filters?.empreendimento) {
          query = query.eq('empreendimento', filters.empreendimento);
        }
        
        if (filters?.situacao) {
          query = query.eq('situacao', filters.situacao);
        }
        
        if (filters?.localizacao) {
          query = query.eq('localizacao', filters.localizacao);
        }
        
        if (filters?.responsavel) {
          query = query.eq('responsavel_atual', filters.responsavel);
        }
        
        if (filters?.dataInicio) {
          query = query.gte('data_lancamento', filters.dataInicio.toISOString());
        }
        
        if (filters?.dataFim) {
          query = query.lte('data_lancamento', filters.dataFim.toISOString());
        }

        return query;
      };

      while (true) {
        const { data, error: fetchError } = await buildQuery().range(from, from + PAGE - 1);
        if (fetchError) throw fetchError;
        if (!data || data.length === 0) break;

        allSnapshots.push(...(data as FluigSnapshot[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }

      setSnapshots(allSnapshots);
    } catch (err) {
      console.error('Error fetching Fluig snapshots:', err);
      setError('Erro ao carregar dados do Fluig');
    } finally {
      setLoading(false);
    }
  }, [filters?.search, filters?.empreendimento, filters?.situacao, filters?.localizacao, filters?.responsavel, filters?.dataInicio, filters?.dataFim]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  return { snapshots, loading, error, refetch: fetchSnapshots };
}

export function useFluigFilterOptions() {
  const [empreendimentos, setEmpreendimentos] = useState<string[]>([]);
  const [situacoes, setSituacoes] = useState<string[]>([]);
  const [localizacoes, setLocalizacoes] = useState<string[]>([]);
  const [responsaveis, setResponsaveis] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOptions() {
      setLoading(true);
      
      try {
        const { data, error } = await supabase.rpc('get_fluig_filter_options');
        
        if (!error && data) {
          const d = data as any;
          setEmpreendimentos((d.empreendimentos || []).sort());
          setSituacoes((d.situacoes || []).sort());
          setLocalizacoes((d.localizacoes || []).sort());
          setResponsaveis((d.responsaveis || []).sort());
        }
      } catch (err) {
        console.error('Error fetching filter options:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchOptions();
  }, []);

  return { empreendimentos, situacoes, localizacoes, responsaveis, loading };
}

// Mapping for stage labels - consolidates different names for the same stage
const ETAPA_LABELS: Record<string, string> = {
  // Gerência de Facilities
  'Para o Papel Gestor Condominio': 'Gerência de Facilities',
  'Para o Papel Gestor Condomínio': 'Gerência de Facilities',
  'Aprovação Nivel 1': 'Gerência de Facilities',
  'Aprovação Nível 1': 'Gerência de Facilities',
  'Jonatas Augusto Ferreira': 'Gerência de Facilities',
  // Gerência Financeira
  'Aprovação Nivel 2': 'Gerência Financeira',
  'Aprovação Nível 2': 'Gerência Financeira',
  'Kethli Pereira Bezerra': 'Gerência Financeira',
  // Diretoria
  'Aprovação Nivel 3': 'Diretoria',
  'Aprovação Nível 3': 'Diretoria',
  'Thiago Demeterco Lucchesi': 'Diretoria',
};

function getMappedLabel(value: string | null): string {
  if (!value) return '';
  return ETAPA_LABELS[value] || value;
}

export function useFluigImport() {
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<FluigImportResult | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });

  const parseFile = useCallback(async (file: File): Promise<ParseResult> => {
    const buffer = await file.arrayBuffer();
    const result = parseFluigXLSX(buffer);
    setParseResult(result);
    return result;
  }, []);

  const importData = useCallback(async (data: FluigRowData[], userId: string): Promise<FluigImportResult> => {
    setImporting(true);
    setProgress({ current: 0, total: data.length, percentage: 0 });
    
    const result: FluigImportResult = {
      totalLinhas: data.length,
      linhasValidas: data.length,
      linhasInvalidas: 0,
      novas: 0,
      atualizadas: 0,
      comAlteracaoStatus: 0,
      erros: [],
    };

    try {
      // Helper: paginate any SELECT to bypass PostgREST's 1000-row default limit
      const PAGE = 1000;
      async function fetchAll<T>(builder: () => any): Promise<T[]> {
        const all: T[] = [];
        let from = 0;
        while (true) {
          const { data: page, error } = await builder().range(from, from + PAGE - 1);
          if (error) throw error;
          if (!page || page.length === 0) break;
          all.push(...(page as T[]));
          if (page.length < PAGE) break;
          from += PAGE;
        }
        return all;
      }

      // Get existing snapshots (paginated)
      const existing = await fetchAll<{ id: string; solicitacao_fluig: string; situacao: string | null; localizacao: string | null; responsavel_atual: string | null; gerencia_conclusao: string | null; gerencia_facilities_conclusao: string | null; gerencia_financeiro_conclusao: string | null; diretoria_conclusao: string | null }>(() =>
        supabase
          .from('fluig_painel_snapshot')
          .select('id, solicitacao_fluig, situacao, localizacao, responsavel_atual, gerencia_conclusao, gerencia_facilities_conclusao, gerencia_financeiro_conclusao, diretoria_conclusao')
      );

      const existingMap = new Map(existing.map(e => [e.solicitacao_fluig, e]));

      // Get links to internal solicitations (paginated)
      const internalLinks = await fetchAll<{ id: string; numero_chamado_fluig: string | null }>(() =>
        supabase
          .from('solicitacoes')
          .select('id, numero_chamado_fluig')
          .not('numero_chamado_fluig', 'is', null)
      );

      const linkMap = new Map(internalLinks.map(l => [l.numero_chamado_fluig?.trim(), l.id]));

      // Create a Set of valid solicitacao IDs for quick validation (paginated)
      const validSolicitacoes = await fetchAll<{ id: string }>(() =>
        supabase.from('solicitacoes').select('id')
      );

      const validIds = new Set(validSolicitacoes.map(s => s.id));
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // Update progress
        const currentProgress = i + 1;
        setProgress({
          current: currentProgress,
          total: data.length,
          percentage: Math.round((currentProgress / data.length) * 100),
        });
        
        try {
          const existingRow = existingMap.get(row.solicitacao_fluig);
          const internalId = linkMap.get(row.solicitacao_fluig) || null;
          
          // Validate that the internal ID still exists in the database
          const validInternalId = internalId && validIds.has(internalId) ? internalId : null;
          
          const snapshotData = {
            solicitacao_fluig: row.solicitacao_fluig,
            data_lancamento: row.data_lancamento?.toISOString() || null,
            fornecedor: row.fornecedor,
            valor: row.valor,
            servico: row.servico,
            responsavel_atual: row.responsavel_atual,
            empreendimento: row.empreendimento,
            situacao: row.situacao,
            localizacao: row.localizacao,
            gerencia_responsavel: row.gerencia_responsavel,
            gerencia_conclusao: row.gerencia_conclusao?.toISOString() || null,
            gerencia_facilities_responsavel: row.gerencia_facilities_responsavel,
            gerencia_facilities_conclusao: row.gerencia_facilities_conclusao?.toISOString() || null,
            gerencia_financeiro_responsavel: row.gerencia_financeiro_responsavel,
            gerencia_financeiro_conclusao: row.gerencia_financeiro_conclusao?.toISOString() || null,
            diretoria_responsavel: row.diretoria_responsavel,
            diretoria_conclusao: row.diretoria_conclusao?.toISOString() || null,
            data_inicio: row.data_inicio?.toISOString() || null,
            data_fim: row.data_fim?.toISOString() || null,
            solicitacao_interna_id: validInternalId,
            importado_por: userId,
            importado_em: new Date().toISOString(),
          };
          
          if (existingRow) {
            // Update existing
            const { error } = await supabase
              .from('fluig_painel_snapshot')
              .update(snapshotData)
              .eq('solicitacao_fluig', row.solicitacao_fluig);
            
            if (error) throw error;
            result.atualizadas++;
            
            // Check for changes and log events
            const rawChanges: { campo: string; anterior: string | null; novo: string | null }[] = [];
            
            if (existingRow.situacao !== row.situacao) {
              rawChanges.push({ campo: 'situacao', anterior: existingRow.situacao, novo: row.situacao });
            }
            if (existingRow.localizacao !== row.localizacao) {
              rawChanges.push({ campo: 'localizacao', anterior: existingRow.localizacao, novo: row.localizacao });
            }
            if (existingRow.responsavel_atual !== row.responsavel_atual) {
              rawChanges.push({ campo: 'responsavel_atual', anterior: existingRow.responsavel_atual, novo: row.responsavel_atual });
            }
            
            // Check approval stages
            if (!existingRow.gerencia_conclusao && row.gerencia_conclusao) {
              rawChanges.push({ campo: 'gerencia_conclusao', anterior: null, novo: row.gerencia_conclusao.toISOString() });
            }
            if (!existingRow.gerencia_facilities_conclusao && row.gerencia_facilities_conclusao) {
              rawChanges.push({ campo: 'gerencia_facilities_conclusao', anterior: null, novo: row.gerencia_facilities_conclusao.toISOString() });
            }
            if (!existingRow.gerencia_financeiro_conclusao && row.gerencia_financeiro_conclusao) {
              rawChanges.push({ campo: 'gerencia_financeiro_conclusao', anterior: null, novo: row.gerencia_financeiro_conclusao.toISOString() });
            }
            if (!existingRow.diretoria_conclusao && row.diretoria_conclusao) {
              rawChanges.push({ campo: 'diretoria_conclusao', anterior: null, novo: row.diretoria_conclusao.toISOString() });
            }
            
            // Consolidate responsavel_atual and localizacao changes if they map to the same stage
            const consolidatedChanges: typeof rawChanges = [];
            const responsavelChange = rawChanges.find(c => c.campo === 'responsavel_atual');
            const localizacaoChange = rawChanges.find(c => c.campo === 'localizacao');
            
            if (responsavelChange && localizacaoChange) {
              // Both changed - check if they map to same stage
              const etapaResponsavel = getMappedLabel(responsavelChange.novo);
              const etapaLocalizacao = getMappedLabel(localizacaoChange.novo);
              
              if (etapaResponsavel === etapaLocalizacao && etapaResponsavel !== responsavelChange.novo) {
                // Same stage AND it's a mapped stage (not just same raw values)
                // Register ONE consolidated event with "Movido para [Etapa]"
                consolidatedChanges.push({
                  campo: 'etapa_consolidada',
                  anterior: null,
                  novo: etapaResponsavel,
                });
              } else if (etapaResponsavel === etapaLocalizacao) {
                // Same raw values but not mapped - just use localizacao
                consolidatedChanges.push({
                  ...localizacaoChange,
                  novo: etapaLocalizacao,
                });
              } else {
                // Different stages - keep only localizacao (more representative)
                consolidatedChanges.push({
                  ...localizacaoChange,
                  novo: etapaLocalizacao,
                });
              }
            } else {
              // Only one changed - apply mapping
              if (responsavelChange) {
                const etapa = getMappedLabel(responsavelChange.novo);
                // Only add if it maps to a known stage, otherwise ignore responsavel_atual
                if (etapa !== responsavelChange.novo) {
                  consolidatedChanges.push({
                    campo: 'etapa_consolidada',
                    anterior: null,
                    novo: etapa,
                  });
                }
              }
              if (localizacaoChange) {
                consolidatedChanges.push({
                  ...localizacaoChange,
                  novo: getMappedLabel(localizacaoChange.novo),
                });
              }
            }
            
            // Add situacao changes
            rawChanges
              .filter(c => c.campo === 'situacao')
              .forEach(c => consolidatedChanges.push(c));
            
            // Consolidate approval changes - avoid duplicates
            const approvalChanges = rawChanges.filter(c => c.campo.includes('_conclusao'));
            const registeredApprovals = new Set<string>();
            
            // Map approval fields to their display names
            const approvalLabels: Record<string, string> = {
              'gerencia_conclusao': 'Gerência',
              'gerencia_facilities_conclusao': 'Gerência de Facilities',
              'gerencia_financeiro_conclusao': 'Gerência Financeira',
              'diretoria_conclusao': 'Diretoria',
            };
            
            for (const approval of approvalChanges) {
              const label = approvalLabels[approval.campo];
              if (label && !registeredApprovals.has(label)) {
                registeredApprovals.add(label);
                consolidatedChanges.push(approval);
              }
            }
            
            if (consolidatedChanges.length > 0) {
              result.comAlteracaoStatus++;
              
              // Batch insert events into fluig_painel_eventos
              const eventoBatch = rawChanges.map(change => ({
                solicitacao_fluig: row.solicitacao_fluig,
                campo_alterado: change.campo,
                valor_anterior: change.anterior,
                valor_novo: change.novo,
                importado_por: userId,
              }));
              
              if (eventoBatch.length > 0) {
                await supabase.from('fluig_painel_eventos').insert(eventoBatch);
              }
              
              // If linked to internal solicitation, batch insert historico events
              if (validInternalId) {
                const novoResponsavel = row.responsavel_atual || '';
                const ehRetorno = isRetornoParaCorrecao(novoResponsavel);
                
                const historicoBatch: any[] = [];
                
                if (ehRetorno) {
                  historicoBatch.push({
                    solicitacao_id: validInternalId,
                    user_id: userId,
                    acao: 'atualizacao_fluig',
                    motivo: `Fluig: Retornado para ${novoResponsavel}`,
                  });
                } else {
                  for (const change of consolidatedChanges) {
                    let mensagem = '';
                    
                    if (change.campo === 'etapa_consolidada') {
                      mensagem = `Fluig: Movido para ${change.novo}`;
                    } else if (change.campo === 'localizacao') {
                      mensagem = `Fluig: Etapa alterada para "${change.novo}"`;
                    } else if (change.campo === 'situacao') {
                      mensagem = `Fluig: Situação alterada para "${change.novo}"`;
                    } else if (change.campo === 'gerencia_conclusao') {
                      mensagem = `Fluig: Aprovado pela Gerência`;
                    } else if (change.campo === 'gerencia_facilities_conclusao') {
                      if (isAprovacaoReal('gerencia_facilities_conclusao', row.localizacao)) {
                        mensagem = `Fluig: Aprovado pela Gerência de Facilities`;
                      }
                    } else if (change.campo === 'gerencia_financeiro_conclusao') {
                      if (isAprovacaoReal('gerencia_financeiro_conclusao', row.localizacao)) {
                        mensagem = `Fluig: Aprovado pela Gerência Financeira`;
                      }
                    } else if (change.campo === 'diretoria_conclusao') {
                      if (isAprovacaoReal('diretoria_conclusao', row.localizacao)) {
                        mensagem = `Fluig: Aprovado pela Diretoria`;
                      }
                    }
                    
                    if (mensagem) {
                      historicoBatch.push({
                        solicitacao_id: validInternalId,
                        user_id: userId,
                        acao: 'atualizacao_fluig',
                        motivo: mensagem,
                      });
                    }
                  }
                }
                
                if (historicoBatch.length > 0) {
                  await supabase.from('historico_solicitacoes').insert(historicoBatch);
                }
              }
            }
          } else {
            // Insert new (upsert as safety net against race conditions / stale existingMap)
            const { error } = await supabase
              .from('fluig_painel_snapshot')
              .upsert(snapshotData, { onConflict: 'solicitacao_fluig' });
            
            if (error) throw error;
            result.novas++;
          }
        } catch (rowError: any) {
          result.erros.push(`Solicitação ${row.solicitacao_fluig}: ${rowError.message}`);
        }
      }
    } catch (err: any) {
      result.erros.push(`Erro geral: ${err.message}`);
    } finally {
      setImporting(false);
      setImportResult(result);
      setProgress({ current: 0, total: 0, percentage: 0 });
    }

    return result;
  }, []);

  const reset = useCallback(() => {
    setParseResult(null);
    setImportResult(null);
    setProgress({ current: 0, total: 0, percentage: 0 });
  }, []);

  return { importing, parseResult, importResult, progress, parseFile, importData, reset };
}
