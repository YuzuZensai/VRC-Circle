import { connect } from "node:net";
import type { InstanceRegion } from "../../shared/types/instance";
import type { RegionPing } from "../../shared/types/appConfig";
import { logger } from "../debug/logger";
import { preferredRegion } from "../config/appConfig";

// VRChat's photon game servers don't expose stable public ping hostnames, so we
// measure latency to a public host physically co-located with each region's
// datacenter
const PING_HOSTS: Record<InstanceRegion, string> = {
  us: "ec2.us-west-1.amazonaws.com",
  use: "ec2.us-east-1.amazonaws.com",
  eu: "ec2.eu-central-1.amazonaws.com",
  jp: "ec2.ap-northeast-1.amazonaws.com",
};

const REGIONS = Object.keys(PING_HOSTS) as InstanceRegion[];
const PORT = 443;
const ATTEMPTS = 3;
const TIMEOUT_MS = 2000;

function tcpPing(host: string): Promise<number | null> {
  return new Promise((resolve) => {
    const start = performance.now();
    const sock = connect({ host, port: PORT });
    const done = (ms: number | null) => {
      sock.destroy();
      resolve(ms);
    };
    sock.setTimeout(TIMEOUT_MS);
    sock.once("connect", () => done(performance.now() - start));
    sock.once("timeout", () => done(null));
    sock.once("error", () => done(null));
  });
}

async function measure(host: string): Promise<number | null> {
  const samples: number[] = [];
  for (let i = 0; i < ATTEMPTS; i++) {
    const ms = await tcpPing(host);
    if (ms !== null) samples.push(ms);
  }
  if (samples.length === 0) return null;
  samples.sort((a, b) => a - b);
  const kept = samples.length > 1 ? samples.slice(0, -1) : samples;
  return Math.round(kept.reduce((a, b) => a + b, 0) / kept.length);
}

function regionFromTimezone(): InstanceRegion {
  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {}
  if (/^Asia\//.test(tz)) return "jp";
  if (/^(Europe|Africa)\//.test(tz)) return "eu";
  if (
    /^America\/(New_York|Detroit|Toronto|Montreal|Halifax|Indiana|Kentucky|Chicago|Sao_Paulo)/.test(
      tz,
    )
  ) {
    return "use";
  }
  return "us";
}

export async function pingRegions(): Promise<RegionPing[]> {
  return Promise.all(
    REGIONS.map(async (region) => ({ region, ms: await measure(PING_HOSTS[region]) })),
  );
}

const DETECT_TTL_MS = 30 * 60 * 1000;
let cached: { region: InstanceRegion; at: number } | null = null;

export function invalidateRegionCache(): void {
  cached = null;
}

export async function detectBestRegion(): Promise<InstanceRegion> {
  if (cached && Date.now() - cached.at < DETECT_TTL_MS) return cached.region;

  const pings = await pingRegions();
  const reachable = pings.filter((p): p is RegionPing & { ms: number } => p.ms !== null);
  if (reachable.length === 0) {
    const fallback = regionFromTimezone();
    logger.info("region", "all pings failed, using timezone fallback", { fallback });
    return fallback;
  }
  const best = reachable.reduce((a, b) => (b.ms < a.ms ? b : a));
  cached = { region: best.region, at: Date.now() };
  logger.info("region", "detected best region", { region: best.region, ms: best.ms });
  return best.region;
}

const REFRESH_MS = 30 * 60 * 1000;

export function startRegionDetection(): void {
  const tick = (): void => {
    if (preferredRegion() !== "auto") return;
    invalidateRegionCache();
    void detectBestRegion();
  };
  tick();
  setInterval(tick, REFRESH_MS).unref();
}
