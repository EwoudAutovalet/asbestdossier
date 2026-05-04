import type {
  ConditionScore,
  CoverageLevel,
  ExposureType,
  CalculatedRisk,
  RecommendedActionIP2,
} from "@/lib/types";

interface RiskInput {
  is_hechtgebonden: boolean | null;
  condition_score: ConditionScore | null;
  exposure: ExposureType | null;
  coverage: CoverageLevel | null;
}

export function calculateRisk(item: RiskInput): CalculatedRisk {
  const bindingScore = item.is_hechtgebonden === false ? 3 : item.is_hechtgebonden === true ? 1 : 2;

  const conditionMap: Record<ConditionScore, number> = {
    onbeschadigd: 0,
    licht_beschadigd: 1,
    matig_beschadigd: 2,
    zwaar_beschadigd: 3,
  };
  const conditionScore = item.condition_score ? conditionMap[item.condition_score] : 0;

  const exposureMap: Record<ExposureType, number> = {
    geen: 0,
    buitenlucht: 1,
    binnenlucht: 2,
    beide: 3,
  };
  const exposureScore = item.exposure ? exposureMap[item.exposure] : 0;

  const coverageMap: Record<CoverageLevel, number> = {
    volledig_afgedekt: 0,
    gedeeltelijk_afgedekt: 1,
    niet_afgedekt: 2,
  };
  const coverageScore = item.coverage ? coverageMap[item.coverage] : 0;

  const total = bindingScore + conditionScore + exposureScore + coverageScore;

  if (total <= 3) return "zeer_laag";
  if (total <= 5) return "laag";
  if (total <= 8) return "verhoogd";
  return "hoog";
}

export function suggestAction(risk: CalculatedRisk): RecommendedActionIP2 {
  switch (risk) {
    case "zeer_laag": return "geen_actie";
    case "laag": return "beheer_in_situ";
    case "verhoogd": return "verwijderen_niet_dringend";
    case "hoog": return "verwijderen_dringend";
  }
}

export const RISK_COLORS: Record<CalculatedRisk, string> = {
  zeer_laag: "text-green-700 bg-green-50 border-green-200",
  laag: "text-blue-700 bg-blue-50 border-blue-200",
  verhoogd: "text-orange-700 bg-orange-50 border-orange-200",
  hoog: "text-red-700 bg-red-50 border-red-200",
};

export const RISK_BADGE_VARIANT: Record<CalculatedRisk, "success" | "info" | "warning" | "destructive"> = {
  zeer_laag: "success",
  laag: "info",
  verhoogd: "warning",
  hoog: "destructive",
};
