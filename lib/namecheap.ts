// Namecheap API client
// Docs: https://www.namecheap.com/support/api/methods/

const SANDBOX_URL = "https://api.sandbox.namecheap.com/xml.response";
const PRODUCTION_URL = "https://api.namecheap.com/xml.response";

function getBaseUrl(): string {
  return process.env.NAMECHEAP_SANDBOX === "true" ? SANDBOX_URL : PRODUCTION_URL;
}

function getBaseParams(): URLSearchParams {
  const apiUser = process.env.NAMECHEAP_API_USER;
  const apiKey = process.env.NAMECHEAP_API_KEY;
  const clientIp = process.env.NAMECHEAP_CLIENT_IP;

  if (!apiUser || !apiKey || !clientIp) {
    throw new Error("Namecheap API credentials not configured (NAMECHEAP_API_USER, NAMECHEAP_API_KEY, NAMECHEAP_CLIENT_IP)");
  }

  const params = new URLSearchParams();
  params.set("ApiUser", apiUser);
  params.set("ApiKey", apiKey);
  params.set("UserName", apiUser);
  params.set("ClientIp", clientIp);
  return params;
}

// ─── Simple XML parsing helpers ─────────────────────────────────────────────

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function extractAttribute(xml: string, tag: string, attr: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i");
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function hasErrors(xml: string): string | null {
  const errorMatch = xml.match(/<Error[^>]*Number="(\d+)"[^>]*>([^<]*)<\/Error>/i);
  if (errorMatch) return errorMatch[2];
  if (xml.includes('Status="ERROR"')) {
    return extractTag(xml, "Error") ?? "Unknown Namecheap API error";
  }
  return null;
}

// ─── Types ──────────────────────────────────────────────────────────────────

type DomainAvailability = {
  domain: string;
  available: boolean;
  price: number | null;
  currency: string;
};

type DomainPurchaseResult = {
  domain: string;
  success: boolean;
  orderId: string | null;
  transactionId: string | null;
};

type DnsRecord = {
  type: "A" | "CNAME" | "TXT" | "MX" | "AAAA";
  hostname: string;
  address: string;
  ttl?: number;
};

// ─── Check domain availability ──────────────────────────────────────────────

export async function checkDomainAvailability(
  domain: string
): Promise<DomainAvailability> {
  const params = getBaseParams();
  params.set("Command", "namecheap.domains.check");
  params.set("DomainList", domain);

  const res = await fetch(`${getBaseUrl()}?${params.toString()}`);
  const xml = await res.text();

  const error = hasErrors(xml);
  if (error) throw new Error(`Namecheap: ${error}`);

  const available = extractAttribute(xml, "DomainCheckResult", "Available") === "true";

  // Get pricing if available
  let price: number | null = null;
  if (available) {
    try {
      const priceResult = await getDomainPrice(domain);
      price = priceResult.price;
    } catch {
      // Pricing fetch failed, return without price
    }
  }

  return {
    domain,
    available,
    price,
    currency: "USD",
  };
}

// ─── Get domain pricing ─────────────────────────────────────────────────────

async function getDomainPrice(
  domain: string
): Promise<{ price: number }> {
  const tld = domain.split(".").slice(1).join(".");
  const params = getBaseParams();
  params.set("Command", "namecheap.users.getPricing");
  params.set("ProductType", "DOMAIN");
  params.set("ProductCategory", "REGISTER");
  params.set("ProductName", tld);

  const res = await fetch(`${getBaseUrl()}?${params.toString()}`);
  const xml = await res.text();

  const priceMatch = xml.match(/Price="([\d.]+)"/);
  const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

  return { price };
}

// ─── Purchase domain ────────────────────────────────────────────────────────

export async function purchaseDomain(
  domain: string,
  registrantInfo: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
  }
): Promise<DomainPurchaseResult> {
  const params = getBaseParams();
  params.set("Command", "namecheap.domains.create");
  params.set("DomainName", domain);
  params.set("Years", "1");

  // Set registrant info for all contact types
  const contactTypes = ["Registrant", "Tech", "Admin", "AuxBilling"];
  for (const type of contactTypes) {
    params.set(`${type}FirstName`, registrantInfo.firstName);
    params.set(`${type}LastName`, registrantInfo.lastName);
    params.set(`${type}Address1`, registrantInfo.address);
    params.set(`${type}City`, registrantInfo.city);
    params.set(`${type}StateProvince`, registrantInfo.stateProvince);
    params.set(`${type}PostalCode`, registrantInfo.postalCode);
    params.set(`${type}Country`, registrantInfo.country);
    params.set(`${type}Phone`, registrantInfo.phone);
    params.set(`${type}EmailAddress`, registrantInfo.email);
  }

  const res = await fetch(`${getBaseUrl()}?${params.toString()}`);
  const xml = await res.text();

  const error = hasErrors(xml);
  if (error) throw new Error(`Namecheap: ${error}`);

  const registered = extractAttribute(xml, "DomainCreateResult", "Registered") === "true";
  const orderId = extractAttribute(xml, "DomainCreateResult", "OrderID");
  const transactionId = extractAttribute(xml, "DomainCreateResult", "TransactionID");

  return {
    domain,
    success: registered,
    orderId,
    transactionId,
  };
}

// ─── Set DNS records ────────────────────────────────────────────────────────

export async function setDnsRecords(
  domain: string,
  records: DnsRecord[]
): Promise<void> {
  const [sld, ...tldParts] = domain.split(".");
  const tld = tldParts.join(".");

  const params = getBaseParams();
  params.set("Command", "namecheap.domains.dns.setHosts");
  params.set("SLD", sld);
  params.set("TLD", tld);

  records.forEach((record, i) => {
    const n = i + 1;
    params.set(`HostName${n}`, record.hostname);
    params.set(`RecordType${n}`, record.type);
    params.set(`Address${n}`, record.address);
    params.set(`TTL${n}`, String(record.ttl ?? 1800));
  });

  const res = await fetch(`${getBaseUrl()}?${params.toString()}`);
  const xml = await res.text();

  const error = hasErrors(xml);
  if (error) throw new Error(`Namecheap DNS: ${error}`);
}

// ─── Get domain info ────────────────────────────────────────────────────────

export async function getDomainInfo(
  domain: string
): Promise<{ status: string; expireDate: string | null; nameservers: string[] }> {
  const params = getBaseParams();
  params.set("Command", "namecheap.domains.getInfo");
  params.set("DomainName", domain);

  const res = await fetch(`${getBaseUrl()}?${params.toString()}`);
  const xml = await res.text();

  const error = hasErrors(xml);
  if (error) throw new Error(`Namecheap: ${error}`);

  const status = extractAttribute(xml, "DomainGetInfoResult", "Status") ?? "Unknown";
  const expireDate = extractTag(xml, "ExpiredDate");

  // Extract nameservers
  const nsMatches = xml.matchAll(/<Nameserver>([^<]+)<\/Nameserver>/gi);
  const nameservers = [...nsMatches].map((m) => m[1]);

  return { status, expireDate, nameservers };
}
