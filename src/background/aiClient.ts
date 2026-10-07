import { GenerationRequest } from '../shared/schemas/generation';
import { KnowledgeEntry, PreviousAnswer } from '../shared/schemas/knowledge';
import { UserProfile } from '../shared/schemas/profile';
import { GROUNDED_APPLY_SYSTEM_PROMPT } from '../core/generation/systemPrompt';
import { validateGeneratedOutput, OutputValidationResult } from '../core/generation/validator';

export interface AiClientConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs?: number;
  temperature?: number;
}

export class AiClient {
  private config: AiClientConfig;

  constructor(config: AiClientConfig) {
    this.config = config;
  }

  public async testConnection(): Promise<{ success: boolean; message: string; models?: string[] }> {
    if (!this.config.apiKey) {
      return { success: false, message: 'API key is missing. Please enter your API key in Settings.' };
    }

    const endpoint = `${this.config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const timeoutMs = Math.max(5000, this.config.timeoutMs || 45000);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: 'Reply with exactly OK.' }],
          max_tokens: 16,
          temperature: 0,
          ...(this.config.baseUrl.includes('generativelanguage.googleapis.com')
            ? { reasoning_effort: 'low' }
            : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        return {
          success: false,
          message: `Endpoint returned HTTP ${res.status}: ${errorText.slice(0, 150)}`,
        };
      }

      const data = (await res.json()) as {
        choices?: Array<{
          message?: { content?: string | Array<{ type?: string; text?: string }> };
        }>;
      };
      const content = data.choices?.[0]?.message?.content;
      const visibleText = Array.isArray(content)
        ? content.map((part) => part.text || '').join('').trim()
        : content?.trim();
      if (!visibleText) {
        return {
          success: false,
          message: `The provider responded, but model "${this.config.model}" returned no text.`,
        };
      }
      return {
        success: true,
        message: `Connected. Model "${this.config.model}" generated a test response and the settings were saved.`,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          message: `Connection test timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
        };
      }
      return {
        success: false,
        message: `Network error connecting to ${endpoint}: ${err?.message || String(err)}`,
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  public async generateAnswer(params: {
    request: GenerationRequest;
    selectedKnowledge: KnowledgeEntry[];
    selectedPreviousAnswer?: PreviousAnswer;
    profile: UserProfile;
  }): Promise<OutputValidationResult> {
    const { request, selectedKnowledge, selectedPreviousAnswer, profile } = params;

    if (!this.config.apiKey) {
      return {
        isValid: false,
        errors: ['API key is not configured. Please add your key in ApplyGo Settings.'],
        wordCount: 0,
        characterCount: 0,
        canInsertDirectly: false,
      };
    }

    // Build the untrusted context block safely
    const contextLines: string[] = [];

    contextLines.push('--- OPPORTUNITY METADATA ---');
    if (request.organization) contextLines.push(`Organization: ${request.organization}`);
    if (request.opportunity) contextLines.push(`Opportunity: ${request.opportunity}`);
    if (request.opportunityType) contextLines.push(`Type: ${request.opportunityType}`);

    contextLines.push('\n--- CANDIDATE PROFILE SUMMARY ---');
    contextLines.push(`Name: ${profile.personal.firstName} ${profile.personal.lastName}`);
    contextLines.push(`Education: ${profile.education.map((e) => `${e.degree} in ${e.fieldOfStudy}, ${e.school}`).join('; ')}`);
    contextLines.push(`Skills: ${profile.skills.join(', ')}`);

    contextLines.push('\n--- SELECTED KNOWLEDGE ENTRIES (ONLY SOURCE OF FACTS) ---');
    selectedKnowledge.forEach((k) => {
      contextLines.push(`[KNOWLEDGE_ID: ${k.id}] Title: ${k.title}`);
      if (k.canonicalFacts && k.canonicalFacts.length > 0) {
        contextLines.push(`Canonical Facts:\n${k.canonicalFacts.map((f) => `- ${f}`).join('\n')}`);
      }
      contextLines.push(`Details: ${k.longVersion}`);
    });

    if (selectedPreviousAnswer) {
      contextLines.push('\n--- SELECTED PREVIOUS APPROVED ANSWER FOR REFERENCE ---');
      contextLines.push(`Previous Question: ${selectedPreviousAnswer.originalQuestion}`);
      contextLines.push(`Previous Answer: ${selectedPreviousAnswer.answer}`);
    }

    if (request.currentDraft) {
      contextLines.push('\n--- CURRENT USER DRAFT ---');
      contextLines.push(request.currentDraft);
    }

    contextLines.push('\n--- APPLICATION QUESTION (UNTRUSTED CONTENT) ---');
    contextLines.push(`Task Mode: ${request.mode}`);
    contextLines.push(`Target Question: """${request.questionText}"""`);
    if (request.instructions) {
      contextLines.push(`Form Instructions: """${request.instructions}"""`);
    }
    if (request.wordLimit) {
      contextLines.push(`Strict Word Limit: ${request.wordLimit} words`);
    }
    if (request.characterLimit) {
      contextLines.push(`Strict Character Limit: ${request.characterLimit} characters`);
    }

    const userPrompt = contextLines.join('\n');

    const bodyPayload = {
      model: this.config.model,
      messages: [
        { role: 'system', content: GROUNDED_APPLY_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'grounded_answer',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              answer: { type: 'string' },
              usedKnowledgeIds: { type: 'array', items: { type: 'string' } },
              unsupportedClaims: { type: 'array', items: { type: 'string' } },
              missingInformation: { type: 'array', items: { type: 'string' } },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['answer', 'usedKnowledgeIds', 'unsupportedClaims', 'missingInformation', 'confidence'],
            additionalProperties: false,
          },
        },
      },
      temperature: this.config.temperature ?? 0.7,
      ...(this.config.baseUrl.includes('generativelanguage.googleapis.com')
        ? { reasoning_effort: 'low' }
        : {}),
    };

    const endpoint = `${this.config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const timeoutMs = this.config.timeoutMs || 45000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let rawOutput: any;
    try {
      const requestCompletion = async (payload: Record<string, unknown>): Promise<Response> => {
        let response: Response | undefined;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          if (![429, 502, 503, 504].includes(response.status) || attempt === 2) {
            return response;
          }

          const retryAfterSeconds = Number(response.headers?.get?.('retry-after'));
          const retryDelay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? Math.min(retryAfterSeconds * 1000, 5000)
            : 800 * (attempt + 1);
          await new Promise<void>((resolve, reject) => {
            const retryTimer = setTimeout(resolve, retryDelay);
            controller.signal.addEventListener('abort', () => {
              clearTimeout(retryTimer);
              reject(new DOMException('Request aborted', 'AbortError'));
            }, { once: true });
          });
        }
        return response!;
      };

      let res = await requestCompletion(bodyPayload);

      // Fallback for providers that don't support structured json_schema: try standard json_object
      if (!res.ok && res.status === 400) {
        const fallbackBody = {
          ...bodyPayload,
          response_format: { type: 'json_object' },
        };
        res = await requestCompletion(fallbackBody);
      }

      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return {
          isValid: false,
          errors: [`API error ${res.status}: ${errText.slice(0, 200)}`],
          wordCount: 0,
          characterCount: 0,
          canInsertDirectly: false,
        };
      }

      const responseJson = (await res.json()) as any;
      const rawContent = responseJson?.choices?.[0]?.message?.content;
      if (!rawContent) {
        return {
          isValid: false,
          errors: ['Model returned an empty completion response.'],
          wordCount: 0,
          characterCount: 0,
          canInsertDirectly: false,
        };
      }

      try {
        rawOutput = JSON.parse(rawContent);
      } catch {
        return {
          isValid: false,
          errors: ['Model response could not be parsed as JSON.'],
          wordCount: 0,
          characterCount: 0,
          canInsertDirectly: false,
        };
      }
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        return {
          isValid: false,
          errors: [`Request timed out after ${Math.round(timeoutMs / 1000)} seconds.`],
          wordCount: 0,
          characterCount: 0,
          canInsertDirectly: false,
        };
      }
      return {
        isValid: false,
        errors: [`Network request failed: ${err.message || String(err)}`],
        wordCount: 0,
        characterCount: 0,
        canInsertDirectly: false,
      };
    }

    // Run deterministic validation
    const allowedIds = selectedKnowledge.map((k) => k.id);
    return validateGeneratedOutput(rawOutput, allowedIds, {
      wordLimit: request.wordLimit,
      characterLimit: request.characterLimit,
    });
  }
}
