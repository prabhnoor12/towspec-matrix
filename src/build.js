const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const SITE_URL = 'https://townmatrix.com';
const SITE_NAME = 'TownMatrix';

const vehicles = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'vehicles.json'), 'utf8'));
const trailers = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'trailers.json'), 'utf8'));
const rawCss = fs.readFileSync(path.join(SRC_DIR, 'styles.css'), 'utf8');
const rawJs = fs.readFileSync(path.join(SRC_DIR, 'app.js'), 'utf8');

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function minifyJs(js) {
  return js
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//'))
    .join('\n');
}

const criticalCss = minifyCss(rawCss);
const minifiedJs = minifyJs(rawJs);
const jsHash = crypto.createHash('sha256').update(minifiedJs).digest('hex').slice(0, 8);
const hashedJsFilename = `app.${jsHash}.js`;

const fmt = new Intl.NumberFormat('en-US');

// Pre-build a compact global datalist for the header Quick-Jump <search> bar
const quickJumpOptionsHtml = vehicles
  .filter((v) => v.year === 2024 || v.year === 2025 || v.year === 2020 || v.year === 2018)
  .map((v) => `<option value="${v.year} ${v.brand} ${v.model} (${v.trim})" data-slug="${v.slug}"></option>`)
  .join('');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writePage(relUrlPath, htmlContent, sitemapUrls) {
  const cleanRel = relUrlPath.replace(/^\/+|\/+$/g, '');
  const outDir = cleanRel ? path.join(DIST_DIR, cleanRel) : DIST_DIR;
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), htmlContent, 'utf8');
  const canonicalUrl = cleanRel ? `${SITE_URL}/${cleanRel}/` : `${SITE_URL}/`;
  sitemapUrls.push(canonicalUrl);
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function calcRealWorldMaxTrailer(v, assumedCabinAndHitchLbs = 550, tongueRatio = 0.13) {
  const availForTongue = Math.max(0, v.maxPayloadLbs - assumedCabinAndHitchLbs);
  const payloadCapped = Math.floor(availForTongue / tongueRatio);
  return Math.min(v.maxTowLbs, payloadCapped);
}

// Live SVG Truck + Trailer Rig Blueprint Visualizer
function renderRigBlueprintSvg(v, defaultTrailer, defaultTongueLbs) {
  return `
  <div class="rig-schematic-box" aria-label="Live Rig Weight & Squat Visualizer">
    <svg class="rig-svg" viewBox="0 0 760 130" role="img" aria-labelledby="rig-svg-title">
      <title id="rig-svg-title">Dynamic Tow Vehicle, Tongue Downforce, and Trailer Axle Load Schematic</title>
      <!-- Ground Line -->
      <line x1="15" y1="114" x2="745" y2="114" stroke="#64748b" stroke-width="2" stroke-dasharray="6 4"/>
      
      <!-- TOW VEHICLE SILHOUETTE -->
      <g>
        <path d="M40 88 L40 58 L95 56 L128 32 L215 32 L215 58 L285 58 L285 88 Z" fill="#1e3a8a" stroke="#38bdf8" stroke-width="2"/>
        <rect x="134" y="37" width="35" height="18" fill="#93c5fd" opacity="0.8"/>
        <rect x="175" y="37" width="32" height="18" fill="#93c5fd" opacity="0.8"/>
        <!-- Cab + Bed Load Label -->
        <rect x="108" y="64" width="166" height="20" rx="3" fill="#0f172a"/>
        <text id="svg-cab-cargo-txt" x="191" y="78" fill="#f8fafc" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">Cab+Bed: 500 lbs</text>
        <!-- Wheels -->
        <circle cx="88" cy="96" r="17" fill="#1e293b" stroke="#94a3b8" stroke-width="4"/>
        <circle cx="242" cy="96" r="17" fill="#1e293b" stroke="#94a3b8" stroke-width="4"/>
      </g>

      <!-- DYNAMIC HITCH & TONGUE DOWNFORCE GROUP (Dips with Payload %) -->
      <g id="svg-hitch-group" transform="translate(0, 2)">
        <line x1="285" y1="84" x2="365" y2="84" stroke="#f59e0b" stroke-width="5"/>
        <circle cx="322" cy="84" r="6" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>
        <!-- Downforce Vector Arrow -->
        <line x1="322" y1="36" x2="322" y2="74" stroke="#ef4444" stroke-width="3"/>
        <polygon points="315,71 329,71 322,80" fill="#ef4444"/>
        <rect id="svg-tongue-pill" x="255" y="12" width="142" height="22" rx="3" fill="#16a34a"/>
        <text id="svg-tongue-txt" x="326" y="27" fill="#ffffff" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">Tongue: ${fmt.format(defaultTongueLbs)} lbs</text>
      </g>

      <!-- TRAVEL TRAILER SILHOUETTE -->
      <g>
        <rect x="365" y="24" width="245" height="66" rx="8" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
        <rect x="385" y="36" width="44" height="22" rx="2" fill="#bae6fd" opacity="0.75"/>
        <rect x="530" y="36" width="52" height="22" rx="2" fill="#bae6fd" opacity="0.75"/>
        <rect x="415" y="64" width="155" height="20" rx="3" fill="#0f172a"/>
        <text id="svg-trailer-txt" x="492" y="78" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">Trailer GTW: ${fmt.format(defaultTrailer)} lbs</text>
        <!-- Tandem Trailer Axles -->
        <circle cx="478" cy="96" r="16" fill="#1e293b" stroke="#94a3b8" stroke-width="4"/>
        <circle cx="518" cy="96" r="16" fill="#1e293b" stroke="#94a3b8" stroke-width="4"/>
      </g>

      <!-- Live Stance Status Banner inside SVG -->
      <rect x="622" y="34" width="128" height="52" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="686" y="52" fill="#94a3b8" font-family="monospace" font-size="9.5" text-anchor="middle">GVWR RATING</text>
      <text x="686" y="72" fill="#f8fafc" font-family="monospace" font-size="13" font-weight="bold" text-anchor="middle">${fmt.format(v.gvwrLbs)} LBS</text>
    </svg>
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;font-family:var(--font-mono);font-size:0.75rem;margin-block-start:0.35rem;color:var(--text-muted);">
      <span>STANCE TELEMETRY: <strong id="svg-squat-badge" style="color:var(--text);">LEVEL STANCE</strong></span>
      <span>Curb: ${fmt.format(v.curbWeightLbs)} lbs • Factory Max Payload: ${fmt.format(v.maxPayloadLbs)} lbs</span>
    </div>
  </div>`;
}

function renderAdUnit(slotType, slotId, initialCreativeIdx = 0) {
  const creatives = [
    {
      sponsor: 'CURT Manufacturing • CPM Bid: $64.20',
      title: 'CURT TruTrack™ 4P Weight Distribution Hitch w/ Active Sway Control',
      desc: 'Stop trailer sway and level rear axle sag. Heavy-duty 10,000 - 15,000 lb GTW ratings.',
      cta: 'Check Truck Fitment →'
    },
    {
      sponsor: 'LightStream Auto & RV Finance • CPM Bid: $84.00',
      title: 'Fixed-Rate RV, Camper & Pickup Loans from 6.49% APR w/ AutoPay',
      desc: 'Zero appraisal fees. Fund up to $100,000 directly into your bank account today.',
      cta: 'Calculate Payment →'
    },
    {
      sponsor: 'Progressive Commercial & RV • CPM Bid: $78.50',
      title: 'Truck & Travel Trailer Combined Policy + 24/7 Heavy-Duty Roadside',
      desc: 'Covers emergency hitch extraction, tire blowouts, and full RV replacement cost.',
      cta: 'Get 60-Sec Rate →'
    },
    {
      sponsor: 'Air Lift Suspension • CPM Bid: $56.80',
      title: 'LoadLifter 5000™ Ultimate Air Spring Kit for Half-Ton & HD Pickups',
      desc: 'Eliminate squat and restore steering axle weight when towing heavy tongue loads.',
      cta: 'Find Your Kit →'
    }
  ];
  const ad = creatives[initialCreativeIdx % creatives.length];

  if (slotType === 'anchor') {
    return `
  <aside class="ad-slot-anchor" data-ad-slot="${slotId}" aria-label="Sponsored Advertisement">
    <div style="max-inline-size:1280px;inline-size:100%;display:flex;align-items:center;justify-content:space-between;gap:1rem;color:#f8fafc;font-size:0.82rem;">
      <div>
        <span style="background:#0284c7;color:#fff;font-family:var(--font-mono);font-size:0.68rem;padding:0.1rem 0.35rem;font-weight:700;margin-inline-end:0.5rem;">AD • <span class="js-ad-refresh-count">Auction #1</span></span>
        <strong class="js-ad-title" style="color:#fff;">${ad.title}</strong>
        <span class="js-ad-desc" style="color:#cbd5e1;margin-inline-start:0.5rem;">${ad.desc}</span>
      </div>
      <a href="#rig-calculator" class="ad-creative-cta js-ad-cta" style="white-space:nowrap;background:#38bdf8;color:#0f172a;">${ad.cta}</a>
    </div>
  </aside>`;
  }

  const sizeClass =
    slotType === 'leaderboard'
      ? 'ad-slot-leaderboard'
      : slotType === 'skyscraper'
      ? 'ad-slot-skyscraper'
      : 'ad-slot-midtool';

  const dimLabel =
    slotType === 'leaderboard'
      ? '728x90 / Resp Leaderboard'
      : slotType === 'skyscraper'
      ? '300x600 Sticky Rail'
      : '300x250 Action Unit';

  return `
  <aside class="ad-container ${sizeClass}" data-ad-slot="${slotId}" aria-label="Advertisement">
    <div class="ad-label-bar">
      <span>Sponsored • ${dimLabel} (Zero-CLS)</span>
      <span class="js-ad-refresh-count">Auction #1</span>
    </div>
    <div class="ad-creative-mock">
      <div>
        <div class="ad-creative-header">
          <span class="js-ad-sponsor">${ad.sponsor}</span>
          <span>IAB Active-View</span>
        </div>
        <div class="ad-creative-title js-ad-title">${ad.title}</div>
        <p class="ad-creative-desc js-ad-desc">${ad.desc}</p>
      </div>
      <a href="#rig-calculator" class="ad-creative-cta js-ad-cta">${ad.cta}</a>
    </div>
    <div class="ad-refresh-progress" title="35s Active-View Ad Refresh Timer">
      <div class="ad-refresh-bar"></div>
    </div>
  </aside>`;
}

function renderLayout({ title, description, canonicalPath, breadcrumbs, schemaJson, mainContent, sidebarLinks = [], totalPagesCount = 2000 }) {
  const canonicalUrl = canonicalPath ? `${SITE_URL}/${canonicalPath.replace(/^\/+|\/+$/g, '')}/` : `${SITE_URL}/`;

  const breadcrumbHtml = breadcrumbs && breadcrumbs.length
    ? `<nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          ${breadcrumbs
            .map((b, i) =>
              i === breadcrumbs.length - 1
                ? `<li aria-current="page"><strong>${b.label}</strong></li>`
                : `<li><a href="${b.url}">${b.label}</a></li>`
            )
            .join('')}
        </ol>
      </nav>`
    : '';

  const breadcrumbSchema = breadcrumbs && breadcrumbs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: b.label,
          item: b.url.startsWith('http') ? b.url : `${SITE_URL}${b.url}`
        }))
      }
    : null;

  const schemas = [breadcrumbSchema, ...(Array.isArray(schemaJson) ? schemaJson : schemaJson ? [schemaJson] : [])].filter(Boolean);

  const speculationRulesJson = JSON.stringify({
    prefetch: [
      {
        tag: 'matrix-prefetch',
        where: {
          and: [{ href_matches: '/*' }, { not: { href_matches: '/sitemap.xml' } }]
        },
        eagerness: 'moderate'
      }
    ],
    prerender: [
      {
        tag: 'matrix-prerender',
        where: {
          and: [{ href_matches: '/*' }, { not: { href_matches: '/sitemap.xml' } }]
        },
        eagerness: 'conservative'
      }
    ]
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <script>try{document.querySelector('meta[name="color-scheme"]').content=localStorage.getItem("color-scheme")??"light dark"}catch(e){}</script>
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="dns-prefetch" href="//securepubads.g.doubleclick.net">
  <link rel="dns-prefetch" href="//pagead2.googlesyndication.com">
  <style>${criticalCss}</style>
  <link rel="expect" href="#hero-panel" blocking="render">
  ${schemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n  ')}
  <script type="speculationrules">${speculationRulesJson}</script>
</head>
<body>
  <div class="adops-bar" role="region" aria-label="Publisher Ad-Ops Telemetry">
    <div class="adops-inner">
      <div><strong>AD-OPS ENGINE:</strong> ${fmt.format(totalPagesCount)} Programmatic Pages • Prebid Active-View 35s Refresh</div>
      <div class="adops-metrics">
        <span class="adops-pill live-dot">Status: <strong id="hud-view-state">ACTIVE VIEW (TIMER RUNNING)</strong></span>
        <span class="adops-pill">Impressions: <strong id="hud-impressions">4</strong></span>
        <span class="adops-pill">RPM: <strong>$64.50</strong></span>
        <span class="adops-pill">Session Yield: <strong id="hud-revenue">$0.26</strong></span>
      </div>
    </div>
  </div>

  <header class="site-header">
    <div class="header-inner">
      <a href="/" class="brand-logo">
        <span>TOWNMATRIX</span>
        <span class="brand-badge">2015–2026 SAE J2807</span>
      </a>
      <div class="header-tools">
        <search class="quick-search-box" aria-label="Quick Jump to Any Vehicle">
          <label for="global-vehicle-jump" class="visually-hidden">Quick jump to truck or SUV</label>
          <input type="search" id="global-vehicle-jump" list="global-vehicle-datalist" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="go" placeholder="⚡ Quick Jump: Type truck/SUV...">
          <datalist id="global-vehicle-datalist">${quickJumpOptionsHtml}</datalist>
        </search>
        <nav class="site-nav" aria-label="Primary Navigation">
          <a href="/">All (${vehicles.length})</a>
          <a href="/years/2025/">2025</a>
          <a href="/years/2024/">2024</a>
          <a href="/years/2021/">2021</a>
          <a href="/years/2018/">2018</a>
          <a href="/trailers/8000-lb-full-size-travel-trailers/">8K Campers</a>
          <a href="/brands/ford/">Ford</a>
          <a href="/brands/chevrolet/">Chevy</a>
          <a href="/brands/toyota/">Toyota</a>
          <a href="/tools/cat-scale-calculator/">CAT Scale</a>
          <a href="/tools/altitude-mountain-towing/">Mountain Grade</a>
          <a href="/tools/tow-checklist/">Tow Checklist</a>
          <button type="button" id="btn-open-garage" class="garage-btn" aria-label="Open My Garage shortlist">📌 My Garage (<span id="garage-count">0</span>)</button>
          <button type="button" id="theme-toggle-btn" class="theme-btn" aria-label="Switch color scheme">☾ Dark</button>
        </nav>
      </div>
    </div>
  </header>

  ${breadcrumbHtml}

  <div style="padding: 0 1rem;">
    ${renderAdUnit('leaderboard', 'top-leaderboard', 0)}
  </div>

  <div class="layout-shell">
    <main id="main-content">
      ${mainContent}
      <section class="sister-widget deferred-section" aria-label="Sister Engineering Portals">
        <h3 style="margin:0;font-size:0.95rem;">🔗 Complete Your RV, Garage &amp; Off-Grid Setup</h3>
        <div class="sister-grid">
          <a class="sister-card" href="https://wattsurgematrix.com" rel="noopener"><strong>🔋 WattSurgeMatrix.com</strong>Boondocking in your trailer? Check if your EcoFlow/Jackery/Honda runs the RV AC &amp; Starlink →</a>
          <a class="sister-card" href="https://slabyardmatrix.com" rel="noopener"><strong>🧱 SlabYardMatrix.com</strong>Building a 12×35 concrete or gravel RV parking pad? Calculate exact yards, bags &amp; tons →</a>
          <a class="sister-card" href="https://wiresizematrix.com" rel="noopener"><strong>⚡ WireSizeMatrix.com</strong>Installing a 30A TT-30 or 50A NEMA 14-50 RV pedestal at home? Size exact NEC wire gauge →</a>
          <a class="sister-card" href="https://minisplitbtumatrix.com" rel="noopener"><strong>❄️ MiniSplitBTUMatrix.com</strong>Cooling a parked RV, barn, or detached tow-rig garage? Size exact mini-split BTU →</a>
        </div>
      </section>
    </main>

    <aside class="ad-rail-sticky" aria-label="Sidebar Calculations & Sponsored Units">
      ${renderAdUnit('skyscraper', 'sidebar-skyscraper', 1)}
      <div class="panel" style="margin:0;">
        <h3 style="margin-block-start:0;">Browse by Model Year</h3>
        <div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-block-end:0.85rem;">
          ${[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015]
            .map((y) => `<a href="/years/${y}/" class="year-pill">${y}</a>`)
            .join('')}
        </div>
        <h3 style="margin-block-start:0;">High-Intent Trailer Brackets</h3>
        <ul style="padding-inline-start:1.1rem;margin:0;font-size:0.82rem;display:grid;gap:0.35rem;">
          ${trailers
            .map(
              (t) =>
                `<li><a href="/trailers/${t.slug}/">${t.title}</a> <span style="color:var(--text-muted);font-family:var(--font-mono);">(${fmt.format(t.tongueWeightLbs)} lb tongue)</span></li>`
            )
            .join('')}
        </ul>
        ${
          sidebarLinks.length
            ? `<h3 style="margin-block-start:1rem;">Direct Rival Matchups</h3>
               <ul style="padding-inline-start:1.1rem;margin:0;font-size:0.8rem;display:grid;gap:0.35rem;">
                 ${sidebarLinks.map((l) => `<li><a href="${l.url}">${l.label}</a></li>`).join('')}
               </ul>`
            : ''
        }
      </div>
    </aside>
  </div>

  <footer class="site-footer">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;">
      <div>
        <strong>${SITE_NAME} — 2015–2026 Programmatic SAE J2807 Towing, Payload & GVWR Matrix</strong>
        <p style="margin:0.35rem 0 0;">Built with 100% Pure Static HTML, Zero-CLS CSS Containment, Speculation Rules Prerendering, and Client-Side Vanilla JS. Always verify your specific VIN yellow door-jamb sticker before towing.</p>
      </div>
      <div style="font-family:var(--font-mono);font-size:0.76rem;">
        <div>Total Indexed Matrix Pages: <strong>${fmt.format(totalPagesCount)} Static HTML Endpoints</strong></div>
        <div><a href="/about/">Methodology & SAE J2807</a> • <a href="/privacy-policy/">Privacy Policy</a> • <a href="/terms/">Terms & Safety Disclaimer</a> • <a href="/contact/">Contact</a> • <a href="/sitemap.xml">XML Sitemap</a></div>
      </div>
    </div>
  </footer>

  ${renderAdUnit('anchor', 'bottom-sticky-anchor', 2)}

  <div class="binder-backdrop" id="garage-backdrop"></div>
  <aside class="binder-drawer" id="garage-drawer" aria-label="My Garage and Trailer Shortlist">
    <div style="display:flex;justify-content:space-between;align-items:center;border-block-end:2px solid var(--text);padding-block-end:0.6rem;margin-block-end:0.75rem;">
      <strong style="font-family:var(--font-mono);font-size:0.95rem;">📌 My Garage Shortlist</strong>
      <button type="button" id="btn-close-garage" class="theme-btn">✕ Close</button>
    </div>
    <p style="font-size:0.8rem;color:var(--text-muted);margin-block-start:0;">Saved locally in your browser so you can compare your shortlisted trucks &amp; trailers right on the dealership lot.</p>
    <div style="margin-block-end:0.75rem;">
      <a href="/tools/garage-compare/" class="garage-btn" style="text-decoration:none;inline-size:100%;justify-content:center;">Compare Saved Trucks Side-by-Side →</a>
    </div>
    <div id="garage-items-list"></div>
  </aside>

  <script defer src="/assets/${hashedJsFilename}"></script>
</body>
</html>`;
}

// Generate 1,500+ Head-to-Head Comparison Pairs (Same-year category rivals + cross-year evolution)
function generateComparisonPairs() {
  const pairs = [];
  const seen = new Set();

  for (const v of vehicles) {
    // 1. Top 3 closest same-year, same-category rivals from competing brands
    const sameYearRivals = vehicles
      .filter(
        (other) =>
          other.slug !== v.slug &&
          other.year === v.year &&
          other.category === v.category &&
          other.brand !== v.brand
      )
      .sort((a, b) => Math.abs(a.maxTowLbs - v.maxTowLbs) - Math.abs(b.maxTowLbs - v.maxTowLbs))
      .slice(0, 3);

    // 2. Same-year sibling engine comparison (e.g. F-150 3.5L EcoBoost vs F-150 5.0L V8)
    const sameBrandSibling = vehicles
      .filter(
        (other) =>
          other.slug !== v.slug &&
          other.year === v.year &&
          other.brand === v.brand &&
          other.model === v.model
      )
      .slice(0, 1);

    for (const r of [...sameYearRivals, ...sameBrandSibling]) {
      const sortedSlugs = [v.slug, r.slug].sort();
      const key = sortedSlugs.join('__');
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({
          slug: `${v.slug}-vs-${r.slug}`,
          a: v,
          b: r
        });
      }
    }
  }
  return pairs;
}

function buildVehiclePages(comparisonPairs, sitemapUrls, totalPagesCount) {
  for (const v of vehicles) {
    const fullTitle = `${v.year} ${v.brand} ${v.model} (${v.trim})`;
    const realMaxTrailer = calcRealWorldMaxTrailer(v, 550, 0.13);
    const defaultTrailer = Math.round(Math.min(v.maxTowLbs * 0.75, 7500) / 100) * 100;
    const defaultTongueLbs = Math.round(defaultTrailer * 0.13);

    // Find all model years (2015-2026) of this exact vehicle trim for the Year Switcher Bar
    const modelYearHistory = vehicles
      .filter((other) => other.brand === v.brand && other.model === v.model && other.trim === v.trim)
      .sort((a, b) => b.year - a.year);

    const myComparisons = comparisonPairs
      .filter((p) => p.a.slug === v.slug || p.b.slug === v.slug)
      .slice(0, 8);

    const brandSiblings = vehicles
      .filter((other) => other.brand === v.brand && other.year === v.year && other.slug !== v.slug)
      .slice(0, 6);

    const categoryPeers = vehicles
      .filter((other) => other.category === v.category && other.year === v.year && other.slug !== v.slug)
      .slice(0, 8);

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `What is the towing capacity and payload of the ${fullTitle}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `The ${fullTitle} powered by the ${v.engine} (${v.horsepower} hp / ${v.torqueLbFt} lb-ft) has a maximum SAE J2807 towing capacity of ${fmt.format(v.maxTowLbs)} lbs, a maximum payload capacity of ${fmt.format(v.maxPayloadLbs)} lbs, a GVWR of ${fmt.format(v.gvwrLbs)} lbs, and a GCWR of ${fmt.format(v.gcwrLbs)} lbs.`
          }
        },
        {
          '@type': 'Question',
          name: `What is the real-world camper weight the ${v.year} ${v.brand} ${v.model} can safely tow without exceeding payload?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `With 550 lbs of passengers, bed cargo, and a weight-distribution hitch, the ${fullTitle} has ${fmt.format(Math.max(0, v.maxPayloadLbs - 550))} lbs of remaining payload for trailer tongue weight. At a standard 13% travel trailer tongue ratio, its payload-limited maximum loaded trailer weight is ${fmt.format(realMaxTrailer)} lbs.`
          }
        }
      ]
    };

    const mainContent = `
      <article id="hero-panel" class="panel isolated-widget">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.5rem;margin-block-end:0.35rem;">
          <span class="brand-badge">${v.year} MODEL YEAR • ${v.category} • ${v.drivetrain} • ${v.axleRatio} Axle</span>
          <span style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted);">Engine: ${v.engine} (${v.horsepower} HP / ${v.torqueLbFt} lb-ft)</span>
        </div>
        <h1>${fullTitle} Towing Capacity, Payload & GVWR Matrix</h1>
        <p class="subtitle">Instant SAE J2807 towing vs. payload bottleneck analyzer. Test real-world camper tongue weight, passengers, and bed cargo against factory GVWR (${fmt.format(v.gvwrLbs)} lbs) and GCWR (${fmt.format(v.gcwrLbs)} lbs) ceilings.</p>

        ${
          modelYearHistory.length > 1
            ? `<div class="year-pill-bar" role="navigation" aria-label="Switch Model Year for ${v.brand} ${v.model}">
                 <strong style="font-family:var(--font-mono);font-size:0.74rem;margin-inline-end:0.25rem;">MODEL YEARS:</strong>
                 ${modelYearHistory
                   .map(
                     (ym) =>
                       `<a href="/towing/${ym.slug}/" class="year-pill ${ym.year === v.year ? 'active' : ''}" ${
                         ym.year === v.year ? 'aria-current="page"' : ''
                       }>${ym.year}</a>`
                   )
                   .join('')}
               </div>`
            : ''
        }

        <div class="spec-kpi-grid">
          <div class="kpi-box highlight">
            <span class="kpi-label">Max Tow Rating</span>
            <span class="kpi-value">${fmt.format(v.maxTowLbs)} lbs</span>
            <span class="kpi-sub">${v.hitchClass}</span>
          </div>
          <div class="kpi-box highlight">
            <span class="kpi-label">Max Payload Limit</span>
            <span class="kpi-value">${fmt.format(v.maxPayloadLbs)} lbs</span>
            <span class="kpi-sub">GVWR: ${fmt.format(v.gvwrLbs)} lbs</span>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">Payload-Capped Trailer</span>
            <span class="kpi-value">${fmt.format(realMaxTrailer)} lbs</span>
            <span class="kpi-sub">w/ 550 lb Cabin + 13% Tongue</span>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">GCWR / Curb Weight</span>
            <span class="kpi-value">${fmt.format(v.gcwrLbs)} lbs</span>
            <span class="kpi-sub">Curb: ${fmt.format(v.curbWeightLbs)} lbs</span>
          </div>
        </div>
      </article>

      <section class="panel isolated-widget" id="rig-calculator"
        data-max-tow="${v.maxTowLbs}"
        data-max-payload="${v.maxPayloadLbs}"
        data-gvwr="${v.gvwrLbs}"
        data-gcwr="${v.gcwrLbs}"
        data-curb-weight="${v.curbWeightLbs}"
        data-vehicle-name="${fullTitle}">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.5rem;margin-block-end:0.5rem;">
          <h2 style="border:none;margin:0;padding:0;">Interactive Rig, Tongue Weight & Payload Simulator</h2>
          <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
            <button type="button" id="btn-save-garage" class="garage-btn">📌 Save to My Garage</button>
            <button type="button" id="btn-copy-rig-link" class="preset-btn">Copy Shareable Rig Link</button>
            <button type="button" id="btn-print-worksheet" class="preset-btn">⎙ Print Rig Worksheet</button>
          </div>
        </div>

        <!-- Custom Yellow Door-Jamb Payload Sticker Override Bar -->
        <div class="door-sticker-bar">
          <div>
            <strong>YELLOW DOOR-JAMB STICKER OVERRIDE:</strong> Have your truck's driver-door payload sticker? Enter your exact VIN payload (lbs):
            <div id="door-payload-error" role="status" style="color:var(--danger-text);font-weight:700;font-size:0.76rem;"></div>
          </div>
          <div class="door-sticker-controls">
            <label for="input-custom-payload" class="visually-hidden">Custom door-jamb payload in lbs</label>
            <input type="text" id="input-custom-payload" name="door_payload" inputmode="numeric" pattern="[0-9]*" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="done" placeholder="${v.maxPayloadLbs}">
            <button type="button" id="btn-reset-payload" class="preset-btn">Reset (${fmt.format(v.maxPayloadLbs)} lbs)</button>
          </div>
        </div>

        <!-- Live Interactive SVG Truck + Trailer Blueprint -->
        ${renderRigBlueprintSvg(v, defaultTrailer, defaultTongueLbs)}

        <div class="preset-pills" role="group" aria-label="Quick Trailer Weight Presets">
          <button type="button" class="preset-btn" data-preset-trailer="3500" data-preset-tongue="12">3,500 lb Pop-Up (12%)</button>
          <button type="button" class="preset-btn" data-preset-trailer="5000" data-preset-tongue="13">5,000 lb Single-Axle (13%)</button>
          <button type="button" class="preset-btn" data-preset-trailer="6500" data-preset-tongue="13">6,500 lb Bunkhouse (13%)</button>
          <button type="button" class="preset-btn" data-preset-trailer="8000" data-preset-tongue="13">8,000 lb Slide-Out (13%)</button>
          <button type="button" class="preset-btn" data-preset-trailer="10000" data-preset-tongue="14">10,000 lb Toy Hauler (14%)</button>
          <button type="button" class="preset-btn" data-preset-trailer="13000" data-preset-tongue="18">13,000 lb 5th-Wheel (18%)</button>
        </div>

        <div class="calc-grid">
          <div class="control-group">
            <div class="control-header">
              <label for="input-trailer-lbs">1. Loaded Trailer Weight (GTW)</label>
              <span id="readout-trailer" class="control-readout">${fmt.format(defaultTrailer)} lbs</span>
            </div>
            <input type="range" id="input-trailer-lbs" min="1000" max="${Math.max(25000, v.maxTowLbs + 4000)}" step="100" value="${defaultTrailer}">
          </div>

          <div class="control-group">
            <div class="control-header">
              <label for="input-tongue-pct">2. Tongue / Pin Weight Ratio (%)</label>
              <span id="readout-tongue" class="control-readout">13%</span>
            </div>
            <input type="range" id="input-tongue-pct" min="10" max="22" step="1" value="13">
          </div>

          <div class="control-group">
            <div class="control-header">
              <label for="input-passengers-lbs">3. Driver, Passengers & Pets in Cab</label>
              <span id="readout-passengers" class="control-readout">350 lbs</span>
            </div>
            <input type="range" id="input-passengers-lbs" min="150" max="1200" step="25" value="350">
          </div>

          <div class="control-group">
            <div class="control-header">
              <label for="input-cargo-lbs">4. Truck Bed Cargo, Tools & Coolers</label>
              <span id="readout-cargo" class="control-readout">150 lbs</span>
            </div>
            <input type="range" id="input-cargo-lbs" min="0" max="2000" step="25" value="150">
          </div>

          <div class="control-group" style="grid-column: 1 / -1;">
            <div class="control-header">
              <label for="input-hitch-lbs">5. Weight Distribution / 5th-Wheel Hitch Hardware Weight</label>
              <span id="readout-hitch" class="control-readout">85 lbs</span>
            </div>
            <input type="range" id="input-hitch-lbs" min="0" max="300" step="5" value="85">
          </div>
        </div>

        ${renderAdUnit('midtool', 'mid-calculator-action', 3)}

        <div class="verdict-banner" id="verdict-banner" data-status="safe" role="status" aria-live="polite">
          <div class="verdict-title">
            <span id="verdict-title-text">Evaluating Rig Configuration...</span>
            <span class="badge badge-safe" id="verdict-badge">CALCULATING</span>
          </div>
          <p id="verdict-desc" style="margin:0;font-size:0.88rem;"></p>
        </div>

        <div class="gauge-list">
          <div class="gauge-row">
            <div class="gauge-top">
              <span>1. PAYLOAD CAPACITY UTILIZATION (Cab + Bed + Hitch + Tongue vs GVWR)</span>
              <span id="gauge-txt-payload">0 / ${fmt.format(v.maxPayloadLbs)} lbs</span>
            </div>
            <div class="gauge-track"><div class="gauge-fill" id="gauge-bar-payload" style="inline-size:50%;"></div></div>
          </div>

          <div class="gauge-row">
            <div class="gauge-top">
              <span>2. MAX TOWING CAPACITY UTILIZATION (Loaded Trailer vs SAE J2807 Rating)</span>
              <span id="gauge-txt-tow">0 / ${fmt.format(v.maxTowLbs)} lbs</span>
            </div>
            <div class="gauge-track"><div class="gauge-fill" id="gauge-bar-tow" style="inline-size:50%;"></div></div>
          </div>

          <div class="gauge-row">
            <div class="gauge-top">
              <span>3. GROSS COMBINED WEIGHT (GCWR) UTILIZATION (Curb + Cargo + Trailer)</span>
              <span id="gauge-txt-gcwr">0 / ${fmt.format(v.gcwrLbs)} lbs</span>
            </div>
            <div class="gauge-track"><div class="gauge-fill" id="gauge-bar-gcwr" style="inline-size:50%;"></div></div>
          </div>
        </div>

        <div class="spec-kpi-grid" style="margin-block-end:0;">
          <div class="kpi-box">
            <span class="kpi-label">Calculated Tongue Load</span>
            <span class="kpi-value" id="out-tongue-lbs">--</span>
            <span class="kpi-sub">Counts against Payload</span>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">Remaining Payload Margin</span>
            <span class="kpi-value" id="out-payload-margin">--</span>
            <span class="kpi-sub">GVWR Headroom</span>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">Remaining Tow Margin</span>
            <span class="kpi-value" id="out-tow-margin">--</span>
            <span class="kpi-sub">Pulling Headroom</span>
          </div>
          <div class="kpi-box highlight">
            <span class="kpi-label">True Max Safe Trailer</span>
            <span class="kpi-value" id="out-max-real-trailer">--</span>
            <span class="kpi-sub">With Current Cab/Bed Load</span>
          </div>
        </div>

        <div class="next-tools-bar">
          <strong style="font-size:0.82rem;font-family:var(--font-mono);">NEXT-STEP TOWING VERIFICATION TOOLS FOR THIS RIG:</strong>
          <div class="next-tools-grid">
            <a class="next-tool-link" href="/tools/cat-scale-calculator/?gvwr=${v.gvwrLbs}&amp;gcwr=${v.gcwrLbs}&amp;tow=${v.maxTowLbs}&amp;name=${encodeURIComponent(fullTitle)}"><strong>⚖️ Verify CAT Scale Ticket →</strong>Check actual Steer, Drive &amp; Trailer axle weights + WDH transfer</a>
            <a class="next-tool-link" href="/tools/altitude-mountain-towing/?tow=${v.maxTowLbs}&amp;hp=${v.horsepower}&amp;engine=${encodeURIComponent(v.engine)}&amp;name=${encodeURIComponent(fullTitle)}"><strong>🏔️ Mountain Grade &amp; Elevation →</strong>Calculate high-altitude SAE J2807 power loss (6%–8% grades)</a>
            <a class="next-tool-link" href="/tools/tow-checklist/"><strong>✅ Pre-Trip Hitch Checklist →</strong>Auto-saved 12-point RV departure &amp; brake controller check</a>
            <a class="next-tool-link" href="/tools/garage-compare/"><strong>📌 Compare Saved Shortlist →</strong>View all your bookmarked trucks side-by-side in My Garage</a>
          </div>
        </div>
      </section>

      <section class="panel deferred-section">
        <h2>Camper & Trailer Weight-Class Fitment Matrix for ${v.year} ${v.brand} ${v.model}</h2>
        <p class="subtitle">Assumes 500 lbs of passengers/cargo + 85 lb Weight Distribution Hitch. Click any column header to sort:</p>
        <p id="table-sort-status" role="status" class="visually-hidden"></p>
        <div tabindex="0" role="region" aria-labelledby="fitment-caption" class="table-wrapper">
          <table id="vehicle-fitment-table" class="sortable-spec-table" style="--label-2:'Trailer Wt';--label-3:'Tongue Load';--label-4:'Total Payload';--label-5:'Payload Margin';--label-6:'Status';">
            <caption id="fitment-caption">${fullTitle} Compatibility Across 8 Common RV & Trailer Weight Brackets</caption>
            <thead>
              <tr>
                <th scope="col">Trailer / Camper Class</th>
                <th scope="col" data-type="number">
                  <button type="button" commandfor="vehicle-fitment-table" command="--sort">Loaded Wt <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col" data-type="number">
                  <button type="button" commandfor="vehicle-fitment-table" command="--sort">Tongue / Pin <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col" data-type="number">
                  <button type="button" commandfor="vehicle-fitment-table" command="--sort">Payload Used <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col" data-type="number">
                  <button type="button" commandfor="vehicle-fitment-table" command="--sort">Payload Margin <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col">Safety Verdict</th>
              </tr>
            </thead>
            <tbody>
              ${trailers
                .map((t) => {
                  const totalPayload = 585 + t.tongueWeightLbs;
                  const payloadMargin = v.maxPayloadLbs - totalPayload;
                  const worstPct = Math.max(
                    Math.round((totalPayload / v.maxPayloadLbs) * 100),
                    Math.round((t.weightLbs / v.maxTowLbs) * 100)
                  );
                  let badge = `<span class="badge badge-safe">SAFE (${worstPct}%)</span>`;
                  if (worstPct > 100) {
                    const reason = payloadMargin < 0 ? 'OVER PAYLOAD' : 'OVER TOW LIMIT';
                    badge = `<span class="badge badge-danger">${reason} (${worstPct}%)</span>`;
                  } else if (worstPct >= 85) {
                    badge = `<span class="badge badge-warn">NEAR LIMIT (${worstPct}%)</span>`;
                  }
                  return `<tr>
                    <th scope="row"><a href="/trailers/${t.slug}/">${t.title}</a></th>
                    <td data-value="${t.weightLbs}">${fmt.format(t.weightLbs)} lbs</td>
                    <td data-value="${t.tongueWeightLbs}">${fmt.format(t.tongueWeightLbs)} lbs (${Math.round(t.tongueRatio * 100)}%)</td>
                    <td data-value="${totalPayload}">${fmt.format(totalPayload)} lbs</td>
                    <td data-value="${payloadMargin}">${payloadMargin >= 0 ? '+' : ''}${fmt.format(payloadMargin)} lbs</td>
                    <td>${badge}</td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel deferred-section">
        <h2>Head-to-Head Towing Comparisons: ${v.year} ${v.brand} ${v.model} vs. Rivals</h2>
        <p class="subtitle">Compare real-world payload bottlenecks, axle ratios, and torque curves side-by-side:</p>
        <div class="link-cluster-grid">
          ${myComparisons
            .map((p) => {
              const rival = p.a.slug === v.slug ? p.b : p.a;
              return `<a href="/compare/${p.slug}/" class="cluster-card">
                <span class="cluster-card-title">${v.year} ${v.brand} ${v.model} vs. ${rival.year} ${rival.brand} ${rival.model}</span>
                <span class="cluster-card-meta">${fmt.format(v.maxTowLbs)} vs ${fmt.format(rival.maxTowLbs)} lbs Tow • ${fmt.format(v.maxPayloadLbs)} vs ${fmt.format(rival.maxPayloadLbs)} lbs Payload</span>
              </a>`;
            })
            .join('')}
        </div>

        ${
          brandSiblings.length
            ? `<h3>More ${v.year} ${v.brand} Towing & Payload Specs</h3>
               <div class="link-cluster-grid">
                 ${brandSiblings
                   .map(
                     (s) => `<a href="/towing/${s.slug}/" class="cluster-card">
                       <span class="cluster-card-title">${s.year} ${s.brand} ${s.model} (${s.trim})</span>
                       <span class="cluster-card-meta">Tow: ${fmt.format(s.maxTowLbs)} lbs • Payload: ${fmt.format(s.maxPayloadLbs)} lbs</span>
                     </a>`
                   )
                   .join('')}
               </div>`
            : ''
        }

        <h3>Alternative ${v.year} ${v.category}s to Compare</h3>
        <div class="link-cluster-grid">
          ${categoryPeers
            .map(
              (c) => `<a href="/towing/${c.slug}/" class="cluster-card">
                <span class="cluster-card-title">${c.year} ${c.brand} ${c.model} — ${c.trim}</span>
                <span class="cluster-card-meta">Tow: ${fmt.format(c.maxTowLbs)} lbs • Payload: ${fmt.format(c.maxPayloadLbs)} lbs</span>
              </a>`
            )
            .join('')}
        </div>
      </section>

      <section class="panel deferred-section">
        <h2>Engineering Breakdown: How ${fullTitle} Towing & Payload Math Works</h2>
        <p>When evaluating the <strong>${fullTitle}</strong> with the <strong>${v.engine}</strong> (${v.horsepower} HP / ${v.torqueLbFt} lb-ft torque, ${v.axleRatio} axle ratio), buyers frequently look only at the advertised <strong>${fmt.format(v.maxTowLbs)} lb maximum towing capacity</strong>. However, under SAE J2807 testing standards, factory tow ratings assume a base-trim vehicle with only a 150-lb driver and zero additional cargo or options.</p>
        <h3>1. The Payload Capacity Formula (GVWR minus Curb Weight)</h3>
        <p>Your legal vertical load ceiling is governed by the <strong>Gross Vehicle Weight Rating (GVWR) of ${fmt.format(v.gvwrLbs)} lbs</strong> minus the <strong>Curb Weight of ${fmt.format(v.curbWeightLbs)} lbs</strong>, yielding a maximum payload of <strong>${fmt.format(v.maxPayloadLbs)} lbs</strong>. Every pound of trailer tongue weight (typically 12% to 15% of total trailer weight for bumper-pull campers, or 18% to 20% pin weight for fifth-wheels) presses directly down on the rear axle and subtracts from your available payload:</p>
        <pre style="background:var(--surface-alt);border:1px solid var(--border-strong);padding:0.75rem;overflow-x:auto;font-family:var(--font-mono);font-size:0.82rem;">Available Payload for Tongue Weight = ${fmt.format(v.maxPayloadLbs)} lbs (Max Payload) - [Passengers + Truck Bed Cargo + Hitch Weight]
Payload-Limited Max Trailer Weight  = Available Payload for Tongue Weight ÷ 0.13 (Standard 13% Travel Trailer Tongue Ratio)</pre>
        <h3>2. Why Payload Runs Out Before Max Tow Rating</h3>
        <p>If you load 550 lbs of family members, firewood, coolers, and a weight-distribution hitch into the ${v.year} ${v.brand} ${v.model}, you have <strong>${fmt.format(Math.max(0, v.maxPayloadLbs - 550))} lbs</strong> of remaining payload capacity. Dividing that remaining payload by a 13% tongue weight ratio limits your maximum loaded travel trailer weight to <strong>${fmt.format(realMaxTrailer)} lbs</strong>—which is <strong>${fmt.format(Math.max(0, v.maxTowLbs - realMaxTrailer))} lbs lower</strong> than the brochure tow number.</p>
      </section>
    `;

    const html = renderLayout({
      title: `${fullTitle} Towing Capacity (${fmt.format(v.maxTowLbs)} lbs) & Payload Calculator`,
      description: `Verified ${fullTitle} towing capacity (${fmt.format(v.maxTowLbs)} lbs), payload limit (${fmt.format(v.maxPayloadLbs)} lbs), GVWR, GCWR, and interactive camper tongue weight simulator.`,
      canonicalPath: `towing/${v.slug}`,
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: `${v.year} Models`, url: `/years/${v.year}/` },
        { label: v.brand, url: `/brands/${slugify(v.brand)}/` },
        { label: `${v.year} ${v.model} (${v.trim})`, url: `/towing/${v.slug}/` }
      ],
      schemaJson: faqSchema,
      mainContent,
      sidebarLinks: myComparisons.map((p) => ({
        url: `/compare/${p.slug}/`,
        label: `${v.year} ${v.model} vs ${(p.a.slug === v.slug ? p.b : p.a).brand} ${(p.a.slug === v.slug ? p.b : p.a).model}`
      })),
      totalPagesCount
    });

    writePage(`towing/${v.slug}`, html, sitemapUrls);
  }
}

function buildComparisonPages(comparisonPairs, sitemapUrls, totalPagesCount) {
  for (const pair of comparisonPairs) {
    const { a, b, slug } = pair;
    const titleA = `${a.year} ${a.brand} ${a.model}`;
    const titleB = `${b.year} ${b.brand} ${b.model}`;
    const realMaxA = calcRealWorldMaxTrailer(a, 550, 0.13);
    const realMaxB = calcRealWorldMaxTrailer(b, 550, 0.13);
    const towDiff = Math.abs(a.maxTowLbs - b.maxTowLbs);
    const payloadDiff = Math.abs(a.maxPayloadLbs - b.maxPayloadLbs);
    const towWinner = a.maxTowLbs >= b.maxTowLbs ? titleA : titleB;
    const payloadWinner = a.maxPayloadLbs >= b.maxPayloadLbs ? titleA : titleB;

    const mainContent = `
      <article id="hero-panel" class="panel isolated-widget">
        <span class="brand-badge">HEAD-TO-HEAD SAE J2807 TOWING & PAYLOAD SHOWDOWN</span>
        <h1>${titleA} vs. ${titleB}: Towing Capacity & Payload Comparison</h1>
        <p class="subtitle">Side-by-side engineering comparison between the <strong>${titleA} (${a.trim})</strong> and the <strong>${titleB} (${b.trim})</strong>. Compare real-world camper tongue weight limits, GVWR, GCWR, and torque.</p>

        <div class="spec-kpi-grid">
          <div class="kpi-box highlight">
            <span class="kpi-label">Max Tow Winner</span>
            <span class="kpi-value">${towWinner}</span>
            <span class="kpi-sub">+${fmt.format(towDiff)} lbs advantage</span>
          </div>
          <div class="kpi-box highlight">
            <span class="kpi-label">Payload Winner</span>
            <span class="kpi-value">${payloadWinner}</span>
            <span class="kpi-sub">+${fmt.format(payloadDiff)} lbs payload headroom</span>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">${a.model} Real Max Camper</span>
            <span class="kpi-value">${fmt.format(realMaxA)} lbs</span>
            <span class="kpi-sub">Payload-capped @ 13% tongue</span>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">${b.model} Real Max Camper</span>
            <span class="kpi-value">${fmt.format(realMaxB)} lbs</span>
            <span class="kpi-sub">Payload-capped @ 13% tongue</span>
          </div>
        </div>
      </article>

      <section class="panel isolated-widget" id="rig-calculator"
        data-mode="compare"
        data-max-tow="${a.maxTowLbs}"
        data-max-payload="${a.maxPayloadLbs}"
        data-gvwr="${a.gvwrLbs}"
        data-gcwr="${a.gcwrLbs}"
        data-curb-weight="${a.curbWeightLbs}"
        data-vehicle-name="${titleA}"
        data-max-tow-b="${b.maxTowLbs}"
        data-max-payload-b="${b.maxPayloadLbs}"
        data-gcwr-b="${b.gcwrLbs}"
        data-curb-weight-b="${b.curbWeightLbs}"
        data-vehicle-name-b="${titleB}">
        <h2>Dual-Rig Stress Test: Hook the Same Trailer to Both Trucks</h2>
        <p class="subtitle">Adjust the trailer and cargo sliders below to see how both vehicles handle the exact same load simultaneously:</p>

        <div class="calc-grid">
          <div class="control-group">
            <div class="control-header">
              <label for="input-trailer-lbs">Loaded Trailer Weight (GTW)</label>
              <span id="readout-trailer" class="control-readout">7,000 lbs</span>
            </div>
            <input type="range" id="input-trailer-lbs" min="1500" max="${Math.max(a.maxTowLbs, b.maxTowLbs) + 2000}" step="100" value="7000">
          </div>
          <div class="control-group">
            <div class="control-header">
              <label for="input-tongue-pct">Tongue / Pin Ratio (%)</label>
              <span id="readout-tongue" class="control-readout">13%</span>
            </div>
            <input type="range" id="input-tongue-pct" min="10" max="20" step="1" value="13">
          </div>
          <div class="control-group">
            <div class="control-header">
              <label for="input-passengers-lbs">Cab Passengers & Pets</label>
              <span id="readout-passengers" class="control-readout">350 lbs</span>
            </div>
            <input type="range" id="input-passengers-lbs" min="150" max="1000" step="25" value="350">
          </div>
          <div class="control-group">
            <div class="control-header">
              <label for="input-cargo-lbs">Truck Bed Cargo</label>
              <span id="readout-cargo" class="control-readout">150 lbs</span>
            </div>
            <input type="range" id="input-cargo-lbs" min="0" max="1500" step="25" value="150">
          </div>
          <input type="hidden" id="input-hitch-lbs" value="85">
        </div>

        ${renderAdUnit('midtool', 'compare-mid-action', 0)}

        <div class="verdict-banner" id="verdict-banner" data-status="safe" role="status" aria-live="polite">
          <div class="verdict-title">
            <span id="compare-live-winner">Comparing Live Load Margins...</span>
            <span class="badge badge-safe" id="verdict-badge">LIVE COMPARISON</span>
          </div>
          <p id="verdict-title-text" style="font-weight:700;margin:0.25rem 0;"></p>
          <p id="verdict-desc" style="margin:0;font-size:0.86rem;"></p>
        </div>

        <div class="calc-grid">
          <div class="gauge-list" style="margin:0;">
            <h3 style="margin:0;"><a href="/towing/${a.slug}/">${titleA} (${a.trim})</a></h3>
            <div class="gauge-row">
              <div class="gauge-top"><span>Payload Used</span><span id="gauge-txt-payload">--</span></div>
              <div class="gauge-track"><div class="gauge-fill" id="gauge-bar-payload"></div></div>
            </div>
            <div class="gauge-row">
              <div class="gauge-top"><span>Tow Rating Used</span><span id="gauge-txt-tow">--</span></div>
              <div class="gauge-track"><div class="gauge-fill" id="gauge-bar-tow"></div></div>
            </div>
            <div class="gauge-row">
              <div class="gauge-top"><span>GCWR Used</span><span id="gauge-txt-gcwr">--</span></div>
              <div class="gauge-track"><div class="gauge-fill" id="gauge-bar-gcwr"></div></div>
            </div>
          </div>

          <div class="gauge-list" style="margin:0;">
            <h3 style="margin:0;"><a href="/towing/${b.slug}/">${titleB} (${b.trim})</a></h3>
            <div class="gauge-row">
              <div class="gauge-top"><span>Payload Used</span><span id="gauge-txt-payload-b">--</span></div>
              <div class="gauge-track"><div class="gauge-fill" id="gauge-bar-payload-b"></div></div>
            </div>
            <div class="gauge-row">
              <div class="gauge-top"><span>Tow Rating Used</span><span id="gauge-txt-tow-b">--</span></div>
              <div class="gauge-track"><div class="gauge-fill" id="gauge-bar-tow-b"></div></div>
            </div>
            <div class="gauge-row">
              <div class="gauge-top"><span>GCWR Used</span><span id="gauge-txt-gcwr-b">--</span></div>
              <div class="gauge-track"><div class="gauge-fill" id="gauge-bar-gcwr-b"></div></div>
            </div>
          </div>
        </div>
      </section>

      <section class="panel deferred-section">
        <h2>Full Specification Breakdown: ${titleA} vs. ${titleB}</h2>
        <div tabindex="0" role="region" aria-labelledby="cmp-table-caption" class="table-wrapper">
          <table style="--label-2:'${a.brand} ${a.model}';--label-3:'${b.brand} ${b.model}';--label-4:'Advantage';">
            <caption id="cmp-table-caption">Factory Towing, Payload & Powertrain Specifications</caption>
            <thead>
              <tr>
                <th scope="col">Specification Metric</th>
                <th scope="col"><a href="/towing/${a.slug}/">${titleA}</a></th>
                <th scope="col"><a href="/towing/${b.slug}/">${titleB}</a></th>
                <th scope="col">Category Winner</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Max Towing Capacity</th>
                <td><strong>${fmt.format(a.maxTowLbs)} lbs</strong></td>
                <td><strong>${fmt.format(b.maxTowLbs)} lbs</strong></td>
                <td><span class="badge badge-safe">${towWinner} (+${fmt.format(towDiff)} lbs)</span></td>
              </tr>
              <tr>
                <th scope="row">Max Payload Capacity</th>
                <td><strong>${fmt.format(a.maxPayloadLbs)} lbs</strong></td>
                <td><strong>${fmt.format(b.maxPayloadLbs)} lbs</strong></td>
                <td><span class="badge badge-safe">${payloadWinner} (+${fmt.format(payloadDiff)} lbs)</span></td>
              </tr>
              <tr>
                <th scope="row">Payload-Capped Real Camper Limit</th>
                <td>${fmt.format(realMaxA)} lbs</td>
                <td>${fmt.format(realMaxB)} lbs</td>
                <td>${realMaxA >= realMaxB ? titleA : titleB}</td>
              </tr>
              <tr>
                <th scope="row">Gross Vehicle Weight Rating (GVWR)</th>
                <td>${fmt.format(a.gvwrLbs)} lbs</td>
                <td>${fmt.format(b.gvwrLbs)} lbs</td>
                <td>${a.gvwrLbs >= b.gvwrLbs ? titleA : titleB}</td>
              </tr>
              <tr>
                <th scope="row">Gross Combined Weight Rating (GCWR)</th>
                <td>${fmt.format(a.gcwrLbs)} lbs</td>
                <td>${fmt.format(b.gcwrLbs)} lbs</td>
                <td>${a.gcwrLbs >= b.gcwrLbs ? titleA : titleB}</td>
              </tr>
              <tr>
                <th scope="row">Base Curb Weight</th>
                <td>${fmt.format(a.curbWeightLbs)} lbs</td>
                <td>${fmt.format(b.curbWeightLbs)} lbs</td>
                <td>${a.curbWeightLbs <= b.curbWeightLbs ? titleA + ' (Lighter)' : titleB + ' (Lighter)'}</td>
              </tr>
              <tr>
                <th scope="row">Engine & Powertrain</th>
                <td>${a.engine}</td>
                <td>${b.engine}</td>
                <td>--</td>
              </tr>
              <tr>
                <th scope="row">Peak Torque (lb-ft)</th>
                <td>${fmt.format(a.torqueLbFt)} lb-ft</td>
                <td>${fmt.format(b.torqueLbFt)} lb-ft</td>
                <td>${a.torqueLbFt >= b.torqueLbFt ? titleA : titleB} (+${Math.abs(a.torqueLbFt - b.torqueLbFt)} lb-ft)</td>
              </tr>
              <tr>
                <th scope="row">Peak Horsepower</th>
                <td>${a.horsepower} HP</td>
                <td>${b.horsepower} HP</td>
                <td>${a.horsepower >= b.horsepower ? titleA : titleB}</td>
              </tr>
              <tr>
                <th scope="row">Rear Axle Ratio</th>
                <td>${a.axleRatio}</td>
                <td>${b.axleRatio}</td>
                <td>--</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    `;

    const html = renderLayout({
      title: `${titleA} vs. ${titleB} Towing & Payload Comparison (${fmt.format(a.maxTowLbs)} vs ${fmt.format(b.maxTowLbs)} lbs)`,
      description: `Compare ${titleA} (${a.trim}) vs ${titleB} (${b.trim}) towing capacity, payload limits, GVWR, GCWR, and real-world travel trailer tongue weight margins.`,
      canonicalPath: `compare/${slug}`,
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: `${a.year} Comparisons`, url: `/years/${a.year}/` },
        { label: `${titleA} vs ${titleB}`, url: `/compare/${slug}/` }
      ],
      schemaJson: null,
      mainContent,
      totalPagesCount
    });

    writePage(`compare/${slug}`, html, sitemapUrls);
  }
}

function buildTrailerClassPages(sitemapUrls, totalPagesCount) {
  for (const t of trailers) {
    const assumedCabAndHitch = 585;
    const totalRequiredPayload = assumedCabAndHitch + t.tongueWeightLbs;

    const rankedVehicles = vehicles
      .filter((v) => v.year >= 2020)
      .map((v) => {
        const payloadMargin = v.maxPayloadLbs - totalRequiredPayload;
        const towMargin = v.maxTowLbs - t.weightLbs;
        const worstPct = Math.max(
          Math.round((totalRequiredPayload / v.maxPayloadLbs) * 100),
          Math.round((t.weightLbs / v.maxTowLbs) * 100)
        );
        return {
          ...v,
          payloadMargin,
          towMargin,
          worstPct,
          canTowSafely: payloadMargin >= 0 && towMargin >= 0
        };
      })
      .sort((a, b) => a.worstPct - b.worstPct);

    const safeCount = rankedVehicles.filter((v) => v.canTowSafely).length;

    const mainContent = `
      <article id="hero-panel" class="panel isolated-widget">
        <span class="brand-badge">TRAILER WEIGHT-CLASS FITMENT DIRECTORY</span>
        <h1>Best Trucks & SUVs to Tow ${t.title} (${fmt.format(t.weightLbs)} lbs GTW)</h1>
        <p class="subtitle">${t.description} Real-world examples include: <strong>${t.examples}</strong>.</p>

        <div class="spec-kpi-grid">
          <div class="kpi-box highlight">
            <span class="kpi-label">Loaded Trailer Weight</span>
            <span class="kpi-value">${fmt.format(t.weightLbs)} lbs</span>
            <span class="kpi-sub">Length: ${t.lengthFt}</span>
          </div>
          <div class="kpi-box highlight">
            <span class="kpi-label">Loaded Tongue / Pin Weight</span>
            <span class="kpi-value">${fmt.format(t.tongueWeightLbs)} lbs</span>
            <span class="kpi-sub">${Math.round(t.tongueRatio * 100)}% Ratio (${t.hitchType})</span>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">Min Truck Payload Needed</span>
            <span class="kpi-value">${fmt.format(totalRequiredPayload)} lbs</span>
            <span class="kpi-sub">w/ 500 lb Family + 85 lb Hitch</span>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">Compatible Vehicles</span>
            <span class="kpi-value">${safeCount} / ${rankedVehicles.length}</span>
            <span class="kpi-sub">Pass Both Tow & Payload</span>
          </div>
        </div>
      </article>

      ${renderAdUnit('midtool', 'trailer-hub-mid-ad', 1)}

      <section class="panel">
        <h2>Trucks & SUVs Ranked for Towing a ${fmt.format(t.weightLbs)} lb Trailer</h2>
        <p class="subtitle">Click any column header to sort vehicles by remaining payload headroom, max tow capacity, or utilization percentage:</p>
        <p id="table-sort-status" role="status" class="visually-hidden"></p>
        <div tabindex="0" role="region" aria-labelledby="trailer-rank-caption" class="table-wrapper">
          <table id="trailer-rank-table" class="sortable-spec-table" style="--label-2:'Max Tow';--label-3:'Max Payload';--label-4:'Payload Left';--label-5:'Peak Load %';--label-6:'Verdict';">
            <caption id="trailer-rank-caption">Vehicles Ranked by Real-World Safety Margin for ${fmt.format(t.weightLbs)} lb Trailer (${fmt.format(t.tongueWeightLbs)} lb Tongue Load)</caption>
            <thead>
              <tr>
                <th scope="col">Vehicle & Powertrain</th>
                <th scope="col" data-type="number">
                  <button type="button" commandfor="trailer-rank-table" command="--sort">Max Tow <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col" data-type="number">
                  <button type="button" commandfor="trailer-rank-table" command="--sort">Max Payload <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col" data-type="number">
                  <button type="button" commandfor="trailer-rank-table" command="--sort">Payload Margin <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col" data-type="number" aria-sort="ascending">
                  <button type="button" commandfor="trailer-rank-table" command="--sort">Peak Load % <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col">Fitment Verdict</th>
              </tr>
            </thead>
            <tbody>
              ${rankedVehicles
                .map((v) => {
                  let badge = `<span class="badge badge-safe">SAFE (${v.worstPct}%)</span>`;
                  if (v.worstPct > 100) {
                    const bottleneck = v.payloadMargin < 0 ? 'OVER PAYLOAD' : 'OVER TOW';
                    badge = `<span class="badge badge-danger">${bottleneck} (${v.worstPct}%)</span>`;
                  } else if (v.worstPct >= 85) {
                    badge = `<span class="badge badge-warn">MARGINAL (${v.worstPct}%)</span>`;
                  }
                  return `<tr>
                    <th scope="row"><a href="/towing/${v.slug}/?trailer=${t.weightLbs}&tongue=${Math.round(t.tongueRatio * 100)}">${v.year} ${v.brand} ${v.model} (${v.trim})</a></th>
                    <td data-value="${v.maxTowLbs}">${fmt.format(v.maxTowLbs)} lbs</td>
                    <td data-value="${v.maxPayloadLbs}">${fmt.format(v.maxPayloadLbs)} lbs</td>
                    <td data-value="${v.payloadMargin}">${v.payloadMargin >= 0 ? '+' : ''}${fmt.format(v.payloadMargin)} lbs</td>
                    <td data-value="${v.worstPct}">${v.worstPct}%</td>
                    <td>${badge}</td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;

    const html = renderLayout({
      title: `Best Trucks & SUVs to Tow ${t.title} (${fmt.format(t.weightLbs)} lbs + ${fmt.format(t.tongueWeightLbs)} lb Tongue)`,
      description: `Complete payload and towing fitment guide for ${t.title}. See which trucks and SUVs safely handle ${fmt.format(t.weightLbs)} lbs and ${fmt.format(t.tongueWeightLbs)} lbs of tongue weight.`,
      canonicalPath: `trailers/${t.slug}`,
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: t.title, url: `/trailers/${t.slug}/` }
      ],
      schemaJson: null,
      mainContent,
      totalPagesCount
    });

    writePage(`trailers/${t.slug}`, html, sitemapUrls);
  }
}

function buildBrandPages(sitemapUrls, totalPagesCount) {
  const brands = [...new Set(vehicles.map((v) => v.brand))];

  for (const brand of brands) {
    const bSlug = slugify(brand);
    const brandVehicles = vehicles
      .filter((v) => v.brand === brand)
      .sort((a, b) => b.year - a.year || b.maxTowLbs - a.maxTowLbs);

    const highestTow = [...brandVehicles].sort((a, b) => b.maxTowLbs - a.maxTowLbs)[0];
    const highestPayload = [...brandVehicles].sort((a, b) => b.maxPayloadLbs - a.maxPayloadLbs)[0];

    const mainContent = `
      <article id="hero-panel" class="panel isolated-widget">
        <span class="brand-badge">MANUFACTURER TOWING & PAYLOAD DIRECTORY (2015–2026)</span>
        <h1>${brand} Towing Capacity, Payload & GVWR Chart (${brandVehicles.length} Model-Year Trims)</h1>
        <p class="subtitle">Compare factory SAE J2807 towing ratings, payload capacities, axle ratios, and real-world camper limits across every ${brand} truck and SUV configuration from 2015 to 2026.</p>

        <div class="spec-kpi-grid">
          <div class="kpi-box highlight">
            <span class="kpi-label">Highest ${brand} Tow Rating</span>
            <span class="kpi-value">${fmt.format(highestTow.maxTowLbs)} lbs</span>
            <span class="kpi-sub">${highestTow.year} ${highestTow.model} (${highestTow.trim})</span>
          </div>
          <div class="kpi-box highlight">
            <span class="kpi-label">Highest ${brand} Payload</span>
            <span class="kpi-value">${fmt.format(highestPayload.maxPayloadLbs)} lbs</span>
            <span class="kpi-sub">${highestPayload.year} ${highestPayload.model} (${highestPayload.trim})</span>
          </div>
        </div>
      </article>

      ${renderAdUnit('midtool', 'brand-mid-ad', 2)}

      <section class="panel">
        <h2>Sortable ${brand} Towing & Payload Specification Table (2015–2026)</h2>
        <p id="table-sort-status" role="status" class="visually-hidden"></p>
        <div tabindex="0" role="region" aria-labelledby="brand-table-caption" class="table-wrapper">
          <table id="brand-spec-table" class="sortable-spec-table" style="--label-2:'Year';--label-3:'Max Tow';--label-4:'Max Payload';--label-5:'Real Camper Max';--label-6:'GVWR';">
            <caption id="brand-table-caption">${brand} Lineup Sorted by Model Year & Towing Capacity</caption>
            <thead>
              <tr>
                <th scope="col">${brand} Model & Trim</th>
                <th scope="col" data-type="number" aria-sort="descending">
                  <button type="button" commandfor="brand-spec-table" command="--sort">Year <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col" data-type="number">
                  <button type="button" commandfor="brand-spec-table" command="--sort">Max Tow <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col" data-type="number">
                  <button type="button" commandfor="brand-spec-table" command="--sort">Payload <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col" data-type="number">
                  <button type="button" commandfor="brand-spec-table" command="--sort">Real Max Camper <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col" data-type="number">
                  <button type="button" commandfor="brand-spec-table" command="--sort">GVWR <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
              </tr>
            </thead>
            <tbody>
              ${brandVehicles
                .map((v) => {
                  const realMax = calcRealWorldMaxTrailer(v, 550, 0.13);
                  return `<tr>
                    <th scope="row"><a href="/towing/${v.slug}/">${v.year} ${v.brand} ${v.model} — ${v.trim}</a></th>
                    <td data-value="${v.year}">${v.year}</td>
                    <td data-value="${v.maxTowLbs}"><strong>${fmt.format(v.maxTowLbs)} lbs</strong></td>
                    <td data-value="${v.maxPayloadLbs}">${fmt.format(v.maxPayloadLbs)} lbs</td>
                    <td data-value="${realMax}">${fmt.format(realMax)} lbs</td>
                    <td data-value="${v.gvwrLbs}">${fmt.format(v.gvwrLbs)} lbs</td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;

    const html = renderLayout({
      title: `${brand} Towing Capacity & Payload Chart (${brandVehicles.length} Models Compared, 2015–2026)`,
      description: `Compare ${brand} towing capacities, payload ratings, GVWR, and real-world camper tongue weight limits across all ${brandVehicles.length} trims (2015–2026).`,
      canonicalPath: `brands/${bSlug}`,
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: `${brand} Towing Specs`, url: `/brands/${bSlug}/` }
      ],
      schemaJson: null,
      mainContent,
      totalPagesCount
    });

    writePage(`brands/${bSlug}`, html, sitemapUrls);
  }
}

// Build 12 Model-Year Hub Pages (/years/2015/ through /years/2026/)
function buildYearPages(sitemapUrls, totalPagesCount) {
  const years = [...new Set(vehicles.map((v) => v.year))].sort((a, b) => b - a);

  for (const year of years) {
    const yearVehicles = vehicles
      .filter((v) => v.year === year)
      .sort((a, b) => b.maxTowLbs - a.maxTowLbs);

    const topTow = yearVehicles[0];
    const topPayload = [...yearVehicles].sort((a, b) => b.maxPayloadLbs - a.maxPayloadLbs)[0];

    const mainContent = `
      <article id="hero-panel" class="panel isolated-widget">
        <span class="brand-badge">${year} MODEL YEAR TOWING & PAYLOAD MATRIX</span>
        <h1>${year} Truck & SUV Towing Capacity & Payload Comparison Chart (${yearVehicles.length} Trims)</h1>
        <p class="subtitle">Shopping for a ${year} pickup truck or SUV? Compare verified SAE J2807 towing capacities, door-jamb payload ratings, GVWR, and real-world travel trailer limits for every ${year} model.</p>

        <div class="year-pill-bar" role="navigation" aria-label="Browse Other Model Years">
          <strong style="font-family:var(--font-mono);font-size:0.74rem;margin-inline-end:0.25rem;">ALL YEARS:</strong>
          ${years
            .map(
              (y) =>
                `<a href="/years/${y}/" class="year-pill ${y === year ? 'active' : ''}" ${
                  y === year ? 'aria-current="page"' : ''
                }>${y}</a>`
            )
            .join('')}
        </div>

        <div class="spec-kpi-grid">
          <div class="kpi-box highlight">
            <span class="kpi-label">${year} Max Tow Leader</span>
            <span class="kpi-value">${fmt.format(topTow.maxTowLbs)} lbs</span>
            <span class="kpi-sub">${topTow.brand} ${topTow.model}</span>
          </div>
          <div class="kpi-box highlight">
            <span class="kpi-label">${year} Payload Leader</span>
            <span class="kpi-value">${fmt.format(topPayload.maxPayloadLbs)} lbs</span>
            <span class="kpi-sub">${topPayload.brand} ${topPayload.model}</span>
          </div>
        </div>
      </article>

      ${renderAdUnit('midtool', 'year-mid-ad', 1)}

      <section class="panel">
        <h2>All ${yearVehicles.length} ${year} Trucks & SUVs Ranked by Towing & Payload</h2>
        <p id="table-sort-status" role="status" class="visually-hidden"></p>
        <div tabindex="0" role="region" aria-labelledby="year-table-caption" class="table-wrapper">
          <table id="year-spec-table" class="sortable-spec-table" style="--label-2:'Class';--label-3:'Max Tow';--label-4:'Payload';--label-5:'Real Max Camper';--label-6:'Torque';">
            <caption id="year-table-caption">${year} Model Year Vehicles Sorted by Maximum Towing Capacity</caption>
            <thead>
              <tr>
                <th scope="col">${year} Vehicle & Powertrain</th>
                <th scope="col">Class</th>
                <th scope="col" data-type="number" aria-sort="descending">
                  <button type="button" commandfor="year-spec-table" command="--sort">Max Tow <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col" data-type="number">
                  <button type="button" commandfor="year-spec-table" command="--sort">Payload <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col" data-type="number">
                  <button type="button" commandfor="year-spec-table" command="--sort">Payload-Capped Camper <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
                <th scope="col" data-type="number">
                  <button type="button" commandfor="year-spec-table" command="--sort">Torque <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
              </tr>
            </thead>
            <tbody>
              ${yearVehicles
                .map((v) => {
                  const realMax = calcRealWorldMaxTrailer(v, 550, 0.13);
                  return `<tr>
                    <th scope="row"><a href="/towing/${v.slug}/">${v.year} ${v.brand} ${v.model} — ${v.trim}</a></th>
                    <td>${v.category}</td>
                    <td data-value="${v.maxTowLbs}"><strong>${fmt.format(v.maxTowLbs)} lbs</strong></td>
                    <td data-value="${v.maxPayloadLbs}">${fmt.format(v.maxPayloadLbs)} lbs</td>
                    <td data-value="${realMax}"><strong>${fmt.format(realMax)} lbs</strong></td>
                    <td data-value="${v.torqueLbFt}">${fmt.format(v.torqueLbFt)} lb-ft</td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;

    const html = renderLayout({
      title: `${year} Truck & SUV Towing Capacity & Payload Chart (${yearVehicles.length} Models Compared)`,
      description: `Compare ${year} truck and SUV towing capacities, payload ratings, GVWR, and real-world travel trailer limits across ${yearVehicles.length} trims.`,
      canonicalPath: `years/${year}`,
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: `${year} Towing & Payload Directory`, url: `/years/${year}/` }
      ],
      schemaJson: null,
      mainContent,
      totalPagesCount
    });

    writePage(`years/${year}`, html, sitemapUrls);
  }
}

function buildHomepage(comparisonPairs, sitemapUrls, totalPagesCount) {
  const brands = [...new Set(vehicles.map((v) => v.brand))].sort();
  const years = [...new Set(vehicles.map((v) => v.year))].sort((a, b) => b - a);
  const sortedVehicles = [...vehicles].sort((a, b) => b.year - a.year || b.maxTowLbs - a.maxTowLbs);

  const mainContent = `
    <section id="hero-panel" class="panel isolated-widget">
      <span class="brand-badge">SAE J2807 TOWING, PAYLOAD & GVWR DATABASE (${vehicles.length} TRIMS • ${fmt.format(totalPagesCount)} PAGES)</span>
      <h1>2015–2026 Truck & SUV Towing Capacity vs. Real-World Payload Matrix</h1>
      <p class="subtitle">90% of overloaded RVers exceed their truck's <strong>Payload Capacity (GVWR)</strong> long before hitting their brochure <strong>Max Tow Rating</strong>. Filter all ${vehicles.length} new and used tow vehicles (2015–2026) below or click any trim to launch the live SVG tongue-weight & squat simulator.</p>

      <search aria-label="Filter Master Vehicle Database">
        <div class="calc-grid" style="margin-block-end:1rem;">
          <div class="control-group">
            <label for="filter-search" style="font-weight:700;font-size:0.8rem;display:block;margin-block-end:0.25rem;">Search Model, Year, Engine, or Trim</label>
            <input type="search" id="filter-search" autocorrect="off" autocapitalize="none" spellcheck="false" placeholder="e.g. 2018 F-150, Duramax, Tacoma, 3.5L...">
          </div>
          <div class="control-group">
            <label for="filter-year" style="font-weight:700;font-size:0.8rem;display:block;margin-block-end:0.25rem;">Filter by Model Year (2015–2026)</label>
            <select id="filter-year">
              <option value="">All Model Years (${years.length} Years)</option>
              ${years.map((y) => `<option value="${y}">${y} Model Year</option>`).join('')}
            </select>
          </div>
          <div class="control-group">
            <label for="filter-brand" style="font-weight:700;font-size:0.8rem;display:block;margin-block-end:0.25rem;">Filter by Brand</label>
            <select id="filter-brand">
              <option value="">All Manufacturers (${brands.length} Brands)</option>
              ${brands.map((b) => `<option value="${b}">${b}</option>`).join('')}
            </select>
          </div>
          <div class="control-group">
            <label for="filter-min-tow" style="font-weight:700;font-size:0.8rem;display:block;margin-block-end:0.25rem;">Minimum Tow Capacity</label>
            <select id="filter-min-tow">
              <option value="0">Any Tow Rating</option>
              <option value="5000">5,000+ lbs (Compact Campers & Boats)</option>
              <option value="7500">7,500+ lbs (Midsize Bunkhouse Trailers)</option>
              <option value="10000">10,000+ lbs (Heavy Half-Ton / Toy Haulers)</option>
              <option value="15000">15,000+ lbs (Fifth-Wheels & Heavy Duty)</option>
            </select>
          </div>
        </div>
      </search>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.5rem;font-family:var(--font-mono);font-size:0.82rem;">
        <strong id="filter-match-count">${vehicles.length} Vehicles Matched</strong>
        <span>Click any column header to sort ▲▼</span>
      </div>

      <p id="table-sort-status" role="status" class="visually-hidden"></p>
      <div tabindex="0" role="region" aria-labelledby="master-table-caption" class="table-wrapper">
        <table id="master-vehicle-table" class="sortable-spec-table" style="--label-2:'Class';--label-3:'Max Tow';--label-4:'Payload';--label-5:'Real Max Camper';--label-6:'GVWR';--label-7:'Torque';">
          <caption id="master-table-caption">Master 2015–2026 SAE J2807 Towing, Payload & Real-World Camper Limit Database</caption>
          <thead>
            <tr>
              <th scope="col">Vehicle Year, Model & Trim</th>
              <th scope="col">Class</th>
              <th scope="col" data-type="number" aria-sort="descending">
                <button type="button" commandfor="master-vehicle-table" command="--sort">Max Tow <span class="sort-icon" aria-hidden="true"></span></button>
              </th>
              <th scope="col" data-type="number">
                <button type="button" commandfor="master-vehicle-table" command="--sort">Payload <span class="sort-icon" aria-hidden="true"></span></button>
              </th>
              <th scope="col" data-type="number">
                <button type="button" commandfor="master-vehicle-table" command="--sort">Payload-Capped Camper <span class="sort-icon" aria-hidden="true"></span></button>
              </th>
              <th scope="col" data-type="number">
                <button type="button" commandfor="master-vehicle-table" command="--sort">GVWR <span class="sort-icon" aria-hidden="true"></span></button>
              </th>
              <th scope="col" data-type="number">
                <button type="button" commandfor="master-vehicle-table" command="--sort">Torque <span class="sort-icon" aria-hidden="true"></span></button>
              </th>
            </tr>
          </thead>
          <tbody>
            ${sortedVehicles
              .map((v) => {
                const realMax = calcRealWorldMaxTrailer(v, 550, 0.13);
                return `<tr data-year="${v.year}" data-brand="${v.brand}" data-tow="${v.maxTowLbs}" data-payload="${v.maxPayloadLbs}">
                  <th scope="row"><a href="/towing/${v.slug}/">${v.year} ${v.brand} ${v.model} — ${v.trim}</a></th>
                  <td>${v.category}</td>
                  <td data-value="${v.maxTowLbs}"><strong>${fmt.format(v.maxTowLbs)} lbs</strong></td>
                  <td data-value="${v.maxPayloadLbs}">${fmt.format(v.maxPayloadLbs)} lbs</td>
                  <td data-value="${realMax}"><strong>${fmt.format(realMax)} lbs</strong></td>
                  <td data-value="${v.gvwrLbs}">${fmt.format(v.gvwrLbs)} lbs</td>
                  <td data-value="${v.torqueLbFt}">${fmt.format(v.torqueLbFt)} lb-ft</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </section>

    ${renderAdUnit('midtool', 'home-mid-ad', 3)}

    <section class="panel deferred-section">
      <h2>Browse Used & New Tow Vehicles by Model Year (2015–2026)</h2>
      <p class="subtitle">75% of RV and boat towers pull with a used truck. Select a model year below to view all factory tow and payload ratings for that year:</p>
      <div class="link-cluster-grid">
        ${years
          .map((y) => {
            const count = vehicles.filter((v) => v.year === y).length;
            return `<a href="/years/${y}/" class="cluster-card">
              <span class="cluster-card-title">${y} Model Year Towing & Payload Chart</span>
              <span class="cluster-card-meta">${count} Trucks & SUVs Tested</span>
            </a>`;
          })
          .join('')}
      </div>
    </section>

    <section class="panel deferred-section">
      <h2>Browse Tow Vehicles by Camper & Trailer Weight Class</h2>
      <p class="subtitle">Select your target loaded trailer weight to see which trucks and SUVs pass both the towing AND payload capacity test:</p>
      <div class="link-cluster-grid">
        ${trailers
          .map(
            (t) => `<a href="/trailers/${t.slug}/" class="cluster-card">
              <span class="cluster-card-title">${t.title}</span>
              <span class="cluster-card-meta">${fmt.format(t.weightLbs)} lbs GTW • ${fmt.format(t.tongueWeightLbs)} lb Tongue (${Math.round(t.tongueRatio * 100)}%)</span>
            </a>`
          )
          .join('')}
      </div>
    </section>

    <section class="panel deferred-section">
      <h2>Popular Head-to-Head Truck & SUV Towing Showdowns</h2>
      <p class="subtitle">Click any matchup to test both vehicles side-by-side on the same dual-rig payload simulator:</p>
      <div class="link-cluster-grid">
        ${comparisonPairs
          .slice(0, 24)
          .map(
            (p) => `<a href="/compare/${p.slug}/" class="cluster-card">
              <span class="cluster-card-title">${p.a.year} ${p.a.brand} ${p.a.model} vs. ${p.b.year} ${p.b.brand} ${p.b.model}</span>
              <span class="cluster-card-meta">${fmt.format(p.a.maxTowLbs)} vs ${fmt.format(p.b.maxTowLbs)} lbs Tow • ${fmt.format(p.a.maxPayloadLbs)} vs ${fmt.format(p.b.maxPayloadLbs)} lbs Payload</span>
            </a>`
          )
          .join('')}
      </div>
    </section>

    <section class="panel deferred-section">
      <h2>Browse Towing & Payload Charts by Manufacturer</h2>
      <div class="link-cluster-grid">
        ${brands
          .map((b) => {
            const count = vehicles.filter((v) => v.brand === b).length;
            return `<a href="/brands/${slugify(b)}/" class="cluster-card">
              <span class="cluster-card-title">${b} Towing & Payload Directory</span>
              <span class="cluster-card-meta">${count} Model-Year Trims (2015–2026)</span>
            </a>`;
          })
          .join('')}
      </div>
    </section>
  `;

  const html = renderLayout({
    title: `${SITE_NAME} — 2015–2026 Truck & SUV Towing Capacity, Payload & Camper Fitment Database`,
    description: `Compare SAE J2807 towing capacity, payload limits, GVWR, GCWR, and real-world travel trailer tongue weight margins across ${vehicles.length} trucks and SUVs (2015–2026).`,
    canonicalPath: '',
    breadcrumbs: [],
    schemaJson: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: '2015-2026 SAE J2807 Truck & SUV Towing Capacity and Payload Matrix',
      description: 'Comprehensive specification dataset of towing capacity, payload limits, GVWR, GCWR, and real-world trailer tongue weight compatibility.',
      url: `${SITE_URL}/`,
      license: 'https://creativecommons.org/licenses/by/4.0/',
      isAccessibleForFree: true,
      creator: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: `${SITE_URL}/`
      }
    },
    mainContent,
    totalPagesCount
  });

  writePage('', html, sitemapUrls);
}

function buildCloudflareEdgeFiles(sitemapUrls, totalPagesCount) {
  const headersTxt = `# Cloudflare Pages Edge Caching & Security Headers
/assets/*
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff

/sitemap.xml
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400
  Content-Type: application/xml; charset=utf-8

/robots.txt
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400
  Content-Type: text/plain; charset=utf-8

/*
  Cache-Control: public, max-age=0, must-revalidate
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()
`;
  fs.writeFileSync(path.join(DIST_DIR, '_headers'), headersTxt, 'utf8');

  const redirectsTxt = `# Redirect legacy or short paths to canonical matrix directories
/vehicles/* /towing/:splat 301
/trucks/* /towing/:splat 301
/campers/* /trailers/:splat 301
`;
  fs.writeFileSync(path.join(DIST_DIR, '_redirects'), redirectsTxt, 'utf8');

  const notFoundHtml = renderLayout({
    title: `404 Page Not Found — ${SITE_NAME}`,
    description: 'Find your truck or SUV towing and payload specifications in our master directory.',
    canonicalPath: '404',
    breadcrumbs: [{ label: 'Home', url: '/' }, { label: '404 Not Found', url: '/404/' }],
    schemaJson: null,
    totalPagesCount,
    mainContent: `
      <section id="hero-panel" class="panel isolated-widget">
        <span class="brand-badge">404 • SPECIFICATION ENDPOINT NOT FOUND</span>
        <h1>Vehicle or Trailer Page Not Found</h1>
        <p class="subtitle">Use the Quick-Jump search bar at the top or return to the master SAE J2807 towing & payload matrix below:</p>
        <div class="link-cluster-grid">
          <a href="/" class="cluster-card">
            <span class="cluster-card-title">→ Open Master Vehicle Directory (${vehicles.length} Trims)</span>
            <span class="cluster-card-meta">Filter by model year (2015–2026), brand, max tow rating, and payload</span>
          </a>
          <a href="/trailers/5000-lb-single-axle-travel-trailers/" class="cluster-card">
            <span class="cluster-card-title">→ 5,000 lb Compact Travel Trailers</span>
            <span class="cluster-card-meta">Ranked compatibility across all trucks & SUVs</span>
          </a>
          <a href="/trailers/8000-lb-full-size-travel-trailers/" class="cluster-card">
            <span class="cluster-card-title">→ 8,000 lb Full-Size Slide-Out Campers</span>
            <span class="cluster-card-meta">Half-ton payload bottleneck breakdown</span>
          </a>
        </div>
      </section>
    `
  });
  fs.writeFileSync(path.join(DIST_DIR, '404.html'), notFoundHtml, 'utf8');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((u) => `  <url><loc>${u}</loc><changefreq>monthly</changefreq><priority>${u === SITE_URL + '/' ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf8');

  const robotsTxt = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf8');

  // Placeholder ads.txt ready for Google AdSense / Mediavine / Raptive publisher ID
  const adsTxt = `# TownMatrix.com Authorized Digital Sellers (IAB ads.txt)
# Replace pub-0000000000000000 with your live Google AdSense Publisher ID upon approval:
# google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
`;
  fs.writeFileSync(path.join(DIST_DIR, 'ads.txt'), adsTxt, 'utf8');

  // 5. Support Cloudflare Workers Static Assets deploy from both root (/) and dist/ working directory
  const distWranglerJson = JSON.stringify(
    {
      name: 'townmatrix',
      compatibility_date: '2026-11-01',
      assets: {
        directory: './',
        not_found_handling: '404-page'
      }
    },
    null,
    2
  );
  fs.writeFileSync(path.join(DIST_DIR, 'wrangler.jsonc'), distWranglerJson, 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, '.assetsignore'), 'wrangler.jsonc\nsrc\n', 'utf8');
  ensureDir(path.join(DIST_DIR, 'src'));
  fs.writeFileSync(
    path.join(DIST_DIR, 'src', 'build.js'),
    'console.log("[TownMatrix] Static files already pre-built in dist/ — proceeding to Cloudflare deploy.");\n',
    'utf8'
  );
}

function buildCompliancePages(sitemapUrls, totalPagesCount) {
  // 1. About & SAE J2807 Methodology Page (E-E-A-T Trust Signal)
  writePage(
    'about',
    renderLayout({
      title: `About ${SITE_NAME} — SAE J2807 Towing & Payload Engineering Methodology`,
      description: `How ${SITE_NAME} calculates real-world payload bottlenecks, tongue weight ratios, GVWR, and SAE J2807 towing capacities across 2015–2026 trucks and SUVs.`,
      canonicalPath: 'about',
      breadcrumbs: [{ label: 'Home', url: '/' }, { label: 'Methodology & About', url: '/about/' }],
      schemaJson: null,
      totalPagesCount,
      mainContent: `
        <article id="hero-panel" class="panel isolated-widget">
          <span class="brand-badge">EDITORIAL & ENGINEERING METHODOLOGY (E-E-A-T)</span>
          <h1>About ${SITE_NAME} & Our SAE J2807 Calculation Methodology</h1>
          <p class="subtitle">Why brochure "Maximum Towing Capacity" numbers mislead 90% of RV and trailer buyers—and how ${SITE_NAME} models real-world GVWR payload bottlenecks.</p>
          <h2>1. Data Sources & SAE J2807 Standards</h2>
          <p>${SITE_NAME} compiles manufacturer towing guides, SAE J2807 certification data, Gross Vehicle Weight Ratings (GVWR), Gross Combined Weight Ratings (GCWR), and base curb weights across ${vehicles.length} pickup truck and SUV configurations from model years 2015 through 2026.</p>
          <h2>2. The Real-World Payload Bottleneck Formula</h2>
          <p>Factory maximum tow ratings assume an empty base-trim vehicle with only a 150-lb driver. In real-world towing, every pound of trailer tongue weight (12%–15% for bumper-pull campers, 18%–22% for fifth-wheels), cab passengers, truck bed cargo, and weight-distribution hitch hardware subtracts directly from the vehicle's payload capacity (<code>GVWR - Curb Weight</code>). Our interactive simulator computes all three limits (Payload, Max Tow, and GCWR) simultaneously and flags whichever ceiling is reached first.</p>
        </article>
      `
    }),
    sitemapUrls
  );

  // 2. Privacy Policy Page (Mandatory for Google AdSense / Mediavine / Raptive Approval)
  writePage(
    'privacy-policy',
    renderLayout({
      title: `Privacy Policy & Cookie Disclosure — ${SITE_NAME}`,
      description: `Privacy Policy, Google AdSense DART cookie disclosure, and GDPR/CCPA data protection terms for ${SITE_NAME} (${SITE_URL}).`,
      canonicalPath: 'privacy-policy',
      breadcrumbs: [{ label: 'Home', url: '/' }, { label: 'Privacy Policy', url: '/privacy-policy/' }],
      schemaJson: null,
      totalPagesCount,
      mainContent: `
        <article id="hero-panel" class="panel isolated-widget">
          <span class="brand-badge">LEGAL & ADVERTISING COMPLIANCE</span>
          <h1>Privacy Policy & Programmatic Advertising Disclosure</h1>
          <p class="subtitle">Last Updated: November 2026 • Applicable to <strong>${SITE_URL}</strong></p>
          <h2>1. Client-Side Calculation Privacy</h2>
          <p>All towing, payload, and tongue-weight calculations on ${SITE_NAME} execute 100% locally inside your web browser. When you enter your vehicle's yellow door-jamb payload sticker number or cargo weights, that data is never transmitted to or stored on a backend database.</p>
          <h2>2. Google AdSense & Third-Party Advertising Cookies</h2>
          <p>Third-party vendors, including Google, use cookies (such as the DoubleClick DART cookie) to serve ads based on a user's prior visits to ${SITE_URL} or other websites on the internet. Google's use of advertising cookies enables it and its partners to serve personalized or non-personalized ads to our visitors.</p>
          <ul>
            <li>Users may opt out of personalized advertising by visiting <a href="https://myadcenter.google.com/" rel="nofollow noopener" target="_blank">Google Ads Settings</a>.</li>
            <li>Alternatively, you can opt out of third-party vendor cookies for personalized advertising by visiting <a href="https://optout.aboutads.info/" rel="nofollow noopener" target="_blank">www.aboutads.info</a>.</li>
          </ul>
          <h2>3. Log Files, LocalStorage & Analytics</h2>
          <p>${SITE_NAME} uses standard edge CDN log files (via Cloudflare) and browser <code>localStorage</code> solely to remember your optional Light/Dark theme override preference.</p>
        </article>
      `
    }),
    sitemapUrls
  );

  // 3. Terms of Use & Towing Safety Disclaimer
  writePage(
    'terms',
    renderLayout({
      title: `Terms of Use & Towing Safety Disclaimer — ${SITE_NAME}`,
      description: `Terms of Use and mandatory VIN door-jamb GVWR/payload verification disclaimer for ${SITE_NAME}.`,
      canonicalPath: 'terms',
      breadcrumbs: [{ label: 'Home', url: '/' }, { label: 'Terms & Safety Disclaimer', url: '/terms/' }],
      schemaJson: null,
      totalPagesCount,
      mainContent: `
        <article id="hero-panel" class="panel isolated-widget">
          <span class="brand-badge">SAFETY & LIABILITY DISCLAIMER</span>
          <h1>Terms of Use & Towing Safety Disclaimer</h1>
          <p class="subtitle">Important legal and safety notice regarding factory towing ratings vs. VIN-specific vehicle equipment.</p>
          <h2>1. Always Verify Your Physical Yellow Door-Jamb Sticker</h2>
          <p>All specifications, payload figures, and calculations provided on ${SITE_NAME} are for informational and educational reference only. Because factory options (sunroofs, running boards, larger wheels, skid plates, and trim packages) add curb weight and reduce payload on every individual vehicle, <strong>you must always verify the physical Tire and Loading Information sticker and GVWR certification label located on your specific vehicle's driver-side door jamb</strong>, as well as your owner's manual and physical CAT scale weights, before towing any trailer.</p>
          <h2>2. Limitation of Liability</h2>
          <p>${SITE_NAME} makes no warranties regarding the accuracy or completeness of any specification and assumes zero liability for equipment damage, warranty disputes, or towing incidents.</p>
        </article>
      `
    }),
    sitemapUrls
  );

  // 4. Contact & Data Correction Request Page
  writePage(
    'contact',
    renderLayout({
      title: `Contact & Specification Correction — ${SITE_NAME}`,
      description: `Contact the ${SITE_NAME} editorial and engineering data team to report a trim specification update or advertising inquiry.`,
      canonicalPath: 'contact',
      breadcrumbs: [{ label: 'Home', url: '/' }, { label: 'Contact Us', url: '/contact/' }],
      schemaJson: null,
      totalPagesCount,
      mainContent: `
        <article id="hero-panel" class="panel isolated-widget">
          <span class="brand-badge">EDITORIAL & ADVERTISING CONTACT</span>
          <h1>Contact ${SITE_NAME}</h1>
          <p class="subtitle">Have a yellow door-jamb payload submission, an OEM towing guide update, or an advertising partnership inquiry?</p>
          <h2>1. Specification & Door-Jamb Data Submissions</h2>
          <p>To submit a verified VIN door-jamb payload photo or request an additional truck/SUV trim configuration for our next build release, email our data desk at: <strong>data@townmatrix.com</strong></p>
          <h2>2. Advertising & Sponsorship Inquiries</h2>
          <p>For direct sponsorship or programmatic Private Marketplace (PMP) deals on ${SITE_URL}, contact: <strong>ads@townmatrix.com</strong></p>
        </article>
      `
    }),
    sitemapUrls
  );
}

function buildDedicatedToolPages(sitemapUrls, totalPagesCount) {
  const datasetCreator = { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` };

  // TOOL 1: CAT Scale Weigh-Station Ticket & Axle Weight Calculator (/tools/cat-scale-calculator/)
  writePage(
    'tools/cat-scale-calculator',
    renderLayout({
      title: `CAT Scale Weight Calculator: Steer, Drive & Trailer Axle + WDH Verification — ${SITE_NAME}`,
      description: `Enter your 3 CAT Scale ticket weights (Steer Axle, Drive Axle, Trailer Axle) to check legal GVWR, GCWR, FAWR, RAWR, tongue weight percentage, and Weight Distribution Hitch restoration.`,
      canonicalPath: 'tools/cat-scale-calculator',
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: 'Towing Tools', url: '/tools/cat-scale-calculator/' },
        { label: 'CAT Scale Ticket Calculator', url: '/tools/cat-scale-calculator/' }
      ],
      schemaJson: [
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'CAT Scale Weigh-Station Axle Weight Calculator', url: `${SITE_URL}/tools/cat-scale-calculator/`, applicationCategory: 'UtilitiesApplication' },
        { '@context': 'https://schema.org', '@type': 'Dataset', name: 'CAT Scale Axle & WDH Verification Matrix', description: 'Interactive truck and travel trailer CAT Scale weigh-station axle compliance calculator.', url: `${SITE_URL}/tools/cat-scale-calculator/`, isAccessibleForFree: true, license: 'https://creativecommons.org/licenses/by/4.0/', creator: datasetCreator }
      ],
      totalPagesCount,
      mainContent: `
        <article id="hero-panel" class="panel isolated-widget">
          <span class="brand-badge">SAE J2807 WEIGH-STATION AUDIT</span>
          <h1>CAT Scale Ticket &amp; Axle Weight Distribution Calculator</h1>
          <p class="subtitle">Weighed your loaded truck &amp; camper at a truck stop? Enter your 3 CAT Scale ticket pads below (plus your unloaded truck weight) to verify <strong>GVWR, GCWR, Rear Axle (RAWR), Tongue Weight %, and WDH front-axle restoration</strong>.</p>
          <div id="cat-scale-rig-badge" style="font-family:var(--font-mono);font-size:0.82rem;font-weight:700;margin-block-end:0.6rem;"></div>

          <section id="tool-cat-scale">
            <div class="tool-input-grid">
              <div class="tool-field"><label for="cs-steer">Pad 1: Steer Axle Loaded (lbs)</label><input id="cs-steer" type="number" min="1500" max="9000" value="3180"></div>
              <div class="tool-field"><label for="cs-drive">Pad 2: Drive / Rear Axle Loaded (lbs)</label><input id="cs-drive" type="number" min="1500" max="11000" value="3640"></div>
              <div class="tool-field"><label for="cs-trailer">Pad 3: Trailer Axles Loaded (lbs)</label><input id="cs-trailer" type="number" min="500" max="25000" value="6420"></div>
              <div class="tool-field"><label for="cs-truck-only">Truck Only Total Weight (No Trailer, lbs)</label><input id="cs-truck-only" type="number" min="3000" max="12000" value="5880"></div>
              <div class="tool-field"><label for="cs-gvwr">Truck Door-Sticker GVWR (lbs)</label><input id="cs-gvwr" type="number" min="4000" max="16000" value="7050"></div>
              <div class="tool-field"><label for="cs-rawr">Truck Rear Axle Rating RAWR (lbs)</label><input id="cs-rawr" type="number" min="2500" max="11000" value="3800"></div>
              <div class="tool-field"><label for="cs-gcwr">Truck Max GCWR (lbs)</label><input id="cs-gcwr" type="number" min="8000" max="40000" value="16200"></div>
              <div class="tool-field"><label for="cs-steer-unloaded">Truck Steer Axle Unloaded (Optional WDH Check)</label><input id="cs-steer-unloaded" type="number" min="1500" max="8000" value="3260"></div>
            </div>

            <div class="verdict-banner" id="cs-verdict" data-status="safe" role="status" aria-live="polite">
              <div class="verdict-title"><span id="cs-verdict-title">Evaluating CAT Scale Compliance...</span><span class="badge badge-safe" id="cs-verdict-badge">READY</span></div>
              <p id="cs-verdict-desc" style="margin:0;font-size:0.88rem;"></p>
            </div>

            <div class="spec-kpi-grid">
              <div class="kpi-box highlight"><span class="kpi-label">Actual Tongue Weight</span><span class="kpi-value" id="cs-out-tongue">--</span><span class="kpi-sub" id="cs-out-tongue-pct">--% of trailer</span></div>
              <div class="kpi-box"><span class="kpi-label">Total Trailer Weight</span><span class="kpi-value" id="cs-out-gtw">--</span><span class="kpi-sub">Trailer Axles + Tongue</span></div>
              <div class="kpi-box"><span class="kpi-label">Truck GVWR Headroom</span><span class="kpi-value" id="cs-out-gvwr">--</span><span class="kpi-sub">Steer + Drive vs GVWR</span></div>
              <div class="kpi-box"><span class="kpi-label">Rear Axle (RAWR) Margin</span><span class="kpi-value" id="cs-out-rawr">--</span><span class="kpi-sub" id="cs-out-wdh">WDH Check</span></div>
            </div>

            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-block-top:0.6rem;">
              <button type="button" id="btn-save-cat-ticket" class="garage-btn">📌 Save CAT Scale Ticket</button>
              <button type="button" onclick="window.print()" class="preset-btn">⎙ Print Scale Audit</button>
            </div>
            <div id="cat-ticket-history" style="margin-block-start:1rem;"></div>
          </section>
        </article>
      `
    }),
    sitemapUrls
  );

  // TOOL 2: SAE J2807 Altitude & Mountain Grade Towing Derating (/tools/altitude-mountain-towing/)
  writePage(
    'tools/altitude-mountain-towing',
    renderLayout({
      title: `High-Altitude & Mountain Grade Towing Derating Calculator (SAE J2807) — ${SITE_NAME}`,
      description: `Calculate real horsepower and towing capacity loss at high elevations (Rockies, Eisenhower Tunnel, I-70) for Naturally Aspirated V8/V6 vs Turbocharged EcoBoost & Turbo-Diesel trucks.`,
      canonicalPath: 'tools/altitude-mountain-towing',
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: 'Towing Tools', url: '/tools/altitude-mountain-towing/' },
        { label: 'Mountain Grade & Altitude Derating', url: '/tools/altitude-mountain-towing/' }
      ],
      schemaJson: [
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Mountain Grade & Elevation Towing Derating Calculator', url: `${SITE_URL}/tools/altitude-mountain-towing/`, applicationCategory: 'UtilitiesApplication' },
        { '@context': 'https://schema.org', '@type': 'Dataset', name: 'Elevation & Grade Towing Derating Dataset', description: 'Atmospheric air-density power loss and grade gravity drag calculations for towing vehicles.', url: `${SITE_URL}/tools/altitude-mountain-towing/`, isAccessibleForFree: true, license: 'https://creativecommons.org/licenses/by/4.0/', creator: datasetCreator }
      ],
      totalPagesCount,
      mainContent: `
        <article id="hero-panel" class="panel isolated-widget">
          <span class="brand-badge">HIGH-ELEVATION &amp; 6%–8% GRADE PHYSICS</span>
          <h1>Mountain Grade &amp; High-Altitude Towing Derating Calculator</h1>
          <p class="subtitle">Crossing the Rockies, I-70 Eisenhower Tunnel (11,158 ft), or Sierra Nevada? Naturally aspirated gas engines lose <strong>~3% power per 1,000 ft of elevation</strong>, while turbo gas &amp; diesel engines compensate via boost (~1% loss per 1,000 ft).</p>
          <div id="alt-rig-badge" style="font-family:var(--font-mono);font-size:0.82rem;font-weight:700;margin-block-end:0.6rem;"></div>

          <section id="tool-altitude">
            <div class="tool-input-grid">
              <div class="tool-field"><label for="alt-tow">Factory Sea-Level Tow Rating (lbs)</label><input id="alt-tow" type="number" min="2000" max="38000" value="10500"></div>
              <div class="tool-field"><label for="alt-trailer">Your Loaded Trailer Weight (lbs)</label><input id="alt-trailer" type="number" min="1000" max="30000" value="7500"></div>
              <div class="tool-field"><label for="alt-engine-type">Engine Aspiration Type</label>
                <select id="alt-engine-type">
                  <option value="na">Naturally Aspirated Gas (V8 / V6 — 3% loss / 1,000 ft)</option>
                  <option value="turbo">Turbocharged Gas (EcoBoost / i-FORCE MAX — 1% loss / 1,000 ft)</option>
                  <option value="diesel">Turbo-Diesel (Power Stroke / Duramax / Cummins — 0.8% loss / 1,000 ft)</option>
                </select>
              </div>
              <div class="tool-field"><label for="alt-elev">Peak Pass Elevation: <strong id="alt-elev-val">7,000 ft</strong></label><input id="alt-elev" type="range" min="0" max="12000" step="500" value="7000"></div>
              <div class="tool-field"><label for="alt-grade">Steepest Highway Grade: <strong id="alt-grade-val">6%</strong></label><input id="alt-grade" type="range" min="0" max="10" step="1" value="6"></div>
              <div class="tool-field"><label for="alt-temp">Ambient Summer Temp (°F)</label><input id="alt-temp" type="number" min="20" max="120" value="90"></div>
            </div>

            <div class="verdict-banner" id="alt-verdict" data-status="safe" role="status" aria-live="polite">
              <div class="verdict-title"><span id="alt-verdict-title">Calculating Mountain Pass Margin...</span><span class="badge badge-safe" id="alt-verdict-badge">READY</span></div>
              <p id="alt-verdict-desc" style="margin:0;font-size:0.88rem;"></p>
            </div>

            <div class="spec-kpi-grid">
              <div class="kpi-box highlight"><span class="kpi-label">Elevation-Adjusted Tow Limit</span><span class="kpi-value" id="alt-out-limit">--</span><span class="kpi-sub">Effective safe pull rating</span></div>
              <div class="kpi-box"><span class="kpi-label">Engine Power Retained</span><span class="kpi-value" id="alt-out-pwr">--</span><span class="kpi-sub">Air-density + heat factor</span></div>
              <div class="kpi-box"><span class="kpi-label">Gravity Pull Resistance</span><span class="kpi-value" id="alt-out-drag">--</span><span class="kpi-sub">Extra grade pulling force</span></div>
              <div class="kpi-box"><span class="kpi-label">Target Climb Speed</span><span class="kpi-value" id="alt-out-speed">--</span><span class="kpi-sub">Keeps trans oil &lt; 225°F</span></div>
            </div>
          </section>
        </article>
      `
    }),
    sitemapUrls
  );

  // TOOL 3: Auto-Saved Pre-Trip Hitch & RV Safety Checklist (/tools/tow-checklist/)
  const checkItems = [
    ['ball', 'Coupler fully seated over hitch ball, latch locked & safety pin inserted'],
    ['wdh', 'Weight Distribution Hitch (WDH) spring bars snapped up & sway control engaged'],
    ['chains', 'Safety chains crossed in an "X" pattern under tongue (not dragging asphalt)'],
    ['breakaway', 'Emergency breakaway switch cable clipped to truck frame (NOT safety chain loop)'],
    ['plug', '7-way trailer wiring plug locked in — test left/right turn, brake & running lights'],
    ['brakegain', 'Tug-test trailer brakes manually via in-cab brake controller at 5 MPH'],
    ['tires', 'Cold tire PSI checked on all 4 truck tires AND trailer tires + spare tire'],
    ['lugs', 'Trailer wheel lug nuts torqued to spec (typically 90–120 ft-lbs)'],
    ['jacks', 'Tongue jack, stabilizer jacks, wheel chocks & entry steps fully retracted'],
    ['propane', 'Propane cylinders shut off, awning locked, roof vents closed & TV antenna down'],
    ['mirrors', 'Tow mirrors extended & adjusted for full blind-spot + trailer tire visibility'],
    ['sticker', 'Loaded cargo verified below yellow door-jamb payload sticker & rear axle rating']
  ];
  writePage(
    'tools/tow-checklist',
    renderLayout({
      title: `Pre-Trip Towing & RV Hitch Safety Checklist (Auto-Saved & Printable) — ${SITE_NAME}`,
      description: `Bookmarkable 12-point pre-departure towing, Weight Distribution Hitch, breakaway cable, and brake controller safety checklist saved automatically in your browser for every camping trip.`,
      canonicalPath: 'tools/tow-checklist',
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: 'Towing Tools', url: '/tools/tow-checklist/' },
        { label: 'Pre-Trip Hitch Checklist', url: '/tools/tow-checklist/' }
      ],
      schemaJson: { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Pre-Trip RV & Trailer Hitch Safety Checklist', url: `${SITE_URL}/tools/tow-checklist/`, applicationCategory: 'UtilitiesApplication' },
      totalPagesCount,
      mainContent: `
        <article id="hero-panel" class="panel isolated-widget">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.5rem;">
            <div>
              <span class="brand-badge">BOOKMARK FOR EVERY TRIP</span>
              <h1 style="margin-block-end:0.25rem;">12-Point Pre-Trip Hitch &amp; RV Departure Checklist</h1>
            </div>
            <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
              <button type="button" id="btn-reset-tow-check" class="preset-btn">↺ Reset for Next Trip</button>
              <button type="button" onclick="window.print()" class="garage-btn">⎙ Print Glovebox Copy</button>
            </div>
          </div>
          <p class="subtitle">Check off each safety step before pulling out of the driveway or campsite. Your progress saves automatically in your phone browser.</p>
          <div class="verdict-banner" id="tow-check-banner" data-status="warn" role="status">
            <div class="verdict-title"><span id="tow-check-status">0 / 12 Safety Checks Complete</span><span class="badge badge-warn" id="tow-check-badge">IN PROGRESS</span></div>
          </div>
          <div id="tool-tow-checklist">
            ${checkItems.map(([id, text], idx) => `
              <div class="checklist-row" data-chk-id="${id}">
                <input type="checkbox" id="tchk-${id}" style="margin-top:0.2rem;transform:scale(1.2);">
                <label for="tchk-${id}"><strong>${idx + 1}.</strong> ${text}</label>
              </div>`).join('')}
          </div>
        </article>
      `
    }),
    sitemapUrls
  );

  // TOOL 4: My Garage Side-by-Side Comparison Hub (/tools/garage-compare/)
  writePage(
    'tools/garage-compare',
    renderLayout({
      title: `My Garage Shortlist: Compare Your Saved Trucks & Trailers Side-by-Side — ${SITE_NAME}`,
      description: `Compare all the trucks and SUVs you saved to My Garage side by side by Max Tow, Payload Capacity, GVWR, GCWR, and real-world travel trailer headroom.`,
      canonicalPath: 'tools/garage-compare',
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: 'My Garage Shortlist', url: '/tools/garage-compare/' }
      ],
      schemaJson: { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'My Garage Saved Trucks Side-by-Side Comparison', url: `${SITE_URL}/tools/garage-compare/`, applicationCategory: 'UtilitiesApplication' },
      totalPagesCount,
      mainContent: `
        <article id="hero-panel" class="panel isolated-widget">
          <span class="brand-badge">DEALERSHIP COMPARISON HUB</span>
          <h1>My Garage — Saved Trucks &amp; Trailer Shortlist</h1>
          <p class="subtitle">Every truck you bookmark with <strong>📌 Save to My Garage</strong> appears below in a clean side-by-side comparison table so you can compare payloads right on the dealership lot.</p>
          <div id="tool-garage-compare"></div>
        </article>
      `
    }),
    sitemapUrls
  );
}

function runBuild() {
  const startTime = Date.now();
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  ensureDir(DIST_DIR);
  ensureDir(path.join(DIST_DIR, 'assets'));

  fs.writeFileSync(path.join(DIST_DIR, 'assets', hashedJsFilename), minifiedJs, 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, 'assets', 'styles.css'), criticalCss, 'utf8');

  const sitemapUrls = [];
  const comparisonPairs = generateComparisonPairs();
  const brandsCount = new Set(vehicles.map((v) => v.brand)).size;
  const yearsCount = new Set(vehicles.map((v) => v.year)).size;
  const totalPagesCount = 9 + vehicles.length + comparisonPairs.length + trailers.length + brandsCount + yearsCount;

  buildHomepage(comparisonPairs, sitemapUrls, totalPagesCount);
  buildVehiclePages(comparisonPairs, sitemapUrls, totalPagesCount);
  buildComparisonPages(comparisonPairs, sitemapUrls, totalPagesCount);
  buildTrailerClassPages(sitemapUrls, totalPagesCount);
  buildBrandPages(sitemapUrls, totalPagesCount);
  buildYearPages(sitemapUrls, totalPagesCount);
  buildDedicatedToolPages(sitemapUrls, totalPagesCount);
  buildCompliancePages(sitemapUrls, totalPagesCount);
  buildCloudflareEdgeFiles(sitemapUrls, totalPagesCount);

  const elapsedMs = Date.now() - startTime;
  console.log(`[TowSpecMatrix Trajectory B SSG] Built ${sitemapUrls.length} static HTML pages in ${elapsedMs}ms!`);
  console.log(`  - 1 Master Directory & Interactive Matcher Homepage`);
  console.log(`  - ${vehicles.length} Individual Vehicle Towing & Payload Workbench Pages (2015–2026) (/towing/...)`);
  console.log(`  - ${comparisonPairs.length} Head-to-Head Dual-Simulator Comparison Pages (/compare/...)`);
  console.log(`  - ${yearsCount} Model-Year Towing & Payload Directories (/years/2015..2026/)`);
  console.log(`  - ${trailers.length} Trailer Weight-Class Fitment Directories (/trailers/...)`);
  console.log(`  - ${brandsCount} Manufacturer Brand Hub Pages (/brands/...)`);
}

runBuild();
