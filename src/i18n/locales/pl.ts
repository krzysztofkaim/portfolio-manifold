import type { CvCardContent } from '../../experience/manifold/ManifoldTypes';
import type { ManifoldLocaleBundle } from '../manifoldLocale';

export const PL_CV_CARDS: readonly CvCardContent[] = [
  {
    title: 'O MNIE',
    expandedTitle: 'KRZYSZTOF KAIM',
    signal: 'PROFIL 01',
    mode: 'LIVE',
    handoff: 'FULL-STACK ENGINEER',
    expandedHandoff: 'FULL-STACK SOFTWARE ENGINEER // ŚCIEŻKA LEAD / ARCHITEKT',
    chip: 'Tożsamość',
    id: 'ID-KAIM',
    previewLeftLabel: 'BAZA',
    previewLeft: 'Remote / Hybrid',
    previewRightLabel: 'KONTAKT',
    previewRight: 'krzysztof@kaim.dev',
    eyebrow: 'Profil zawodowy // Zakres odpowiedzialności',
    lead: 'Krzysztof Kaim to inżynier o profilu full-stack, który łączy doświadczenie programistyczne, bezpieczeństwo aplikacji i odpowiedzialność architektoniczną za systemy produkcyjne oraz platformy dla dużych organizacji.',
    highlights: [
      'Największą wartość wnosi tam, gdzie produkt wymaga jednocześnie dobrego interfejsu, solidnego backendu i zrozumienia operacji.',
      'Ma doświadczenie w systemach MES, integracjach ERP, platformach wewnętrznych oraz stabilizowaniu projektów wymagających uporządkowania.',
      'Prowadzi decyzje architektoniczne, modernizacje, przepisywanie kluczowych modułów i doprowadzanie rozwiązań do produkcji.',
      'Dobrze odnajduje się zarówno jako niezależny konsultant, jak i techniczny lider osadzony blisko zespołu oraz biznesu.'
    ],
    facts: [
      { label: 'Rola', value: 'Lead / Architekt' },
      { label: 'Telefon', value: '(+48) 666 550 888' },
      { label: 'Email', value: 'krzysztof@kaim.dev' },
      { label: 'Rdzeń', value: '.NET 8 / React 18' }
    ],
    surfaceKicker: 'Executive Fit',
    surfaceValue: 'FULL-STACK',
    surfaceText: 'Architektura, implementacja, integracje i utrzymanie systemów, które muszą działać w realnym środowisku biznesowym.'
  },
  {
    title: '#DLACZEGO',
    expandedTitle: 'BIEŻĄCY FOKUS',
    signal: 'PROFIL 02',
    mode: 'PRIORYTET',
    handoff: 'UX / BACKEND / ENTERPRISE',
    expandedHandoff: 'ZAKRES TECHNICZNY // UX, BACKEND I OGRANICZENIA ENTERPRISE',
    chip: 'Fokus',
    id: 'ID-SYS2',
    previewLeftLabel: 'TRYB',
    previewLeft: 'Rescue / Rewrite',
    previewRightLabel: 'ZASIĘG',
    previewRight: 'UX do backendu',
    eyebrow: 'Zakres techniczny // Produkt, backend i ograniczenia domeny',
    lead: 'Jego naturalnym obszarem pracy są produkty, w których doświadczenie użytkownika musi wynikać z dobrze zaprojektowanej logiki backendowej i realnych ograniczeń domeny.',
    highlights: [
      'Pracuje w pełnym przekroju: od rozpoznania wymagań i architektury po wdrożenie, monitoring i dalsze utrzymanie.',
      'Buduje nowoczesne interfejsy w React, dbając o przewidywalny stan, czytelny przepływ danych i wydajność.',
      'Projektuje backend w .NET z naciskiem na poprawność domenową, bezpieczeństwo i kontrolę kosztu obliczeniowego.',
      'Najlepiej sprawdza się na styku produktu, integracji korporacyjnych i systemów, w których błąd ma konsekwencje operacyjne.'
    ],
    facts: [
      { label: 'Przemysł', value: 'MES, planowanie, role kioskowe' },
      { label: 'Enterprise', value: 'Travel, medical, systemy wewnętrzne' },
      { label: 'Dowożenie', value: 'Od architektury do produkcji' },
      { label: 'Rdzeń', value: 'React / .NET / integracje' }
    ],
    surfaceKicker: 'Obecny Tor',
    surfaceValue: 'PRODUKT',
    surfaceText: 'Najmocniejsze dopasowanie: produkt, backend, integracje i odpowiedzialność za działanie w produkcji.'
  },
  {
    title: '#JAK',
    expandedTitle: 'PARADYGMAT',
    signal: 'PROFIL 03',
    mode: 'PODEJŚCIE',
    handoff: 'SYSTEMS THINKING',
    expandedHandoff: 'MODEL DOWOZENIA // OD PRODUKTU DO PRODUKCJI',
    chip: 'Paradygmat',
    id: 'ID-FOC3',
    previewLeftLabel: 'STYL',
    previewLeft: 'Systems Thinking',
    previewRightLabel: 'STYL',
    previewRight: 'Pragmatic Dowożenie',
    eyebrow: 'Model pracy // Od decyzji do stabilnego wdrożenia',
    lead: 'Pracuje pragmatycznie: najpierw porządkuje cel i ryzyka, potem dobiera architekturę, zakres i sposób dostarczenia, który da się utrzymać po wdrożeniu.',
    highlights: [
      'Koncentruje się na rozwiązaniu problemu biznesowego, a nie na mechanicznym zamykaniu listy zadań.',
      'Dba o pełny cykl życia rozwiązania: wdrożenia, dokumentację, wsparcie, release flow i możliwość dalszego rozwoju.',
      'Potrafi przełożyć oczekiwania interesariuszy na decyzje techniczne bez utraty tempa pracy.',
      'Traktuje niezawodność, bezpieczeństwo i utrzymanie jako część projektu od pierwszych decyzji, nie jako późniejszy porządek.'
    ],
    facts: [
      { label: 'Mindset', value: 'Pragmatic engineering' },
      { label: 'Docs', value: 'OpenAPI, remediation, KB' },
      { label: 'Cel', value: 'Stabilne dowożenie pod presją' },
      { label: 'Zakres', value: 'Od produktu do produkcji' }
    ],
    surfaceKicker: 'Model Operacyjny',
    surfaceValue: 'SYSTEMY',
    surfaceText: 'Budowanie kompletnych rozwiązań, które mają sens techniczny, biznesowy i operacyjny.'
  },
  {
    title: '#NDA',
    expandedTitle: 'KONTRAKT POD NDA',
    signal: 'WDROŻENIE 01',
    mode: 'ARCHITEKT',
    handoff: 'TEXTILE MES',
    expandedHandoff: 'LEAD SOFTWARE ENGINEER & SOLUTION ARCHITECT // VAPTURE',
    chip: 'MES',
    id: 'ID-JTX4',
    previewLeftLabel: 'OKRES',
    previewLeft: 'Sep 2025 - Present',
    previewRightLabel: 'ROLA',
    previewRight: 'Lead / Architect',
    eyebrow: 'Textile MES // Modernizacja systemu produkcyjnego',
    lead: 'Objął odpowiedzialność za krytyczny projekt MES dla produkcji tekstylnej i przeprowadził go przez uporządkowanie architektury, przepisanie kluczowych obszarów oraz modernizację platformy.',
    highlights: [
      'System obsługuje 58 maszyn w 5 halach produkcyjnych, ponad 205 rekordów virtual stock i 180 integracji ERP-MES.',
      'Ograniczył użycie zasobów serwera o około 80%, eliminując główne hotspoty N+1 i profilując przepływy w OpenTelemetry.',
      'Zaprojektował bezpieczne warstwy backendu oraz dostępu do danych z JWT, BCrypt, RBAC, EF Core i PostgreSQL.',
      'Dostarczył frontend oparty o role użytkowników dla planowania i wykonania, obsługujący 13 ról biznesowych oraz 9 person kioskowych.'
    ],
    facts: [
      { label: 'Backend', value: '.NET 8, EF Core, PostgreSQL, MSSQL' },
      { label: 'Frontend', value: 'React, Redux Toolkit, FSD' },
      { label: 'Domena', value: 'Textile MES, ERP, planowanie' },
      { label: 'Skala', value: '58 maszyn / 5 hal' }
    ],
    surfaceKicker: 'Klasa Wdrozenia',
    surfaceValue: 'MES',
    surfaceText: 'System produkcyjny, integracja ERP, panele planistyczne i logika domenowa podporządkowana realnym procesom na hali.'
  },
  {
    title: '#NTA',
    expandedTitle: 'NATA AUTOMATION',
    signal: 'WDROŻENIE 02',
    mode: 'STABILIZACJA',
    handoff: 'SYSTEM RESCUE',
    expandedHandoff: 'NATA AUTOMATION // STABILIZACJA TRUDNEGO PROJEKTU',
    chip: 'Rescue',
    id: 'ID-NTA5',
    previewLeftLabel: 'OKRES',
    previewLeft: 'Feb 2025 - Sep 2025',
    previewRightLabel: 'ROLA',
    previewRight: 'Kontrakt',
    eyebrow: 'NATA Automation // Stabilizacja projektu automatyki',
    lead: 'Dołączył do projektu jako backend .NET engineer, a następnie przejął odpowiedzialność za szerszy zakres techniczny, stabilizując system automatyki wymagający szybkich decyzji i konsekwentnej egzekucji.',
    highlights: [
      'Zbudował narzędzie drag-and-drop do deploymentu, skracając czas releasu o około 95%.',
      'Przepisał interfejs w React 18 i Feature-Sliced Design, usuwając cykle zależności oraz istotny dług architektoniczny.',
      'Wdrożył RTK Query i paginację po stronie serwera, ograniczając zużycie pamięci przeglądarki o około 70% na dużych zbiorach danych.',
      'Przebudował warstwę bezpieczeństwa z BCrypt i rotacją JWT, usuwając krytyczne problemy odziedziczone po legacy AES storage.'
    ],
    facts: [
      { label: 'Stack', value: 'React 18, Vite, RTK Query, .NET 8' },
      { label: 'UX', value: 'MUI, SignalR, realtime sync' },
      { label: 'Rola', value: 'Senior / Tech Lead' },
      { label: 'Dane', value: 'PostgreSQL' }
    ],
    surfaceKicker: 'Tryb Odzyskiwania',
    surfaceValue: 'STABILIZACJA',
    surfaceText: 'Stabilizacja infrastruktury, modernizacja frontendu i odzyskanie kontroli nad logiką krytyczną dla biznesu.'
  },
  {
    title: '#VPT',
    expandedTitle: 'VAPTURE',
    signal: 'WDROŻENIE 03',
    mode: 'B2B',
    handoff: 'DELIVERY ENTERPRISE',
    expandedHandoff: 'KONSULTANT B2B I FULL-STACK ENGINEER',
    chip: 'Konsulting',
    id: 'ID-VAP6',
    previewLeftLabel: 'OKRES',
    previewLeft: 'May 2020 - Jan 2025',
    previewRightLabel: 'DOMENA',
    previewRight: 'Travel / Medical',
    eyebrow: 'Vapture // Systemy dla branży travel i medical',
    lead: 'Prowadził niezależną działalność konsultingową, wspierając pięciu długoterminowych klientów pod NDA w obszarach travel, medical i systemów wewnętrznych.',
    highlights: [
      'Brał odpowiedzialność za pełny cykl SDLC: od architektury i zbierania wymagań po wdrożenie oraz utrzymanie.',
      'Zaprojektował bramę SMS opartą o Google Cloud do obsługi przypomnień o wizytach pacjentów.',
      'Wdrażał autorskie mechanizmy uwierzytelniania, warstwy danych relacyjnych i NoSQL oraz szybkie portale osiągające 90+ w Lighthouse.',
      'Standaryzował środowiska przez Docker, skracając przygotowanie projektów z dni do minut.'
    ],
    facts: [
      { label: 'Backend', value: 'ASP.NET Core, Node.js, PostgreSQL' },
      { label: 'Frontend', value: 'React, TypeScript, Next.js' },
      { label: 'DevOps', value: 'Docker, AWS, OpenAPI' },
      { label: 'Dowożenie', value: 'Od architektury do utrzymania' }
    ],
    surfaceKicker: 'Tor systemowy',
    surfaceValue: 'B2B',
    surfaceText: 'Systemy dla branży travel i medical prowadzone od decyzji architektonicznych po utrzymanie produkcyjne.'
  },
  {
    title: '#WSEI',
    expandedTitle: 'WSEI DEV',
    signal: 'OPS 01',
    mode: 'CLOUD',
    handoff: 'DEV / CLOUD',
    expandedHandoff: 'SOFTWARE DEVELOPER & PROJECT LEAD // WSEI',
    chip: 'Operacje',
    id: 'ID-WSE7',
    previewLeftLabel: 'OKRES',
    previewLeft: 'Oct 2016 - May 2020',
    previewRightLabel: 'MIEJSCE',
    previewRight: 'Krakow',
    eyebrow: 'WSEI // Aplikacje wewnętrzne i infrastruktura wydarzeń',
    lead: 'Rozwijał wewnętrzny ekosystem technologiczny uczelni, łącząc pracę programistyczną z odpowiedzialnością za chmurę, komunikację i wydarzenia o wysokim natężeniu ruchu.',
    highlights: [
      'Rozwijał i utrzymywał system CRM uczelni, strony eventowe WordPress oraz platformy komunikacji hackathonowej.',
      'Prowadził cross-funkcyjny zespół 20 osób przy organizacji SheepYourHack i WSEICraft.',
      'Zarządzał infrastrukturą Azure przygotowaną na wysoki ruch podczas wydarzeń z udziałem 100+ uczestników.',
      'Automatyzował komunikację mailową, ograniczając narzut administracyjny i ryzyko błędów operacyjnych.'
    ],
    facts: [
      { label: 'Stack', value: 'ASP.NET Core, C#, React, Bootstrap' },
      { label: 'Cloud', value: 'Microsoft Azure' },
      { label: 'Skala', value: '20 osób / 100+ uczestników' },
      { label: 'Rola', value: 'Developer / project lead' }
    ],
    surfaceKicker: 'Warstwa Operacyjna',
    surfaceValue: 'CLOUD',
    surfaceText: 'Aplikacje wewnętrzne, odpowiedzialność za chmurę i infrastruktura przygotowana na intensywne wydarzenia.'
  },
  {
    title: '#ARCH',
    expandedTitle: 'ARCHMAN',
    signal: 'OPS 02',
    mode: 'SECURITY',
    handoff: 'PENTEST / CONSULTING',
    expandedHandoff: 'BLACK-BOX PENTESTER & SECURITY CONSULTANT',
    chip: 'Bezpieczeństwo',
    id: 'ID-ARC8',
    previewLeftLabel: 'OKRES',
    previewLeft: 'Sep 2018 - Sep 2019',
    previewRightLabel: 'MIEJSCE',
    previewRight: 'Krakow',
    eyebrow: 'Bezpieczeństwo // Audyt platformy ECM',
    lead: 'Realizował testy penetracyjne black-box i konsultacje bezpieczeństwa dla proprietarnej platformy ECM, koncentrując się na praktycznie wykorzystywalnych ryzykach.',
    highlights: [
      'Pracował z Burp Suite, Nmap i OWASP ZAP, identyfikując podatności istotne z perspektywy realnego ataku.',
      'Prowadził audyty podatności i zgodności, dostarczając zespołom technicznym konkretne rekomendacje remediacyjne.',
      'Dokumentował problemy z obszaru OWASP Top 10 oraz luki wymagające zamknięcia przed produkcją.',
      'Łączył praktyczne testowanie z dokumentacją bezpieczeństwa i oceną gotowości wdrożeniowej.'
    ],
    facts: [
      { label: 'Narzędzia', value: 'Burp Suite, Nmap, ZAP' },
      { label: 'Fokus', value: 'OWASP, compliance, black-box' },
      { label: 'Output', value: 'Raporty audytowe i remediation' },
      { label: 'Zakres', value: 'ECM security consulting' }
    ],
    surfaceKicker: 'Perspektywa bezpieczeństwa',
    surfaceValue: 'AUDYT',
    surfaceText: 'Testy, raportowanie, rekomendacje naprawcze i praktyczny feedback dla bezpiecznego wytwarzania oprogramowania.'
  },
  {
    title: '#WLCK',
    expandedTitle: 'WIELICZKA',
    signal: 'OPS 03',
    mode: 'DATA & NET',
    handoff: 'DBA / NETWORK',
    expandedHandoff: 'DATABASE ADMINISTRATOR & NETWORK SPECIALIST',
    chip: 'Fundamenty',
    id: 'ID-ORA9',
    previewLeftLabel: 'OKRES',
    previewLeft: 'Jul 2015 - Aug 2016',
    previewRightLabel: 'MIEJSCE',
    previewRight: 'Wieliczka',
    eyebrow: 'Dane i sieci // Fundamenty operacyjne',
    lead: 'Wczesne doświadczenie operacyjne zbudowało solidną podstawę w pracy z danymi, infrastrukturą lokalną i odpowiedzialnością za stabilność środowisk technicznych.',
    highlights: [
      'Realizował złożone migracje danych w środowiskach Oracle Database.',
      'Projektował i dokumentował mapy topologii sieci dla rozszerzeń systemów.',
      'Zbudował praktyczne zrozumienie integralności danych, administracji sieciowej i pracy blisko infrastruktury.',
      'Wypracował operacyjne nawyki, które później przełożyły się na projektowanie niezawodnych systemów aplikacyjnych.'
    ],
    facts: [
      { label: 'Baza', value: 'Oracle Database (SQL)' },
      { label: 'Narzędzia', value: 'Microsoft Visio' },
      { label: 'Zakres', value: 'Migracje danych, topologia sieci' },
      { label: 'Tryb', value: 'On-site operations' }
    ],
    surfaceKicker: 'Warstwa Fundamentów',
    surfaceValue: 'OPS',
    surfaceText: 'Bazy danych, migracje i topologie sieci jako fundament późniejszej pracy nad systemami aplikacyjnymi.'
  },
  {
    title: '#FE',
    expandedTitle: 'FRONTEND',
    signal: 'UMIEJĘTNOŚĆ 01',
    mode: 'UI',
    handoff: 'UI SYSTEMS',
    expandedHandoff: 'SYSTEMY UI I ARCHITEKTURA FRONTENDU',
    chip: 'Frontend',
    id: 'ID-FRO10',
    previewLeftLabel: 'FOKUS',
    previewLeft: 'React / TypeScript',
    previewRightLabel: 'BUILD',
    previewRight: 'Vite / FSD / MUI',
    eyebrow: 'Frontend // Interfejsy dla złożonych produktów',
    lead: 'Projektuje i rozwija interfejsy, które mają być nie tylko estetyczne, ale przede wszystkim czytelne, szybkie i możliwe do utrzymania w długim cyklu życia produktu.',
    highlights: [
      'Biegła praca w React 18, TypeScript i Next.js przy produktach o dużej liczbie stanów i scenariuszy użytkownika.',
      'Przewidywalna orkiestracja danych i stanu z wykorzystaniem Redux Toolkit oraz RTK Query.',
      'Feature-Sliced Design, responsywne layouty i komponenty MUI dopasowane do wymagań produktu, nie odwrotnie.',
      'Interfejsy projektowane pod czytelność decyzji, wydajność i szybkie diagnozowanie problemów.'
    ],
    facts: [
      { label: 'Rdzeń', value: 'React 18, TypeScript, Next.js' },
      { label: 'Stan', value: 'Redux Toolkit, RTK Query' },
      { label: 'Build', value: 'Vite, FSD, MUI' },
      { label: 'Cel', value: 'Czytelność i utrzymanie' }
    ],
    surfaceKicker: 'Warstwa Kompetencji',
    surfaceValue: 'FRONTEND',
    surfaceText: 'Typowane interfejsy, skalowalne systemy UI i architektura klienta przygotowana na rozwój produktu.'
  },
  {
    title: '#BE',
    expandedTitle: 'BACKEND',
    signal: 'UMIEJĘTNOŚĆ 02',
    mode: 'API',
    handoff: '.NET 8 / NODE',
    expandedHandoff: 'LOGIKA CORE, ARCHITEKTURA I BAZY DANYCH',
    chip: 'Backend',
    id: 'ID-BCK11',
    previewLeftLabel: 'FOKUS',
    previewLeft: '.NET 8 / Node.js',
    previewRightLabel: 'PATTERNS',
    previewRight: 'DDD / CQRS',
    eyebrow: 'Backend // Logika domenowa i dane',
    lead: 'Buduje backendy, które porządkują logikę biznesową, chronią dane i dają produktowi stabilny fundament techniczny.',
    highlights: [
      'Szerokie wykorzystanie .NET 8 i ASP.NET Core do serwisów, w których liczy się wydajność, poprawność i bezpieczeństwo.',
      'Modelowanie danych z EF Core, PostgreSQL, MSSQL i MongoDB, z naciskiem na spójność oraz czytelność warstw.',
      'Granice domenowe i dekompozycja usług stosowane tam, gdzie realnie upraszczają rozwój oraz utrzymanie.',
      'Backendy projektowane pod testowalność, monitoring, diagnozowanie błędów i wsparcie operacyjne.'
    ],
    facts: [
      { label: 'Frameworki', value: '.NET 8, ASP.NET Core, Node.js' },
      { label: 'Bazy', value: 'PostgreSQL, MSSQL, MongoDB' },
      { label: 'Patterny', value: 'DDD, CQRS, EF Core' },
      { label: 'Zakres', value: 'API, silniki, warstwy danych' }
    ],
    surfaceKicker: 'Warstwa Kompetencji',
    surfaceValue: 'BACKEND',
    surfaceText: 'API, logika domenowa, silniki i warstwy danych budowane z myślą o poprawności oraz odporności.'
  },
  {
    title: '#INF',
    expandedTitle: 'PERYMETR DELIVERY',
    signal: 'UMIEJĘTNOŚĆ 03',
    mode: 'SEC-OPS',
    handoff: 'DELIVERY / TOOLS',
    expandedHandoff: 'INFRASTRUCTURE, SECURITY AND DELIVERY FLOW',
    chip: 'Infra',
    id: 'ID-INF12',
    previewLeftLabel: 'FOKUS',
    previewLeft: 'Zakres wdrożeniowy',
    previewRightLabel: 'TOOLS',
    previewRight: 'Docker / AWS / Auth',
    eyebrow: 'Infra // Operacyjna jakość produktu',
    lead: 'Traktuje deployment, hosting, bezpieczeństwo i narzędzia developerskie jako element jakości produktu, a nie osobny etap po zakończeniu implementacji.',
    highlights: [
      'Praktyczna praca z Dockerem, AWS, CI/CD i procesami release w projektach wymagających kontroli wdrożeń.',
      'Dobre zrozumienie uwierzytelniania, bezpieczeństwa API i operacyjnego perymetru systemu.',
      'Budowanie workflow deploymentowych wtedy, gdy ograniczenia projektu wymagają narzędzi szytych pod kontekst.',
      'Dbanie o to, by system był nie tylko napisany, ale też uruchamialny, obserwowalny i utrzymywalny.'
    ],
    facts: [
      { label: 'Platformy', value: 'Docker, AWS, Linux' },
      { label: 'Bezpieczeństwo', value: 'Auth, API security, compliance' },
      { label: 'Dowożenie', value: 'CI/CD, release flow, hosting' },
      { label: 'Tryb', value: 'Operacje gotowe na produkt' }
    ],
    surfaceKicker: 'Warstwa wdrożeniowa',
    surfaceValue: 'INFRA',
    surfaceText: 'Infrastruktura, bezpieczeństwo i tooling domykające odpowiedzialność za cały produkt.'
  },
  {
    title: '#EDU',
    expandedTitle: 'EDUKACJA I CERTY',
    signal: 'KWALIFIKACJA 01',
    mode: 'AKADEMICKIE',
    handoff: 'FORMALNE PODSTAWY',
    expandedHandoff: 'WYKSZTAŁCENIE INŻYNIERSKIE I CERTYFIKATY',
    chip: 'Edukacja',
    id: 'ID-EDU13',
    previewLeftLabel: 'MGR',
    previewLeft: 'Computer Science',
    previewRightLabel: 'KIERUNEK',
    previewRight: 'Doktorat w toku',
    eyebrow: 'Edukacja // Formalne zaplecze',
    lead: 'Formalne wykształcenie inżynierskie stanowi dla niego podstawę pracy praktycznej, uzupełnioną certyfikatami technicznymi i bezpieczeństwa.',
    highlights: [
      'Bachelor of Engineering in Mobile and Web Application Programming, WSEI Kraków, rocznik 2020.',
      'IT Technician, Technikum Łączności nr 14 w Krakowie, rocznik 2016.',
      'Microsoft MTA 98-375 i 98-364 oraz państwowe potwierdzenie kwalifikacji IT Technician.',
      'CV obejmuje również Google Cybersecurity i IBM Full Stack jako certyfikaty wzmacniające praktyczny profil zawodowy.'
    ],
    facts: [
      { label: 'Stopień', value: 'BEng, rocznik 2020' },
      { label: 'Uczelnia', value: 'WSEI Kraków' },
      { label: 'Certy', value: 'Microsoft MTA, IT Technician' },
      { label: 'Profil', value: 'Podstawa inżynierska' }
    ],
    surfaceKicker: 'Podstawa Formalna',
    surfaceValue: 'EDU',
    surfaceText: 'Wykształcenie techniczne wsparte praktyką produktową, bezpieczeństwem i ciągłym rozwojem zawodowym.'
  },
  {
    title: '#COM',
    expandedTitle: 'LIDERSTWO I AKTYWNOŚĆ',
    signal: 'KWALIFIKACJA 02',
    mode: 'WSPÓŁPRACA',
    handoff: 'EVENTS / LEADERSHIP',
    expandedHandoff: 'HACKATHONY, SAMORZĄD I LIDERSTWO ZESPOŁOWE',
    chip: 'Leadership',
    id: 'ID-COM14',
    previewLeftLabel: 'FOKUS',
    previewLeft: 'Leadership / Events',
    previewRightLabel: 'SKALA',
    previewRight: 'Zespół / 100+',
    eyebrow: 'Aktywność // Liderstwo i odpowiedzialność zespołowa',
    lead: 'Doświadczenie organizacyjne i liderskie uzupełnia jego profil techniczny o umiejętność prowadzenia ludzi, komunikacji i spokojnej koordynacji pracy pod presją.',
    highlights: [
      'Współorganizował SheepYourHack i WSEICraft jako lider techniczny oraz mentor.',
      'Zarządzał 20-osobowym zespołem wolontariuszy i koordynował współpracę ze sponsorami.',
      'Pełnił funkcję prezesa i wiceprezesa samorządu studenckiego w latach 2017-2020.',
      'Wypracował spokojny, zadaniowy styl prowadzenia zespołów w środowiskach wysokiej presji.'
    ],
    facts: [
      { label: 'Wydarzenia', value: 'SheepYourHack, WSEICraft' },
      { label: 'Rola', value: 'Tech lead / organizer' },
      { label: 'Skala', value: '20 osób, 100+ uczestników' },
      { label: 'Wątek', value: 'Leadership i mentoring' }
    ],
    surfaceKicker: 'Warstwa Leadershipu',
    surfaceValue: 'LEAD',
    surfaceText: 'Mentoring, organizacja wydarzeń, reprezentacja i odpowiedzialne prowadzenie zespołów.'
  },
  {
    title: '#GDPR',
    expandedTitle: 'ZGODNOŚĆ',
    signal: 'KWALIFIKACJA 03',
    mode: 'REGULACYJNE',
    handoff: 'PRYWATNOŚĆ / POLITYKI',
    expandedHandoff: 'ŚWIADOMOŚĆ SECURITY, PRYWATNOŚCI I ZGODNOŚCI',
    chip: 'Zgodność',
    id: 'ID-GDP15',
    previewLeftLabel: 'ZAKRES',
    previewLeft: 'GDPR / security',
    previewRightLabel: 'PODEJŚCIE',
    previewRight: 'Practical',
    eyebrow: 'Zgodność // Bezpieczeństwo i prywatność',
    lead: 'Warstwa formalna jest przygotowana pod rozmowy rekrutacyjne i współpracę B2B: zgody, referencje oraz spójna komunikacja w języku polskim i angielskim.',
    highlights: [
      'Zgoda na przetwarzanie danych osobowych do celów rekrutacyjnych zgodnie z GDPR / RODO.',
      'Referencje od klientów z uratowanych projektów są dostępne na życzenie.',
      'Treść formalna utrzymywana jest zarówno w języku polskim, jak i angielskim.',
      'Dokumentacja pozostaje spójna z oczekiwaniami rekrutacyjnymi, prywatnością danych i standardami formalnej komunikacji.'
    ],
    facts: [
      { label: 'Regulacja', value: 'EU GDPR 2016/679' },
      { label: 'Status', value: 'Zgoda aktywna' },
      { label: 'Referencje', value: 'Dostępne na życzenie' },
      { label: 'Języki', value: 'PL / EN' }
    ],
    surfaceKicker: 'Warstwa Formalna',
    surfaceValue: 'GDPR',
    surfaceText: 'Zgoda GDPR, referencje i formalna gotowość do procesu rekrutacyjnego lub współpracy B2B.'
  }
];

export const PL_FEATURED_INTRO_CARD: CvCardContent = {
  title: 'DOSTĘP',
  expandedTitle: 'WĘZEŁ WEJŚCIOWY MANIFOLD',
  signal: 'BOOT 00',
  mode: 'BRAMA',
  handoff: 'AUTO ENTER',
  expandedHandoff: 'WEKTOR WEJŚCIA // INICJALIZUJ GŁÓWNY ŚWIAT',
  chip: 'Brama',
  id: 'ID-BOOT',
  previewLeftLabel: 'STATUS',
  previewLeft: 'Oczekiwanie na handshake',
  previewRightLabel: 'AKCJA',
  previewRight: 'Inicjalizacja',
  eyebrow: 'Węzeł wejścia // Przejście ze splasha do głównej sceny manifold',
  lead: 'Karta wejściowa pełni rolę świadomego progu między ekranem startowym a właściwym portfolio, prowadząc użytkownika do głównej nawigacji.',
  highlights: [
    'Aktywuje widok świata i odblokowuje warstwy nawigacyjne.',
    'Przełącza kartę głównego fokusu z profilu startowego na właściwą prezentację portfolio.',
    'Buduje wizualne przejście między ładowaniem a główną sceną.',
    'Utrzymuje start jako czytelny, kontrolowany i intencjonalny moment wejścia.'
  ],
  facts: [
    { label: 'Tryb', value: 'Intro / przejście' },
    { label: 'Trigger', value: 'Wskaźnik lub klawiatura' },
    { label: 'Stan', value: 'Sekwencja boot gotowa' },
    { label: 'Efekt', value: 'Wejście do manifold' }
  ],
  surfaceKicker: 'Powierzchnia startu',
  surfaceValue: 'WEJŚCIE',
  surfaceText: 'Dedykowany próg wejścia, który po aktywacji przechodzi w główną prezentację portfolio.'
};

export const PL_BUNDLE: ManifoldLocaleBundle = {
  audio: {
    enterZenAria: 'Włącz tryb zen',
    exitZenAria: 'Wyjdź z trybu zen',
    exitZenLabel: 'Wyjdź zen',
    pauseAria: 'Wstrzymaj muzykę w tle',
    pauseLabel: 'Pauza',
    playAria: 'Odtwórz muzykę w tle',
    playLabel: 'GRAJ',
    zenLabel: 'Zen'
  },
  document: {
    cvDownloadFileName: 'krzysztof_kaim_resume.pdf',
    cvDownloadHref: '/files/krzysztof_kaim_resume.pdf',
    description:
      'Krzysztof Kaim to inżynier oprogramowania full-stack specjalizujący się w React, TypeScript, .NET, systemach MES, integracjach ERP i projektach wymagających odpowiedzialności architektonicznej.',
    lang: 'pl',
    title: 'Krzysztof Kaim Software Engineer | React, .NET, MES'
  },
  sectionLabels: {
    PROFILE: 'PROFIL',
    DEPLOYMENTS: 'WDROŻENIA',
    OPERATIONS: 'OPERACJE',
    CAPABILITIES: 'UMIEJĘTNOŚCI',
    CREDENTIALS: 'KWALIFIKACJE'
  },
  ui: {
    additionalOptions: 'Opcje dodatkowe',
    additionalOptionsHint: '[ BLOKADA ]',
    aboutLabel: 'SYSTEM',
    aboutCloseLabel: 'ZAMKNIJ',
    aboutContent: {
      stack: 'Silnik Manifold (DOM/WebGL2/WebGPU), TypeScript, Three.js (Renderowanie Scen), Matematyka macierzowa Tesseraktu 4D, WebWorker Physics, Object Pooling, CSS Typed OM.',
      trivia: 'Hybrydowy renderer WebGL/WebGPU i DOM wykorzystujący projekcję Tesserakt 4D oraz homografię CSS matrix3d. Pętla renderująca zoptymalizowana pod niski narzut GC (integer hashing, object pooling). Symulacje płynów, fizyka i analiza FFT izolowane w WebWorkers. System integruje adaptacyjny frame-pacing oraz dynamiczne skalowanie DPR.',
      build: 'SYGNATURA KOMPILACJI',
      runtime: 'STATUS OPERACYJNY',
      authorTime: 'STATUS AUTORA',
      visitor: 'GOŚĆ',
      authorStatus: {
        sleeping: 'ŚPI',
        breakfast: 'JE ŚNIADANIE',
        working: 'PRACUJE / KODUJE',
        chillingPostWork: 'ODPOCZYWA PO PRACY',
        walking: 'NA SPACERZE',
        chilling: 'RELAKSUJE SIĘ'
      }
    },
    cardHighlights: 'Najważniejsze',
    cardSnapshot: 'Podsumowanie',
    clickCardForDetails: 'Kliknij kartę po szczegóły',
    closeNavigationAria: 'Zamknij nawigację',
    coord: 'WSPÓŁ',
    cvDownloadAria: 'Pobierz CV',
    cvLabel: 'CV',
    contactLabel: 'kontakt',
    contactAria: 'Wyślij e-mail na krzysztof@kaim.dev',
    contactEmail: 'krzysztof@kaim.dev',
    enteringAutomatically: 'Automatyczne wejście',
    entryPoint: 'Punkt wejścia',
    fps: 'FPS',
    focusLock: 'TRYB FOKUS',
    hudHintLineOne: 'JESTEM KLIKALNY',
    hudHintLineTwo: 'MENU SCENY',
    hudTravelLineOne: 'PRZEJŚCIE DO',
    fullRate: 'PEŁNA WYDAJNOŚĆ',
    fullRateBoost: 'PEŁNA WYDAJNOŚĆ+',
    jumpAcrossCards: 'Przeskocz między kartami',
    jumpAcrossSections: 'Przeskocz między sekcjami',
    localeLabel: 'PL',
    localeSwitchToEnglish: 'Przełącz język na angielski',
    localeSwitchToPolish: 'Przełącz język na polski',
    menuAriaLabel: 'Wybór trybu',
    mode2D: 'TRYB 2D',
    mode3D: 'TRYB 3D',
    mode4D: 'TRYB 4D',
    currentModeAriaPrefix: 'Aktualny tryb manifold',
    nextCardAria: 'Następna karta',
    nextCardSectionAria: 'Pokaż następną sekcję karty',
    nextPageAria: 'Następna strona',
    orbitToggle: 'ORBITY',
    orbitToggleActive: 'Orbity: wł.',
    orbitToggleInactive: 'Orbity: wył.',
    orbitToggleAria: 'Przełącz orbity',
    previousPageAria: 'Poprzednia strona',
    previousCardAria: 'Poprzednia karta',
    powerSave: 'OSZCZĘDZANIE',
    perf: 'TRYB',
    policyLabel: 'POLITYKA PRYWATNOŚCI',
    policyCloseLabel: 'ZAMKNIJ POLITYKĘ',
    policyContent: {
      intro:
        'POLITYKA PRYWATNOŚCI\n\nOstatnia aktualizacja: 29 kwietnia 2026 r.\n\nTa strona jest osobistym doświadczeniem webowym działającym w domenie kaim.dev. Została zaprojektowana tak, aby działać głównie w przeglądarce użytkownika i zbierać możliwie mało informacji.',
      processingTitle: 'PRZETWARZANIE LOKALNE',
      processingBody:
        'Renderowanie, stan interakcji, diagnostyka, sprawdzanie możliwości GPU/przeglądarki oraz efekty wizualne działają lokalnie w przeglądarce. Informacje debugowe o urządzeniu lub przeglądarce pozostają na urządzeniu użytkownika, chyba że telemetria zostanie wyraźnie włączona.',
      storageTitle: 'PAMIĘĆ PRZEGLĄDARKI',
      storageBody:
        'Strona używa localStorage do zapamiętania wybranego języka i widoczności przewodnika orbitalnego oraz sessionStorage dla krótkotrwałej flagi przejścia językowego. Te wartości służą wyłącznie zachowaniu spójności interfejsu. Strona nie używa plików cookies.',
      audioTitle: 'ODTWARZANIE AUDIO',
      audioBody:
        'Dźwięk tła jest ładowany dopiero po użyciu przełącznika audio. Strona nie żąda dostępu do mikrofonu ani kamery.',
      telemetryTitle: 'OPCJONALNA TELEMETRIA',
      telemetryBody:
        'Jeżeli dla tej wersji wdrożenia skonfigurowano endpoint telemetryczny, aplikacja może wysyłać ograniczone zdarzenia techniczne, takie jak nazwa zdarzenia, znacznik czasu, aktualna ścieżka oraz niewielkie dane interakcji, np. zmiana trybu lub uruchomienie audio. Dane te służą wyłącznie zrozumieniu i poprawie działania strony.',
      performanceTitle: 'ANALITYKA WYDAJNOŚCI',
      performanceBody:
        'Strona może używać Cloudflare Web Analytics / Real User Measurements (RUM) do pomiaru rzeczywistej szybkości ładowania i niezawodności. Po włączeniu tej funkcji Cloudflare może załadować lub automatycznie dodać niewielki skrypt JavaScript, który zbiera pomiary wydajności przeglądarki, takie jak czas ładowania strony, navigation timing, resource timing, paint timing i Core Web Vitals, wraz z ograniczonym kontekstem strony, takim jak aktualna ścieżka lub referrer. Ten pomiar wydajności służy diagnozowaniu i poprawie szybkości, renderowania oraz odczuwalnej jakości działania strony. Strona nie wykorzystuje tych danych do reklam, profilowania między stronami ani identyfikowania użytkowników. Podstawą prawną, tam gdzie jest wymagana, jest prawnie uzasadniony interes operatora polegający na utrzymaniu i poprawie jakości technicznej strony.',
      contactTitle: 'KONTAKT',
      contactBody:
        'Link kontaktowy dopasowuje się do aktywnego języka ("contact" albo "kontakt"). Aby ograniczyć automatyczne zbieranie adresu przez scrapery i boty, adres nie jest przechowywany jako statyczny widoczny tekst i jest wstawiany do protokołu mailto dopiero po interakcji użytkownika.',
      rightsTitle: 'TWOJE PRAWA',
      rightsBody:
        'Tam, gdzie zastosowanie ma RODO, możesz żądać dostępu, sprostowania, usunięcia, ograniczenia przetwarzania lub sprzeciwu wobec przetwarzania danych osobowych związanych z tą stroną. Kontakt jest możliwy przez akcję kontaktową dostępną na stronie.'
    },
    privacyLabel: 'DEBUG OVERLAY',
    privacyCloseLabel: 'UKRYJ DEBUG',
    privacyContent: '',
    return: 'POWRÓT DO STARTU',
    sceneNavigation: 'Nawigacja Sceny',
    returnToEntryAria: 'Wyjdź i wróć do ekranu startowego',
    scrollArrowsToExit: 'Przewijaj / Strzałki, aby wyjść',
    scrollArrowsWsToMove: 'Przewijaj / Strzałki / W S, aby się poruszać',
    scrollToExit: 'Przewijaj, aby wyjść',
    scrollVelocity: 'PRĘDKOŚĆ SCROLLU',
    scrollToBrowse: 'Przewijaj, aby przeglądać',
    scrollToExitCard: 'Przewiń, aby wyjść z karty',
    scrollPrompt: 'SCROLL',
    sectionKicker: 'Sekcja',
    systemLoader: 'System Loader',
    topbarRole: 'inżynier oprogramowania full-stack / lead architect',
    twoDSection: 'Sekcja 2D',
    systemOverlayToggleAria: 'Przełącz overlay systemowy',
    systemOverlayToggleActive: 'Overlay systemowy: włączony',
    systemOverlayToggleInactive: 'Overlay systemowy: wyłączony',
    systemOverlayOn: 'OVERLAY: WŁĄCZONY',
    systemOverlayOff: 'OVERLAY: WYŁĄCZONY',
    zenLock: 'TRYB ZEN'
  }
};
