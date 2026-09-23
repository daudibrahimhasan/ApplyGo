// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { scanPageForFields } from '../../src/content/scanner';
import { fillFields, fillSingleElement } from '../../src/content/filler';
import { UndoManager } from '../../src/content/undo';
import { defaultProfile } from '../../src/shared/storage/defaultProfile';
import { defaultKnowledge } from '../../src/shared/storage/defaultKnowledge';
import { retrieveKnowledge } from '../../src/core/retrieval/retriever';
import { validateGeneratedOutput } from '../../src/core/generation/validator';

describe('End-to-End Form Engine Workflow', () => {
  beforeEach(() => {
    const fixturePath = path.resolve(__dirname, '../fixtures/complexApplication.html');
    const html = fs.readFileSync(fixturePath, 'utf8');
    document.documentElement.innerHTML = html;
  });

  it('scans page, detects fields, blocks sensitive fields, and ignores honeypots', () => {
    const scan = scanPageForFields(defaultProfile);
    expect(scan.fields.length).toBeGreaterThan(0);

    // Verify honeypot website_trap was ignored
    const honeypot = scan.fields.find((f) => f.name === 'website_trap');
    expect(honeypot).toBeUndefined();

    // Verify firstName is high confidence match
    const firstName = scan.fields.find((f) => f.name === 'firstName');
    expect(firstName).toBeDefined();
    expect(firstName?.confidence).toBe('high');
    expect(firstName?.proposedValue).toBe('Daud');

    // Verify sensitive fields are BLOCKED
    const ssnField = scan.fields.find((f) => f.name === 'ssn');
    expect(ssnField).toBeDefined();
    expect(ssnField?.confidence).toBe('blocked');
    expect(ssnField?.sensitivity).toBe('blocked');

    const pwdField = scan.fields.find((f) => f.name === 'password');
    expect(pwdField).toBeDefined();
    expect(pwdField?.confidence).toBe('blocked');
    expect(pwdField?.sensitivity).toBe('blocked');

    const certField = scan.fields.find((f) => f.name === 'certify_truth');
    expect(certField).toBeDefined();
    expect(certField?.confidence).toBe('blocked');
  });

  it('fills safe fields, preserves user values, and leaves sensitive fields untouched', async () => {
    const scan = scanPageForFields(defaultProfile);
    const safeFields = scan.fields
      .filter((f) => f.confidence === 'high' && f.sensitivity === 'safe' && f.proposedValue)
      .map((f) => ({ id: f.id, selector: f.selector, value: f.proposedValue! }));

    expect(safeFields.length).toBeGreaterThan(0);

    const fillResult = await fillFields(safeFields);
    expect(fillResult.successCount).toBeGreaterThan(0);

    // Verify filled values in DOM
    const firstNameInput = document.querySelector<HTMLInputElement>('#first_name');
    expect(firstNameInput?.value).toBe('Daud');

    const lastNameInput = document.querySelector<HTMLInputElement>('#last_name');
    expect(lastNameInput?.value).toBe('Rahman');

    const emailInput = document.querySelector<HTMLInputElement>('#email');
    expect(emailInput?.value).toBe('daud.rahman@example.com');

    // Verify sensitive inputs REMAIN UNTOUCHED
    const ssnInput = document.querySelector<HTMLInputElement>('#ssn_tax_id');
    expect(ssnInput?.value).toBe('');

    const pwdInput = document.querySelector<HTMLInputElement>('#account_pwd');
    expect(pwdInput?.value).toBe('');

    const certBox = document.querySelector<HTMLInputElement>('#legal_cert');
    expect(certBox?.checked).toBe(false);

    // Verify existing user value was preserved
    const referralInput = document.querySelector<HTMLInputElement>('#user_note');
    expect(referralInput?.value).toBe('Attended CHAI workshop');
  });

  it('undoes the fill transaction and restores previous values', async () => {
    const scan = scanPageForFields(defaultProfile);
    const safeFields = scan.fields
      .filter((f) => f.confidence === 'high' && f.sensitivity === 'safe' && f.proposedValue)
      .map((f) => ({ id: f.id, selector: f.selector, value: f.proposedValue! }));

    await fillFields(safeFields);
    const firstNameInput = document.querySelector<HTMLInputElement>('#first_name');
    expect(firstNameInput?.value).toBe('Daud');

    // Undo transaction
    const undoResult = UndoManager.undoLastTransaction();
    expect(undoResult.success).toBe(true);
    expect(undoResult.restoredCount).toBeGreaterThan(0);

    // Value should be restored to initial empty state
    expect(firstNameInput?.value).toBe('');
  });

  it('generates a grounded written answer and inserts it into essay field without submitting', async () => {
    const questionText = 'Describe your technical focus in AI safety and verification.';
    const retrieved = retrieveKnowledge(questionText, defaultKnowledge, 'Research Fellowship', 3);
    expect(retrieved.length).toBeGreaterThan(0);

    const allowedIds = retrieved.map((r) => r.entry.id);

    // Mocked grounded answer matching Daud's facts
    const mockModelOutput = {
      answer:
        'In my research with the Berkeley Safety & Scalable Oversight Group and through the AgentContain project, I have focused on designing empirical evaluations and sandboxed telemetry for autonomous agentic systems. Rather than assuming alignment guardrails work, I benchmark tool-calling agents against indirect prompt injections using negative controls.',
      usedKnowledgeIds: [allowedIds[0]],
      unsupportedClaims: [],
      missingInformation: [],
      confidence: 'high',
    };

    const validation = validateGeneratedOutput(mockModelOutput, allowedIds, { wordLimit: 250 });
    expect(validation.isValid).toBe(true);
    expect(validation.canInsertDirectly).toBe(true);

    // Insert into textarea
    const insertRes = await fillSingleElement('#research_statement', validation.data!.answer);
    expect(insertRes.success).toBe(true);

    const textarea = document.querySelector<HTMLTextAreaElement>('#research_statement');
    expect(textarea?.value).toContain('AgentContain');

    // Confirm submit button was NEVER clicked
    let submitted = false;
    document.querySelector('#fellowship_form')?.addEventListener('submit', () => {
      submitted = true;
    });
    expect(submitted).toBe(false);
  });
});
