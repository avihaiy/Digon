import { Trophy, Shield, Medal, Star, Crown } from "lucide-react";

export const RANKS = [
  { max: 100, name: "דייג מתחיל", color: "text-slate-500", bg: "bg-slate-500", bgLight: "bg-slate-500/10", bgMedium: "bg-slate-500/20", borderLight: "border-slate-500/30", icon: Shield },
  { max: 500, name: "חובבן פלוס", color: "text-emerald-500", bg: "bg-emerald-500", bgLight: "bg-emerald-500/10", bgMedium: "bg-emerald-500/20", borderLight: "border-emerald-500/30", icon: Star },
  { max: 1500, name: "מכור לים", color: "text-blue-500", bg: "bg-blue-500", bgLight: "bg-blue-500/10", bgMedium: "bg-blue-500/20", borderLight: "border-blue-500/30", icon: Medal },
  { max: 3000, name: "ז'רז'ור מאסטר", color: "text-purple-500", bg: "bg-purple-500", bgLight: "bg-purple-500/10", bgMedium: "bg-purple-500/20", borderLight: "border-purple-500/30", icon: Trophy },
  { max: Infinity, name: "פוסידון", color: "text-amber-500", bg: "bg-amber-500", bgLight: "bg-amber-500/10", bgMedium: "bg-amber-500/20", borderLight: "border-amber-500/30", icon: Crown }
];

export function getRankFromPoints(points: number = 0) {
  const currentRankIndex = RANKS.findIndex(r => points < r.max);
  const currentRank = currentRankIndex === -1 ? RANKS[RANKS.length - 1] : RANKS[currentRankIndex];
  
  const prevMax = currentRankIndex === 0 ? 0 : RANKS[currentRankIndex - 1].max;
  const nextMax = currentRank.max === Infinity ? points : currentRank.max;
  
  const progress = currentRank.max === Infinity 
    ? 100 
    : Math.min(100, Math.max(0, ((points - prevMax) / (nextMax - prevMax)) * 100));

  return {
    ...currentRank,
    progress,
    nextMax,
    pointsRemaining: currentRank.max === Infinity ? 0 : nextMax - points
  };
}
