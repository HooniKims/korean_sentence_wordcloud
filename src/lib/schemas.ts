import { z } from "zod";
import { KOREAN_POS } from "./pos";

export const koreanPosSchema = z.enum(KOREAN_POS);

export const studentIdentitySchema = z.object({
  className: z.string().trim().min(1, "반을 입력하세요."),
  studentNumber: z.string().trim().min(1, "학번을 입력하세요."),
  studentName: z.string().trim().min(1, "이름을 입력하세요.")
});

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

export const analyzeRequestSchema = studentIdentitySchema.extend({
  transcriptText: transcriptSchema
});

export const submitRequestSchema = analyzeRequestSchema.extend({
  items: analysisItemsSchema,
  choices: studentChoiceSchema
});

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
