# Guia de Internacionalização (i18n) por Perfil

Este guia descreve como descentralizar as chaves de tradução da plataforma PINT, retirando chaves específicas de cada perfil do `LanguageContext.jsx` global e colocando-as em ficheiros locais de i18n por perfil. Este padrão já foi implementado com sucesso no perfil **Talent Manager** (TM) e deve ser replicado para os outros perfis.

---

## 1. Motivação e Benefícios

- **Menos Acoplamento:** O `LanguageContext.jsx` deixa de crescer indefinidamente com chaves específicas de ecrãs de backoffice.
- **Divisão de Bundles (Code Splitting):** Com o Lazy Loading ativo no `App.jsx`, o JavaScript associado às traduções de um perfil só é descarregado quando o utilizador acede a páginas desse perfil.
- **Manutenção Simples:** Ficheiros pequenos, organizados por contexto/perfil e fáceis de editar sem interferir nos outros módulos.

---

## 2. Padrão Talent Manager (Referência)

O perfil Talent Manager usa o ficheiro [i18n.js](file:///c:/Users/USER/Desktop/PINT/web/src/pages/talentManager/i18n.js). A estrutura básica é:

```javascript
import { useLanguage } from '../../context/LanguageContext';

const TM = {
  pt: {
    dash_titulo: 'Dashboard Talent Manager',
    // ... chaves em português
  },
  en: {
    dash_titulo: 'Talent Manager Dashboard',
    // ... chaves em inglês
  },
  es: {
    dash_titulo: 'Dashboard Talent Manager',
    // ... chaves em espanhol
  }
};

export function useTM() {
  const { idioma } = useLanguage();
  const dict = TM[idioma] || TM.pt;
  return (key) => dict[key] ?? TM.pt[key] ?? key;
}
```

E nas páginas do Talent Manager, em vez de `useLanguage()`, consome-se a tradução local:

```javascript
import { useTM } from './i18n';

export default function TalentDashboard() {
  const tt = useTM();
  
  return (
    <h1>{tt('dash_titulo')}</h1>
  );
}
```

---

## 3. Plano de Migração para Outros Perfis

Para migrar os perfis restantes, deves seguir estes passos com cuidado:

### A) Perfil: Service Line
1. Cria o ficheiro `web/src/pages/serviceLine/i18n.js`.
2. Identifica no `LanguageContext.jsx` todas as chaves prefixadas com `sl_*` ou relativas a ecrãs do Service Line e move-as para o novo ficheiro.
3. Exporta a função `useSL()` com a mesma lógica de fallback.
4. Nas páginas de `web/src/pages/serviceLine/`, substitui `const { t } = useLanguage()` por `const tt = useSL()` e altera o uso de `t(...)` para `tt(...)`.

### B) Perfil: Consultor
1. Cria o ficheiro `web/src/pages/consultor/i18n.js`.
2. Remove do `LanguageContext.jsx` as chaves do consultor (`cons_*`, dashboard, conquistas, catálogo, etc.).
3. Exporta o hook `useCons()`.
4. Atualiza as páginas em `web/src/pages/consultor/` para usarem `useCons()`.

### C) Perfil: Administrador
1. O admin é o maior bloco (~1800 chaves). Cria `web/src/pages/admin/i18n.js`.
2. Move as chaves `admin_*` do `LanguageContext.jsx` para o novo ficheiro.
3. Exporta o hook `useAdmin()`.
4. Atualiza os componentes de backoffice em `web/src/pages/admin/`.

---

## 4. Recomendações e Cuidados

> [!WARNING]
> Como o JavaScript é dinâmico, erros de chaves em falta apenas são visíveis durante o runtime. Segue estas recomendações:
> - **Chaves Globais:** Mantém chaves genéricas (ex.: `'bom_dia'`, `'boa_tarde'`, `'cancelar'`, `'confirmar'`, estados comuns) no `LanguageContext.jsx`.
> - **Fallback no Hook:** O hook de tradução deve fazer fallback para a chave em português (`TM.pt[key]`) e, se esta também não existir, retornar a própria string da `key`.
> - **Migração Incremental:** Migra um perfil de cada vez. Faz `npm run build` após a migração de cada perfil para garantir que não existem erros de importação estática.
