import type { CrewMember } from "@/lib/types";

export const CURRENT_EXPEDITION = 74;

export const CURRENT_CREW: CrewMember[] = [
  { name: "Sunita Williams", role: "CDR", agency: "NASA", nationality: "us", expedition: 74 },
  { name: "Oleg Kononenko", role: "FE", agency: "RSA", nationality: "ru", expedition: 74 },
  { name: "Nick Hague", role: "FE", agency: "NASA", nationality: "us", expedition: 74 },
  { name: "Satoshi Furukawa", role: "FE", agency: "JAXA", nationality: "jp", expedition: 74 },
  { name: "Samantha Cristoforetti", role: "FE", agency: "ESA", nationality: "it", expedition: 74 },
  { name: "Dmitri Petelin", role: "FE", agency: "RSA", nationality: "ru", expedition: 74 },
];

export const FLAG_EMOJI: Record<string, string> = {
  us: "🇺🇸",
  ru: "🇷🇺",
  jp: "🇯🇵",
  it: "🇮🇹",
  ca: "🇨🇦",
  de: "🇩🇪",
  fr: "🇫🇷",
  gb: "🇬🇧",
};
