import { KnowledgeEntry } from '../schemas/knowledge';

/**
 * Empty default knowledge base.
 *
 * ApplyGo ships with NO pre-filled knowledge entries.
 * The user must add their own facts, experiences, projects,
 * and motivations through the Knowledge tab or by importing a backup.
 * This prevents fabricated achievements from being sent to the
 * writing model and appearing in generated application answers.
 */
export const defaultKnowledge: KnowledgeEntry[] = [];
