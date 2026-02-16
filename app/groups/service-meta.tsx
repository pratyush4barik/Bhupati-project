import type { IconType } from "react-icons";
import {
  FaCirclePlay,
  FaGraduationCap,
  FaHeadphones,
  FaMicrosoft,
  FaMusic,
  FaXbox,
} from "react-icons/fa6";
import {
  SiApplemusic,
  SiAppletv,
  SiCanva,
  SiCoursera,
  SiGoogle,
  SiHbo,
  SiNetflix,
  SiNotion,
  SiOpenai,
  SiPlaystation,
  SiPrimevideo,
  SiSpotify,
  SiSteam,
  SiUdemy,
  SiYoutubemusic,
} from "react-icons/si";

type ServiceMeta = {
  icon: IconType;
  color: string;
};

const serviceMetaMap: Record<string, ServiceMeta> = {
  "netflix": { icon: SiNetflix, color: "#E50914" },
  "amazon-prime": { icon: SiPrimevideo, color: "#00A8E1" },
  "disney-plus": { icon: FaCirclePlay, color: "#113CCF" },
  "hbo-max": { icon: SiHbo, color: "#6C2CF7" },
  "apple-tv-plus": { icon: SiAppletv, color: "#111827" },
  "spotify": { icon: SiSpotify, color: "#1DB954" },
  "apple-music": { icon: SiApplemusic, color: "#FA243C" },
  "youtube-music": { icon: SiYoutubemusic, color: "#FF0000" },
  "gaana": { icon: FaMusic, color: "#FF6A00" },
  "jiosaavn": { icon: FaHeadphones, color: "#2BC5B4" },
  "google-one": { icon: SiGoogle, color: "#4285F4" },
  "microsoft-365": { icon: FaMicrosoft, color: "#00A4EF" },
  "canva-pro": { icon: SiCanva, color: "#00C4CC" },
  "notion-pro": { icon: SiNotion, color: "#111111" },
  "chatgpt-plus": { icon: SiOpenai, color: "#10A37F" },
  "xbox-game-pass": { icon: FaXbox, color: "#107C10" },
  "playstation-plus": { icon: SiPlaystation, color: "#003087" },
  "steam-wallet": { icon: SiSteam, color: "#1B2838" },
  "coursera-plus": { icon: SiCoursera, color: "#0056D2" },
  "udemy-pro": { icon: SiUdemy, color: "#A435F0" },
  "masterclass": { icon: FaGraduationCap, color: "#B07A3F" },
};

export function getServiceMeta(serviceKey: string | null) {
  if (!serviceKey) return null;
  return serviceMetaMap[serviceKey] ?? null;
}
