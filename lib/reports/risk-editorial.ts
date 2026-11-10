/** Suggested presentation names. Never changes official project-risk records. */
export function executiveRiskTitle(title:string):string{
 const text=title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 if(/registros de auditoria.*(?:pipeline|etl)/.test(text))return "Rastreabilidade do processamento de dados";
 if(/falhas? na integracao.*(?:api|backend|interface)/.test(text))return "Integração das funcionalidades";
 if(/(?:liberacao|entrega).*sem homologacao/.test(text))return "Validação das entregas";
 if(/autenticacao|acesso indevido/.test(text))return "Controle de acesso entre empresas";
 if(/duplicidade|perda de informacoes.*(?:processamento|arquivos)/.test(text))return "Integridade dos dados e arquivos";
 if(/fluxo legado.*(?:xml|arquivos)/.test(text))return "Mapeamento do fluxo de arquivos";
 if(/atraso das entregas.*disponibilidade/.test(text))return "Capacidade de execução e prazos";
 return title;
}
