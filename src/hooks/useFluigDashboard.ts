import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseFluigXLSX, type ParseResult } from '@/lib/fluig-parser';
import type { FluigSnapshot, FluigRowData, FluigImportResult } from '@/types/fluig';

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
      let query = supabase
        .from('fluig_painel_snapshot')
        .select('*')
        .order('data_lancamento', { ascending: false, nullsFirst: false });
      
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
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      setSnapshots((data || []) as FluigSnapshot[]);
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
        const { data } = await supabase
          .from('fluig_painel_snapshot')
          .select('empreendimento, situacao, localizacao, responsavel_atual');
        
        if (data) {
          const empSet = new Set<string>();
          const sitSet = new Set<string>();
          const locSet = new Set<string>();
          const respSet = new Set<string>();
          
          data.forEach(row => {
            if (row.empreendimento) empSet.add(row.empreendimento);
            if (row.situacao) sitSet.add(row.situacao);
            if (row.localizacao) locSet.add(row.localizacao);
            if (row.responsavel_atual) respSet.add(row.responsavel_atual);
          });
          
          setEmpreendimentos(Array.from(empSet).sort());
          setSituacoes(Array.from(sitSet).sort());
          setLocalizacoes(Array.from(locSet).sort());
          setResponsaveis(Array.from(respSet).sort());
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
      // Get existing snapshots
      const { data: existing } = await supabase
        .from('fluig_painel_snapshot')
        .select('id, solicitacao_fluig, situacao, localizacao, responsavel_atual, gerencia_conclusao, gerencia_facilities_conclusao, gerencia_financeiro_conclusao, diretoria_conclusao');
      
      const existingMap = new Map((existing || []).map(e => [e.solicitacao_fluig, e]));
      
      // Get links to internal solicitations and create a Set of valid IDs
      const { data: internalLinks } = await supabase
        .from('solicitacoes')
        .select('id, numero_chamado_fluig')
        .not('numero_chamado_fluig', 'is', null);
      
      const linkMap = new Map((internalLinks || []).map(l => [l.numero_chamado_fluig, l.id]));
      
      // Create a Set of valid solicitacao IDs for quick validation
      const { data: validSolicitacoes } = await supabase
        .from('solicitacoes')
        .select('id');
      
      const validIds = new Set((validSolicitacoes || []).map(s => s.id));
      
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
            const changes: { campo: string; anterior: string | null; novo: string | null }[] = [];
            
            if (existingRow.situacao !== row.situacao) {
              changes.push({ campo: 'situacao', anterior: existingRow.situacao, novo: row.situacao });
            }
            if (existingRow.localizacao !== row.localizacao) {
              changes.push({ campo: 'localizacao', anterior: existingRow.localizacao, novo: row.localizacao });
            }
            if (existingRow.responsavel_atual !== row.responsavel_atual) {
              changes.push({ campo: 'responsavel_atual', anterior: existingRow.responsavel_atual, novo: row.responsavel_atual });
            }
            
            // Check approval stages
            if (!existingRow.gerencia_conclusao && row.gerencia_conclusao) {
              changes.push({ campo: 'gerencia_conclusao', anterior: null, novo: row.gerencia_conclusao.toISOString() });
            }
            if (!existingRow.gerencia_facilities_conclusao && row.gerencia_facilities_conclusao) {
              changes.push({ campo: 'gerencia_facilities_conclusao', anterior: null, novo: row.gerencia_facilities_conclusao.toISOString() });
            }
            if (!existingRow.gerencia_financeiro_conclusao && row.gerencia_financeiro_conclusao) {
              changes.push({ campo: 'gerencia_financeiro_conclusao', anterior: null, novo: row.gerencia_financeiro_conclusao.toISOString() });
            }
            if (!existingRow.diretoria_conclusao && row.diretoria_conclusao) {
              changes.push({ campo: 'diretoria_conclusao', anterior: null, novo: row.diretoria_conclusao.toISOString() });
            }
            
            if (changes.length > 0) {
              result.comAlteracaoStatus++;
              
              // Insert events into fluig_painel_eventos
              for (const change of changes) {
                await supabase.from('fluig_painel_eventos').insert({
                  solicitacao_fluig: row.solicitacao_fluig,
                  campo_alterado: change.campo,
                  valor_anterior: change.anterior,
                  valor_novo: change.novo,
                  importado_por: userId,
                });
              }
              
              // If linked to internal solicitation, also insert into historico_solicitacoes
              if (validInternalId) {
                for (const change of changes) {
                  let mensagem = '';
                  
                  if (change.campo === 'responsavel_atual') {
                    mensagem = `Fluig: Responsável alterado para "${change.novo}"`;
                  } else if (change.campo === 'localizacao') {
                    mensagem = `Fluig: Etapa alterada para "${change.novo}"`;
                  } else if (change.campo === 'situacao') {
                    mensagem = `Fluig: Situação alterada para "${change.novo}"`;
                  } else if (change.campo === 'gerencia_conclusao') {
                    mensagem = `Fluig: Aprovado pela Gerência`;
                  } else if (change.campo === 'gerencia_facilities_conclusao') {
                    mensagem = `Fluig: Aprovado pela Gerência de Facilities`;
                  } else if (change.campo === 'gerencia_financeiro_conclusao') {
                    mensagem = `Fluig: Aprovado pela Gerência Financeira`;
                  } else if (change.campo === 'diretoria_conclusao') {
                    mensagem = `Fluig: Aprovado pela Diretoria`;
                  }
                  
                  if (mensagem) {
                    await supabase.from('historico_solicitacoes').insert({
                      solicitacao_id: validInternalId,
                      user_id: userId,
                      acao: 'atualizacao_fluig',
                      motivo: mensagem,
                    });
                  }
                }
              }
            }
          } else {
            // Insert new
            const { error } = await supabase
              .from('fluig_painel_snapshot')
              .insert(snapshotData);
            
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
