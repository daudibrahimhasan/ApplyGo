import { KnowledgeEntry, PreviousAnswer } from '../../shared/schemas/knowledge';
import { normalizeText, normalizeQuestion } from '../matching/normalizer';

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing',
  'don\'t', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t',
  'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers',
  'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if',
  'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t',
  'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s',
  'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re',
  'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t',
  'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s',
  'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t',
  'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself',
  'yourselves', 'please', 'describe', 'explain', 'detail', 'share',
]);

export function tokenize(text: string): string[] {
  const norm = normalizeText(text);
  return norm
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function classifyQuestionCategory(question: string): string[] {
  const q = normalizeText(question);
  const detected: string[] = [];

  if (/safety|alignment|eval|unlearn|agent|contain|oversight|red[- ]team/i.test(q)) {
    detected.push('AI safety interests', 'Research interests');
  }
  if (/research|publication|paper|study|hypothesis|investigat/i.test(q)) {
    detected.push('Research interests', 'Research direction', 'Experiments');
  }
  if (/project|built|develop|system|code|repository|github/i.test(q)) {
    detected.push('Projects', 'Technical experience');
  }
  if (/why|motivat|interest in|passion|goals|aspire|future/i.test(q)) {
    detected.push('Motivation', 'Career goals');
  }
  if (/lead|organi|mentor|team|collaborat/i.test(q)) {
    detected.push('Leadership');
  }
  if (/challenge|difficult|failure|obstacle|problem you solved/i.test(q)) {
    detected.push('Challenges');
  }

  return detected.length > 0 ? detected : ['Background'];
}

export interface ScoredKnowledgeEntry {
  entry: KnowledgeEntry;
  score: number;
  matchedTokens: string[];
}

export function retrieveKnowledge(
  question: string,
  entries: KnowledgeEntry[],
  opportunityType?: string,
  maxResults = 5
): ScoredKnowledgeEntry[] {
  const tokens = tokenize(question);
  const categories = classifyQuestionCategory(question);
  const normOppType = opportunityType ? normalizeText(opportunityType) : '';

  const scored = entries
    .filter((e) => e.allowAIUse !== false)
    .map((entry) => {
      let score = 0;
      const matchedTokens: string[] = [];

      // Category match
      if (categories.includes(entry.category)) {
        score += 15;
      }

      // Opportunity type match
      if (normOppType && entry.opportunityTypes.some((ot) => normalizeText(ot) === normOppType)) {
        score += 10;
      }

      const titleTokens = new Set(tokenize(entry.title));
      const tagTokens = new Set(entry.tags.flatMap(tokenize));
      const factTokens = new Set(entry.canonicalFacts.flatMap(tokenize));
      const bodyTokens = new Set(tokenize(entry.longVersion));

      tokens.forEach((t) => {
        let tokenMatched = false;
        if (titleTokens.has(t)) {
          score += 6;
          tokenMatched = true;
        }
        if (tagTokens.has(t)) {
          score += 5;
          tokenMatched = true;
        }
        if (factTokens.has(t)) {
          score += 4;
          tokenMatched = true;
        }
        if (bodyTokens.has(t)) {
          score += 2;
          tokenMatched = true;
        }
        if (tokenMatched && !matchedTokens.includes(t)) {
          matchedTokens.push(t);
        }
      });

      return { entry, score, matchedTokens };
    })
    .filter((res) => res.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults);
}

export interface RetrievedPreviousAnswer {
  answer: PreviousAnswer;
  isExactMatch: boolean;
  similarityScore: number;
}

export function retrievePreviousAnswers(
  question: string,
  previousAnswers: PreviousAnswer[]
): RetrievedPreviousAnswer[] {
  const normQ = normalizeQuestion(question);
  const tokens = new Set(tokenize(question));

  return previousAnswers
    .map((pa) => {
      const normPaQ = normalizeQuestion(pa.originalQuestion);
      const isExact = normQ === normPaQ;

      let score = 0;
      if (isExact) {
        score = 100;
      } else {
        const paTokens = tokenize(pa.originalQuestion);
        let intersection = 0;
        paTokens.forEach((t) => {
          if (tokens.has(t)) intersection++;
        });
        score = tokens.size > 0 ? (intersection / Math.max(tokens.size, paTokens.length)) * 80 : 0;
      }

      return {
        answer: pa,
        isExactMatch: isExact,
        similarityScore: Math.round(score),
      };
    })
    .filter((res) => res.similarityScore >= 30)
    .sort((a, b) => b.similarityScore - a.similarityScore);
}
