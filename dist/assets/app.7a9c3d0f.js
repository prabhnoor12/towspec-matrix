(function () {
'use strict';
const fmtNum = new Intl.NumberFormat('en-US');
const fmtCurrency = new Intl.NumberFormat('en-US', {
style: 'currency',
currency: 'USD',
minimumFractionDigits: 2
});
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const supportsAccentColor =
typeof CSS !== 'undefined' && CSS.supports && CSS.supports('accent-color', '#1d4ed8');
function initThemeToggle() {
const meta = document.querySelector('meta[name="color-scheme"]');
const btn = document.getElementById('theme-toggle-btn');
if (!meta || !btn) return;
const mql = window.matchMedia('(prefers-color-scheme: dark)');
function getSystemScheme() {
return mql.matches ? 'dark' : 'light';
}
function getRenderedScheme() {
const content = meta.getAttribute('content') || 'light dark';
if (content === 'dark' || content === 'light') return content;
return getSystemScheme();
}
function updateButtonLabel() {
const current = getRenderedScheme();
btn.textContent = current === 'dark' ? '☀ Light' : '☾ Dark';
btn.setAttribute(
'aria-label',
current === 'dark' ? 'Switch to light color scheme' : 'Switch to dark color scheme'
);
}
btn.addEventListener('click', () => {
const sys = getSystemScheme();
const current = getRenderedScheme();
const target = current === 'dark' ? 'light' : 'dark';
try {
if (target !== sys) {
localStorage.setItem('color-scheme', target);
meta.setAttribute('content', target);
} else {
localStorage.removeItem('color-scheme');
meta.setAttribute('content', 'light dark');
}
} catch (e) {
meta.setAttribute('content', target !== sys ? target : 'light dark');
}
updateButtonLabel();
});
mql.addEventListener('change', updateButtonLabel);
window.addEventListener('storage', (e) => {
if (e.key === 'color-scheme') {
meta.setAttribute('content', e.newValue ?? 'light dark');
updateButtonLabel();
}
});
updateButtonLabel();
}
function initQuickJumpSearch() {
const input = document.getElementById('global-vehicle-jump');
const datalist = document.getElementById('global-vehicle-datalist');
if (!input || !datalist) return;
const slugMap = new Map();
for (const opt of datalist.options) {
if (opt.dataset.slug) {
slugMap.set(opt.value.toLowerCase(), opt.dataset.slug);
}
}
function tryJump() {
const val = input.value.trim().toLowerCase();
if (slugMap.has(val)) {
window.location.href = '/towing/' + slugMap.get(val) + '/';
}
}
input.addEventListener('change', tryJump);
input.addEventListener('keydown', (e) => {
if (e.isComposing) return;
if (e.key === 'Enter') {
const val = input.value.trim().toLowerCase();
if (slugMap.has(val)) {
e.preventDefault();
window.location.href = '/towing/' + slugMap.get(val) + '/';
}
}
});
}
function initRigCalculator() {
const calcRoot = document.getElementById('rig-calculator');
if (!calcRoot) return;
const maxTow = Number(calcRoot.dataset.maxTow || 10000);
const factoryMaxPayload = Number(calcRoot.dataset.maxPayload || 1800);
let activeMaxPayload = factoryMaxPayload;
const gcwr = Number(calcRoot.dataset.gcwr || 16500);
const curbWeight = Number(calcRoot.dataset.curbWeight || 5200);
const vehicleName = calcRoot.dataset.vehicleName || 'Selected Vehicle';
const isCompare = calcRoot.dataset.mode === 'compare';
const maxTowB = Number(calcRoot.dataset.maxTowB || 0);
const maxPayloadB = Number(calcRoot.dataset.maxPayloadB || 0);
const gcwrB = Number(calcRoot.dataset.gcwrB || 0);
const curbWeightB = Number(calcRoot.dataset.curbWeightB || 0);
const vehicleNameB = calcRoot.dataset.vehicleNameB || 'Vehicle B';
const inputTrailer = document.getElementById('input-trailer-lbs');
const inputTonguePct = document.getElementById('input-tongue-pct');
const inputPassengers = document.getElementById('input-passengers-lbs');
const inputCargo = document.getElementById('input-cargo-lbs');
const inputHitch = document.getElementById('input-hitch-lbs');
const inputCustomPayload = document.getElementById('input-custom-payload');
const btnResetPayload = document.getElementById('btn-reset-payload');
const payloadErr = document.getElementById('door-payload-error');
if (!inputTrailer || !inputTonguePct || !inputPassengers || !inputCargo || !inputHitch) return;
const dom = {
rTrailer: document.getElementById('readout-trailer'),
rTongue: document.getElementById('readout-tongue'),
rPax: document.getElementById('readout-passengers'),
rCargo: document.getElementById('readout-cargo'),
rHitch: document.getElementById('readout-hitch'),
barTow: document.getElementById('gauge-bar-tow'),
txtTow: document.getElementById('gauge-txt-tow'),
barPayload: document.getElementById('gauge-bar-payload'),
txtPayload: document.getElementById('gauge-txt-payload'),
barGcwr: document.getElementById('gauge-bar-gcwr'),
txtGcwr: document.getElementById('gauge-txt-gcwr'),
barTowB: document.getElementById('gauge-bar-tow-b'),
txtTowB: document.getElementById('gauge-txt-tow-b'),
barPayloadB: document.getElementById('gauge-bar-payload-b'),
txtPayloadB: document.getElementById('gauge-txt-payload-b'),
barGcwrB: document.getElementById('gauge-bar-gcwr-b'),
txtGcwrB: document.getElementById('gauge-txt-gcwr-b'),
outTongue: document.getElementById('out-tongue-lbs'),
outPayloadRem: document.getElementById('out-payload-margin'),
outTowRem: document.getElementById('out-tow-margin'),
outMaxSafeTrailer: document.getElementById('out-max-real-trailer'),
verdictBanner: document.getElementById('verdict-banner'),
verdictTitle: document.getElementById('verdict-title-text'),
verdictBadge: document.getElementById('verdict-badge'),
verdictDesc: document.getElementById('verdict-desc'),
cmpWinner: document.getElementById('compare-live-winner'),
svgCabTxt: document.getElementById('svg-cab-cargo-txt'),
svgTongueTxt: document.getElementById('svg-tongue-txt'),
svgTrailerTxt: document.getElementById('svg-trailer-txt'),
svgSquatBadge: document.getElementById('svg-squat-badge'),
svgHitchGroup: document.getElementById('svg-hitch-group'),
svgTongueRect: document.getElementById('svg-tongue-pill')
};
const params = new URLSearchParams(window.location.search);
if (params.has('trailer')) inputTrailer.value = params.get('trailer');
if (params.has('tongue')) inputTonguePct.value = params.get('tongue');
if (params.has('pax')) inputPassengers.value = params.get('pax');
if (params.has('cargo')) inputCargo.value = params.get('cargo');
if (params.has('hitch')) inputHitch.value = params.get('hitch');
if (params.has('door') && inputCustomPayload) {
const customVal = Number(params.get('door'));
if (customVal >= 400 && customVal <= 9000) {
inputCustomPayload.value = String(customVal);
activeMaxPayload = customVal;
}
}
function updateRangeProgressFallback(slider) {
if (supportsAccentColor || !slider || slider.type !== 'range') return;
const min = Number(slider.min || 0);
const max = Number(slider.max || 100);
const val = Number(slider.value || 0);
const pct = Math.round(((val - min) / Math.max(1, max - min)) * 100);
slider.style.setProperty('--progress', pct + '%');
}
function setGauge(bar, txt, pct, usedText) {
if (bar) {
const clamped = Math.min(100, Math.max(0, pct));
bar.style.inlineSize = clamped + '%';
bar.dataset.level = pct > 100 ? 'danger' : pct >= 85 ? 'warn' : 'safe';
}
if (txt) {
txt.textContent = usedText;
}
}
function computeRig() {
const trailerLbs = Number(inputTrailer.value);
const tonguePct = Number(inputTonguePct.value);
const passengersLbs = Number(inputPassengers.value);
const cargoLbs = Number(inputCargo.value);
const hitchLbs = Number(inputHitch.value);
const tongueLbs = Math.round(trailerLbs * (tonguePct / 100));
if (dom.rTrailer) dom.rTrailer.textContent = fmtNum.format(trailerLbs) + ' lbs';
if (dom.rTongue) dom.rTongue.textContent = tonguePct + '% (' + fmtNum.format(tongueLbs) + ' lbs)';
if (dom.rPax) dom.rPax.textContent = fmtNum.format(passengersLbs) + ' lbs';
if (dom.rCargo) dom.rCargo.textContent = fmtNum.format(cargoLbs) + ' lbs';
if (dom.rHitch) dom.rHitch.textContent = fmtNum.format(hitchLbs) + ' lbs';
const payloadUsed = passengersLbs + cargoLbs + hitchLbs + tongueLbs;
const combinedWeight = curbWeight + passengersLbs + cargoLbs + hitchLbs + trailerLbs;
const towPct = Math.round((trailerLbs / maxTow) * 100);
const payloadPct = Math.round((payloadUsed / activeMaxPayload) * 100);
const gcwrPct = Math.round((combinedWeight / gcwr) * 100);
const payloadMargin = activeMaxPayload - payloadUsed;
const towMargin = maxTow - trailerLbs;
setGauge(
dom.barTow,
dom.txtTow,
towPct,
fmtNum.format(trailerLbs) + ' / ' + fmtNum.format(maxTow) + ' lbs (' + towPct + '%)'
);
setGauge(
dom.barPayload,
dom.txtPayload,
payloadPct,
fmtNum.format(payloadUsed) + ' / ' + fmtNum.format(activeMaxPayload) + ' lbs (' + payloadPct + '%)'
);
setGauge(
dom.barGcwr,
dom.txtGcwr,
gcwrPct,
fmtNum.format(combinedWeight) + ' / ' + fmtNum.format(gcwr) + ' lbs (' + gcwrPct + '%)'
);
if (dom.svgCabTxt) {
dom.svgCabTxt.textContent =
'Cab+Bed: ' + fmtNum.format(passengersLbs + cargoLbs) + ' lbs';
}
if (dom.svgTongueTxt) {
dom.svgTongueTxt.textContent =
'Tongue: ' + fmtNum.format(tongueLbs) + ' lbs (' + tonguePct + '%)';
}
if (dom.svgTrailerTxt) {
dom.svgTrailerTxt.textContent =
'Trailer GTW: ' + fmtNum.format(trailerLbs) + ' lbs';
}
if (dom.svgHitchGroup) {
const squatPx = Math.max(0, Math.min(8, Math.round(((payloadPct - 45) / 65) * 7)));
dom.svgHitchGroup.setAttribute('transform', 'translate(0, ' + squatPx + ')');
}
if (dom.svgSquatBadge && dom.svgTongueRect) {
if (payloadPct > 100) {
dom.svgSquatBadge.textContent = 'REAR AXLE OVERLOADED (' + payloadPct + '% PAYLOAD)';
dom.svgTongueRect.setAttribute('fill', '#dc2626');
} else if (payloadPct >= 85) {
dom.svgSquatBadge.textContent = 'HEAVY SQUAT — WDH + SWAY BAR MANDATORY (' + payloadPct + '%)';
dom.svgTongueRect.setAttribute('fill', '#ca8a04');
} else {
dom.svgSquatBadge.textContent = 'LEVEL STANCE — ' + fmtNum.format(payloadMargin) + ' LBS PAYLOAD RESERVE';
dom.svgTongueRect.setAttribute('fill', '#16a34a');
}
}
if (dom.outTongue) dom.outTongue.textContent = fmtNum.format(tongueLbs) + ' lbs';
if (dom.outPayloadRem) {
dom.outPayloadRem.textContent =
(payloadMargin >= 0 ? '+' : '') + fmtNum.format(payloadMargin) + ' lbs';
}
if (dom.outTowRem) {
dom.outTowRem.textContent = (towMargin >= 0 ? '+' : '') + fmtNum.format(towMargin) + ' lbs';
}
const availablePayloadForTongue = Math.max(0, activeMaxPayload - (passengersLbs + cargoLbs + hitchLbs));
const payloadLimitedTrailer = Math.floor(availablePayloadForTongue / (tonguePct / 100));
const trueSafeMaxTrailer = Math.min(maxTow, payloadLimitedTrailer);
if (dom.outMaxSafeTrailer) {
dom.outMaxSafeTrailer.textContent = fmtNum.format(trueSafeMaxTrailer) + ' lbs';
}
if (dom.verdictBanner && dom.verdictTitle && dom.verdictDesc) {
const worstPct = Math.max(towPct, payloadPct, gcwrPct);
if (worstPct > 100) {
dom.verdictBanner.dataset.status = 'danger';
if (dom.verdictBadge) dom.verdictBadge.textContent = 'OVERLOADED / EXCEEDS GVWR OR TOW RATING';
if (payloadPct > 100 && towPct <= 100) {
dom.verdictTitle.textContent =
'PAYLOAD BOTTLENECK: Overloaded by ' + fmtNum.format(Math.abs(payloadMargin)) + ' lbs!';
dom.verdictDesc.textContent =
'Classic Half-Ton Trap: Even though the ' +
fmtNum.format(trailerLbs) +
' lb trailer is under the ' +
fmtNum.format(maxTow) +
' lb tow rating, the ' +
fmtNum.format(tongueLbs) +
' lb tongue weight + ' +
fmtNum.format(passengersLbs + cargoLbs + hitchLbs) +
' lbs of cab/bed load exceeds your ' +
fmtNum.format(activeMaxPayload) +
' lb payload limit. With your current cargo, your real-world max trailer weight is ' +
fmtNum.format(trueSafeMaxTrailer) +
' lbs.';
} else {
dom.verdictTitle.textContent =
'UNSAFE RIG: Exceeds Factory Rated Capacity (' + worstPct + '% Peak Load)';
dom.verdictDesc.textContent =
'This configuration exceeds factory limits for the ' +
vehicleName +
'. Reduce trailer weight below ' +
fmtNum.format(trueSafeMaxTrailer) +
' lbs or upgrade to a higher payload trim.';
}
} else if (worstPct >= 85) {
dom.verdictBanner.dataset.status = 'warning';
if (dom.verdictBadge) dom.verdictBadge.textContent = 'NEAR LIMIT (85% - 100% UTILIZATION)';
dom.verdictTitle.textContent = 'CAUTION: High Load Utilization (' + worstPct + '% of Rated Ceiling)';
dom.verdictDesc.textContent =
'Legally within factory ratings (' +
fmtNum.format(payloadMargin) +
' lbs payload remaining), but exceeds the recommended 80% mountain-grade safety buffer. A Weight Distribution Hitch with active sway control is mandatory.';
} else {
dom.verdictBanner.dataset.status = 'safe';
if (dom.verdictBadge) dom.verdictBadge.textContent = 'SAFE & COMPLIANT (' + worstPct + '% PEAK)';
dom.verdictTitle.textContent =
'GREEN LIGHT: Safe Towing & Payload Margin (' + fmtNum.format(payloadMargin) + ' lbs Payload Headroom)';
dom.verdictDesc.textContent =
'The ' +
vehicleName +
' handles this ' +
fmtNum.format(trailerLbs) +
' lb rig comfortably with ' +
(100 - worstPct) +
'% reserve margin across Tow, Payload, and GCWR limits.';
}
}
if (isCompare && maxTowB > 0) {
const combinedWeightB = curbWeightB + passengersLbs + cargoLbs + hitchLbs + trailerLbs;
const towPctB = Math.round((trailerLbs / maxTowB) * 100);
const payloadPctB = Math.round((payloadUsed / maxPayloadB) * 100);
const gcwrPctB = Math.round((combinedWeightB / gcwrB) * 100);
setGauge(
dom.barTowB,
dom.txtTowB,
towPctB,
fmtNum.format(trailerLbs) + ' / ' + fmtNum.format(maxTowB) + ' lbs (' + towPctB + '%)'
);
setGauge(
dom.barPayloadB,
dom.txtPayloadB,
payloadPctB,
fmtNum.format(payloadUsed) + ' / ' + fmtNum.format(maxPayloadB) + ' lbs (' + payloadPctB + '%)'
);
setGauge(
dom.barGcwrB,
dom.txtGcwrB,
gcwrPctB,
fmtNum.format(combinedWeightB) + ' / ' + fmtNum.format(gcwrB) + ' lbs (' + gcwrPctB + '%)'
);
if (dom.cmpWinner) {
const marginA = Math.min(activeMaxPayload - payloadUsed, maxTow - trailerLbs);
const marginB = Math.min(maxPayloadB - payloadUsed, maxTowB - trailerLbs);
if (marginA > marginB) {
dom.cmpWinner.textContent =
vehicleName +
' wins for this load (+' +
fmtNum.format(activeMaxPayload - payloadUsed) +
' lbs payload margin vs ' +
fmtNum.format(maxPayloadB - payloadUsed) +
' lbs)';
} else if (marginB > marginA) {
dom.cmpWinner.textContent =
vehicleNameB +
' wins for this load (+' +
fmtNum.format(maxPayloadB - payloadUsed) +
' lbs payload margin vs ' +
fmtNum.format(activeMaxPayload - payloadUsed) +
' lbs)';
} else {
dom.cmpWinner.textContent = 'Tie for this exact load configuration';
}
}
}
}
[inputTrailer, inputTonguePct, inputPassengers, inputCargo, inputHitch].forEach((el) => {
updateRangeProgressFallback(el);
el.addEventListener('input', () => {
updateRangeProgressFallback(el);
computeRig();
});
});
if (inputCustomPayload) {
let edited = false;
inputCustomPayload.addEventListener('input', () => {
edited = true;
inputCustomPayload.setCustomValidity('');
inputCustomPayload.removeAttribute('aria-invalid');
if (payloadErr) payloadErr.textContent = '';
const raw = inputCustomPayload.value.trim();
if (!raw) {
activeMaxPayload = factoryMaxPayload;
computeRig();
return;
}
const num = Number(raw);
if (!Number.isNaN(num) && num >= 400 && num <= 9000) {
activeMaxPayload = num;
computeRig();
}
});
inputCustomPayload.addEventListener('blur', () => {
if (!edited) return;
const raw = inputCustomPayload.value.trim();
if (!raw) return;
const num = Number(raw);
if (Number.isNaN(num) || num < 400 || num > 9000) {
const msg = 'Enter a door-jamb payload between 400 and 9,000 lbs.';
inputCustomPayload.setCustomValidity(msg);
inputCustomPayload.setAttribute('aria-invalid', 'true');
if (payloadErr) payloadErr.textContent = msg;
}
});
if (btnResetPayload) {
btnResetPayload.addEventListener('click', () => {
inputCustomPayload.value = '';
inputCustomPayload.setCustomValidity('');
inputCustomPayload.removeAttribute('aria-invalid');
if (payloadErr) payloadErr.textContent = '';
activeMaxPayload = factoryMaxPayload;
computeRig();
});
}
}
document.querySelectorAll('[data-preset-trailer]').forEach((btn) => {
btn.addEventListener('click', () => {
inputTrailer.value = btn.dataset.presetTrailer;
if (btn.dataset.presetTongue) {
inputTonguePct.value = btn.dataset.presetTongue;
}
updateRangeProgressFallback(inputTrailer);
updateRangeProgressFallback(inputTonguePct);
computeRig();
});
});
const shareBtn = document.getElementById('btn-copy-rig-link');
if (shareBtn) {
shareBtn.addEventListener('click', () => {
const url = new URL(window.location.href);
url.searchParams.set('trailer', inputTrailer.value);
url.searchParams.set('tongue', inputTonguePct.value);
url.searchParams.set('pax', inputPassengers.value);
url.searchParams.set('cargo', inputCargo.value);
url.searchParams.set('hitch', inputHitch.value);
if (inputCustomPayload && inputCustomPayload.value.trim()) {
url.searchParams.set('door', inputCustomPayload.value.trim());
}
window.history.replaceState({}, '', url.toString());
if (navigator.clipboard) {
navigator.clipboard.writeText(url.toString());
}
shareBtn.textContent = '✓ Rig URL Copied!';
setTimeout(() => {
shareBtn.textContent = 'Copy Shareable Rig Link';
}, 2200);
});
}
const printBtn = document.getElementById('btn-print-worksheet');
if (printBtn) {
printBtn.addEventListener('click', () => {
window.print();
});
}
computeRig();
}
function reorderRows(tbody, orderedRows) {
const move = Object.hasOwn(Element.prototype, 'moveBefore')
? (node) => tbody.moveBefore(node, null)
: (node) => tbody.append(node);
for (const row of orderedRows) {
move(row);
}
}
function reorderWithTransition(table, tbody, orderedRows) {
const update = () => reorderRows(tbody, orderedRows);
if (orderedRows.length > 200) {
update();
return;
}
if (table.startViewTransition) {
table.startViewTransition(update);
} else if (document.startViewTransition) {
document.startViewTransition(update);
} else {
update();
}
}
function sortRows(rows, index, type, direction) {
const factor = direction === 'ascending' ? 1 : -1;
const mapped = rows.map((row) => {
const cell = row.cells[index];
const raw = cell ? (cell.dataset.value ?? cell.textContent.trim()) : '';
return {
row,
val: type === 'number' ? Number(raw) : raw
};
});
mapped.sort((a, b) =>
factor * (type === 'number' ? a.val - b.val : collator.compare(String(a.val), String(b.val)))
);
return mapped.map((item) => item.row);
}
function handleTableSort(table, button) {
const th = button.closest('th');
const tbody = table.tBodies[0];
if (!th || !tbody) return;
const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
for (const header of table.tHead.rows[0].cells) {
header.removeAttribute('aria-sort');
}
th.setAttribute('aria-sort', direction);
const rows = sortRows([...tbody.rows], th.cellIndex, th.dataset.type || 'text', direction);
reorderWithTransition(table, tbody, rows);
const status = document.getElementById('table-sort-status');
if (status) {
const colLabel = button.textContent.replace(/[▲▼⇅]/g, '').trim();
status.textContent = `Sorted by ${colLabel}, ${direction}, ${rows.length} rows`;
}
}
function initSortableTables() {
document.querySelectorAll('table.sortable-spec-table').forEach((table) => {
let handledByCommand = false;
table.addEventListener('command', (event) => {
if (event.command !== '--sort') return;
handledByCommand = true;
handleTableSort(table, event.source);
});
table.querySelectorAll('thead th > button').forEach((btn) => {
btn.addEventListener('click', () => {
setTimeout(() => {
if (!handledByCommand) {
handleTableSort(table, btn);
}
handledByCommand = false;
}, 0);
});
});
});
}
function initDirectoryFilter() {
const searchInput = document.getElementById('filter-search');
const yearSelect = document.getElementById('filter-year');
const brandSelect = document.getElementById('filter-brand');
const minTowSelect = document.getElementById('filter-min-tow');
const minPayloadSelect = document.getElementById('filter-min-payload');
const countLabel = document.getElementById('filter-match-count');
const table = document.getElementById('master-vehicle-table');
if (!table || (!searchInput && !brandSelect && !minTowSelect)) return;
const tbody = table.tBodies[0];
if (!tbody) return;
const indexedRows = [...tbody.rows].map((row) => ({
row,
year: row.dataset.year || '',
brand: row.dataset.brand || '',
tow: Number(row.dataset.tow || 0),
payload: Number(row.dataset.payload || 0),
searchText: row.textContent.toLowerCase()
}));
function applyFilter() {
const q = (searchInput ? searchInput.value : '').toLowerCase().trim();
const year = yearSelect ? yearSelect.value : '';
const brand = brandSelect ? brandSelect.value : '';
const minTow = minTowSelect ? Number(minTowSelect.value) : 0;
const minPayload = minPayloadSelect ? Number(minPayloadSelect.value) : 0;
let visibleCount = 0;
for (let i = 0; i < indexedRows.length; i++) {
const item = indexedRows[i];
const show =
(!q || item.searchText.includes(q)) &&
(!year || item.year === year) &&
(!brand || item.brand === brand) &&
item.tow >= minTow &&
item.payload >= minPayload;
if (item.row.hidden === show) {
item.row.hidden = !show;
}
if (show) visibleCount++;
}
if (countLabel) {
countLabel.textContent = visibleCount + ' Vehicles Matched';
}
}
[searchInput, yearSelect, brandSelect, minTowSelect, minPayloadSelect].forEach((el) => {
if (el) el.addEventListener('input', applyFilter);
});
}
const AD_CREATIVES = [
{
sponsor: 'CURT Manufacturing • CPM Bid: $64.20',
title: 'CURT TruTrack™ 4P Weight Distribution Hitch w/ Integrated Sway Control',
desc: 'Eliminate trailer sway & level your rear axle sag. Rated for 10,000 - 15,000 lbs GTW.',
cta: 'Check Fitment & Price →'
},
{
sponsor: 'Progressive Commercial & RV • CPM Bid: $78.50',
title: 'Tow Truck & Travel Trailer Comprehensive Roadside + Total Loss Replacement',
desc: 'Bundle your tow vehicle and camper policy. Includes 24/7 heavy-duty flatbed towing.',
cta: 'Get 60-Second Quote →'
},
{
sponsor: 'LightStream Auto & RV Finance • CPM Bid: $84.00',
title: 'Fixed-Rate RV & Pickup Truck Loans from 6.49% APR w/ AutoPay',
desc: 'No appraisal fees or prepayment penalties. Same-day funding up to $100,000.',
cta: 'Calculate Monthly Rate →'
},
{
sponsor: 'Air Lift Suspension • CPM Bid: $56.80',
title: 'LoadLifter 5000™ Ultimate Air Spring Kit for Half-Ton & HD Trucks',
desc: 'Up to 5,000 lbs of rear load-leveling capacity. Stop headlight aim sag under heavy tongue loads.',
cta: 'Find Your Truck Kit →'
},
{
sponsor: 'Discount Tire Direct • CPM Bid: $61.40',
title: 'Upgrade to Load Range E (10-Ply) LT All-Terrain Towing Tires',
desc: 'Stiffer sidewalls for zero highway squirm when pulling 7,000+ lb travel trailers.',
cta: 'View Rebates ($110 Off) →'
},
{
sponsor: 'Blue Ox Towing • CPM Bid: $59.10',
title: 'Blue Ox SwayPro™ Weight Distributing Hitch — No-Pin Spring Bars',
desc: 'Self-centering spring steel bars prevent trailer sway before it starts, even in crosswinds.',
cta: 'Compare Hitch Models →'
}
];
function initAdOpsEngine() {
const slots = document.querySelectorAll('[data-ad-slot]');
if (!slots.length) return;
const REFRESH_INTERVAL_SEC = 35;
let lastUserActivityTs = Date.now();
let totalImpressions = slots.length;
let totalRevenueCents = slots.length * 6.4;
let creativeCursor = 0;
const hudImp = document.getElementById('hud-impressions');
const hudRev = document.getElementById('hud-revenue');
const hudState = document.getElementById('hud-view-state');
const slotStates = new Map();
slots.forEach((slot) => {
slotStates.set(slot, {
inView: true,
activeSec: 0,
refreshes: 0,
bar: slot.querySelector('.ad-refresh-bar'),
sponsorEl: slot.querySelector('.js-ad-sponsor'),
titleEl: slot.querySelector('.js-ad-title'),
descEl: slot.querySelector('.js-ad-desc'),
ctaEl: slot.querySelector('.js-ad-cta'),
countEl: slot.querySelector('.js-ad-refresh-count')
});
});
if ('IntersectionObserver' in window) {
const observer = new IntersectionObserver(
(entries) => {
entries.forEach((entry) => {
const st = slotStates.get(entry.target);
if (st) st.inView = entry.isIntersecting;
});
},
{ threshold: 0.5 }
);
slots.forEach((s) => observer.observe(s));
}
const markActive = () => {
lastUserActivityTs = Date.now();
};
['pointerdown', 'keydown', 'input', 'scroll'].forEach((evt) => {
window.addEventListener(evt, markActive, { passive: true });
});
function refreshSlotCreative(state) {
creativeCursor = (creativeCursor + 1) % AD_CREATIVES.length;
const ad = AD_CREATIVES[creativeCursor];
if (state.sponsorEl) state.sponsorEl.textContent = ad.sponsor;
if (state.titleEl) state.titleEl.textContent = ad.title;
if (state.descEl) state.descEl.textContent = ad.desc;
if (state.ctaEl) state.ctaEl.textContent = ad.cta;
if (state.countEl) state.countEl.textContent = 'Auction #' + (state.refreshes + 1);
}
setInterval(() => {
if (document.visibilityState !== 'visible') return;
const secondsSinceInput = (Date.now() - lastUserActivityTs) / 1000;
const userIsEngaged = secondsSinceInput <= 45;
if (userIsEngaged) {
slotStates.forEach((st) => {
if (!st.inView) return;
st.activeSec += 1;
if (st.bar) {
const pct = Math.min(100, Math.round((st.activeSec / REFRESH_INTERVAL_SEC) * 100));
st.bar.style.inlineSize = pct + '%';
}
if (st.activeSec >= REFRESH_INTERVAL_SEC) {
st.activeSec = 0;
st.refreshes += 1;
totalImpressions += 1;
totalRevenueCents += 6.8;
refreshSlotCreative(st);
}
});
}
if (hudImp) hudImp.textContent = String(totalImpressions);
if (hudRev) hudRev.textContent = fmtCurrency.format(totalRevenueCents / 100);
if (hudState) {
hudState.textContent = userIsEngaged ? 'ACTIVE VIEW (TIMER RUNNING)' : 'IDLE (PAUSED)';
}
}, 1000);
}
document.addEventListener('DOMContentLoaded', () => {
initThemeToggle();
initQuickJumpSearch();
initRigCalculator();
initSortableTables();
initDirectoryFilter();
initAdOpsEngine();
});
})();