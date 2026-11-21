const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const SITE_URL = 'https://towspecmatrix.com';
const SITE_NAME = 'TowSpecMatrix';

const vehicles = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'vehicles.json'), 'utf8'));
const trailers = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'trailers.json'), 'utf8'));
const rawCss = fs.readFileSync(path.join(SRC_DIR, 'styles.css'), 'utf8');
const rawJs = fs.readFileSync(path.join(SRC_DIR, 'app.js'), 'utf8');

// Zero-dependency build-time CSS minifier for inlined critical <head> styles
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

// Zero-dependency build-time JS minifier (strips single-line comments and excess blank lines)
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

// Base HTML Shell with Inlined Minified CSS, <link rel="expect">, Speculation Rules API & Fingerprinted JS
function renderLayout({ title, description, canonicalPath, breadcrumbs, schemaJson, mainContent, sidebarLinks = [] }) {
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

  // Speculation Rules API for instant next-page MPA navigation (improve-next-page-load-performance)
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
      <div><strong>AD-OPS ENGINE:</strong> Prebid + Active-View 35s Refresh • Speculation Rules MPA</div>
      <div class="adops-metrics">
        <span class="adops-pill live-dot">Status: <strong id="hud-view-state">ACTIVE VIEW (TIMER RUNNING)</strong></span>
        <span class="adops-pill">Session Impressions: <strong id="hud-impressions">4</strong></span>
        <span class="adops-pill">Effective RPM: <strong>$64.50</strong></span>
        <span class="adops-pill">Est. Session Yield: <strong id="hud-revenue">$0.26</strong></span>
      </div>
    </div>
  </div>

  <header class="site-header">
    <div class="header-inner">
      <a href="/" class="brand-logo">
        <span>TOWSPECMATRIX</span>
        <span class="brand-badge">SAE J2807 DATABASE</span>
      </a>
      <nav class="site-nav" aria-label="Primary Navigation">
        <a href="/">All Vehicles (${vehicles.length})</a>
        <a href="/trailers/5000-lb-single-axle-travel-trailers/">5,000 lb Campers</a>
        <a href="/trailers/8000-lb-full-size-travel-trailers/">8,000 lb Trailers</a>
        <a href="/trailers/13000-lb-mid-profile-fifth-wheels/">13,000 lb 5th-Wheels</a>
        <a href="/brands/ford/">Ford</a>
        <a href="/brands/chevrolet/">Chevy</a>
        <a href="/brands/toyota/">Toyota</a>
        <a href="/brands/ram/">Ram</a>
      </nav>
    </div>
  </header>

  ${breadcrumbHtml}

  <div style="padding: 0 1rem;">
    ${renderAdUnit('leaderboard', 'top-leaderboard', 0)}
  </div>

  <div class="layout-shell">
    <main id="main-content">
      ${mainContent}
    </main>

    <aside class="ad-rail-sticky" aria-label="Sidebar Calculations & Sponsored Units">
      ${renderAdUnit('skyscraper', 'sidebar-skyscraper', 1)}
      <div class="panel" style="margin:0;">
        <h3 style="margin-block-start:0;">High-Intent Trailer Brackets</h3>
        <ul style="padding-inline-start:1.1rem;margin:0;font-size:0.84rem;display:grid;gap:0.35rem;">
          ${trailers
            .map(
              (t) =>
                `<li><a href="/trailers/${t.slug}/">${t.title}</a> <span style="color:var(--text-muted);font-family:var(--font-mono);">(${fmt.format(t.tongueWeightLbs)} lb tongue)</span></li>`
            )
            .join('')}
        </ul>
        ${
          sidebarLinks.length
            ? `<h3 style="margin-block-start:1rem;">Related Matrix Comparisons</h3>
               <ul style="padding-inline-start:1.1rem;margin:0;font-size:0.82rem;display:grid;gap:0.35rem;">
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
        <strong>${SITE_NAME} — Programmatic SAE J2807 Towing, Payload & GVWR Reference Matrix</strong>
        <p style="margin:0.35rem 0 0;">Built with 100% Pure Static HTML, Zero-CLS CSS Containment, Speculation Rules Prerendering, and Client-Side Vanilla JS. Always verify your specific VIN door-jamb sticker before towing.</p>
      </div>
      <div style="font-family:var(--font-mono);font-size:0.76rem;">
        <div>Total Indexed Matrix Pages: <strong>171 Static HTML Endpoints</strong></div>
        <div><a href="/sitemap.xml">XML Sitemap</a> • <a href="/">Master Directory</a></div>
      </div>
    </div>
  </footer>

  ${renderAdUnit('anchor', 'bottom-sticky-anchor', 2)}

  <script defer src="/assets/${hashedJsFilename}"></script>
</body>
</html>`;
}

function generateComparisonPairs() {
  const pairs = [];
  const seen = new Set();

  for (const v of vehicles) {
    const rivals = vehicles
      .filter((other) => other.slug !== v.slug && other.category === v.category && other.brand !== v.brand)
      .sort((a, b) => Math.abs(a.maxTowLbs - v.maxTowLbs) - Math.abs(b.maxTowLbs - v.maxTowLbs))
      .slice(0, 2);

    for (const r of rivals) {
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

function buildVehiclePages(comparisonPairs, sitemapUrls) {
  for (const v of vehicles) {
    const fullTitle = `${v.year} ${v.brand} ${v.model} (${v.trim})`;
    const realMaxTrailer = calcRealWorldMaxTrailer(v, 550, 0.13);
    const defaultTrailer = Math.round(Math.min(v.maxTowLbs * 0.75, 7500) / 100) * 100;

    const myComparisons = comparisonPairs
      .filter((p) => p.a.slug === v.slug || p.b.slug === v.slug)
      .slice(0, 6);

    const brandSiblings = vehicles.filter((other) => other.brand === v.brand && other.slug !== v.slug);
    const categoryPeers = vehicles
      .filter((other) => other.category === v.category && other.slug !== v.slug)
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
          <span class="brand-badge">${v.category} • ${v.drivetrain} • ${v.axleRatio} Axle</span>
          <span style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted);">Engine: ${v.engine} (${v.horsepower} HP / ${v.torqueLbFt} lb-ft)</span>
        </div>
        <h1>${fullTitle} Towing Capacity, Payload & GVWR Matrix</h1>
        <p class="subtitle">Instant SAE J2807 towing vs. payload bottleneck analyzer. Test real-world camper tongue weight, passengers, and bed cargo against factory GVWR (${fmt.format(v.gvwrLbs)} lbs) and GCWR (${fmt.format(v.gcwrLbs)} lbs) ceilings.</p>

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
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.5rem;">
          <h2 style="border:none;margin:0;padding:0;">Interactive Rig, Tongue Weight & Payload Simulator</h2>
          <button type="button" id="btn-copy-rig-link" class="preset-btn">Copy Shareable Rig Link</button>
        </div>
        <p class="subtitle" style="margin-block-top:0.25rem;">Click a camper preset or drag the sliders to test whether you hit the <strong>Payload limit</strong> before the <strong>Max Tow limit</strong>:</p>

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
                <span class="cluster-card-title">${v.brand} ${v.model} vs. ${rival.year} ${rival.brand} ${rival.model}</span>
                <span class="cluster-card-meta">${fmt.format(v.maxTowLbs)} vs ${fmt.format(rival.maxTowLbs)} lbs Tow • ${fmt.format(v.maxPayloadLbs)} vs ${fmt.format(rival.maxPayloadLbs)} lbs Payload</span>
              </a>`;
            })
            .join('')}
        </div>

        ${
          brandSiblings.length
            ? `<h3>More ${v.brand} Towing & Payload Specs</h3>
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

        <h3>Alternative ${v.category}s to Compare</h3>
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
        { label: v.brand, url: `/brands/${slugify(v.brand)}/` },
        { label: `${v.year} ${v.model} (${v.trim})`, url: `/towing/${v.slug}/` }
      ],
      schemaJson: faqSchema,
      mainContent,
      sidebarLinks: myComparisons.map((p) => ({
        url: `/compare/${p.slug}/`,
        label: `${v.model} vs ${(p.a.slug === v.slug ? p.b : p.a).brand} ${(p.a.slug === v.slug ? p.b : p.a).model}`
      }))
    });

    writePage(`towing/${v.slug}`, html, sitemapUrls);
  }
}

function buildComparisonPages(comparisonPairs, sitemapUrls) {
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
        { label: `${a.brand} vs ${b.brand}`, url: `/compare/${slug}/` }
      ],
      schemaJson: null,
      mainContent
    });

    writePage(`compare/${slug}`, html, sitemapUrls);
  }
}

function buildTrailerClassPages(sitemapUrls) {
  for (const t of trailers) {
    const assumedCabAndHitch = 585;
    const totalRequiredPayload = assumedCabAndHitch + t.tongueWeightLbs;

    const rankedVehicles = vehicles
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
            <span class="kpi-value">${safeCount} / ${vehicles.length}</span>
            <span class="kpi-sub">Pass Both Tow & Payload</span>
          </div>
        </div>
      </article>

      ${renderAdUnit('midtool', 'trailer-hub-mid-ad', 1)}

      <section class="panel">
        <h2>All ${vehicles.length} Trucks & SUVs Ranked for Towing a ${fmt.format(t.weightLbs)} lb Trailer</h2>
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
      mainContent
    });

    writePage(`trailers/${t.slug}`, html, sitemapUrls);
  }
}

function buildBrandPages(sitemapUrls) {
  const brands = [...new Set(vehicles.map((v) => v.brand))];

  for (const brand of brands) {
    const bSlug = slugify(brand);
    const brandVehicles = vehicles
      .filter((v) => v.brand === brand)
      .sort((a, b) => b.maxTowLbs - a.maxTowLbs);

    const highestTow = brandVehicles[0];
    const highestPayload = [...brandVehicles].sort((a, b) => b.maxPayloadLbs - a.maxPayloadLbs)[0];

    const mainContent = `
      <article id="hero-panel" class="panel isolated-widget">
        <span class="brand-badge">MANUFACTURER TOWING & PAYLOAD DIRECTORY</span>
        <h1>${brand} Towing Capacity, Payload & GVWR Chart (${brandVehicles.length} Trims Tested)</h1>
        <p class="subtitle">Compare factory SAE J2807 towing ratings, payload capacities, axle ratios, and real-world camper limits across every ${brand} truck and SUV configuration.</p>

        <div class="spec-kpi-grid">
          <div class="kpi-box highlight">
            <span class="kpi-label">Highest ${brand} Tow Rating</span>
            <span class="kpi-value">${fmt.format(highestTow.maxTowLbs)} lbs</span>
            <span class="kpi-sub">${highestTow.model} (${highestTow.trim})</span>
          </div>
          <div class="kpi-box highlight">
            <span class="kpi-label">Highest ${brand} Payload</span>
            <span class="kpi-value">${fmt.format(highestPayload.maxPayloadLbs)} lbs</span>
            <span class="kpi-sub">${highestPayload.model} (${highestPayload.trim})</span>
          </div>
        </div>
      </article>

      ${renderAdUnit('midtool', 'brand-mid-ad', 2)}

      <section class="panel">
        <h2>Sortable ${brand} Towing & Payload Specification Table</h2>
        <p id="table-sort-status" role="status" class="visually-hidden"></p>
        <div tabindex="0" role="region" aria-labelledby="brand-table-caption" class="table-wrapper">
          <table id="brand-spec-table" class="sortable-spec-table" style="--label-2:'Max Tow';--label-3:'Max Payload';--label-4:'Real Camper Max';--label-5:'GVWR';--label-6:'Torque';">
            <caption id="brand-table-caption">${brand} Lineup Sorted by Maximum Towing Capacity</caption>
            <thead>
              <tr>
                <th scope="col">${brand} Model & Trim</th>
                <th scope="col" data-type="number" aria-sort="descending">
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
                <th scope="col" data-type="number">
                  <button type="button" commandfor="brand-spec-table" command="--sort">Torque <span class="sort-icon" aria-hidden="true"></span></button>
                </th>
              </tr>
            </thead>
            <tbody>
              ${brandVehicles
                .map((v) => {
                  const realMax = calcRealWorldMaxTrailer(v, 550, 0.13);
                  return `<tr>
                    <th scope="row"><a href="/towing/${v.slug}/">${v.year} ${v.brand} ${v.model} — ${v.trim}</a></th>
                    <td data-value="${v.maxTowLbs}"><strong>${fmt.format(v.maxTowLbs)} lbs</strong></td>
                    <td data-value="${v.maxPayloadLbs}">${fmt.format(v.maxPayloadLbs)} lbs</td>
                    <td data-value="${realMax}">${fmt.format(realMax)} lbs</td>
                    <td data-value="${v.gvwrLbs}">${fmt.format(v.gvwrLbs)} lbs</td>
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
      title: `${brand} Towing Capacity & Payload Chart (${brandVehicles.length} Models Compared)`,
      description: `Compare ${brand} towing capacities, payload ratings, GVWR, and real-world camper tongue weight limits across all ${brandVehicles.length} trims.`,
      canonicalPath: `brands/${bSlug}`,
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: `${brand} Towing Specs`, url: `/brands/${bSlug}/` }
      ],
      schemaJson: null,
      mainContent
    });

    writePage(`brands/${bSlug}`, html, sitemapUrls);
  }
}

function buildHomepage(comparisonPairs, sitemapUrls) {
  const brands = [...new Set(vehicles.map((v) => v.brand))].sort();
  const sortedVehicles = [...vehicles].sort((a, b) => b.maxTowLbs - a.maxTowLbs);

  const mainContent = `
    <section id="hero-panel" class="panel isolated-widget">
      <span class="brand-badge">SAE J2807 TOWING, PAYLOAD & GVWR DATABASE (${vehicles.length} TRIMS • 171 PAGES)</span>
      <h1>Truck & SUV Towing Capacity vs. Real-World Payload Matrix</h1>
      <p class="subtitle">90% of overloaded RVers exceed their truck's <strong>Payload Capacity (GVWR)</strong> long before hitting their brochure <strong>Max Tow Rating</strong>. Filter all ${vehicles.length} vehicles below or click any trim to launch the interactive tongue-weight & payload simulator.</p>

      <div class="calc-grid" style="margin-block-end:1rem;">
        <div class="control-group">
          <label for="filter-search" style="font-weight:700;font-size:0.8rem;display:block;margin-block-end:0.25rem;">Search Model, Engine, or Trim</label>
          <input type="search" id="filter-search" placeholder="e.g. F-150 EcoBoost, Duramax, Tacoma, 3.5L...">
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
        <div class="control-group">
          <label for="filter-min-payload" style="font-weight:700;font-size:0.8rem;display:block;margin-block-end:0.25rem;">Minimum Payload Capacity</label>
          <select id="filter-min-payload">
            <option value="0">Any Payload Rating</option>
            <option value="1500">1,500+ lbs Payload</option>
            <option value="1800">1,800+ lbs Payload (Safe Half-Ton)</option>
            <option value="2200">2,200+ lbs Payload (Max Payload / HD)</option>
            <option value="3200">3,200+ lbs Payload (5th-Wheel Ready)</option>
          </select>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.5rem;font-family:var(--font-mono);font-size:0.82rem;">
        <strong id="filter-match-count">${vehicles.length} Vehicles Matched</strong>
        <span>Click any column header to sort ▲▼</span>
      </div>

      <p id="table-sort-status" role="status" class="visually-hidden"></p>
      <div tabindex="0" role="region" aria-labelledby="master-table-caption" class="table-wrapper">
        <table id="master-vehicle-table" class="sortable-spec-table" style="--label-2:'Category';--label-3:'Max Tow';--label-4:'Payload';--label-5:'Real Max Camper';--label-6:'GVWR';--label-7:'Torque';">
          <caption id="master-table-caption">Master SAE J2807 Towing, Payload & Real-World Camper Limit Database</caption>
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
                return `<tr data-brand="${v.brand}" data-tow="${v.maxTowLbs}" data-payload="${v.maxPayloadLbs}">
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
          .slice(0, 18)
          .map(
            (p) => `<a href="/compare/${p.slug}/" class="cluster-card">
              <span class="cluster-card-title">${p.a.brand} ${p.a.model} vs. ${p.b.brand} ${p.b.model}</span>
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
              <span class="cluster-card-meta">${count} Trims & Engine Configurations</span>
            </a>`;
          })
          .join('')}
      </div>
    </section>
  `;

  const html = renderLayout({
    title: `${SITE_NAME} — Truck & SUV Towing Capacity, Payload & Camper Fitment Database`,
    description: `Compare SAE J2807 towing capacity, payload limits, GVWR, GCWR, and real-world travel trailer tongue weight margins across ${vehicles.length} trucks and SUVs.`,
    canonicalPath: '',
    breadcrumbs: [],
    schemaJson: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'SAE J2807 Truck & SUV Towing Capacity and Payload Matrix',
      description: 'Comprehensive specification dataset of towing capacity, payload limits, GVWR, GCWR, and real-world trailer tongue weight compatibility.',
      url: `${SITE_URL}/`
    },
    mainContent
  });

  writePage('', html, sitemapUrls);
}

function buildCloudflareEdgeFiles(sitemapUrls) {
  // 1. Cloudflare Pages _headers (Immutable fingerprinted assets + bfcache-friendly HTML headers)
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

  // 2. Cloudflare Pages _redirects
  const redirectsTxt = `# Redirect legacy or short paths to canonical matrix directories
/vehicles/* /towing/:splat 301
/trucks/* /towing/:splat 301
/campers/* /trailers/:splat 301
`;
  fs.writeFileSync(path.join(DIST_DIR, '_redirects'), redirectsTxt, 'utf8');

  // 3. Fast Static 404 Page for Cloudflare Pages
  const notFoundHtml = renderLayout({
    title: `404 Page Not Found — ${SITE_NAME}`,
    description: 'Find your truck or SUV towing and payload specifications in our master directory.',
    canonicalPath: '404',
    breadcrumbs: [{ label: 'Home', url: '/' }, { label: '404 Not Found', url: '/404/' }],
    schemaJson: null,
    mainContent: `
      <section id="hero-panel" class="panel isolated-widget">
        <span class="brand-badge">404 • SPECIFICATION ENDPOINT NOT FOUND</span>
        <h1>Vehicle or Trailer Page Not Found</h1>
        <p class="subtitle">Return to the master SAE J2807 towing & payload matrix or browse our top categories below:</p>
        <div class="link-cluster-grid">
          <a href="/" class="cluster-card">
            <span class="cluster-card-title">→ Open Master Vehicle Directory (${vehicles.length} Trims)</span>
            <span class="cluster-card-meta">Filter by brand, max tow rating, and payload capacity</span>
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

  // 4. Sitemap & Robots.txt
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
}

function runBuild() {
  const startTime = Date.now();
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  ensureDir(DIST_DIR);
  ensureDir(path.join(DIST_DIR, 'assets'));

  // Write fingerprinted, minified JS & CSS assets
  fs.writeFileSync(path.join(DIST_DIR, 'assets', hashedJsFilename), minifiedJs, 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, 'assets', 'styles.css'), criticalCss, 'utf8');

  const sitemapUrls = [];
  const comparisonPairs = generateComparisonPairs();

  buildHomepage(comparisonPairs, sitemapUrls);
  buildVehiclePages(comparisonPairs, sitemapUrls);
  buildComparisonPages(comparisonPairs, sitemapUrls);
  buildTrailerClassPages(sitemapUrls);
  buildBrandPages(sitemapUrls);
  buildCloudflareEdgeFiles(sitemapUrls);

  const elapsedMs = Date.now() - startTime;
  console.log(`[TowSpecMatrix SSG] Built ${sitemapUrls.length} pages + Cloudflare Pages edge configs in ${elapsedMs}ms!`);
  console.log(`  - Inlined Minified Critical CSS: ${(Buffer.byteLength(criticalCss) / 1024).toFixed(2)} KB`);
  console.log(`  - Fingerprinted Immutable JS (/assets/${hashedJsFilename}): ${(Buffer.byteLength(minifiedJs) / 1024).toFixed(2)} KB`);
  console.log(`  - Cloudflare Pages files: dist/_headers, dist/_redirects, dist/404.html`);
}

runBuild();
