import { useState } from 'react';
import {
  Award,
  BadgeCheck,
  BarChart3,
  BellRing,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Globe2,
  GraduationCap,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  PlayCircle,
  QrCode,
  Route,
  Server,
  ShieldCheck,
  Smartphone,
  UserCog,
  Users,
  Video,
} from 'lucide-react';

import adminPrint from '../../assets/screenshots/admin.png';
import consultorPrint from '../../assets/screenshots/consultor.png';
import tmPrint from '../../assets/screenshots/talent_manager.png';
import slPrint from '../../assets/screenshots/service_line.png';

const LINKS = {
  producao: 'https://pint-production.up.railway.app/',
  apk: '#',
  appLocal: '/login',
};

const navegacao = [
  { id: 'visao', label: 'Visão' },
  { id: 'perfis', label: 'Perfis' },
  { id: 'funcionalidades', label: 'Funcionalidades' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'demos', label: 'Demonstração' },
  { id: 'acesso', label: 'Acesso' },
  { id: 'equipa', label: 'Equipa' },
];

const perfis = [
  {
    nome: 'Administrador',
    rota: '/admin',
    Icon: UserCog,
    print: adminPrint,
    classeBotao: 'border-softinsa-500 bg-softinsa-600 text-white shadow-sm',
    classeIcone: 'bg-softinsa-50 text-softinsa-700 ring-softinsa-100',
    resumo: 'Configura a plataforma, gere utilizadores, políticas, hierarquia, SLA, relatórios e módulos administrativos.',
    responsabilidades: [
      'Gestão de utilizadores, perfis e estados de conta',
      'CRUD da hierarquia Learning Path, Service Line, Área, Nível e Badge',
      'Configuração de requisitos, eventos especiais, avisos, SLA, RGPD e notificações',
      'Dashboards, auditoria, filtros e exportações operacionais',
    ],
    destaques: ['Backoffice completo', 'RGPD versionado', 'SLA configurável', 'Relatórios CSV/PDF'],
    acesso: { email: 'A preencher', password: 'A preencher' },
  },
  {
    nome: 'Consultor',
    rota: '/dashboard',
    Icon: GraduationCap,
    print: consultorPrint,
    classeBotao: 'border-emerald-500 bg-emerald-600 text-white shadow-sm',
    classeIcone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    resumo: 'Consulta badges, submete candidaturas, carrega evidências, acompanha progresso e publica conquistas.',
    responsabilidades: [
      'Catálogo de badges e detalhe por requisitos',
      'Candidaturas com evidências, reutilização de ficheiros e estados',
      'Badges atribuídos com certificado, QR Code, perfil público e LinkedIn',
      'Preferências, RGPD, notificações, conquistas e assinatura de email',
    ],
    destaques: ['Catálogo pessoal', 'Evidências', 'Certificado/QR', 'Perfil público'],
    acesso: { email: 'A preencher', password: 'A preencher' },
  },
  {
    nome: 'Talent Manager',
    rota: '/tm/dashboard',
    Icon: Users,
    print: tmPrint,
    classeBotao: 'border-cyan-500 bg-cyan-700 text-white shadow-sm',
    classeIcone: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
    resumo: 'Acompanha candidaturas, valida evidências e garante que o fluxo avança com qualidade.',
    responsabilidades: [
      'Dashboard de candidaturas, KPIs e candidaturas críticas',
      'Validação de evidências antes da decisão final da Service Line',
      'Relatórios, listagens, histórico e acompanhamento transversal',
      'Notificações e perfil de segurança com 2FA',
    ],
    destaques: ['Validação intermédia', 'Monitorização global', 'Relatórios', 'Alertas'],
    acesso: { email: 'A preencher', password: 'A preencher' },
  },
  {
    nome: 'Service Line',
    rota: '/sl/dashboard',
    Icon: Briefcase,
    print: slPrint,
    classeBotao: 'border-amber-500 bg-amber-500 text-slate-950 shadow-sm',
    classeIcone: 'bg-amber-50 text-amber-700 ring-amber-100',
    resumo: 'Faz a validação final dentro da sua Service Line e acompanha consultores, rankings e histórico.',
    responsabilidades: [
      'Pedidos e detalhe de candidatura no escopo da Service Line',
      'Aprovação, rejeição ou devolução de candidaturas',
      'Consulta de badges, consultores, relatórios, ranking e histórico',
      'Notificações e perfil de segurança com experiência consistente',
    ],
    destaques: ['Decisão final', 'Escopo por equipa', 'Ranking', 'Histórico'],
    acesso: { email: 'A preencher', password: 'A preencher' },
  },
];

const categorias = [
  {
    nome: 'Plataforma',
    itens: [
      {
        titulo: 'Autenticação e perfis',
        texto: 'JWT, confirmação de email, primeiro login, recuperação de password e 2FA/TOTP.',
        Icon: LockKeyhole,
      },
      {
        titulo: 'Hierarquia Softinsa',
        texto: 'Learning Path, Service Line, Área, Nível, Badge e Requisitos mantêm a estrutura do catálogo.',
        Icon: Layers3,
      },
      {
        titulo: 'RGPD funcional',
        texto: 'Políticas versionadas e consentimentos controlam publicação pública, perfil público e LinkedIn.',
        Icon: ShieldCheck,
      },
      {
        titulo: 'Deploy integrado',
        texto: 'API Express serve também o build React quando web/dist existe, simplificando produção.',
        Icon: Server,
      },
    ],
  },
  {
    nome: 'Candidaturas',
    itens: [
      {
        titulo: 'Workflow multi-etapa',
        texto: 'OPEN, SUBMITTED, validação Talent Manager, validação Service Line, aprovação ou rejeição.',
        Icon: Route,
      },
      {
        titulo: 'Evidências por requisito',
        texto: 'Uploads, descrição, associação a requisitos e reutilização controlada no fluxo do consultor.',
        Icon: FileCheck2,
      },
      {
        titulo: 'Auditoria de estados',
        texto: 'Histórico de candidatura e avaliações registam quem decidiu, quando e com que comentário.',
        Icon: ClipboardCheck,
      },
      {
        titulo: 'Badges atribuídos',
        texto: 'Emissão de badge, certificado PDF, QR Code, token público e partilha do resultado.',
        Icon: Award,
      },
    ],
  },
  {
    nome: 'Gestão',
    itens: [
      {
        titulo: 'Backoffice admin',
        texto: 'CRUDs, filtros, modais, tabelas, estados ativos/inativos e exportações nos módulos principais.',
        Icon: LayoutDashboard,
      },
      {
        titulo: 'SLA e alertas',
        texto: 'Configuração por fase, candidaturas fora do prazo e notificações manuais ou automáticas.',
        Icon: BellRing,
      },
      {
        titulo: 'Relatórios e KPIs',
        texto: 'Dashboards por perfil, estatísticas, ranking, evolução mensal e exportação de dados.',
        Icon: BarChart3,
      },
      {
        titulo: 'Notificações globais',
        texto: 'Canais de plataforma, email e push mobile configuráveis por evento no admin.',
        Icon: BellRing,
      },
    ],
  },
  {
    nome: 'Mobile',
    itens: [
      {
        titulo: 'Push mobile Firebase',
        texto: 'A API regista tokens de dispositivo e envia notificações por Firebase Cloud Messaging.',
        Icon: Smartphone,
      },
      {
        titulo: 'Deep links',
        texto: 'Fluxos como email, confirmação e recuperação podem abrir a app mobile quando configurados.',
        Icon: ExternalLink,
      },
      {
        titulo: 'APK para testes',
        texto: 'O microsite reserva o ponto de download do APK para a equipa e avaliadores.',
        Icon: Download,
      },
      {
        titulo: 'Experiência responsiva',
        texto: 'As páginas web foram revistas para funcionar em desktop e dispositivos móveis.',
        Icon: Globe2,
      },
    ],
  },
];

const fluxo = [
  {
    titulo: 'Catálogo',
    subtitulo: 'Consultor escolhe badge',
    texto: 'O consultor analisa requisitos, nível, pontos e contexto do badge antes de iniciar candidatura.',
    Icon: Award,
  },
  {
    titulo: 'Evidências',
    subtitulo: 'Provas associadas a requisitos',
    texto: 'Cada requisito pode receber ficheiros e descrições, mantendo rastreabilidade dentro da candidatura.',
    Icon: FileText,
  },
  {
    titulo: 'Talent Manager',
    subtitulo: 'Validação intermédia',
    texto: 'O Talent Manager revê evidências, pede correções quando necessário e encaminha o processo.',
    Icon: Users,
  },
  {
    titulo: 'Service Line',
    subtitulo: 'Decisão final',
    texto: 'A Service Line aprova, rejeita ou devolve a candidatura conforme os critérios definidos.',
    Icon: Briefcase,
  },
  {
    titulo: 'Badge público',
    subtitulo: 'Certificado e QR Code',
    texto: 'Com aprovação e consentimento RGPD, o badge pode ser publicado e verificado publicamente.',
    Icon: QrCode,
  },
];

const demos = [
  {
    titulo: 'Demonstração web',
    perfil: 'Aplicação web',
    duracao: 'até 90s',
    descricao: 'Vídeo único para demonstrar login, perfis, admin, candidatura, validações, badge atribuído e publicação.',
  },
  {
    titulo: 'Demonstração mobile',
    perfil: 'Aplicação mobile',
    duracao: 'até 90s',
    descricao: 'Vídeo único para demonstrar APK, autenticação mobile, notificações push e principais ecrãs da app.',
  },
];

const acessos = [
  { perfil: 'Administrador', rota: '/admin', email: 'A preencher', password: 'A preencher' },
  { perfil: 'Consultor', rota: '/dashboard', email: 'A preencher', password: 'A preencher' },
  { perfil: 'Talent Manager', rota: '/tm/dashboard', email: 'A preencher', password: 'A preencher' },
  { perfil: 'Service Line', rota: '/sl/dashboard', email: 'A preencher', password: 'A preencher' },
];

const criadores = [
  { nome: 'Sérgio Costa', numero: '27428' },
  { nome: 'Diogo Caçador', numero: '27427' },
  { nome: 'Jaime Ribeiro', numero: '27412' },
  { nome: 'Helder Albuquerque', numero: '27409' },
  { nome: 'Francisco Pereira', numero: '27422' },
];

function AcaoLink({ href, children, Icon, variante = 'primario' }) {
  const indisponivel = !href || href === '#';
  const base =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950';
  const estilos = {
    primario: 'bg-white text-softinsa-900 hover:bg-cyan-50 focus:ring-cyan-300',
    secundario: 'border border-white/25 bg-white/10 text-white hover:bg-white/15 focus:ring-white/50',
    claro: 'bg-softinsa-600 text-white hover:bg-softinsa-700 focus:ring-softinsa-400 focus:ring-offset-white',
    contorno: 'border border-slate-200 bg-white text-slate-800 hover:border-softinsa-200 hover:bg-softinsa-50 focus:ring-softinsa-300 focus:ring-offset-white',
  };

  if (indisponivel) {
    return (
      <button
        type="button"
        disabled
        className={`${base} ${estilos[variante]} cursor-not-allowed opacity-70`}
        title="Link a configurar quando o URL final estiver disponível."
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
        {children}
        <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-black uppercase text-amber-800">
          a definir
        </span>
      </button>
    );
  }

  const externo = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      target={externo ? '_blank' : undefined}
      rel={externo ? 'noreferrer' : undefined}
      className={`${base} ${estilos[variante]}`}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      {children}
    </a>
  );
}

function HeroScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#071628]" />
      <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#f6f8fb] via-[#f6f8fb]/45 to-transparent" />
    </div>
  );
}

function HeroShowcase({ perfil, passo }) {
  const IconPerfil = perfil.Icon;
  const IconPasso = passo.Icon;

  return (
    <div className="mt-10 grid gap-4 text-left text-slate-950 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
      <div className="rounded-lg border border-white/20 bg-white/95 p-4 shadow-2xl shadow-slate-950/25">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Dashboard em destaque</p>
            <p className="mt-1 text-xl font-black text-slate-950">{perfil.nome}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ring-1 ${perfil.classeIcone}`}>
            <IconPerfil className="h-5 w-5" strokeWidth={2} />
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <img
            src={perfil.print}
            alt={`Ecrã do dashboard do perfil ${perfil.nome}`}
            className="w-full h-auto object-contain transition-all duration-300 hover:scale-[1.01]"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-lg border border-white/20 bg-white/10 p-4 text-white backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-softinsa-800">
              <IconPasso className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-cyan-100">Fluxo em destaque</p>
              <p className="font-black">{passo.titulo}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-200">{passo.texto}</p>
        </div>

        <div className="rounded-lg border border-white/20 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-slate-950">Softinsa Mobile</p>
            <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700">FCM</span>
          </div>
          <div className="mt-4 rounded-lg bg-softinsa-700 p-4 text-white">
            <Smartphone className="h-5 w-5" />
            <p className="mt-5 text-xl font-black">Push mobile</p>
            <p className="mt-1 text-xs text-cyan-100">Firebase Cloud Messaging</p>
          </div>
          <div className="mt-3 grid gap-2">
            {['Nova validação', 'Badge aprovado', 'SLA crítico'].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
                <span className="h-2 w-2 rounded bg-emerald-500" />
                <span className="text-xs font-bold text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SecaoTitulo({ eyebrow, titulo, texto }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-black uppercase text-softinsa-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">{titulo}</h2>
      {texto && <p className="mt-4 text-base leading-7 text-slate-600">{texto}</p>}
    </div>
  );
}

function Microsite() {
  const [perfilAtivo, setPerfilAtivo] = useState(perfis[0].nome);
  const [categoriaAtiva, setCategoriaAtiva] = useState(categorias[0].nome);
  const [passoAtivo, setPassoAtivo] = useState(0);

  const perfil = perfis.find((item) => item.nome === perfilAtivo) || perfis[0];
  const categoria = categorias.find((item) => item.nome === categoriaAtiva) || categorias[0];
  const passo = fluxo[passoAtivo] || fluxo[0];

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href="#visao" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-softinsa-700 text-lg font-black text-white">
              S
            </div>
            <div>
              <p className="font-black leading-tight text-slate-950">Softinsa Badges</p>
              <p className="text-xs font-semibold text-slate-500">Microsite do projeto PINT</p>
            </div>
          </a>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal do microsite">
            {navegacao.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-softinsa-700"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <a
            href={LINKS.appLocal}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-softinsa-700"
          >
            Abrir app
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
        <div className="flex gap-1 overflow-x-auto px-4 pb-3 lg:hidden">
          {navegacao.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"
            >
              {item.label}
            </a>
          ))}
        </div>
      </header>

      <section id="visao" className="relative isolate overflow-hidden">
        <HeroScene />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-4xl pt-6 text-white">
            <p className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase text-cyan-100 backdrop-blur">
              <BadgeCheck className="h-4 w-4" />
              Plataforma de badges digitais
            </p>
            <h1 className="mt-6 text-5xl font-black sm:text-6xl lg:text-7xl">
              Softinsa Badges
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              Microsite interativo do PINT para apresentar a plataforma, perfis, workflow de candidaturas,
              funcionalidades web e integração mobile com push notifications.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <AcaoLink href={LINKS.producao} Icon={ExternalLink}>
                Website em produção
              </AcaoLink>
              <AcaoLink href={LINKS.apk} Icon={Download} variante="secundario">
                Download APK
              </AcaoLink>
              <AcaoLink href="#demos" Icon={PlayCircle} variante="secundario">
                Ver demonstrações
              </AcaoLink>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {perfis.map((item) => {
                const ativo = item.nome === perfilAtivo;
                return (
                  <button
                    key={item.nome}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => setPerfilAtivo(item.nome)}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition ${
                      ativo
                        ? item.classeBotao
                        : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                    }`}
                  >
                    <item.Icon className="h-4 w-4" strokeWidth={2} />
                    {item.nome}
                  </button>
                );
              })}
            </div>
          </div>
          <HeroShowcase perfil={perfil} passo={passo} />
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            ['4', 'Perfis funcionais'],
            ['33', 'Tabelas no modelo SQL'],
            ['PT/EN/ES', 'Interface traduzida'],
            ['Web + Mobile', 'Frontend e push Firebase'],
          ].map(([valor, label]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-2xl font-black text-slate-950">{valor}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="perfis" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SecaoTitulo
          eyebrow="Perfis"
          titulo="Quatro experiências para o mesmo ciclo de badges"
          texto="Cada perfil tem rotas, permissões e responsabilidades próprias, mantendo o backend como fonte de verdade."
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="grid gap-3">
            {perfis.map((item) => {
              const ativo = item.nome === perfilAtivo;
              return (
                <button
                  key={item.nome}
                  type="button"
                  onClick={() => setPerfilAtivo(item.nome)}
                  className={`flex min-h-20 items-center gap-4 rounded-lg border p-4 text-left transition ${
                    ativo ? 'border-softinsa-300 bg-white shadow-sm' : 'border-slate-200 bg-white/70 hover:bg-white'
                  }`}
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ring-1 ${item.classeIcone}`}>
                    <item.Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="font-black text-slate-950">{item.nome}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{item.rota}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className={`inline-flex h-14 w-14 items-center justify-center rounded-lg ring-1 ${perfil.classeIcone}`}>
                  <perfil.Icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <h3 className="mt-5 text-2xl font-black text-slate-950">{perfil.nome}</h3>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{perfil.resumo}</p>
              </div>
              <AcaoLink href={perfil.rota} Icon={ExternalLink} variante="contorno">
                Abrir rota
              </AcaoLink>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-sm font-black uppercase text-slate-500">Responsabilidades</p>
                <ul className="mt-4 space-y-3">
                  {perfil.responsabilidades.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-black uppercase text-slate-500">Destaques do perfil</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {perfil.destaques.map((item) => (
                    <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-black text-slate-900">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-black text-amber-900">Acesso de teste</p>
                  <p className="mt-2 text-sm text-amber-800">
                    Email: <span className="font-bold">{perfil.acesso.email}</span>
                  </p>
                  <p className="text-sm text-amber-800">
                    Password: <span className="font-bold">{perfil.acesso.password}</span>
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="funcionalidades" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SecaoTitulo
            eyebrow="Funcionalidades"
            titulo="Resumo organizado dos módulos principais"
            texto="A plataforma cobre autenticação, gestão administrativa, candidaturas, validação, publicação pública e suporte mobile."
          />

          <div className="mt-8 flex flex-wrap gap-2">
            {categorias.map((item) => {
              const ativo = item.nome === categoriaAtiva;
              return (
                <button
                  key={item.nome}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setCategoriaAtiva(item.nome)}
                  className={`min-h-10 rounded-lg border px-4 py-2 text-sm font-black transition ${
                    ativo
                      ? 'border-softinsa-500 bg-softinsa-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.nome}
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {categoria.itens.map((item) => (
              <article key={item.titulo} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-softinsa-700 ring-1 ring-slate-200">
                  <item.Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="mt-5 text-lg font-black text-slate-950">{item.titulo}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.texto}</p>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-lg border border-slate-200 bg-[#0d1b2f] p-5 text-white shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-cyan-200">Workflow</p>
                <h3 className="mt-2 text-2xl font-black">Do pedido ao badge verificável</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {fluxo.map((item, index) => (
                  <button
                    key={item.titulo}
                    type="button"
                    aria-pressed={passoAtivo === index}
                    onClick={() => setPassoAtivo(index)}
                    className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-black transition ${
                      passoAtivo === index
                        ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                        : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                    }`}
                  >
                    {index + 1}. {item.titulo}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="rounded-lg border border-white/15 bg-white/10 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-softinsa-800">
                  <passo.Icon className="h-6 w-6" />
                </div>
                <h4 className="mt-5 text-xl font-black">{passo.titulo}</h4>
                <p className="mt-1 text-sm font-bold text-cyan-200">{passo.subtitulo}</p>
                <p className="mt-4 text-sm leading-6 text-slate-200">{passo.texto}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {fluxo.map((item, index) => (
                  <button
                    key={item.titulo}
                    type="button"
                    onClick={() => setPassoAtivo(index)}
                    className={`flex min-h-56 flex-col rounded-lg border p-4 text-left transition ${
                      passoAtivo === index
                        ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                        : 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-black uppercase">0{index + 1}</span>
                      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        passoAtivo === index ? 'bg-white/80 text-softinsa-800' : 'bg-white/10 text-cyan-100'
                      }`}>
                        <item.Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                    </div>
                    <div className="mt-8">
                      <span className="block text-base font-black">{item.titulo}</span>
                      <span className={`mt-2 block text-xs font-bold ${
                        passoAtivo === index ? 'text-softinsa-900' : 'text-cyan-100'
                      }`}>
                        {item.subtitulo}
                      </span>
                      <span className={`mt-4 block text-xs leading-5 ${
                        passoAtivo === index ? 'text-slate-800' : 'text-slate-300'
                      }`}>
                        {item.texto}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="mobile" className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div>
          <SecaoTitulo
            eyebrow="Mobile"
            titulo="Preparado para app mobile e notificações Firebase"
            texto="O repositório contém a API e a web. A app mobile é externa, mas a API já suporta registo de tokens de dispositivo, envio de push e deep links quando as variáveis de ambiente estão configuradas."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ['Firebase Admin', 'Envia push para dispositivos registados e remove tokens inválidos quando necessário.', BellRing],
              ['Deep links', 'A variável MOBILE_APP_URL permite direcionar fluxos para a app mobile.', ExternalLink],
              ['APK', 'O microsite inclui a área própria para disponibilizar o ficheiro Android aos avaliadores.', Download],
              ['Responsividade', 'As páginas web foram revistas para reduzir inconsistências em ecrãs pequenos.', Smartphone],
            ].map(([titulo, texto, Icon]) => (
              <div key={titulo} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <Icon className="h-5 w-5 text-softinsa-700" />
                <h3 className="mt-4 font-black text-slate-950">{titulo}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{texto}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-lg bg-slate-950 p-3">
            <div className="rounded-lg bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-950">Softinsa Mobile</p>
                <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700">
                  FCM
                </span>
              </div>
              <div className="mt-5 rounded-lg bg-softinsa-700 p-4 text-white">
                <Smartphone className="h-6 w-6" />
                <p className="mt-6 text-2xl font-black">Badge aprovado</p>
                <p className="mt-2 text-sm text-cyan-100">Notificação enviada pela API.</p>
              </div>
              <div className="mt-4 space-y-3">
                {['Abrir candidatura', 'Ver certificado', 'Consultar notificações'].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <span className="text-sm font-bold text-slate-700">{item}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <AcaoLink href={LINKS.apk} Icon={Download} variante="claro">
                  Download APK
                </AcaoLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="demos" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SecaoTitulo
            eyebrow="Demonstração"
            titulo="Vídeos de demonstração"
            texto="Área preparada para os dois vídeos finais: uma demonstração da aplicação web e uma demonstração da aplicação mobile, cada uma com duração máxima recomendada de 90 segundos."
          />

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {demos.map((demo) => (
              <article key={demo.titulo} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
                <div className="flex aspect-video items-center justify-center bg-[#0d1b2f] text-white">
                  <div className="text-center">
                    <Video className="mx-auto h-10 w-10 text-cyan-200" />
                    <p className="mt-4 text-sm font-black uppercase text-cyan-100">
                      Vídeo por adicionar
                    </p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded bg-white px-2 py-1 text-xs font-black text-softinsa-700 ring-1 ring-slate-200">
                      {demo.perfil}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{demo.duracao}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-black text-slate-950">{demo.titulo}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{demo.descricao}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="acesso" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SecaoTitulo
          eyebrow="Acesso"
          titulo="Links e contas de teste"
          texto="Esta área centraliza o URL de produção, o download do APK e as credenciais de teste por perfil, ou seja, os dados que também devem constar no PDF de entrega."
        />

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <ExternalLink className="h-6 w-6 text-softinsa-700" />
            <h3 className="mt-4 text-xl font-black text-slate-950">Website em produção</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Versão publicada da aplicação web no Railway.
            </p>
            <div className="mt-5">
              <AcaoLink href={LINKS.producao} Icon={ExternalLink} variante="claro">
                Abrir produção
              </AcaoLink>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <Download className="h-6 w-6 text-softinsa-700" />
            <h3 className="mt-4 text-xl font-black text-slate-950">APK mobile</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Link reservado para download da app Android quando o ficheiro final estiver disponível.
            </p>
            <div className="mt-5">
              <AcaoLink href={LINKS.apk} Icon={Download} variante="claro">
                Descarregar APK
              </AcaoLink>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <Globe2 className="h-6 w-6 text-softinsa-700" />
            <h3 className="mt-4 text-xl font-black text-slate-950">Aplicação local</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Entrada direta para testar a app no ambiente local ou no mesmo domínio do microsite.
            </p>
            <div className="mt-5">
              <AcaoLink href={LINKS.appLocal} Icon={ExternalLink} variante="claro">
                Abrir login
              </AcaoLink>
            </div>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h3 className="text-xl font-black text-slate-950">Credenciais de teste</h3>
            <p className="mt-2 text-sm text-slate-600">
              Preencher estes valores quando as contas finais de demonstração estiverem criadas.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Perfil</th>
                  <th className="px-5 py-3">Rota</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {acessos.map((item) => (
                  <tr key={item.perfil} className="bg-white">
                    <td className="px-5 py-4 font-black text-slate-950">{item.perfil}</td>
                    <td className="px-5 py-4 font-semibold text-softinsa-700">{item.rota}</td>
                    <td className="px-5 py-4 text-slate-600">{item.email}</td>
                    <td className="px-5 py-4 text-slate-600">{item.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="equipa" className="bg-[#0d1b2f] py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase text-cyan-200">Equipa</p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">Criadores do projeto</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
                Projeto PINT desenvolvido para demonstrar uma solução completa de badges digitais, com backend,
                frontend, regras de negócio, segurança, documentação e suporte mobile.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {['React', 'Vite', 'Express', 'MySQL', 'JWT', 'Firebase', 'Tailwind'].map((item) => (
                  <span key={item} className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/10 p-5">
              <div className="grid gap-3">
                {criadores.map((criador) => (
                  <div key={criador.numero} className="flex items-center justify-between rounded-lg bg-white p-4 text-slate-950">
                    <span className="font-black">{criador.nome}</span>
                    <span className="rounded bg-slate-100 px-2 py-1 text-sm font-black text-softinsa-700">
                      {criador.numero}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>Softinsa Badges - PINT</span>
          <span>Microsite informativo para demonstração e entrega final.</span>
        </div>
      </footer>
    </main>
  );
}

export default Microsite;
