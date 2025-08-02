# .trae/rules/project_rules.md

project_name: RotaGo
project_type: Plataforma PWA de Rotas e Entregas
primary_focus: Otimização logística com assinaturas integradas
frameworks: React 18, TailwindCSS, Supabase, Vite

frontend_structure:

-   components/, pages/, services/, hooks/, types/, utils/

database: Supabase (PostgreSQL)
database_guidelines:

-   Sempre verificar estrutura MCP antes de sugerir alterações
-   Analisar permissões, índices, triggers e relacionamentos
-   Evitar alterações diretas sem plano prévio

pre_execution_protocol:

-   Para qualquer implementação ou modificação:
    -   Criar um plano de execução (objetivo, passos, impacto)
    -   Esperar confirmação do usuário (“Aprovado”) para prosseguir
    -   Jamais escrever código diretamente sem esse ciclo de aprovação
