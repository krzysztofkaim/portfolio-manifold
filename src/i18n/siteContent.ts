import type { ManifoldLocale } from './manifoldLocale';

interface AboutContent {
  eyebrow: string;
  title: string;
  paragraphs: [string, string];
  stats: Array<{ label: string; value: string }>;
}

interface ProjectsContent {
  eyebrow: string;
  title: string;
  items: Array<{ description: string; tag: string; title: string }>;
}

interface SkillsContent {
  eyebrow: string;
  title: string;
  items: Array<{ description: string; title: string }>;
}

interface ContactContent {
  ctaLabel: string;
  eyebrow: string;
  linkedinLabel: string;
  message: string;
  title: string;
}

export interface SiteContentBundle {
  about: AboutContent;
  contact: ContactContent;
  projects: ProjectsContent;
  skills: SkillsContent;
}

const SITE_CONTENT: Record<ManifoldLocale, SiteContentBundle> = {
  en: {
    about: {
      eyebrow: 'About',
      title: 'I rescue, redesign, and deliver software systems that have to work under real constraints.',
      paragraphs: [
        'I work at the intersection of frontend, backend, integrations, and delivery. My strongest fit is in manufacturing and enterprise contexts where product UX, domain correctness, and operational reality have to line up.',
        'I am most useful when a system needs recovery, architectural clarity, and end-to-end execution: from rewriting distressed products and stabilizing infrastructure to shipping secure, role-based software into production.'
      ],
      stats: [
        { value: '5+', label: 'years delivering full-stack software across enterprise contexts' },
        { value: '4+', label: 'years running an independent consultancy under NDA engagements' },
        { value: '58', label: 'machines supported in the latest rescued textile MES platform' }
      ]
    },
    projects: {
      eyebrow: 'Projects',
      title: 'Selected work focused on narrative, performance, and motion.',
      items: [
        {
          tag: 'Launch platform',
          title: 'Neon Atlas',
          description: 'A marketing site for an AI product with a modular CMS, lightweight motion, and Core Web Vitals kept in the green.'
        },
        {
          tag: 'Interactive showcase',
          title: 'Material Echo',
          description: 'An experimental WebGL demo with layered storytelling and an asset pipeline optimized for meshopt and KTX2.'
        },
        {
          tag: 'Design system',
          title: 'Signal Foundry',
          description: 'A UI library and documentation hub for a product team, focused on accessibility, development velocity, and brand consistency.'
        }
      ]
    },
    skills: {
      eyebrow: 'Skills',
      title: 'From React and .NET to enterprise integrations and production rescue.',
      items: [
        {
          title: 'Frontend Systems',
          description: 'React 18, TypeScript, Redux Toolkit, RTK Query, Vite, Feature-Sliced Design, MUI.'
        },
        {
          title: 'Backend & Data',
          description: '.NET 8, ASP.NET Core, Node.js, EF Core, PostgreSQL, MSSQL, MongoDB, domain-heavy logic.'
        },
        {
          title: 'Architecture & Integrations',
          description: 'DDD, CQRS, ERP integrations, planning engines, secure auth, and re-architecting distressed systems.'
        },
        {
          title: 'Delivery',
          description: 'Docker, AWS, OpenTelemetry, Swagger/OpenAPI, release tooling, deployment flow, and operational support.'
        }
      ]
    },
    contact: {
      eyebrow: 'Contact',
      title: 'Have a distressed product, enterprise system, or delivery pipeline that needs a stronger technical lead?',
      message: 'I can help with recovery, architecture, full-stack execution, and shipping complex systems that need both product clarity and operational discipline.',
      ctaLabel: 'Email',
      linkedinLabel: 'LinkedIn'
    }
  },
  pl: {
    about: {
      eyebrow: 'O mnie',
      title: 'Przejmuję, porządkuję i dowożę systemy, które muszą działać pod realnymi ograniczeniami.',
      paragraphs: [
        'Pracuję na przecięciu frontendu, backendu, integracji i delivery. Najmocniej odnajduję się w środowiskach produkcyjnych i enterprise, gdzie UX produktu, poprawność domenowa i realia operacyjne muszą się spotkać.',
        'Najwięcej wartości daję wtedy, gdy system wymaga odzyskania kontroli: od rewrite trudnych projektów i stabilizacji infrastruktury po dostarczenie bezpiecznego, role-based software na produkcję.'
      ],
      stats: [
        { value: '5+', label: 'lat dowożenia full-stack software w środowiskach enterprise' },
        { value: '4+', label: 'lat prowadzenia niezależnej konsultacji pod NDA' },
        { value: '58', label: 'maszyn obsługiwanych przez ostatni uratowany system MES' }
      ]
    },
    projects: {
      eyebrow: 'Projekty',
      title: 'Wybrane realizacje z naciskiem na narrację, performance i motion.',
      items: [
        {
          tag: 'Platforma startowa',
          title: 'Neon Atlas',
          description: 'Marketing site dla produktu AI z modularnym CMS, lekką animacją i wynikami Core Web Vitals utrzymanymi w zieleni.'
        },
        {
          tag: 'Interaktywny showcase',
          title: 'Material Echo',
          description: 'Eksperymentalne demo z WebGL, warstwowym storytellingiem i asset pipeline pod meshopt oraz KTX2.'
        },
        {
          tag: 'Design system',
          title: 'Signal Foundry',
          description: 'Biblioteka UI i dokumentacja dla zespołu produktowego, z naciskiem na dostępność, tempo developmentu i spójność brandu.'
        }
      ]
    },
    skills: {
      eyebrow: 'Umiejętności',
      title: 'Od React i .NET po integracje enterprise i ratowanie projektów produkcyjnych.',
      items: [
        {
          title: 'Frontend Systems',
          description: 'React 18, TypeScript, Redux Toolkit, RTK Query, Vite, Feature-Sliced Design, MUI.'
        },
        {
          title: 'Backend & Data',
          description: '.NET 8, ASP.NET Core, Node.js, EF Core, PostgreSQL, MSSQL, MongoDB i ciężka logika domenowa.'
        },
        {
          title: 'Architektura & Integracje',
          description: 'DDD, CQRS, integracje ERP, silniki planowania, bezpieczne auth i re-architektura trudnych systemów.'
        },
        {
          title: 'Delivery',
          description: 'Docker, AWS, OpenTelemetry, Swagger/OpenAPI, release tooling, deployment flow i wsparcie operacyjne.'
        }
      ]
    },
    contact: {
      eyebrow: 'Kontakt',
      title: 'Masz trudny produkt, system enterprise albo delivery pipeline, który potrzebuje mocniejszego prowadzenia technicznego?',
      message: 'Mogę pomóc w odzyskaniu kontroli nad projektem, architekturze, full-stack execution i dowiezieniu złożonego systemu bez utraty dyscypliny operacyjnej.',
      ctaLabel: 'Email',
      linkedinLabel: 'LinkedIn'
    }
  }
};

export function getSiteContent(locale: ManifoldLocale): SiteContentBundle {
  return SITE_CONTENT[locale];
}
