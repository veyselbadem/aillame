import type { NanoTaskKind } from "./types";

export type NanoEvalCase = {
  id: string;
  prompt: string;
  expectedKind: NanoTaskKind;
  shouldNeedReasoning: boolean;
};

export const NANO_EVAL_CASES: readonly NanoEvalCase[] = [
  {
    id: "debug-plan",
    prompt: "TypeScript projem build almıyor, hatayı analiz edip düzeltme planı çıkar.",
    expectedKind: "coding",
    shouldNeedReasoning: true,
  },
  {
    id: "student-explain",
    prompt: "8. sınıf öğrencisine olasılığı örnekle öğret.",
    expectedKind: "education",
    shouldNeedReasoning: false,
  },
  {
    id: "complex-analysis",
    prompt: "Bir ürün fikrini pazar, risk, maliyet ve teknik uygulanabilirlik açısından detaylı analiz et.",
    expectedKind: "analysis",
    shouldNeedReasoning: true,
  },
  {
    id: "image-brief",
    prompt: "Bir eğitim uygulaması için modern bir afiş görseli üret.",
    expectedKind: "image",
    shouldNeedReasoning: false,
  },
];
