import { z } from "zod";
import { KOREAN_POS } from "./pos";

export const koreanPosSchema = z.enum(KOREAN_POS);

function classNameFromStudentNumber(studentNumber: string): string {
  const classNumber = Number(studentNumber.slice(0, 2)) - 10;
  return `${classNumber}반`;
}

const studentIdentityBaseSchema = z.object({
  className: z.string().trim().optional(),
  studentNumber: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "학번은 숫자 4자리로 입력하세요.")
    .refine((value) => /^1[1-5]\d{2}$/.test(value), "학번은 1100부터 1599 사이의 숫자 4자리로 입력하세요."),
  studentName: z.string().trim().min(1, "이름을 입력하세요.")
});

function normalizeIdentity<T extends z.infer<typeof studentIdentityBaseSchema>>(identity: T) {
  return {
    ...identity,
    className: identity.className || classNameFromStudentNumber(identity.studentNumber)
  };
}

export const studentIdentitySchema = studentIdentityBaseSchema.transform(normalizeIdentity);

export const transcriptSchema = z
  .string()
  .trim()
  .min(20, "분석할 텍스트를 20자 이상 입력하세요.")
  .max(12000, "텍스트는 12,000자 이하로 입력하세요.");

export const analysisItemSchema = z.object({
  id: z.string().min(1),
  surface: z.string().min(1),
  lemma: z.string().optional().default(""),
  pos: koreanPosSchema,
  frequency: z.number().int().min(1),
  reason: z.string().optional().default(""),
  confidence: z.number().min(0).max(1).optional().default(0.5)
});

export const analysisItemsSchema = z.array(analysisItemSchema).min(1).max(60);

export const studentChoiceSchema = z.record(z.string(), koreanPosSchema);

export const analyzeRequestSchema = studentIdentityBaseSchema
  .extend({
    transcriptText: transcriptSchema
  })
  .transform(normalizeIdentity);

export const submitRequestSchema = studentIdentityBaseSchema
  .extend({
    transcriptText: transcriptSchema,
    items: analysisItemsSchema,
    choices: studentChoiceSchema
  })
  .transform(normalizeIdentity);

export const answerKeySchema = z.record(z.string(), koreanPosSchema);

export const incorrectItemSchema = z.object({
  id: z.string(),
  surface: z.string(),
  expected: koreanPosSchema,
  actual: koreanPosSchema.optional()
});

export const gradingSchema = z.object({
  correctCount: z.number().int().min(0),
  totalCount: z.number().int().min(0),
  score: z.number().min(0).max(100),
  incorrectItems: z.array(incorrectItemSchema)
});

export type StudentIdentity = z.infer<typeof studentIdentitySchema>;
export type AnalysisItem = z.infer<typeof analysisItemSchema>;
export type StudentChoices = z.infer<typeof studentChoiceSchema>;
export type AnswerKey = z.infer<typeof answerKeySchema>;
export type GradingResult = z.infer<typeof gradingSchema>;
