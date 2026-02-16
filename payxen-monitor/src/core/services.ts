export const MONITOR_SERVICE_NAMES = [
  "Netflix",
  "Amazon Prime",
  "Disney+",
  "HBO Max",
  "Apple TV+",
  "Spotify",
  "Apple Music",
  "YouTube Music",
  "Gaana",
  "JioSaavn",
  "Google One",
  "Microsoft 365",
  "Canva",
  "Notion",
  "ChatGPT",
  "Xbox",
  "PlayStation",
  "Steam",
  "Coursera",
  "Udemy",
  "MasterClass",
] as const;

export type MonitorServiceName = (typeof MONITOR_SERVICE_NAMES)[number];

const SERVICE_PATTERNS: Array<{ service: MonitorServiceName; keywords: string[] }> = [
  { service: "Netflix", keywords: ["netflix"] },
  { service: "Amazon Prime", keywords: ["prime video", "amazon prime"] },
  { service: "Disney+", keywords: ["disney+"] },
  { service: "HBO Max", keywords: ["hbo max", "max"] },
  { service: "Apple TV+", keywords: ["apple tv", "tv+"] },
  { service: "Spotify", keywords: ["spotify"] },
  { service: "Apple Music", keywords: ["apple music"] },
  { service: "YouTube Music", keywords: ["youtube music"] },
  { service: "Gaana", keywords: ["gaana"] },
  { service: "JioSaavn", keywords: ["jiosaavn", "jio saavn"] },
  { service: "Google One", keywords: ["google one"] },
  { service: "Microsoft 365", keywords: ["microsoft 365", "office.com", "outlook"] },
  { service: "Canva", keywords: ["canva"] },
  { service: "Notion", keywords: ["notion"] },
  { service: "ChatGPT", keywords: ["chatgpt"] },
  { service: "Xbox", keywords: ["xbox", "game pass"] },
  { service: "PlayStation", keywords: ["playstation"] },
  { service: "Steam", keywords: ["steam"] },
  { service: "Coursera", keywords: ["coursera"] },
  { service: "Udemy", keywords: ["udemy"] },
  { service: "MasterClass", keywords: ["masterclass"] },
];

const aliasToCanonical = new Map<string, MonitorServiceName>([
  ["netflix", "Netflix"],
  ["amazon prime", "Amazon Prime"],
  ["amazon-prime", "Amazon Prime"],
  ["disney+", "Disney+"],
  ["disney plus", "Disney+"],
  ["hbo max", "HBO Max"],
  ["apple tv+", "Apple TV+"],
  ["apple tv plus", "Apple TV+"],
  ["spotify", "Spotify"],
  ["apple music", "Apple Music"],
  ["youtube music", "YouTube Music"],
  ["gaana", "Gaana"],
  ["jiosaavn", "JioSaavn"],
  ["jio saavn", "JioSaavn"],
  ["google one", "Google One"],
  ["microsoft 365", "Microsoft 365"],
  ["canva", "Canva"],
  ["notion", "Notion"],
  ["chatgpt", "ChatGPT"],
  ["xbox", "Xbox"],
  ["playstation", "PlayStation"],
  ["steam", "Steam"],
  ["coursera", "Coursera"],
  ["udemy", "Udemy"],
  ["masterclass", "MasterClass"],
]);

export function matchMonitoredService(input: {
  title: string;
  ownerName: string;
  ownerPath: string;
}): MonitorServiceName | null {
  const haystack = [input.title, input.ownerName, input.ownerPath].join(" ").toLowerCase();

  for (const pattern of SERVICE_PATTERNS) {
    if (pattern.keywords.some((keyword) => haystack.includes(keyword))) {
      return pattern.service;
    }
  }

  return null;
}

export function normalizeMonitorServiceName(input: string): MonitorServiceName | null {
  return aliasToCanonical.get(input.trim().toLowerCase()) ?? null;
}
