-- Update the get_solicitacao_detalhes function to include enriched data for all 3 suppliers
CREATE OR REPLACE FUNCTION public.get_solicitacao_detalhes(p_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'solicitacao', (
      SELECT row_to_json(sol) FROM (
        SELECT 
          s.*,
          -- Fornecedor Escolhido (completo)
          f.cnpj as fornecedor_cnpj,
          f.razao_social as fornecedor_razao,
          f.nome_fantasia as fornecedor_nome_fantasia,
          f.email as fornecedor_email,
          f.telefone as fornecedor_telefone,
          f.endereco as fornecedor_endereco,
          f.cidade as fornecedor_cidade,
          f.uf as fornecedor_uf,
          f.is_mei as fornecedor_is_mei,
          f.cep as fornecedor_cep,
          f.bairro as fornecedor_bairro,
          f.logradouro as fornecedor_logradouro,
          f.numero as fornecedor_numero,
          f.complemento as fornecedor_complemento,
          f.cnae_principal_codigo as fornecedor_cnae_principal_codigo,
          f.cnae_principal_descricao as fornecedor_cnae_principal_descricao,
          f.cnaes_secundarios as fornecedor_cnaes_secundarios,
          f.situacao_cadastral as fornecedor_situacao_cadastral,
          f.situacao_cadastral_descricao as fornecedor_situacao_cadastral_descricao,
          f.data_situacao_cadastral as fornecedor_data_situacao_cadastral,
          f.natureza_juridica as fornecedor_natureza_juridica,
          f.porte as fornecedor_porte,
          f.capital_social as fornecedor_capital_social,
          f.data_inicio_atividade as fornecedor_data_inicio_atividade,
          -- Concorrente 1 (completo)
          fc1.id as concorrente1_id,
          fc1.cnpj as concorrente1_cnpj,
          fc1.razao_social as concorrente1_razao,
          fc1.nome_fantasia as concorrente1_nome_fantasia,
          fc1.email as concorrente1_email,
          fc1.telefone as concorrente1_telefone,
          fc1.endereco as concorrente1_endereco,
          fc1.cidade as concorrente1_cidade,
          fc1.uf as concorrente1_uf,
          fc1.is_mei as concorrente1_is_mei,
          fc1.cep as concorrente1_cep,
          fc1.bairro as concorrente1_bairro,
          fc1.logradouro as concorrente1_logradouro,
          fc1.numero as concorrente1_numero,
          fc1.complemento as concorrente1_complemento,
          fc1.cnae_principal_codigo as concorrente1_cnae_principal_codigo,
          fc1.cnae_principal_descricao as concorrente1_cnae_principal_descricao,
          fc1.cnaes_secundarios as concorrente1_cnaes_secundarios,
          fc1.situacao_cadastral as concorrente1_situacao_cadastral,
          fc1.situacao_cadastral_descricao as concorrente1_situacao_cadastral_descricao,
          fc1.data_situacao_cadastral as concorrente1_data_situacao_cadastral,
          fc1.natureza_juridica as concorrente1_natureza_juridica,
          fc1.porte as concorrente1_porte,
          fc1.capital_social as concorrente1_capital_social,
          fc1.data_inicio_atividade as concorrente1_data_inicio_atividade,
          -- Concorrente 2 (completo)
          fc2.id as concorrente2_id,
          fc2.cnpj as concorrente2_cnpj,
          fc2.razao_social as concorrente2_razao,
          fc2.nome_fantasia as concorrente2_nome_fantasia,
          fc2.email as concorrente2_email,
          fc2.telefone as concorrente2_telefone,
          fc2.endereco as concorrente2_endereco,
          fc2.cidade as concorrente2_cidade,
          fc2.uf as concorrente2_uf,
          fc2.is_mei as concorrente2_is_mei,
          fc2.cep as concorrente2_cep,
          fc2.bairro as concorrente2_bairro,
          fc2.logradouro as concorrente2_logradouro,
          fc2.numero as concorrente2_numero,
          fc2.complemento as concorrente2_complemento,
          fc2.cnae_principal_codigo as concorrente2_cnae_principal_codigo,
          fc2.cnae_principal_descricao as concorrente2_cnae_principal_descricao,
          fc2.cnaes_secundarios as concorrente2_cnaes_secundarios,
          fc2.situacao_cadastral as concorrente2_situacao_cadastral,
          fc2.situacao_cadastral_descricao as concorrente2_situacao_cadastral_descricao,
          fc2.data_situacao_cadastral as concorrente2_data_situacao_cadastral,
          fc2.natureza_juridica as concorrente2_natureza_juridica,
          fc2.porte as concorrente2_porte,
          fc2.capital_social as concorrente2_capital_social,
          fc2.data_inicio_atividade as concorrente2_data_inicio_atividade
        FROM solicitacoes s
        LEFT JOIN fornecedores f ON s.fornecedor_id = f.id
        LEFT JOIN fornecedores fc1 ON s.fornecedor_concorrente_1_id = fc1.id
        LEFT JOIN fornecedores fc2 ON s.fornecedor_concorrente_2_id = fc2.id
        WHERE s.id = p_id
      ) sol
    ),
    'solicitante', (
      SELECT row_to_json(prof) FROM (
        SELECT p.id, p.email, p.full_name, p.avatar_url
        FROM profiles p
        WHERE p.id = (SELECT user_id FROM solicitacoes WHERE id = p_id)
      ) prof
    ),
    'cliente', (
      SELECT row_to_json(cli) FROM (
        SELECT c.id, c.nome
        FROM clientes c
        WHERE c.id = (SELECT cliente_id FROM solicitacoes WHERE id = p_id)
      ) cli
    ),
    'anexos', (
      SELECT COALESCE(json_agg(row_to_json(anx) ORDER BY anx.created_at), '[]'::json)
      FROM (
        SELECT id, tipo, nome_arquivo, storage_path, mime_type, tamanho_bytes, created_at
        FROM anexos WHERE solicitacao_id = p_id
      ) anx
    ),
    'documentos_emitidos', (
      SELECT COALESCE(json_agg(row_to_json(doc) ORDER BY doc.created_at DESC), '[]'::json)
      FROM (
        SELECT de.*, p.full_name as emitido_por_nome
        FROM documentos_emitidos de
        LEFT JOIN profiles p ON de.emitido_por = p.id
        WHERE de.solicitacao_id = p_id
      ) doc
    ),
    'documentos_fiscais', (
      SELECT COALESCE(json_agg(row_to_json(df) ORDER BY df.created_at DESC), '[]'::json)
      FROM (
        SELECT df.*, p.full_name as baixa_por_nome
        FROM documentos_fiscais df
        LEFT JOIN profiles p ON df.baixa_financeiro_por = p.id
        WHERE df.solicitacao_id = p_id
      ) df
    ),
    'historico', (
      SELECT COALESCE(json_agg(row_to_json(hist) ORDER BY hist.created_at DESC), '[]'::json)
      FROM (
        SELECT h.*, p.full_name as usuario_nome
        FROM historico_solicitacoes h
        LEFT JOIN profiles p ON h.user_id = p.id
        WHERE h.solicitacao_id = p_id
      ) hist
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;