import type { CvCardContent } from '../../experience/manifold/ManifoldTypes';
import type { ManifoldLocaleBundle } from '../manifoldLocale';

export const EN_CV_CARDS: readonly CvCardContent[] = [
  {
    title: 'ABOUT ME',
    expandedTitle: 'KRZYSZTOF KAIM',
    signal: 'PROFILE 01',
    mode: 'LIVE',
    handoff: 'FULL-STACK ENGINEER',
    expandedHandoff: 'FULL-STACK SOFTWARE ENGINEER // LEAD / ARCHITECT TRACK',
    chip: 'Identity',
    id: 'ID-KAIM',
    previewLeftLabel: 'BASE',
    previewLeft: 'Remote / Hybrid',
    previewRightLabel: 'REACH',
    previewRight: 'krzysztof@kaim.dev',
    eyebrow: 'Executive Summary // Identity and range',
    lead:
      'Software developer and security consultant turned Lead Engineer and Solution Architect, focused on rescuing and re-architecting complex manufacturing and enterprise systems.',
    highlights: [
      'Combines frontend systems, backend logic, integrations and operational thinking in one delivery model.',
      'Strong fit for MES, ERP, enterprise internal platforms and distressed-system recovery.',
      'Comfortable leading architecture, rewrite work, platform upgrades and production execution.',
      'Located in Krakow and used to independent consultancy as well as embedded technical leadership.'
    ],
    facts: [
      { label: 'Role', value: 'Lead / Architect' },
      { label: 'Phone', value: '(+48) 666 550 888' },
      { label: 'Email', value: 'krzysztof@kaim.dev' },
      { label: 'Core', value: '.NET 8 / React 18' }
    ],
    surfaceKicker: 'Executive Fit',
    surfaceValue: 'FULL-STACK',
    surfaceText: 'Architecture, delivery, integrations and maintenance across modern product systems.'
  },
  {
    title: '#WHY',
    expandedTitle: 'CURRENT FOCUS',
    signal: 'PROFILE 02',
    mode: 'PRIORITY',
    handoff: 'UX / BACKEND / ENTERPRISE',
    expandedHandoff: 'TECHNICAL RANGE // UX, BACKEND AND ENTERPRISE CONSTRAINTS',
    chip: 'Focus',
    id: 'ID-SYS2',
    previewLeftLabel: 'MODE',
    previewLeft: 'Rescue / Rewrite',
    previewRightLabel: 'RANGE',
    previewRight: 'UX to backend',
    eyebrow: 'Technical Range // The intersection of UX and backend',
    lead:
      'The strongest overlap sits where product UX, backend correctness, and industrial or enterprise constraints meet.',
    highlights: [
      'Comfortable shipping from architecture and requirements to deployment and maintenance.',
      'Modern UI systems in React with disciplined state and data flow.',
      'Business-critical backend logic in .NET with performance and security in mind.',
      'Strong overlap between delivery UX, enterprise integration and domain correctness.'
    ],
    facts: [
      { label: 'Industrial', value: 'MES, planning, kiosk roles' },
      { label: 'Enterprise', value: 'Travel, medical, internal systems' },
      { label: 'Delivery', value: 'Architecture to production' },
      { label: 'Core', value: 'React / .NET / integrations' }
    ],
    surfaceKicker: 'Current Lane',
    surfaceValue: 'PRODUCT',
    surfaceText: 'The strongest fit sits where product UX meets backend correctness and enterprise constraints.'
  },
  {
    title: '#HOW',
    expandedTitle: 'PARADIGM',
    signal: 'PROFILE 03',
    mode: 'APPROACH',
    handoff: 'SYSTEMS THINKING',
    expandedHandoff: 'DELIVERY MODEL // PRODUCT TO PRODUCTION',
    chip: 'Paradigm',
    id: 'ID-FOC3',
    previewLeftLabel: 'STYLE',
    previewLeft: 'Systems Thinking',
    previewRightLabel: 'STYLE',
    previewRight: 'Pragmatic Delivery',
    eyebrow: 'Delivery Model // Product to production',
    lead:
      'Built around pragmatic product engineering: shipping complete systems, not isolated layers or tickets.',
    highlights: [
      'Focuses on solving complex business problems rather than just implementing tickets.',
      'Ensures operational coverage including deployments, documentation, support and release flow.',
      'Bridges stakeholder requirements and technical execution without losing delivery momentum.',
      'Treats reliability and maintainability as part of product engineering, not cleanup work.'
    ],
    facts: [
      { label: 'Mindset', value: 'Pragmatic engineering' },
      { label: 'Docs', value: 'OpenAPI, remediation, KB' },
      { label: 'Goal', value: 'Stable delivery under pressure' },
      { label: 'Scope', value: 'Product to production' }
    ],
    surfaceKicker: 'Operating Model',
    surfaceValue: 'SYSTEMS',
    surfaceText: 'Solving business problems through complete systems, not isolated implementation slices.'
  },
  {
    title: '#NDA',
    expandedTitle: 'UNDER NDA CONTRACT',
    signal: 'DEPLOYMENT 01',
    mode: 'ARCHITECT',
    handoff: 'TEXTILE MES',
    expandedHandoff: 'LEAD SOFTWARE ENGINEER & SOLUTION ARCHITECT // VAPTURE',
    chip: 'MES',
    id: 'ID-JTX4',
    previewLeftLabel: 'PERIOD',
    previewLeft: 'Sep 2025 - Present',
    previewRightLabel: 'ROLE',
    previewRight: 'Lead / Architect',
    eyebrow: 'Textile MES // Rewrite and upgrade',
    lead:
      'Took over a failing textile MES project and led a full rewrite and platform upgrade.',
    highlights: [
      'System now supports 58 machines across 5 production halls, over 205 virtual stock records and 180 ERP-to-MES integrations.',
      'Reduced server resource usage by about 80% by removing major N+1 hotspots and profiling with OpenTelemetry.',
      'Built secure backend and data access layers with JWT, BCrypt, RBAC, EF Core and Postgres.',
      'Delivered a role-based frontend for planning and execution, supporting 13 business roles and 9 kiosk personas.'
    ],
    facts: [
      { label: 'Backend', value: '.NET 8, EF Core, PostgreSQL, MSSQL' },
      { label: 'Frontend', value: 'React, Redux Toolkit, FSD' },
      { label: 'Domain', value: 'Textile MES, ERP, planning' },
      { label: 'Scale', value: '58 machines / 5 halls' }
    ],
    surfaceKicker: 'Deployment Class',
    surfaceValue: 'MES',
    surfaceText: 'Production engine, ERP gateway, planning dashboards and solver-driven domain logic.'
  },
  {
    title: '#NTA',
    expandedTitle: 'NATA AUTOMATION',
    signal: 'DEPLOYMENT 02',
    mode: 'STABILIZE',
    handoff: 'SYSTEM RESCUE',
    expandedHandoff: 'NATA AUTOMATION // DISTRESSED PROJECT STABILIZATION',
    chip: 'Rescue',
    id: 'ID-NTA5',
    previewLeftLabel: 'PERIOD',
    previewLeft: 'Feb 2025 - Sep 2025',
    previewRightLabel: 'ROLE',
    previewRight: 'Contract',
    eyebrow: 'NATA Automation // System rescue',
    lead:
      'Joined as a backend .NET engineer and quickly expanded scope to own the full technical stack on a distressed automation project.',
    highlights: [
      'Built a custom drag-and-drop deployment tool that reduced release time by roughly 95%.',
      'Rewrote the UI in React 18 and Feature-Sliced Design, removing dependency cycles and architectural debt.',
      'Implemented RTK Query and server-side pagination, cutting browser RAM usage by roughly 70% on large datasets.',
      'Overhauled security with BCrypt and JWT rotation, removing critical issues from legacy AES storage.'
    ],
    facts: [
      { label: 'Stack', value: 'React 18, Vite, RTK Query, .NET 8' },
      { label: 'UX', value: 'MUI, SignalR, realtime sync' },
      { label: 'Role', value: 'Senior / Technical Lead' },
      { label: 'Data', value: 'PostgreSQL' }
    ],
    surfaceKicker: 'Recovery Mode',
    surfaceValue: 'STABILIZE',
    surfaceText: 'Infrastructure stabilization, frontend rewrite and business-critical domain recovery.'
  },
  {
    title: '#VPT',
    expandedTitle: 'VAPTURE',
    signal: 'DEPLOYMENT 03',
    mode: 'B2B',
    handoff: 'ENTERPRISE DELIVERY',
    expandedHandoff: 'B2B SOFTWARE CONSULTANT & FULL-STACK ENGINEER',
    chip: 'Consulting',
    id: 'ID-VAP6',
    previewLeftLabel: 'PERIOD',
    previewLeft: 'May 2020 - Jan 2025',
    previewRightLabel: 'DOMAIN',
    previewRight: 'Travel / Medical',
    eyebrow: 'Vapture // Travel and medical systems',
    lead:
      'Founded and operated an independent consultancy serving 5 long-term clients under NDA across travel and medical domains.',
    highlights: [
      'Owned the full SDLC from architectural design and requirements gathering to deployment and maintenance.',
      'Engineered a custom SMS notification gateway via Google Cloud for patient reminders.',
      'Implemented custom authentication, relational and NoSQL persistence, and high-performance portals with 90+ Lighthouse scores.',
      'Standardized DevOps with Docker and reduced environment setup from days to minutes.'
    ],
    facts: [
      { label: 'Backend', value: 'ASP.NET Core, Node.js, PostgreSQL' },
      { label: 'Frontend', value: 'React, TypeScript, Next.js' },
      { label: 'DevOps', value: 'Docker, AWS, OpenAPI' },
      { label: 'Delivery', value: 'Architecture to maintenance' }
    ],
    surfaceKicker: 'Enterprise Track',
    surfaceValue: 'B2B',
    surfaceText: 'Travel and medical systems delivered across the full SDLC perimeter.'
  },
  {
    title: '#WSEI',
    expandedTitle: 'WSEI DEV',
    signal: 'OPS 01',
    mode: 'CLOUD',
    handoff: 'DEV / CLOUD',
    expandedHandoff: 'SOFTWARE DEVELOPER & PROJECT LEAD // WSEI',
    chip: 'Operations',
    id: 'ID-WSE7',
    previewLeftLabel: 'PERIOD',
    previewLeft: 'Oct 2016 - May 2020',
    previewRightLabel: 'PLACE',
    previewRight: 'Krakow',
    eyebrow: 'WSEI // Development and cloud',
    lead:
      'Developed and maintained the internal university ecosystem while helping run high-traffic events and hackathons.',
    highlights: [
      'Developed and maintained internal web applications using ASP.NET Core and C#.',
      'Led a cross-functional team of 20 people while organizing SheepYourHack and WSEICraft.',
      'Managed Azure infrastructure capable of handling high traffic during events with 100+ participants.',
      'Implemented automated communication workflows for students and event operations.'
    ],
    facts: [
      { label: 'Stack', value: 'ASP.NET Core, C#, React, Bootstrap' },
      { label: 'Cloud', value: 'Microsoft Azure' },
      { label: 'Scale', value: '20 people / 100+ participants' },
      { label: 'Role', value: 'Developer / project lead' }
    ],
    surfaceKicker: 'Operations Layer',
    surfaceValue: 'CLOUD',
    surfaceText: 'Internal applications, cloud ownership and event-grade infrastructure.'
  },
  {
    title: '#ARCH',
    expandedTitle: 'ARCHMAN',
    signal: 'OPS 02',
    mode: 'SECURITY',
    handoff: 'PENTEST / CONSULTING',
    expandedHandoff: 'BLACK-BOX PENTESTER & SECURITY CONSULTANT',
    chip: 'Security',
    id: 'ID-ARC8',
    previewLeftLabel: 'PERIOD',
    previewLeft: 'Sep 2018 - Sep 2019',
    previewRightLabel: 'PLACE',
    previewRight: 'Krakow',
    eyebrow: 'Security // ECM black-box testing',
    lead:
      'Conducted black-box penetration testing and security consulting for a proprietary ECM platform.',
    highlights: [
      'Worked with Burp Suite, Nmap and OWASP ZAP to identify exploitable weaknesses.',
      'Performed vulnerability and compliance audits and delivered remediation guidance to engineering.',
      'Documented OWASP Top 10 issues and gaps before production release.',
      'Combined practical testing with security documentation and deployment-readiness review.'
    ],
    facts: [
      { label: 'Tools', value: 'Burp Suite, Nmap, ZAP' },
      { label: 'Focus', value: 'OWASP, compliance, black-box' },
      { label: 'Output', value: 'Audit reports & remediation' },
      { label: 'Scope', value: 'ECM security consulting' }
    ],
    surfaceKicker: 'Security Lens',
    surfaceValue: 'AUDIT',
    surfaceText: 'Testing, reporting, remediation and secure engineering feedback loops.'
  },
  {
    title: '#WLCK',
    expandedTitle: 'WIELICZKA',
    signal: 'OPS 03',
    mode: 'DATA & NET',
    handoff: 'DBA / NETWORK',
    expandedHandoff: 'DATABASE ADMINISTRATOR & NETWORK SPECIALIST',
    chip: 'Foundations',
    id: 'ID-ORA9',
    previewLeftLabel: 'PERIOD',
    previewLeft: 'Jul 2015 - Aug 2016',
    previewRightLabel: 'PLACE',
    previewRight: 'Wieliczka',
    eyebrow: 'Data & networks // Early foundations',
    lead:
      'Early foundational roles managing enterprise databases and network topographies on-site.',
    highlights: [
      'Executed complex data migrations across Oracle Database environments.',
      'Designed and documented network topology maps for system expansions.',
      'Built a strong baseline in data integrity and network administration.',
      'Developed operational habits that later translated into system reliability work.'
    ],
    facts: [
      { label: 'Database', value: 'Oracle Database (SQL)' },
      { label: 'Tools', value: 'Microsoft Visio' },
      { label: 'Scope', value: 'Data migration, network topography' },
      { label: 'Mode', value: 'On-site operations' }
    ],
    surfaceKicker: 'Foundational Layer',
    surfaceValue: 'OPS',
    surfaceText: 'Database care, migrations and network mapping before the application layer.'
  },
  {
    title: '#FE',
    expandedTitle: 'FRONTEND',
    signal: 'CAPABILITY 01',
    mode: 'UI',
    handoff: 'UI SYSTEMS',
    expandedHandoff: 'UI SYSTEMS & FRONTEND ARCHITECTURE',
    chip: 'Frontend',
    id: 'ID-FRO10',
    previewLeftLabel: 'FOCUS',
    previewLeft: 'React / TypeScript',
    previewRightLabel: 'BUILD',
    previewRight: 'Vite / FSD / MUI',
    eyebrow: 'Frontend // Typed UI systems',
    lead:
      'Building typed, scalable interfaces focused on clarity, performance and maintainability.',
    highlights: [
      'Expertise in React 18, TypeScript and Next.js for complex delivery contexts.',
      'Predictable state orchestration using Redux Toolkit and RTK Query.',
      'Feature-Sliced Design and responsive, themed layouts with MUI.',
      'Interfaces designed for clarity under real delivery pressure.'
    ],
    facts: [
      { label: 'Core', value: 'React 18, TypeScript, Next.js' },
      { label: 'State', value: 'Redux Toolkit, RTK Query' },
      { label: 'Build', value: 'Vite, FSD, MUI' },
      { label: 'Goal', value: 'Clarity and maintainability' }
    ],
    surfaceKicker: 'Capability Layer',
    surfaceValue: 'FRONTEND',
    surfaceText: 'Typed interfaces, scalable UI systems and predictable client-side architecture.'
  },
  {
    title: '#BE',
    expandedTitle: 'BACKEND',
    signal: 'CAPABILITY 02',
    mode: 'API',
    handoff: '.NET 8 / NODE',
    expandedHandoff: 'CORE LOGIC, ARCHITECTURE & DATABASES',
    chip: 'Backend',
    id: 'ID-BCK11',
    previewLeftLabel: 'FOCUS',
    previewLeft: '.NET 8 / Node.js',
    previewRightLabel: 'PATTERNS',
    previewRight: 'DDD / CQRS',
    eyebrow: 'Backend // Core logic and data',
    lead:
      'Delivering business-critical APIs, simulation engines and reliable data layers.',
    highlights: [
      'Extensive use of .NET 8 and ASP.NET Core for high-performance services.',
      'Strong data modeling with EF Core, PostgreSQL, MSSQL and MongoDB.',
      'Domain-driven boundaries and service decomposition where they help delivery.',
      'Backends built for correctness, maintainability and operational support.'
    ],
    facts: [
      { label: 'Frameworks', value: '.NET 8, ASP.NET Core, Node.js' },
      { label: 'Databases', value: 'PostgreSQL, MSSQL, MongoDB' },
      { label: 'Patterns', value: 'DDD, CQRS, EF Core' },
      { label: 'Scope', value: 'APIs, engines, data layers' }
    ],
    surfaceKicker: 'Capability Layer',
    surfaceValue: 'BACKEND',
    surfaceText: 'Business logic, APIs, engines and databases built for correctness and resilience.'
  },
  {
    title: '#INF',
    expandedTitle: 'INFRA & SECURITY',
    signal: 'CAPABILITY 03',
    mode: 'SEC-OPS',
    handoff: 'DELIVERY PERIMETER',
    expandedHandoff: 'DEVOPS, INTEGRATIONS & SECURITY STANDARDS',
    chip: 'Infra',
    id: 'ID-INF12',
    previewLeftLabel: 'FOCUS',
    previewLeft: 'Delivery perimeter',
    previewRightLabel: 'TOOLS',
    previewRight: 'Docker / AWS / Auth',
    eyebrow: 'DevOps & security // Delivery perimeter',
    lead:
      'Security and infrastructure are treated as product features, not afterthoughts.',
    highlights: [
      'Implementation of JWT, OAuth2, RBAC and BCrypt across application layers.',
      'Complex ERP integrations including Subiekt GT synchronization.',
      'Dockerized services, AWS provisioning and realtime SignalR communication.',
      'Operational thinking applied throughout the delivery perimeter.'
    ],
    facts: [
      { label: 'Security', value: 'JWT, OAuth2, RBAC, BCrypt' },
      { label: 'DevOps', value: 'Docker, AWS, Git' },
      { label: 'Integrations', value: 'Subiekt GT, SignalR, Swagger' },
      { label: 'Perimeter', value: 'Delivery and operations' }
    ],
    surfaceKicker: 'Capability Layer',
    surfaceValue: 'INFRA',
    surfaceText: 'Security, integrations and operational standards treated as first-class system features.'
  },
  {
    title: '#EDU',
    expandedTitle: 'EDUCATION & CERTS',
    signal: 'CREDENTIAL 01',
    mode: 'FORMAL',
    handoff: 'FORMAL BACKGROUND',
    expandedHandoff: 'ENGINEERING EDUCATION & PROFESSIONAL CERTIFICATES',
    chip: 'Validation',
    id: 'ID-EDU13',
    previewLeftLabel: 'STATUS',
    previewLeft: 'BEng + Certs',
    previewRightLabel: 'TRACK',
    previewRight: 'Security / Full-stack',
    eyebrow: 'Formal validation // Education and certs',
    lead:
      'Formal engineering education combined with technical and security certifications relevant to delivery work.',
    highlights: [
      'Bachelor of Engineering in Mobile and Web Application Programming, WSEI Krakow, class of 2020.',
      'IT Technician, Technikum Łączności nr 14 in Krakow, class of 2016.',
      'Microsoft MTA 98-375 and MTA 98-364 plus IT Technician state qualification.',
      'Resume also lists Google Cybersecurity and IBM Full Stack among relevant certificates.'
    ],
    facts: [
      { label: 'Degree', value: 'BEng (Class of 2020)' },
      { label: 'Degree', value: 'BEng, class of 2020' },
      { label: 'School', value: 'WSEI Krakow' },
      { label: 'Certs', value: 'Microsoft MTA, IT Technician' },
      { label: 'Track', value: 'Engineering foundation' }
    ],
    surfaceKicker: 'Academic Track',
    surfaceValue: 'BENG',
    surfaceText: 'Web engineering, mobile applications and technical IT foundations.'
  },
  {
    title: '#COM',
    expandedTitle: 'COMMUNITY LEADERSHIP',
    signal: 'CREDENTIAL 02',
    mode: 'ALLIANCE',
    handoff: 'EVENTS / LEADERSHIP',
    expandedHandoff: 'MENTORSHIP, STUDENT COUNCIL & HACKATHONS',
    chip: 'Community',
    id: 'ID-CMM15',
    previewLeftLabel: 'FOCUS',
    previewLeft: 'Leadership / Events',
    previewRightLabel: 'SCALE',
    previewRight: 'Teams / 100+',
    eyebrow: 'Credentials // Community leadership',
    lead:
      'Leadership and coordination experience spanning hackathons, student representation and cross-functional event teams.',
    highlights: [
      'Co-organized SheepYourHack and WSEICraft hackathons as a technical lead and mentor.',
      'Managed a 20-person volunteer team and coordinated with external sponsors.',
      'Served as President and Vice-President of the Student Council between 2017 and 2020.',
      'Built calm, execution-oriented leadership habits in high-pressure event environments.'
    ],
    facts: [
      { label: 'Events', value: 'SheepYourHack, WSEICraft' },
      { label: 'Role', value: 'Technical lead / organizer' },
      { label: 'Scale', value: '20 volunteers, 100+ participants' },
      { label: 'Thread', value: 'Leadership & mentoring' }
    ],
    surfaceKicker: 'Leadership Track',
    surfaceValue: 'COMMUNITY',
    surfaceText: 'Mentoring, event operations, representation and collaborative technical leadership.'
  },
  {
    title: '#GDPR',
    expandedTitle: 'CLEARANCE',
    signal: 'CREDENTIAL 03',
    mode: 'LEGAL',
    handoff: 'GDPR / RECRUITMENT',
    expandedHandoff: 'DATA PROCESSING COMPLIANCE // GDPR',
    chip: 'Consent',
    id: 'ID-EDU14',
    previewLeftLabel: 'STATUS',
    previewLeft: 'Consent granted',
    previewRightLabel: 'REFERENCE',
    previewRight: 'Available',
    eyebrow: 'Compliance // Recruitment data processing',
    lead:
      'Recruitment-ready documentation layer covering GDPR consent, references and bilingual compliance language.',
    highlights: [
      'Consent granted for processing personal data for recruitment purposes in accordance with GDPR.',
      'References from rescued-project clients are available upon request.',
      'Formal compliance language maintained in both Polish and English contexts.',
      'Documentation layer aligned with recruitment and data-handling expectations.'
    ],
    facts: [
      { label: 'Regulation', value: 'EU GDPR 2016/679' },
      { label: 'Clearance', value: 'Active' },
      { label: 'References', value: 'Available upon request' },
      { label: 'Status', value: 'Compliant' }
    ],
    surfaceKicker: 'Compliance Layer',
    surfaceValue: 'GDPR',
    surfaceText: 'Formal consent, references and recruitment-ready documentation perimeter.'
  }
];

export const EN_FEATURED_INTRO_CARD: CvCardContent = {
  title: 'ACCESS',
  expandedTitle: 'MANIFOLD ENTRY NODE',
  signal: 'BOOT 00',
  mode: 'GATEWAY',
  handoff: 'AUTO ENTER',
  expandedHandoff: 'ENTRY VECTOR // INITIALIZE MAIN WORLD',
  chip: 'Gateway',
  id: 'ID-BOOT',
  previewLeftLabel: 'STATUS',
  previewLeft: 'Awaiting handshake',
  previewRightLabel: 'ACTION',
  previewRight: 'Initialize',
  eyebrow: 'Entry Node // Transition from splash into the main manifold scene',
  lead: 'Primary access card for bootstrapping the main portfolio space and switching from intro state into navigation.',
  highlights: [
    'Activates the world view and unlocks the navigation layers.',
    'Switches the featured card from boot profile to portfolio profile.',
    'Acts as the visual handoff between landing screen and main scene.',
    'Keeps the entrance intentional, cinematic and clearly interactive.'
  ],
  facts: [
    { label: 'Mode', value: 'Intro / handoff' },
    { label: 'Trigger', value: 'Pointer or keyboard' },
    { label: 'State', value: 'Boot sequence armed' },
    { label: 'Effect', value: 'Enter manifold' }
  ],
  surfaceKicker: 'Boot Surface',
  surfaceValue: 'ENTRY',
  surfaceText: 'A dedicated intro profile that mutates into the main featured card after world entry.'
};

export const EN_BUNDLE: ManifoldLocaleBundle = {
  audio: {
    enterZenAria: 'Enter zen mode',
    exitZenAria: 'Exit zen mode',
    exitZenLabel: 'Exit zen',
    pauseAria: 'Pause musical background',
    pauseLabel: 'Pause',
    playAria: 'Play musical background',
    playLabel: 'PLAY',
    zenLabel: 'Zen'
  },
  document: {
    cvDownloadFileName: 'krzysztof_kaim_resume.pdf',
    cvDownloadHref: '/files/krzysztof_kaim_resume.pdf',
    description:
      'Krzysztof Kaim is a software engineer specializing in React, TypeScript, .NET, MES, ERP integrations, industrial systems, and enterprise project recovery.',
    lang: 'en',
    title: 'Krzysztof Kaim Software Engineer | React, .NET, MES'
  },
  sectionLabels: {
    PROFILE: 'PROFILE',
    DEPLOYMENTS: 'DEPLOYMENTS',
    OPERATIONS: 'OPERATIONS',
    CAPABILITIES: 'CAPABILITIES',
    CREDENTIALS: 'CREDENTIALS'
  },
  ui: {
    additionalOptions: 'Additional options',
    additionalOptionsHint: '[ LOCK ]',
    aboutLabel: 'SYSTEM',
    aboutCloseLabel: 'CLOSE',
    aboutContent: {
      stack: 'Manifold Engine (DOM/WebGL2/WebGPU), TypeScript, Three.js (Scene Rendering), Tesseract 4D Matrix Math, WebWorker Physics, Object Pooling, CSS Typed OM.',
      trivia: 'Hybrid WebGL/WebGPU/DOM renderer using 4D Tesseract projection and CSS matrix3d homography. Optimized render loop with state hashing and object pooling for low GC overhead. Off-main-thread WebWorkers handle fluid simulations, spatial physics, and FFT audio analysis. Includes adaptive frame-pacing and dynamic DPR scaling.',
      build: 'BUILD SIGNATURE',
      runtime: 'RUNTIME STATUS',
      authorTime: "AUTHOR'S STATUS",
      visitor: 'VISITOR',
      authorStatus: {
        sleeping: 'SLEEPING',
        breakfast: 'EATING BREAKFAST',
        working: 'WORKING / CODING',
        chillingPostWork: 'CHILLING AFTER WORK',
        walking: 'HAVING A WALK',
        chilling: 'JUST CHILLING'
      }
    },
    cardHighlights: 'Highlights',
    cardSnapshot: 'Snapshot',
    clickCardForDetails: 'Click Card For Details',
    closeNavigationAria: 'Close navigation',
    coord: 'COORD',
    cvDownloadAria: 'Download résumé placeholder',
    cvLabel: 'Résumé',
    contactLabel: 'contact',
    contactAria: 'Send an email to krzysztof@kaim.dev',
    contactEmail: 'krzysztof@kaim.dev',
    enteringAutomatically: 'Entering Automatically',
    entryPoint: 'Entry Point',
    fps: 'FPS',
    focusLock: 'FOCUS LOCK',
    hudHintLineOne: 'CLICK TO OPEN',
    hudHintLineTwo: 'SCENE MENU',
    hudTravelLineOne: 'MOVING TO',
    fullRate: 'FULL RATE',
    fullRateBoost: 'FULL RATE+',
    jumpAcrossCards: 'Jump Across Cards',
    jumpAcrossSections: 'Jump Across Sections',
    localeLabel: 'EN',
    localeSwitchToEnglish: 'Switch language to English',
    localeSwitchToPolish: 'Switch language to Polish',
    menuAriaLabel: 'Mode selection',
    mode2D: '2D MODE',
    mode3D: '3D MODE',
    mode4D: '4D MODE',
    currentModeAriaPrefix: 'Current manifold mode',
    nextCardAria: 'Next card',
    nextCardSectionAria: 'Show next card section',
    nextPageAria: 'Next page',
    orbitToggle: 'ORBITAL GUIDES',
    orbitToggleActive: 'Orbital guides: on',
    orbitToggleInactive: 'Orbital guides: off',
    orbitToggleAria: 'Toggle orbital navigation guides',
    previousPageAria: 'Previous page',
    previousCardAria: 'Previous card',
    powerSave: 'POWER SAVE',
    perf: 'PERF',
    policyLabel: 'PRIVACY POLICY',
    policyCloseLabel: 'CLOSE POLICY',
    policyContent: {
      intro:
        'PRIVACY NOTICE\n\nLast updated: 29 April 2026\n\nThis website is a personal web experience operated under the kaim.dev domain. It is designed to run mostly in your browser and to collect as little information as reasonably possible.',
      processingTitle: 'LOCAL PROCESSING',
      processingBody:
        'Rendering, interaction state, diagnostics, GPU/browser capability checks and visual effects run locally in your browser. Debug information about your device or browser remains on your device unless telemetry is explicitly enabled.',
      storageTitle: 'BROWSER STORAGE',
      storageBody:
        'The site uses localStorage to remember selected language and orbital-guide visibility, and sessionStorage for a short-lived locale transition flag. These values are used only to keep the interface consistent. This experience does not use cookies.',
      audioTitle: 'AUDIO PLAYBACK',
      audioBody:
        'Background audio is loaded only after you press the audio toggle. The site does not request microphone or camera access.',
      telemetryTitle: 'OPTIONAL TELEMETRY',
      telemetryBody:
        'If a telemetry endpoint is configured for this deployment, the app may send limited technical events such as event name, timestamp, current path and small interaction payloads, for example mode switches or audio start. This is used only to understand and improve the experience.',
      performanceTitle: 'PERFORMANCE ANALYTICS',
      performanceBody:
        "This site may use Cloudflare Web Analytics / Real User Measurements (RUM) to measure real-world loading performance and reliability. When enabled, Cloudflare may load or inject a small JavaScript beacon that collects browser performance measurements such as page-load timing, navigation timing, resource timing, paint timing and Core Web Vitals, together with limited page context such as the current path or referrer. This performance measurement is used to diagnose and improve speed, rendering behavior and user-perceived performance. It is not used by this site for advertising, cross-site profiling or user identification. The legal basis, where required, is the operator's legitimate interest in maintaining and improving the technical quality of the website.",
      contactTitle: 'CONTACT ACTION',
      contactBody:
        'The contact link matches the active locale ("contact" or "kontakt"). To reduce automated harvesting by scrapers and bots, the address is not stored as a static visible string and is injected into the mailto protocol only upon interaction.',
      rightsTitle: 'YOUR RIGHTS',
      rightsBody:
        'Where GDPR applies, you may request access, correction, deletion, restriction or objection regarding personal data processed in connection with this site. Contact may be made through the contact action available on the website.'
    },
    privacyLabel: 'DEBUG OVERLAY',
    privacyCloseLabel: 'HIDE DEBUG',
    privacyContent: '',
    return: 'EXIT TO START',
    sceneNavigation: 'Scene Navigation',
    returnToEntryAria: 'Exit and return to start screen',
    scrollArrowsToExit: 'Scroll / Arrows To Exit',
    scrollArrowsWsToMove: 'Scroll / Arrows / W S To Move',
    scrollToExit: 'Scroll To Exit',
    scrollVelocity: 'SCROLL VELOCITY',
    scrollToBrowse: 'Scroll To Browse',
    scrollToExitCard: 'Scroll To Exit Card',
    scrollPrompt: 'SCROLL',
    sectionKicker: 'Section',
    systemLoader: 'System Loader',
    topbarRole: 'full-stack software engineer / lead architect',
    twoDSection: '2D Section',
    systemOverlayToggleAria: 'Toggle system overlay',
    systemOverlayToggleActive: 'System overlay: on',
    systemOverlayToggleInactive: 'System overlay: off',
    systemOverlayOn: 'OVERLAY: ON',
    systemOverlayOff: 'OVERLAY: OFF',
    zenLock: 'ZEN LOCK'
  }
};
