---
name: pipeline-subagente
description: >-
  Use quando receber uma task delegada pelo orquestrador. Descreve as 7 fases
  que cada subagente deve seguir ao executar sua tarefa, incluindo a fase
  obrigatória de autodescoberta de contexto antes da execução.
---
# Pipeline do Subagente

## Regra Fundamental

**NUNCA comece a executar sem antes descobrir o contexto do projeto.**

O orquestrador forneceu apenas:
- Descrição da tarefa
- Objetivo
- Restrições

Você é responsável por descobrir todo o resto.

## Pipeline de 7 Fases

### Fase 1: Análise da Task

- Receba a solicitação, objetivo e restrições do orquestrador
- Entenda claramente o que precisa ser feito
- Identifique quais habilidades da sua especialidade são necessárias

### Fase 2: Descoberta de Contexto (OBRIGATÓRIA)

Use `glob`, `grep`, `read`, `bash` para descobrir **exatamente** o que está abaixo. Execute os comandos na ordem — se um falhar, tente o próximo.

---

#### A. Linguagem Principal (execute até encontrar)

```bash
# Prioridade 1: arquivos de configuração de ecossistema
glob("**/package.json")           # → JavaScript/TypeScript
glob("**/pyproject.toml")         # → Python (moderno)
glob("**/requirements.txt")       # → Python (legacy)
glob("**/Cargo.toml")             # → Rust
glob("**/go.mod")                 # → Go
glob("**/pom.xml")                # → Java/Kotlin (Maven)
glob("**/build.gradle*")          # → Java/Kotlin (Gradle)
glob("**/*.csproj")               # → C#/.NET
glob("**/Gemfile")                # → Ruby
glob("**/mix.exs")                # → Elixir
glob("**/pubspec.yaml")           # → Dart/Flutter
glob("**/Package.swift")          # → Swift
glob("**/build.sbt")              # → Scala
glob("**/build.zig")              # → Zig
glob("**/*.cabal")                # → Haskell (Cabal)
glob("**/stack.yaml")             # → Haskell (Stack)
glob("**/DESCRIPTION")            # → R
glob("**/Makefile")               # → C/C++ (Make)
glob("**/CMakeLists.txt")         # → C/C++ (CMake)
```

**Confirmação:** Leia o arquivo encontrado para extrair `name`, `version`, `dependencies`.

---

#### B. Framework Principal

```bash
# Após identificar o arquivo de config, leia as dependências
# Exemplos de busca por framework:
# JS/TS: grep -E "(express|fastify|next|nest|koa|hono|astro|svelte|vue|react)" package.json
# Python: grep -E "(django|flask|fastapi|starlette|tornado|sanic)" pyproject.toml requirements.txt
# Go: grep -E "(gin|echo|fiber|chi|httprouter|gofiber)" go.mod
# Rust: grep -E "(actix|axum|warp|rocket|tide)" Cargo.toml
# Java: grep -E "(spring|quarkus|micronaut|vertx)" pom.xml build.gradle
# C#: grep -E "(aspnet|aspnetcore)" *.csproj
# Ruby: grep -E "(rails|sinatra|hanami|padrino)" Gemfile
# Elixir: grep -E "(phoenix|plug)" mix.exs
# Dart: grep -E "(flutter|angel|shelf)" pubspec.yaml
```

---

#### C. Ferramentas de Qualidade (Linters, Formatters, Type Checkers)

```bash
# Procure arquivos de config de ferramentas:
glob("**/.eslintrc*")             # ESLint
glob("**/eslint.config.*")        # ESLint (flat)
glob("**/.prettierrc*")           # Prettier
glob("**/prettier.config.*")      # Prettier
glob("**/tsconfig.json")          # TypeScript
glob("**/.golangci.yml")          # golangci-lint
glob("**/clippy.toml")            # clippy (Rust)
glob("**/.pylintrc")              # pylint
glob("**/pyproject.toml")         # ruff, black, mypy (seção [tool.*])
glob("**/.rubocop.yml")           # rubocop
glob("**/.editorconfig")          # EditorConfig (genérico)
glob("**/mypy.ini")               # mypy
glob("**/ruff.toml")              # ruff
glob("**/ktlint*")                # ktlint
```

---

#### D. Estrutura do Projeto

```bash
# Mapeie a hierarquia (máx 3 níveis):
bash("find . -type f -name '*.md' -o -name '*.txt' -o -name '*.rs' -o -name '*.go' -o -name '*.py' -o -name '*.js' -o -name '*.ts' -o -name '*.java' -o -name '*.kt' -o -name '*.cs' -o -name '*.rb' -o -name '*.ex' -o -name '*.dart' -o -name '*.swift' -o -name '*.scala' -o -name '*.zig' -o -name '*.hs' -o -name '*.r' -o -name '*.c' -o -name '*.cpp' -o -name '*.h' | head -200")
# Identifique padrões:
# src/  lib/  app/  cmd/  internal/  pkg/  tests/  test/  spec/  __tests__/  e2e/
```

---

#### E. Convenções de Nomenclatura

```bash
# Analise 5-10 arquivos de código para inferir:
# - Funções: camelCase? snake_case? PascalCase?
# - Classes/Types: PascalCase? snake_case?
# - Arquivos: kebab-case? snake_case? PascalCase?
# - Constantes: UPPER_SNAKE_CASE?
# - Privados: _prefixo?
```

---

#### F. Regras de Negócio (domínio da tarefa)

```bash
# Use grep com termos do domínio (recebidos do orquestrador):
grep -r "TERMO_DOMINIO" --include="*.rs" --include="*.go" --include="*.py" --include="*.js" --include="*.ts" --include="*.java" --include="*.kt" --include="*.cs" --include="*.rb" --include="*.ex" --include="*.dart" --include="*.swift" .
# Identifique: models, services, handlers, validações existentes
```

---

#### G. Arquivos Relevantes para Modificação

```bash
# Combine descobertas A-F para listar arquivos que provavelmente precisam mudar
# Priorize: arquivos existentes no mesmo módulo/domínio > novos arquivos
```

---

#### H. Ambiente de Execução

```bash
# Como roda:
grep -E "(scripts|commands|tasks)" package.json Cargo.toml pyproject.toml Makefile justfile Taskfile.yml .github/workflows/*.yml 2>/dev/null | head -30
# Como testar:
grep -E "(test|spec)" package.json Cargo.toml pyproject.toml go.mod 2>/dev/null | head -20
```

---

#### Validação Mínima Obrigatória

Antes de avançar, confirme que você tem:
- [ ] Linguagem identificada + arquivo de config lido
- [ ] Framework identificado (ou "nenhum")
- [ ] Pelo menos 1 linter/formatter encontrado (ou "nenhum configurado")
- [ ] Estrutura de pastas mapeada
- [ ] Convenção de nomenclatura inferida de exemplos reais
- [ ] Comando de build e teste identificado

### Fase 3: Validação de Contexto

**Timebox de descoberta:** a Fase 2 nao deve consumir mais do que 30% do
esforco total da tarefa. Se apos 3-5 buscas (glob/grep/read) voce nao
encontrou o que precisa:

- **Se o projeto e desconhecido** (stack nao identificada): reporte ao
  orquestrador que o projeto nao segue nenhum padrao reconhecido e pergunte
  qual stack usar
- **Se o dominio e desconhecido** (termos de negocio nao encontrados): use
  os nomes genericos (ex: "entidade principal", "servico de persistencia")
  e documente a incerteza no retorno
- **Se o tooling e desconhecido** (sem linter, sem build configurado):
  assuma os padroes da linguagem identificada e documente que usou defaults

Antes de executar, pergunte-se:

- **Tenho informação suficiente** para executar esta tarefa corretamente?
- **Entendo a stack?** Sei onde colocar o novo código?
- **Conheço os padrões?** Meu código será consistente com o existente?

**Se SIM** → Avance para a execução.

**Se NÃO** → Busque mais informações. Se ainda assim não conseguir, reporte EXPLICITAMENTE ao orquestrador quais informações estão faltando e como isso impacta sua análise. NÃO faça suposições.

### Fase 4: Execução

- Escreva ou altere o código seguindo os padrões descobertos na Fase 2
- Respeite as convenções da linguagem e do projeto
- Siga responsabilidade única e baixo acoplamento
- Implemente o QUÊ foi pedido, não mais que isso

### Fase 5: Auto-Revisão (OBRIGATÓRIA)

Antes de validar, revise seu próprio código como se fosse de outra pessoa:

1. **Releia cada arquivo** que criou/modificou procurando inconsistências
2. **Verifique consistência**: não misture estilos (ex: snake_case com camelCase no mesmo arquivo)
3. **Verifique edge cases**: sua solução cobre entradas vazias, duplicatas, erros, valores limite?
4. **Remova código morto**: variáveis não usadas, imports órfãos, comentários de debug
5. **Verifique error handling**: todo ponto que pode falhar está tratado?
6. **Auto-pergunta**: "Um desenvolvedor familiarizado com essa stack entenderia este código sem esforço?"
7. **Se encontrou 1+ melhoria**: corrija antes de passar para a Fase 6

### Fase 6: Validação Local

Execute verificações específicas da sua especialidade. **Cada item deve ser verificado ativamente com comandos.**

---

#### Implementador (qualquer stack)

**Build/Compilação:**
```bash
# JS/TS
npm run build 2>&1
# Rust
cargo check --quiet 2>&1
# Go
go build ./... 2>&1
# Python
python -m compileall . -q 2>&1
pip install -e . 2>&1  # para pacotes
# Java/Maven
mvn compile -q 2>&1
# Java/Gradle
gradle build --quiet 2>&1
# .NET
dotnet build --nologo -q 2>&1
# Ruby
ruby -c app.rb 2>&1
# Qualquer projeto com Makefile
make build 2>&1
```
- [ ] Compilou sem erros? (saída: SUCCESS, exit code 0)

**Linting:**
```bash
# JS/TS
npx eslint . --quiet 2>&1
# Rust
cargo clippy --quiet 2>&1
# Go
golangci-lint run 2>&1
# Python
ruff check . 2>&1
pylint src/ 2>&1
# Ruby
rubocop 2>&1
# Java
./gradlew check 2>&1
mvn checkstyle:check 2>&1
```
- [ ] Lint passou sem erros novos? (ou: sem piorar erros existentes)

**Edge Cases Verificados:**
- [ ] Input vazio/nulo/nil/None — tratado?
- [ ] Concorrência/race condition — tratada (se aplicável)?
- [ ] Limites (max_length, max_items, paginação) — respeitados?
- [ ] Timeout/cancelamento — tratado (se operação longa)?
- [ ] Dados malformados/corrompidos — falha graciosa?

**Error Handling:**
- [ ] Todo ponto de falha tem tratamento? (try/catch, Result, if err, match)
- [ ] Mensagens de erro são informativas? (não só "erro")
- [ ] Fallback existe? (valor default, retry, degradação)

**Checklist Final:**
- [ ] Código segue convenções da stack
- [ ] Input validation em todas as entradas externas
- [ ] Error handling idiomático e presente
- [ ] Edge cases cobertos
- [ ] Código morto removido
- [ ] SRP respeitado
- [ ] Limiares de tamanho respeitados: funcao <= 30 linhas, classe <= 150 linhas, arquivo <= 200 linhas, params <= 4, indentacao <= 3 niveis
- [ ] Separacao de camadas: apresentacao → aplicacao → dominio; infraestrutura implementa contratos; dominio nao conhece infraestrutura
- [ ] Dependencias injetadas (nunca instanciadas diretamente)

---

#### Testador (qualquer stack)

**Execução dos Testes:**
```bash
# JS/TS
npm test -- --run 2>&1
npx jest --verbose --passWithNoTests 2>&1
npx vitest run 2>&1
# Rust
cargo test --quiet 2>&1
# Go
go test ./... -v -count=1 2>&1
# Python
python -m pytest -v --tb=short 2>&1
python -m unittest discover -v 2>&1
# Java
mvn test -q 2>&1
./gradlew test --quiet 2>&1
# .NET
dotnet test --nologo -v normal 2>&1
# Ruby
bundle exec rspec --format documentation 2>&1
# Elixir
mix test --trace 2>&1
# Flutter
flutter test --reporter expanded 2>&1
```
- [ ] Testes rodam sem erros de configuração?
- [ ] Testes novos passam?
- [ ] Testes existentes continuam passando? (zero regressão)

**Cobertura de Cenários:**
- [ ] **Caso normal**: entrada/situação padrão → resultado esperado
- [ ] **Caso de borda**: valores limite, string vazia, zero, máximo, fora de intervalo
- [ ] **Caso de erro**: falha esperada → exception/erro tratado corretamente
- [ ] **Caso de concorrência** (se aplicável): corrida, lock, timeout

**Qualidade dos Testes:**
- [ ] Nomes descritivos: seguem o padrão do projeto (it/should, test_*, TestXxx)
- [ ] Independentes: testes não dependem de ordem de execução
- [ ] Sem mocks desnecessários: mocks mínimos e focados
- [ ] Sem lógica complexa no teste (if/for/while) — testes devem ser declarativos

---

#### Revisor

- [ ] **Hierarquia respeitada**: bug funcional > segurança > lógica > performance > manutenibilidade > estilo
- [ ] **Evidência**: cada alegação tem arquivo + linha + impacto
- [ ] **Falso-positivo zero**: não recomendar prática errada para a stack
- [ ] **Cross-file**: arquivos foram verificados como sistema (não isoladamente)
- [ ] **Código morto**: `grep` por declarações não referenciadas

```bash
# Verificar código morto (adapte à linguagem):
# JS/TS: grep -rn "^function \|^const \|^let \|^var \|^export " src/ | grep -v "export default\|export const"
# Go: grep -rn "^func \|^type \|^const \|^var " cmd/ pkg/ internal/
# Python: grep -rn "^def \|^class \|^CONSTANT " src/
# Rust: grep -rn "^fn \|^struct \|^enum \|^const \|^static " src/
```

---

#### Detetive

- [ ] **Causa raiz**: o bug foi reproduzido? O caminho de execução foi traçado?
- [ ] **Evidência**: stack trace, log, teste que falha — documentado
- [ ] **Solução**: impacto colateral mínimo, não trata sintoma
- [ ] **Proposta**: clara o suficiente para o Implementador executar

### Fase 7: Retorno ao Orquestrador

Devolva o resultado usando **exatamente este formato** (markdown estruturado):

```markdown
## Resumo da Execução

**Agente:** [implementador | testador | revisor | detetive]
**Tarefa:** [descrição resumida]

### Arquivos Alterados
- `caminho/arquivo.ext` — [criado | modificado | removido]
  - O que foi feito: [breve descrição da alteração]

### Stack Descoberta
- **Linguagem:** [ex: Python 3.12, Rust edition 2021, TypeScript 5.5]
- **Framework:** [ex: FastAPI, Axum, React, ou "nenhum"]
- **Build:** `[comando usado para build]`
- **Teste:** `[comando usado para testes]`
- **Linters/Formatters:** [ex: ruff, black, mypy]

### Validações Executadas
- [ ] Build compilou sem erros (comando: `...`)
- [ ] Lint passou (comando: `...`)
- [ ] Testes passaram (comando: `...`) — [nº] testes, [nº] falhas

### Resultado
[Descreva o que foi implementado/testado/revisado/encontrado]

### Pendências / Observações
- [Item que ficou pendente, risco identificado, decisão questionável]
```

**Regras do Retorno:**
1. **SEMPRE** use este formato — o orquestrador verifica a estrutura
2. **SEMPRE** documente os comandos que executou (para reprodutibilidade)
3. **NUNCA** omita validações que falharam
4. **SEMPRE** reporte se algo ficou fora do escopo ou não foi possível fazer
5. Se não conseguiu executar alguma validação, reporte o motivo

## Regras de Ouro

1. NUNCA comece a executar sem antes descobrir o contexto
2. NUNCA faça suposições sem verificar (use glob/grep/read)
3. NUNCA retorne sem validar sua própria solução
4. SEMPRE reporte o que descobriu no retorno ao orquestrador
5. Se algo não está claro, BUSQUE no projeto primeiro, pergunte ao orquestrador depois
