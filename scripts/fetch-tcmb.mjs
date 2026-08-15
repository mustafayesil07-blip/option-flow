#!/usr/bin/env node
/**
 * TCMB USD/TRY doviz alis kurlarini sunucu tarafinda ceker ve kurlar.json
 * dosyasina yazar.
 *
 * Neden sunucu tarafi?
 *   TCMB Access-Control-Allow-Origin gondermiyor. Tarayicidan dogrudan
 *   cekilemiyor, ucuncu parti CORS proxy'leri ise yavas ve guvenilmez.
 *   GitHub Actions runner'i TCMB'ye dogrudan ulasabildigi icin kurlari
 *   burada cekip statik JSON olarak yayinliyoruz. Uygulama da bu dosyayi
 *   kendi origin'inden indiriyor — CORS yok, proxy yok, aninda.
 *
 * Cikti dosyalari:
 *   kurlar.json         { "YYYY-MM-DD": 44.1234, ... }  (yalnizca yayin yapilan gunler)
 *   tcmb-holidays.json  [ "YYYY-MM-DD", ... ]           (yayin yapilmayan is gunleri)
 *
 * Ortam degiskeni:
 *   TCMB_FROM=YYYY-MM-DD  Baslangic tarihini elle ver (geriye donuk doldurma icin)
 */

import fs from 'node:fs';

const RATES_FILE    = 'kurlar.json';
const HOLIDAYS_FILE = 'tcmb-holidays.json';
const CONCURRENCY   = 4;
const MAX_PER_RUN   = 400;
const DEFAULT_FROM  = '2025-08-01';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

const pad   = (n) => String(n).padStart(2, '0');
const toIso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (s) => new Date(`${s}T00:00:00Z`);

// Pazartesi–Cuma (getUTCDay: 0=Pazar, 6=Cumartesi)
const isBusinessDay = (d) => {
  const w = d.getUTCDay();
  return w >= 1 && w <= 5;
};

function businessDaysBetween(fromIso, toIso_) {
  const out = [];
  const d   = parse(fromIso);
  const end = parse(toIso_);
  let guard = 0;
  while (d <= end && guard++ < 20000) {
    if (isBusinessDay(d)) out.push(toIso(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

// https://www.tcmb.gov.tr/kurlar/YYYYMM/DDMMYYYY.xml
function tcmbUrl(isoDate) {
  const [y, m, dd] = isoDate.split('-');
  return `https://www.tcmb.gov.tr/kurlar/${y}${m}/${dd}${m}${y}.xml`;
}

function parseUsdForexBuying(xml) {
  const block = xml.match(/<Currency[^>]*Kod="USD"[^>]*>([\s\S]*?)<\/Currency>/i);
  if (block) {
    const f = block[1].match(/<ForexBuying>\s*([\d.]+)\s*<\/ForexBuying>/i);
    if (f) return parseFloat(f[1]);
  }
  return null;
}

/**
 * Tek bir is gununu ceker.
 * @returns {{kind:'rate',rate:number}|{kind:'holiday'}|{kind:'error',error:string}}
 */
async function fetchDay(isoDate) {
  const url = tcmbUrl(isoDate);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        signal:  AbortSignal.timeout(20000),
        headers: { 'User-Agent': 'option-flow-tcmb-bot' },
      });
      // 404 → o gun kur yayinlanmamis (resmi tatil)
      if (res.status === 404) return { kind: 'holiday' };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const xml = await res.text();
      if (!/<Tarih_Date/i.test(xml)) throw new Error('beklenmeyen govde');

      const rate = parseUsdForexBuying(xml);
      if (rate && rate > 0) return { kind: 'rate', rate };
      return { kind: 'holiday' };
    } catch (err) {
      if (attempt === 2) return { kind: 'error', error: String(err?.message || err) };
      await sleep(800 * (attempt + 1));
    }
  }
}

async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const rates    = readJson(RATES_FILE, {});
  const holidays = new Set(readJson(HOLIDAYS_FILE, []));

  const today    = toIso(new Date());
  const existing = Object.keys(rates).sort();
  const from     = (process.env.TCMB_FROM || '').trim() || existing[0] || DEFAULT_FROM;

  const allDays = businessDaysBetween(from, today);
  let todo = allDays.filter((d) => !(d in rates) && !holidays.has(d));

  console.log(`Aralik      : ${from} → ${today}`);
  console.log(`Mevcut kur  : ${existing.length} (son: ${existing[existing.length - 1] || '-'})`);
  console.log(`Eksik is gunu: ${todo.length}`);

  if (todo.length > MAX_PER_RUN) {
    console.log(`UYARI: ${todo.length} gunun ilk ${MAX_PER_RUN} tanesi cekiliyor, kalani sonraki calismada.`);
    todo = todo.slice(0, MAX_PER_RUN);
  }

  if (!todo.length) {
    console.log('Eksik gun yok — degisiklik yapilmadi.');
    return;
  }

  const results = await runPool(todo, CONCURRENCY, async (day) => {
    const r = await fetchDay(day);
    await sleep(120); // TCMB'yi bogmayalim
    return r;
  });

  let added = 0, holiday = 0, errored = 0;
  results.forEach((r, i) => {
    const day = todo[i];
    if (!r) { errored++; return; }
    if (r.kind === 'rate') {
      rates[day] = Math.trunc(r.rate * 10000) / 10000;
      added++;
    } else if (r.kind === 'holiday') {
      holidays.add(day);
      holiday++;
    } else {
      errored++;
      console.log(`  HATA ${day}: ${r.error}`);
    }
  });

  console.log(`Eklenen: ${added} | Tatil: ${holiday} | Hatali: ${errored}`);

  if (added === 0 && holiday === 0 && errored > 0) {
    console.error('Hicbir gun cekilemedi — TCMB erisimi basarisiz.');
    process.exit(1);
  }

  const sortedRates = {};
  Object.keys(rates).sort().forEach((k) => { sortedRates[k] = rates[k]; });

  fs.writeFileSync(RATES_FILE, JSON.stringify(sortedRates) + '\n');
  fs.writeFileSync(HOLIDAYS_FILE, JSON.stringify([...holidays].sort(), null, 0) + '\n');

  const keys = Object.keys(sortedRates);
  console.log(`Yazildi: ${RATES_FILE} (${keys.length} kayit, son: ${keys[keys.length - 1]})`);
}

main().catch((err) => {
  console.error('Beklenmeyen hata:', err);
  process.exit(1);
});
