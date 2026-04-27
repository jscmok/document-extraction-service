import path from 'path';
import fs from 'fs/promises';
import { env } from '../config/env';

const EDGAR_API = 'https://data.sec.gov';
const EDGAR_ARCHIVES = 'https://www.sec.gov/Archives/edgar/data';
const USER_AGENT = 'SDES-TakeHome contact@example.com';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`EDGAR request failed: ${res.status} ${url}`);
  return res.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`EDGAR request failed: ${res.status} ${url}`);
  return res.text();
}

async function resolveCik(ticker: string): Promise<string> {
  const data = await fetchJson<Record<string, { cik_str: number; ticker: string }>>(
    'https://www.sec.gov/files/company_tickers.json'
  );
  const entry = Object.values(data).find(
    (c) => c.ticker.toLowerCase() === ticker.toLowerCase()
  );
  if (!entry) throw new Error(`Ticker "${ticker}" not found in SEC EDGAR`);
  return String(entry.cik_str).padStart(10, '0');
}

async function getLatest10K(cik: string): Promise<{ accessionNumber: string; filingDate: string; primaryDocument: string }> {
  const data = await fetchJson<{
    filings: { recent: { accessionNumber: string[]; filingDate: string[]; form: string[]; primaryDocument: string[] } };
  }>(`${EDGAR_API}/submissions/CIK${cik}.json`);

  const { accessionNumber, filingDate, form, primaryDocument } = data.filings.recent;
  const index = form.findIndex((f) => f === '10-K');
  if (index === -1) throw new Error(`No 10-K filing found for CIK ${cik}`);

  return {
    accessionNumber: accessionNumber[index],
    filingDate: filingDate[index],
    primaryDocument: primaryDocument[index],
  };
}

type XbrlFacts = {
  facts: { 'us-gaap': Record<string, { units: { USD: Array<{ end: string; val: number; form: string }> } }> };
};

async function getXbrlFinancials(cik: string): Promise<Record<string, number>> {
  const data = await fetchJson<XbrlFacts>(`${EDGAR_API}/api/xbrl/companyfacts/CIK${cik}.json`);
  const usGaap = data.facts?.['us-gaap'] ?? {};

  // Collect the most recent 10-K entry across all candidate concepts — companies
  // change XBRL tags over time, so the freshest data may not be in the first concept
  function latestAnnual(...concepts: string[]): number {
    let best: { end: string; val: number } | null = null;
    for (const concept of concepts) {
      const entries = usGaap[concept]?.units?.USD;
      if (!entries) continue;
      const annual = entries.filter((e) => e.form === '10-K');
      if (annual.length === 0) continue;
      annual.sort((a, b) => b.end.localeCompare(a.end));
      if (!best || annual[0].end > best.end) best = annual[0];
    }
    return best ? Math.round(best.val / 1_000_000) : 0;
  }

  return {
    totalRevenue: latestAnnual(
      'Revenues',
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'SalesRevenueNet'
    ),
    netIncome: latestAnnual('NetIncomeLoss'),
    operatingIncome: latestAnnual('OperatingIncomeLoss'),
    totalAssets: latestAnnual('Assets'),
    totalLiabilities: latestAnnual('Liabilities'),
  };
}

async function getFrontMatterText(cik: string, accessionNumber: string, primaryDocument: string): Promise<string> {
  const accNoClean = accessionNumber.replace(/-/g, '');
  const docUrl = `${EDGAR_ARCHIVES}/${parseInt(cik)}/${accNoClean}/${primaryDocument}`;
  console.log(`[edgar] fetching filing text: ${docUrl}`);

  const html = await fetchText(docUrl);
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  // Front matter contains company name, ticker, business description, risk factors
  return text.substring(0, 60000);
}

export interface EdgarResult {
  ticker: string;
  filingDate: string;
  storagePath: string;
  originalFileName: string;
  mimeType: string;
}

export async function fetchAndSaveFiling(ticker: string): Promise<EdgarResult> {
  console.log(`[edgar] fetching 10-K for ${ticker.toUpperCase()}`);

  const cik = await resolveCik(ticker);
  console.log(`[edgar] resolved CIK: ${cik}`);

  const filing = await getLatest10K(cik);
  console.log(`[edgar] found 10-K filed ${filing.filingDate}`);

  // Fetch XBRL financials and filing text in parallel
  const [financials, frontMatter] = await Promise.all([
    getXbrlFinancials(cik),
    getFrontMatterText(cik, filing.accessionNumber, filing.primaryDocument),
  ]);

  console.log(`[edgar] XBRL financials: revenue=${financials.totalRevenue}M, netIncome=${financials.netIncome}M`);

  // Combine into a single document: structured financials + narrative text
  const content = [
    `=== FINANCIAL DATA (SEC XBRL, in millions USD) ===`,
    `Total Revenue: ${financials.totalRevenue}`,
    `Net Income: ${financials.netIncome}`,
    `Operating Income: ${financials.operatingIncome}`,
    `Total Assets: ${financials.totalAssets}`,
    `Total Liabilities: ${financials.totalLiabilities}`,
    ``,
    `=== FILING TEXT ===`,
    frontMatter,
  ].join('\n');

  const filename = `${ticker.toUpperCase()}-10K-${filing.filingDate}.txt`;
  const storagePath = path.join(env.UPLOAD_DIR, filename);
  await fs.writeFile(storagePath, content, 'utf-8');

  return {
    ticker: ticker.toUpperCase(),
    filingDate: filing.filingDate,
    storagePath,
    originalFileName: filename,
    mimeType: 'text/plain',
  };
}
