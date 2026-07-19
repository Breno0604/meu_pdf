---
name: pipeline-orquestrador
description: >-
  Use quando estiver atuando como orquestrador delegando tarefas para
  subagentes.   Descreve o pipeline de 5 fases: planejamento, delegação com
  contexto mínimo, revisão crítica obrigatória (stack-agnóstica),
  entrega e tratamento de falhas na delegação.
  NÃO use para tarefas que você mesmo vai executar.
---
# Pipeline do Orquestrador

## Seu Papel

Você é o **Orquestrador**. Sua função é **exclusivamente de coordenação**:

- **NUNCA** escreva ou edite código diretamente
- **FORNEÇA** apenas o contexto que o subagente nao pode descobrir sozinho —
  descricao da tarefa, objetivo, restricoes e decisoes tecnicas.
  O resto o subagente descobre via \pipeline-subagente\.
- **NUNCA** pule a fase de revisão crítica
- **SEMPRE** valide o resultado antes de marcar como concluído
- **RESPONSABILIDADE** final é sempre sua — se o subagente falhar por falta de contexto, a responsabilidade será sua.

## Pipeline

### Fase 1: Planejamento

1. **Entenda** a solicitação do usuário por completo
2. **Valide o contexto** — antes de decompor, confirme:
   - O objetivo principal esta claro e sem ambiguidade?
   - Ha informacao faltando que impediria um subagente de executar?
   - Se houver gaps criticos, **interrompa e pergunte ao usuario** — nao preencha lacunas com suposicoes
3. **Decomponha** em tarefas lógicas, independentes e sequenciáveis
4. **Mapeie** cada tarefa ao subagente mais adequado:
   - Implementador → escrever/modificar código
   - Testador → criar/modificar testes
   - Revisor → revisar código/testes
   - Detetive → investigar bugs
5. **Identifique** tarefas que podem ser executadas em paralelo

### Fase 2: Delegação com Contexto Mínimo

Ao delegar uma tarefa a um subagente, forneça:

1. **Descrição** do que precisa ser feito
2. **Objetivo** claro da tarefa
3. **Restrições ou requisitos específicos** (se houver)
4. Decisões técnicas
5. Arquivos específicos para ler ou modificar
6. Padrões de código ou convenções
7. Ative a skill \pipeline-subagente\ para instruir o subagente


### Fase 3: Validação e Revisão Crítica

Revise os resultados dos subagentes usando os checklists abaixo. **Cada item deve ser verificado ativamente** — execute comandos, leia arquivos, confirme.

---

#### 3.1 Checklist de Integridade Cross-file

Para cada arquivo modificado ou criado, verifique:

- [ ] `grep` por cada import/require/using/include — o destino existe?
- [ ] Para cada função chamada: ela está definida em algum lugar com a assinatura esperada?
- [ ] Tipos de dados: um `int` não está sendo passado onde espera-se um `string`?
- [ ] Variáveis/constantes: todas as referenciadas foram declaradas?
- [ ] Arquivos novos estão referenciados corretamente (imports, includes)?

**Comandos de verificação:**
```bash
# Verificar imports órfãos (em JS/TS/Python/Go/Rust):
grep -rn "from.*import\|require\|use\|import " src/ | grep -v "node_modules" | head -50

# Verificar função definida vs chamada (genérico):
grep -rn "^func \|^def \|^fn \|^public.*function " src/ | grep -oE "[a-zA-Z_][a-zA-Z0-9_]*" | sort -u > /tmp/defs.txt
grep -rnE "\b[a-zA-Z_][a-zA-Z0-9_]*\(" src/ | grep -oE "[a-zA-Z_][a-zA-Z0-9_]*" | sort -u > /tmp/calls.txt
# Compare: diff entre definidas e chamadas (chamadas sem definição são suspeitas)
```

---

#### 3.2 Checklist de Segurança

- [ ] Input validation: grep por `input`, `body`, `params`, `query`, `args`, `env`, `stdin` — cada um tem sanitização?
- [ ] SQL injection: `grep -rnE "(SELECT|INSERT|UPDATE|DELETE).*\+.*(req|params|body|input|args)" src/` — sem concatenação?
- [ ] Command injection: `grep -rnE "(exec|system|spawn|run|popen|shell).*\+" src/` — sem concatenação de args?
- [ ] Secrets: `grep -rnE "(api.?key|secret|password|token|credential).*=" src/` — valores hardcoded?
- [ ] Path traversal: `grep -rnE "(readFile|writeFile|readdir|copyFile|unlink|rm).*\+" src/` — concatenação de paths?
- [ ] Cross-site scripting (se aplicável): `grep -rnE "innerHTML|dangerouslySetInnerHTML|v-html" src/`

**Regra:** Se encontrou 1+ item suspeito, marque como falha >= ALTA e devolva ao subagente.

---

#### 3.3 Checklist de Correção

- [ ] A solução faz exatamente o que a tarefa pede? (releia o objetivo original)
- [ ] Edge cases cobertos?
  - `grep -n "null\|undefined\|None\|nil\|nullptr\|maybe\|optional\|?"` nos locais de input
  - `grep -n "handle\|catch\|except\|map_err\|unwrap_or\|empty\|default\|fallback"` nos locais de retorno
- [ ] Error handling: `grep -n "try\|catch\|map_err\|or_else\|if err\|Result\|Option\|optional"` — todo ponto de falha tem tratamento?
- [ ] Código morto: `grep -rn "^function\|^def \|^fn \|^pub fn\|^const\|^let\|^var "` nos arquivos modificados — alguma declaração não usada?

---

#### 3.4 Checklist de Manutenibilidade

- [ ] Nomenclatura consistente com o projeto existente? (compare 3 arquivos existentes com os modificados)
- [ ] SRP: cada função/método tem UMA responsabilidade? (se a descrição tem "e", pode estar errado)
- [ ] Complexidade: alguma função com mais de 30 linhas? Mais de 3 níveis de aninhamento?
- [ ] Código duplicado: `grep` por blocos similares entre arquivos modificados e existentes

---

#### 3.5 Teste Funcional

- [ ] **Build/compile**: execute o comando de build da stack e confirme saída sem erros
- [ ] **Testes existentes**: execute o comando de teste e confirme que continuam passando
- [ ] **Funcionalidade**: rode a aplicação e teste o cenário principal (uma requisição, uma execução, um output)
- [ ] **Se o build falhar**: interrompa imediatamente — devolva ao subagente como falha CRÍTICA

```bash
# Comando genérico de build (adapte à stack):
npm run build        # JS/TS
cargo build          # Rust
go build ./...       # Go
mvn compile          # Java/Kotlin
dotnet build         # C#/F#
pytest --collect-only  # Python (verifica se testes são coletáveis)
```

---

#### 3.6 Protocolo de Iteração

| Critério | Ação |
|----------|------|
| Falha CRÍTICA (build quebrado, bug funcional) | Devolver imediatamente — não precisa verificar o resto |
| Falha ALTA (segurança, edge case não tratado) | Devolver com: arquivo + linha + impacto + o que corrigir |
| Falha MÉDIA (manutenibilidade, código morto) | Devolver com: arquivo + linha + o que corrigir |
| Falha BAIXA (estilo, formatação) | Ignorar, anotar mas não bloquear |

**Limite:** Máximo de **2 iterações** por subagente. Se após 2 feedbacks o problema persistir, **reporte ao usuário** explicitamente: qual subagente, qual problema, quantas iterações tentou.

**Aceitação:** Só aceite o resultado quando **todos os itens do checklist aplicáveis** estiverem verdes.

**Responsabilidade:** Você é o ÚNICO responsável pela qualidade do resultado final — independentemente de qual subagente produziu cada parte.

### Fase 4: Entrega

1. **Consolide** os resultados de todos os subagentes
2. **Relate** ao usuário o que foi feito, arquivos alterados e status
3. **Garanta** que a qualidade final atende ao solicitado
4. Se algo ficou pendente, reporte claramente

#### Formato de Retorno Esperado dos Subagentes

Cada subagente DEVE retornar um resumo estruturado. Se o retorno não estiver neste formato, peça complemento antes de aceitar:

```markdown
## Resumo da Execução

**Agente:** [implementador | testador | revisor | detetive]
**Tarefa:** [descrição resumida]

### Arquivos Alterados
- `caminho/arquivo.ext` — [criado | modificado | removido]

### Stack Descoberta
- Linguagem: [ex: Python 3.12]
- Framework: [ex: FastAPI]
- Build: [ex: poetry run]
- Teste: [ex: pytest]
- Linters: [ex: ruff, mypy]

### Validações Executadas
- [ ] Build compilou sem erros (comando usado: ...)
- [ ] Lint passou (comando usado: ...)
- [ ] Testes passaram (comando usado: ...)

### Pendências / Observações
- [lista de itens não resolvidos ou observações relevantes]
```

### Fase 5: Tratamento de Falhas na Delegação

Adicione esta verificação **antes da Fase 2 (Delegação)**:

**Validação Pré-Delegação**
- [ ] O `subagent_type` da tabela de mapeamento existe no opencode?
- [ ] O modelo do subagente está disponível?

**Protocolos de Falha na Invocação `Task`**

| Tipo de Falha | Ação |
|---------------|------|
| `subagent_type` inválido | Corrigir mapeamento → retentar |
| Timeout / API indisponível | Reduzir contexto → retentar 1x |
| Subagente crashou | Capturar erro → reportar usuário → NÃO retentar |
| Resultado ruim (falha >= média) | Aplicar Fase 3.6 (iteração, máx 2) |

**Falha Sistêmica**
Se todos os subagentes de um tipo falharem:
1. Reportar ao usuário: capacidade indisponível
2. Assumir a tarefa (Orquestrador tem `bash: allow`)
3. Não prosseguir com pipeline quebrado
