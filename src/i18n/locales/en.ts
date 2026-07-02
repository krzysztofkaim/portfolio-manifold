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
    lead: 'Full-stack software engineer with security consulting experience and a lead-level track record in complex manufacturing, enterprise and recovery-oriented projects.',
    highlights: [
      'Connects product-facing UI, backend architecture, integrations and operational responsibility into one coherent delivery model.',
      'Strong fit for MES, ERP-connected platforms, internal enterprise systems and projects that need technical stabilization.',
      'Comfortable owning architecture, rewrites, platform upgrades and the final path to production.',
      'Works effectively as an independent consultant or as an embedded technical lead close to the team and business context.'
    ],
    facts: [
      { label: 'Role', value: 'Lead / Architect' },
      { label: 'Contact', value: 'Email / LinkedIn' },
      { label: 'Email', value: 'krzysztof@kaim.dev' },
      { label: 'Core', value: '.NET 8 / React 18' }
    ],
    surfaceKicker: 'Executive Fit',
    surfaceValue: 'Full-stack',
    surfaceText:
      'Architecture, implementation, integrations and maintenance for systems that need to perform in real operating environments.'
  },
  {
    title: '#WHY',
    expandedTitle: 'CURRENT FOCUS',
    signal: 'PROFILE 02',
    mode: 'PRIORITY',
    handoff: 'UX / BACKEND / ENTERPRISE',
    expandedHandoff:
      'TECHNICAL RANGE // UX, BACKEND AND ENTERPRISE CONSTRAINTS',
    chip: 'Focus',
    id: 'ID-SYS2',
    previewLeftLabel: 'MODE',
    previewLeft: 'Rescue / Rewrite',
    previewRightLabel: 'RANGE',
    previewRight: 'UX to backend',
    eyebrow: 'Technical Range // Product, backend and domain constraints',
    lead: 'The strongest contribution comes where product experience, backend correctness and domain constraints have to be designed together.',
    highlights: [
      'Works across the full path from requirements and architecture to deployment, monitoring and ongoing maintenance.',
      'Builds modern React interfaces with disciplined state management, data flow and performance awareness.',
      'Designs .NET backends with a focus on domain correctness, security and computational efficiency.',
      'Best suited to product work where integrations, enterprise constraints and operational consequences matter.'
    ],
    facts: [
      { label: 'Industrial', value: 'MES, planning, kiosk roles' },
      { label: 'Enterprise', value: 'Travel, medical, internal systems' },
      { label: 'Delivery', value: 'Architecture to production' },
      { label: 'Core', value: 'React / .NET / integrations' }
    ],
    surfaceKicker: 'Current Lane',
    surfaceValue: 'Product',
    surfaceText:
      'A strong fit for product, backend, integrations and production ownership in one technical role.'
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
    eyebrow: 'Delivery Model // From decision to stable release',
    lead: 'Built around pragmatic product engineering: clarifying the goal, managing risk and choosing architecture that can survive production.',
    highlights: [
      'Focuses on solving the business problem rather than simply completing implementation tasks.',
      'Covers the operational perimeter: deployment, documentation, support, release flow and future maintainability.',
      'Translates stakeholder expectations into technical execution without losing delivery momentum.',
      'Treats reliability, security and maintainability as design inputs rather than post-release cleanup.'
    ],
    facts: [
      { label: 'Mindset', value: 'Pragmatic engineering' },
      { label: 'Docs', value: 'OpenAPI, remediation, KB' },
      { label: 'Goal', value: 'Stable delivery under pressure' },
      { label: 'Scope', value: 'Product to production' }
    ],
    surfaceKicker: 'Operating Model',
    surfaceValue: 'Systems',
    surfaceText:
      'Complete solutions designed to make sense technically, operationally and commercially.'
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
    eyebrow: 'Textile MES // Manufacturing platform modernization',
    lead: 'Assumed responsibility for a critical textile MES platform and led architectural cleanup, major rewrite work and platform modernization.',
    highlights: [
      'The system supports 58 machines across 5 production halls, over 205 virtual stock records and 180 ERP-to-MES integrations.',
      'Reduced server resource usage by roughly 80% by removing major N+1 hotspots and profiling flows with OpenTelemetry.',
      'Designed secure backend and data access layers using JWT, BCrypt, RBAC, EF Core and PostgreSQL.',
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
    surfaceText:
      'Manufacturing workflows, ERP integration, planning dashboards and domain logic aligned with real factory operations.'
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
    eyebrow: 'NATA Automation // Automation project stabilization',
    lead: 'Joined as a backend .NET engineer and expanded into broader technical ownership to stabilize an automation project under delivery pressure.',
    highlights: [
      'Built a custom drag-and-drop deployment tool that reduced release time by roughly 95%.',
      'Rebuilt the UI with React 18 and Feature-Sliced Design, removing dependency cycles and significant architectural debt.',
      'Implemented RTK Query and server-side pagination, reducing browser memory usage by roughly 70% on large datasets.',
      'Reworked application security with BCrypt and JWT rotation, removing critical issues inherited from legacy AES storage.'
    ],
    facts: [
      { label: 'Stack', value: 'React 18, Vite, RTK Query, .NET 8' },
      { label: 'UX', value: 'MUI, SignalR, realtime sync' },
      { label: 'Role', value: 'Senior / Technical Lead' },
      { label: 'Data', value: 'PostgreSQL' }
    ],
    surfaceKicker: 'Recovery Mode',
    surfaceValue: 'Stabilization',
    surfaceText:
      'Infrastructure stabilization, frontend modernization and recovery of business-critical domain behavior.'
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
    eyebrow: 'Vapture // Travel, medical and internal platforms',
    lead: 'Operated an independent software consultancy serving five long-term NDA clients across travel, medical and internal business systems.',
    highlights: [
      'Owned the full SDLC from architecture and requirements discovery through deployment and maintenance.',
      'Engineered a Google Cloud-based SMS gateway for patient appointment reminders.',
      'Implemented custom authentication, relational and NoSQL persistence, and high-performance portals scoring 90+ in Lighthouse.',
      'Standardized environments with Docker, reducing project setup from days to minutes.'
    ],
    facts: [
      { label: 'Backend', value: 'ASP.NET Core, Node.js, PostgreSQL' },
      { label: 'Frontend', value: 'React, TypeScript, Next.js' },
      { label: 'DevOps', value: 'Docker, AWS, OpenAPI' },
      { label: 'Delivery', value: 'Architecture to maintenance' }
    ],
    surfaceKicker: 'Enterprise Track',
    surfaceValue: 'B2B',
    surfaceText:
      'Travel and medical systems delivered from architectural decisions through production maintenance.'
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
    eyebrow: 'WSEI // Internal systems and event infrastructure',
    lead: 'Developed the university internal technology ecosystem while combining application work with cloud ownership, communication tooling and event infrastructure.',
    highlights: [
      'Developed and maintained the university CRM, event websites and hackathon communication platforms.',
      'Led a cross-functional team of 20 people while organizing SheepYourHack and WSEICraft.',
      'Managed Azure infrastructure prepared for high-traffic events with 100+ participants.',
      'Automated email communication workflows, reducing administrative overhead and operational risk.'
    ],
    facts: [
      { label: 'Stack', value: 'ASP.NET Core, C#, React, Bootstrap' },
      { label: 'Cloud', value: 'Microsoft Azure' },
      { label: 'Scale', value: '20 people / 100+ participants' },
      { label: 'Role', value: 'Developer / project lead' }
    ],
    surfaceKicker: 'Operations Layer',
    surfaceValue: 'Cloud',
    surfaceText:
      'Internal applications, cloud ownership and infrastructure prepared for high-intensity events.'
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
    eyebrow: 'Security // ECM platform assessment',
    lead: 'Conducted black-box penetration testing and security consulting for a proprietary ECM platform, focusing on practical exploitability and remediation.',
    highlights: [
      'Used Burp Suite, Nmap and OWASP ZAP to identify weaknesses relevant to real attack scenarios.',
      'Performed vulnerability and compliance audits with actionable remediation guidance for engineering teams.',
      'Documented OWASP Top 10 issues and security gaps before production release.',
      'Combined hands-on testing with security documentation and deployment-readiness review.'
    ],
    facts: [
      { label: 'Tools', value: 'Burp Suite, Nmap, ZAP' },
      { label: 'Focus', value: 'OWASP, compliance, black-box' },
      { label: 'Output', value: 'Audit reports & remediation' },
      { label: 'Scope', value: 'ECM security consulting' }
    ],
    surfaceKicker: 'Security Lens',
    surfaceValue: 'Audit',
    surfaceText:
      'Testing, reporting, remediation guidance and practical feedback loops for secure software engineering.'
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
    eyebrow: 'Data & networks // Operational foundations',
    lead: 'Early operational experience established a practical foundation in data integrity, local infrastructure and technical environment stability.',
    highlights: [
      'Executed complex data migrations across Oracle Database environments.',
      'Designed and documented network topology maps for system expansions.',
      'Built practical fluency in data integrity, network administration and infrastructure-adjacent work.',
      'Developed operational habits that later informed reliability-focused application engineering.'
    ],
    facts: [
      { label: 'Database', value: 'Oracle Database (SQL)' },
      { label: 'Tools', value: 'Microsoft Visio' },
      { label: 'Scope', value: 'Data migration, network topography' },
      { label: 'Mode', value: 'On-site operations' }
    ],
    surfaceKicker: 'Foundational Layer',
    surfaceValue: 'Ops',
    surfaceText:
      'Databases, migrations and network topology as the foundation for later application-system work.'
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
    eyebrow: 'Frontend // Interfaces for complex products',
    lead: 'Designs and builds interfaces that are not only polished, but also clear, fast and maintainable over the full product lifecycle.',
    highlights: [
      'Strong React 18, TypeScript and Next.js experience in products with complex states and user scenarios.',
      'Predictable data and state orchestration using Redux Toolkit and RTK Query.',
      'Feature-Sliced Design, responsive layouts and MUI components shaped around product needs.',
      'Interfaces designed for clarity, performance and fast issue diagnosis.'
    ],
    facts: [
      { label: 'Core', value: 'React 18, TypeScript, Next.js' },
      { label: 'State', value: 'Redux Toolkit, RTK Query' },
      { label: 'Build', value: 'Vite, FSD, MUI' },
      { label: 'Goal', value: 'Clarity and maintainability' }
    ],
    surfaceKicker: 'Capability Layer',
    surfaceValue: 'Frontend',
    surfaceText:
      'Typed interfaces, scalable UI systems and client-side architecture ready for product growth.'
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
    eyebrow: 'Backend // Domain logic and data',
    lead: 'Builds backend systems that structure business logic, protect data and give products a stable technical foundation.',
    highlights: [
      'Extensive use of .NET 8 and ASP.NET Core where performance, correctness and security matter.',
      'Data modeling with EF Core, PostgreSQL, MSSQL and MongoDB, emphasizing consistency and clear boundaries.',
      'Domain boundaries and service decomposition applied where they genuinely simplify delivery and maintenance.',
      'Backends designed for testability, monitoring, diagnostics and operational support.'
    ],
    facts: [
      { label: 'Frameworks', value: '.NET 8, ASP.NET Core, Node.js' },
      { label: 'Databases', value: 'PostgreSQL, MSSQL, MongoDB' },
      { label: 'Patterns', value: 'DDD, CQRS, EF Core' },
      { label: 'Scope', value: 'APIs, engines, data layers' }
    ],
    surfaceKicker: 'Capability Layer',
    surfaceValue: 'Backend',
    surfaceText:
      'Business logic, APIs, engines and data layers built for correctness and resilience.'
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
    eyebrow: 'DevOps & security // Operational product quality',
    lead: 'Treats deployment, hosting, security and developer tooling as part of product quality, not as afterthoughts.',
    highlights: [
      'Hands-on experience with Docker, AWS, CI/CD and controlled release processes.',
      'Strong understanding of authentication, API security and operational system boundaries.',
      'Builds deployment workflows when project constraints require context-specific tooling.',
      'Ensures systems are not only implemented, but also deployable, observable and maintainable.'
    ],
    facts: [
      { label: 'Platforms', value: 'Docker, AWS, Linux' },
      { label: 'Security', value: 'Auth, API security, compliance' },
      { label: 'Delivery', value: 'CI/CD, release flow, hosting' },
      { label: 'Mode', value: 'Operational product readiness' }
    ],
    surfaceKicker: 'Capability Layer',
    surfaceValue: 'Infra',
    surfaceText:
      'Infrastructure, security and tooling that close the loop on full product ownership.'
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
    lead: 'Formal engineering education provides the foundation for practical product work, extended by technical and security-focused certifications.',
    highlights: [
      'Bachelor of Engineering in Mobile and Web Application Programming, WSEI Krakow, class of 2020.',
      'IT Technician, Technikum Łączności nr 14 in Krakow, class of 2016.',
      'Microsoft MTA 98-375 and MTA 98-364 plus IT Technician state qualification.',
      'The resume also includes Google Cybersecurity and IBM Full Stack certifications that strengthen the practical engineering profile.'
    ],
    facts: [
      { label: 'Degree', value: 'BEng, class of 2020' },
      { label: 'School', value: 'WSEI Krakow' },
      { label: 'Certs', value: 'Microsoft MTA, IT Technician' },
      { label: 'Track', value: 'Engineering foundation' }
    ],
    surfaceKicker: 'Academic Track',
    surfaceValue: 'B.Eng',
    surfaceText:
      'Technical education supported by product engineering practice, security awareness and continued professional development.'
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
    eyebrow: 'Credentials // Leadership and team responsibility',
    lead: 'Leadership and coordination experience complements the technical profile with calm team guidance, communication and execution under pressure.',
    highlights: [
      'Co-organized SheepYourHack and WSEICraft hackathons as a technical lead and mentor.',
      'Managed a 20-person volunteer team and coordinated with external sponsors.',
      'Served as President and Vice-President of the Student Council between 2017 and 2020.',
      'Built a calm, execution-oriented leadership style in high-pressure event environments.'
    ],
    facts: [
      { label: 'Events', value: 'SheepYourHack, WSEICraft' },
      { label: 'Role', value: 'Technical lead / organizer' },
      { label: 'Scale', value: '20 volunteers, 100+ participants' },
      { label: 'Thread', value: 'Leadership & mentoring' }
    ],
    surfaceKicker: 'Leadership Track',
    surfaceValue: 'Community',
    surfaceText:
      'Mentoring, event operations, representation and responsible team leadership.'
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
    lead: 'The formal documentation layer is prepared for recruitment and B2B cooperation, covering consent, references and consistent Polish-English communication.',
    highlights: [
      'Consent granted for processing personal data for recruitment purposes in accordance with GDPR.',
      'References from rescued-project clients are available upon request.',
      'Formal compliance language is maintained in both Polish and English contexts.',
      'Documentation remains aligned with recruitment expectations, privacy obligations and professional communication standards.'
    ],
    facts: [
      { label: 'Regulation', value: 'EU GDPR 2016/679' },
      { label: 'Clearance', value: 'Active' },
      { label: 'References', value: 'Available upon request' },
      { label: 'Status', value: 'Compliant' }
    ],
    surfaceKicker: 'Compliance Layer',
    surfaceValue: 'GDPR',
    surfaceText:
      'GDPR consent, references and formal readiness for recruitment or B2B cooperation.'
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
  lead: 'The entry card acts as a deliberate threshold between the launch state and the main portfolio experience.',
  highlights: [
    'Activates the world view and unlocks the navigation layers.',
    'Switches the featured card from boot profile into the main portfolio presentation.',
    'Creates a visual transition between loading and the main scene.',
    'Keeps the entrance clear, controlled and intentionally interactive.'
  ],
  facts: [
    { label: 'Mode', value: 'Intro / handoff' },
    { label: 'Trigger', value: 'Pointer or keyboard' },
    { label: 'State', value: 'Boot sequence armed' },
    { label: 'Effect', value: 'Enter manifold' }
  ],
  surfaceKicker: 'Boot Surface',
  surfaceValue: 'Entry',
  surfaceText:
    'A dedicated entry threshold that transitions into the main portfolio presentation.'
};

export const EN_BUNDLE: ManifoldLocaleBundle = {
  audio: {
    enterZenAria: 'Enter zen mode',
    exitZenAria: 'Exit zen mode',
    exitZenLabel: 'Exit zen',
    pauseAria: 'Pause musical background',
    pauseLabel: 'Pause',
    playAria: 'Play musical background',
    playLabel: 'Play',
    zenLabel: 'Zen'
  },
  document: {
    cvDownloadFileName: 'krzysztof_kaim_resume.pdf',
    cvDownloadHref: '/files/krzysztof_kaim_resume.pdf',
    description:
      'Krzysztof Kaim is a full-stack software engineer specializing in React, TypeScript, .NET, MES, ERP integrations and architecture ownership for complex industrial and enterprise systems.',
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
    aboutLabel: 'System',
    aboutCloseLabel: 'Close',
    aboutContent: {
      stack:
        'Manifold Engine (DOM/WebGL2/WebGPU), TypeScript, Three.js (Scene Rendering), Tesseract 4D Matrix Math, WebWorker Physics, Object Pooling, CSS Typed OM.',
      trivia:
        'Hybrid WebGL/WebGPU/DOM renderer using 4D Tesseract projection and CSS matrix3d homography. Optimized render loop with state hashing and object pooling for low GC overhead. Off-main-thread WebWorkers handle fluid simulations, spatial physics, and FFT audio analysis. Includes adaptive frame-pacing and dynamic DPR scaling.',
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
    clickCardForDetails: 'Open card details',
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
    hudHintLineOne: 'Click to open',
    hudHintLineTwo: 'Scene menu',
    hudTravelLineOne: 'Moving to',
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
    orbitToggle: 'Orbital guides',
    orbitToggleActive: 'Orbital guides: on',
    orbitToggleInactive: 'Orbital guides: off',
    orbitToggleAria: 'Toggle orbital navigation guides',
    previousPageAria: 'Previous page',
    previousCardAria: 'Previous card',
    powerSave: 'POWER SAVE',
    perf: 'PERF',
    policyLabel: 'Privacy policy',
    policyCloseLabel: 'Close policy',
    policyContent: {
      intro:
        'Privacy notice\n\nLast updated: 29 April 2026\n\nThis website is a personal web experience operated under the kaim.dev domain. It is designed to run mostly in your browser and to collect as little information as reasonably possible.',
      processingTitle: 'Local processing',
      processingBody:
        'Rendering, interaction state, diagnostics, GPU/browser capability checks and visual effects run locally in your browser. Debug information about your device or browser remains on your device unless telemetry is explicitly enabled.',
      storageTitle: 'Browser storage',
      storageBody:
        'The site uses localStorage to remember selected language and orbital-guide visibility, and sessionStorage for a short-lived locale transition flag. These values are used only to keep the interface consistent. This experience does not use cookies.',
      audioTitle: 'Audio playback',
      audioBody:
        'Background audio is loaded only after you press the audio toggle. The site does not request microphone or camera access.',
      telemetryTitle: 'Optional telemetry',
      telemetryBody:
        'If a telemetry endpoint is configured for this deployment, the app may send limited technical events such as event name, timestamp, current path and small interaction payloads, for example mode switches or audio start. This is used only to understand and improve the experience.',
      performanceTitle: 'Performance analytics',
      performanceBody:
        "This site may use Cloudflare Web Analytics / Real User Measurements (RUM) to measure real-world loading performance and reliability. When enabled, Cloudflare may load or inject a small JavaScript beacon that collects browser performance measurements such as page-load timing, navigation timing, resource timing, paint timing and Core Web Vitals, together with limited page context such as the current path or referrer. This performance measurement is used to diagnose and improve speed, rendering behavior and user-perceived performance. It is not used by this site for advertising, cross-site profiling or user identification. The legal basis, where required, is the operator's legitimate interest in maintaining and improving the technical quality of the website.",
      contactTitle: 'Contact action',
      contactBody:
        'The contact link matches the active locale ("contact" or "kontakt"). To reduce automated harvesting by scrapers and bots, the address is not stored as a static visible string and is injected into the mailto protocol only upon interaction.',
      rightsTitle: 'Your rights',
      rightsBody:
        'Where GDPR applies, you may request access, correction, deletion, restriction or objection regarding personal data processed in connection with this site. Contact may be made through the contact action available on the website.'
    },
    privacyLabel: 'Debug overlay',
    privacyCloseLabel: 'Hide debug',
    privacyContent: '',
    return: 'Exit to start',
    sceneNavigation: 'Scene Navigation',
    returnToEntryAria: 'Exit and return to start screen',
    scrollArrowsToExit: 'Scroll / arrows to exit',
    scrollArrowsWsToMove: 'Scroll / arrows / W S to move',
    scrollToExit: 'Scroll to exit',
    scrollVelocity: 'SCROLL VELOCITY',
    scrollToBrowse: 'Scroll to browse',
    scrollToExitCard: 'Scroll to exit card',
    scrollPrompt: 'Scroll',
    sectionKicker: 'Section',
    systemLoader: 'System Loader',
    topbarRole: 'full-stack software engineer / lead architect',
    twoDSection: '2D Section',
    systemOverlayToggleAria: 'Toggle system overlay',
    systemOverlayToggleActive: 'System overlay: on',
    systemOverlayToggleInactive: 'System overlay: off',
    systemOverlayOn: 'Overlay: on',
    systemOverlayOff: 'Overlay: off',
    zenLock: 'Zen lock'
  }
};
