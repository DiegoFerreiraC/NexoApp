# Nexo RH — Diagramas UML e C4 Model

---

# 1. UML — Diagrama de Caso de Uso

```mermaid
flowchart LR

    subgraph LAYOUT[" "]
        direction LR

        COL["👤<br/>Colaborador"]

        subgraph SISTEMA["Nexo RH — Sistema"]
            direction TB

            AUTH(["Autenticar no<br/>sistema"])
            PERFIL(["Consultar seu perfil"])
            SOLICITAR(["Solicitar férias"])
            CONSULTAR_FERIAS(["Consultar suas férias"])
            CANCELAR(["Cancelar férias"])
            FOLHA(["Consultar folha de<br/>pagamento"])
            HOLERITE(["Consultar holerite"])

            GER_COL(["Gerenciar<br/>colaboradores"])
            GER_FERIAS(["Gerenciar<br/>férias"])
            GER_FOLHA(["Gerenciar Folha<br/>de pagamento"])

        end

        RH["👤<br/>RH"]

        COL --- AUTH
        COL --- PERFIL
        COL --- SOLICITAR
        COL --- CONSULTAR_FERIAS
        COL --- CANCELAR
        COL --- FOLHA
        COL --- HOLERITE

        RH --- GER_COL
        RH --- GER_FERIAS
        RH --- GER_FOLHA
    end

    classDef actor fill:#ffffff,stroke:#333333,color:#111111,stroke-width:2px;
    classDef usecase fill:#e5e5e5,stroke:#333333,color:#111111,stroke-width:1.5px;
    classDef layout fill:transparent,stroke:transparent,color:transparent;

    class COL,RH actor;
    class AUTH,PERFIL,SOLICITAR,CONSULTAR_FERIAS,CANCELAR,FOLHA,HOLERITE,GER_COL,GER_FERIAS,GER_FOLHA usecase;
    class LAYOUT layout;
```

# 2. UML — Diagrama de Classes

```mermaid
classDiagram
    direction LR

    class Department {
        +UUID id
        +String name
    }

    class Position {
        +UUID id
        +String name
    }

    class Employee {
        +UUID id
        +String full_name
        +String cpf
        +String email
        +String phone
        +Date birth_date
        +Date hire_date
        +Decimal salary
        +String status
        +UUID department_id
        +UUID position_id
    }

    class Profile {
        +UUID id
        +UUID employee_id
        +String role
        +Boolean must_change_password
        +Timestamp last_password_change
    }

    class VacationRequest {
        +UUID id
        +UUID employee_id
        +UUID requested_by
        +Date start_date
        +Date end_date
        +Integer days
        +String reason
        +String status
        +UUID approved_by
        +Timestamp created_at
        +Timestamp updated_at
    }

    class Payroll {
        +UUID id
        +UUID employee_id
        +String reference_month
        +Decimal base_salary
        +Decimal gross_salary
        +Decimal total_deductions
        +Decimal net_salary
        +Date payment_date
        +String status
        +Timestamp created_at
    }

    class PayrollItem {
        +UUID id
        +UUID payroll_id
        +String type
        +String description
        +Decimal amount
        +Timestamp created_at
    }

    Department "1" --> "0..*" Employee : possui
    Position "1" --> "0..*" Employee : possui
    Employee "1" --> "0..1" Profile : possui perfil
    Employee "1" --> "0..*" VacationRequest : solicita
    Employee "1" --> "0..*" Payroll : possui
    Payroll "1" --> "0..*" PayrollItem : contém
    Profile "1" --> "0..*" VacationRequest : solicita / aprova
```

# 3. UML — Diagrama de Sequência

### Fluxo: solicitação de férias pelo colaborador

```mermaid
sequenceDiagram
    autonumber

    actor C as Colaborador
    participant F as Nexo RH<br/>(Frontend)
    participant A as Supabase Auth
    participant D as Supabase<br/>(PostgreSQL)

    C->>F: Acessa o sistema
    F->>A: Autentica usuário
    A-->>F: Retorna sessão válida

    F->>D: Consulta perfil do usuário
    D-->>F: Retorna employee_id e role

    F-->>C: Exibe módulo de férias
    C->>F: Preenche período e motivo

    F->>F: Valida datas e quantidade de dias

    alt Dados inválidos
        F-->>C: Exibe mensagem de validação
    else Dados válidos
        F->>D: INSERT vacation_request
        D->>D: Valida permissões RLS
        D-->>F: Solicitação criada<br/>status = pending
        F-->>C: Exibe mensagem de sucesso
    end
```

---

# 4. UML — Diagrama de Atividade

### Fluxo: solicitação e aprovação de férias

```mermaid
flowchart TD

    INICIO((Início))

    A["Colaborador acessa o sistema"]
    B["Faz login"]
    C["Informa período e motivo"]
    D["Sistema valida os dados"]
    E{"Dados válidos?"}

    F["Exibe erro de validação"]
    G["Cria solicitação"]
    H["Status = Pendente"]
    I["RH / Administrador analisa solicitação"]
    J{"Aprovar?"}

    K["Aprova solicitação"]
    L["Status = Aprovada"]

    M["Reprova solicitação"]
    N["Status = Reprovada"]

    O["Colaborador consulta suas férias"]
    FIM((Fim))

    INICIO --> A
    A --> B
    B --> C
    C --> D
    D --> E

    E -->|Não| F
    F --> C

    E -->|Sim| G
    G --> H
    H --> I
    I --> J

    J -->|Sim| K
    K --> L
    L --> O

    J -->|Não| M
    M --> N
    N --> O

    O --> FIM

    classDef start fill:#ffffff,stroke:#333333,stroke-width:2px;
    classDef action fill:#eef3ff,stroke:#356ae6,color:#111111;
    classDef decision fill:#fff3c4,stroke:#d89b00,color:#111111;
    classDef finish fill:#ffffff,stroke:#333333,stroke-width:2px;

    class INICIO start;
    class A,B,C,D,F,G,H,I,K,L,M,N,O action;
    class E,J decision;
    class FIM finish;
```

# 5. C4 Model — Diagrama de Contexto

```mermaid
flowchart TB

    COL["👤 Colaborador<br/><br/>Solicita férias<br/>Consulta perfil e holerite"]

    RH["👤 RH / Administrador<br/><br/>Gerencia colaboradores<br/>Analisa férias<br/>Consulta folha"]

    NEXO["NEXO RH<br/><br/>Sistema web de gestão de pessoas<br/><br/>Colaboradores • Férias • Folha de pagamento • Holerites"]

    SUPA["SUPABASE<br/><br/>Autenticação<br/>PostgreSQL<br/>Políticas de segurança (RLS)"]

    COL -->|"Utiliza via navegador"| NEXO
    RH -->|"Utiliza via navegador"| NEXO
    NEXO -->|"Utiliza serviços de backend e banco"| SUPA

    classDef person fill:#ffffff,stroke:#333333,color:#111111,stroke-width:2px;
    classDef system fill:#ffffff,stroke:#333333,color:#111111,stroke-width:2px;
    classDef external fill:#ffffff,stroke:#333333,color:#111111,stroke-width:2px;

    class COL,RH person;
    class NEXO system;
    class SUPA external;
```

# 6. C4 Model — Diagrama de Containers

```mermaid
flowchart LR

    COL["👤 Colaborador<br/>Navegador"]
    RH["👤 RH / Administrador<br/>Navegador"]

    subgraph NEXO["Nexo RH — Aplicação"]
        direction TB

        WEB["Frontend Web<br/><br/>React + Vite + React Router<br/><br/>• Autenticação<br/>• Dashboard<br/>• Colaboradores<br/>• Férias<br/>• Folha e holerites"]

        EDGE["Supabase Edge Functions<br/><br/>Funções de backend"]
    end

    subgraph SUPA["Supabase — Backend"]
        direction TB

        AUTH["Supabase Auth<br/><br/>• Usuários<br/>• Sessões<br/>• Autenticação"]

        DB[("PostgreSQL<br/><br/>• profiles<br/>• employees<br/>• departments<br/>• positions<br/>• vacation_requests<br/>• payrolls<br/>• payroll_items<br/>• RLS")]
    end

    COL -->|"HTTPS"| WEB
    RH -->|"HTTPS"| WEB

    WEB -->|"Autenticação"| AUTH
    WEB -->|"Consultas / alterações"| DB
    WEB -->|"Invoca funções"| EDGE

    EDGE -->|"Acessa"| DB
    EDGE -->|"Autenticação"| AUTH

    classDef person fill:#ffffff,stroke:#333333,color:#111111,stroke-width:2px;
    classDef app fill:#ffffff,stroke:#333333,color:#111111,stroke-width:2px;
    classDef service fill:#ffffff,stroke:#333333,color:#111111,stroke-width:2px;
    classDef database fill:#ffffff,stroke:#333333,color:#111111,stroke-width:2px;

    class COL,RH person;
    class WEB,EDGE app;
    class AUTH service;
    class DB database;
```
