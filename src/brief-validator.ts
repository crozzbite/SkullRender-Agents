import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import type { BriefValidationResult } from './types.js';

const ALLOWED_KEYS = new Set([
  'goal',
  'constraints',
  'forbidden_capabilities',
  'change_id',
  'handoff_notes',
]);

function isPlainObject(o: unknown): o is Record<string, unknown> {
  return typeof o === 'object' && o !== null && !Array.isArray(o);
}

function validateBriefObject(data: unknown): BriefValidationResult {
  const errors: NonNullable<BriefValidationResult['errors']> = [];

  if (!isPlainObject(data)) {
    errors.push({ keyword: 'type', instancePath: '', message: 'Brief must be a JSON/YAML object' });
    return { valid: false, errors };
  }

  for (const key of Object.keys(data)) {
    if (!ALLOWED_KEYS.has(key)) {
      errors.push({
        keyword: 'additionalProperties',
        instancePath: `/${key}`,
        message: `Property "${key}" is not permitted`,
      });
    }
  }

  const goal = data['goal'];
  if (goal === undefined || goal === '') {
    errors.push({ keyword: 'required', instancePath: '/goal', message: 'Missing or empty goal' });
  } else if (typeof goal !== 'string') {
    errors.push({ keyword: 'type', instancePath: '/goal', message: 'goal must be a string' });
  }

  const constr = data['constraints'];
  if (constr === undefined) {
    errors.push({
      keyword: 'required',
      instancePath: '/constraints',
      message: 'constraints is required',
    });
  } else if (!Array.isArray(constr)) {
    errors.push({
      keyword: 'type',
      instancePath: '/constraints',
      message: 'constraints must be an array of strings',
    });
  } else {
    constr.forEach((c, i) => {
      if (typeof c !== 'string' || c.length === 0) {
        errors.push({
          keyword: 'type',
          instancePath: `/constraints/${i}`,
          message: 'Each constraint must be a non-empty string',
        });
      }
    });
  }

  const forbidden = data['forbidden_capabilities'];
  if (forbidden === undefined) {
    errors.push({
      keyword: 'required',
      instancePath: '/forbidden_capabilities',
      message: 'forbidden_capabilities is required',
    });
  } else if (!Array.isArray(forbidden)) {
    errors.push({
      keyword: 'type',
      instancePath: '/forbidden_capabilities',
      message: 'forbidden_capabilities must be an array of strings',
    });
  } else if (forbidden.length < 1) {
    errors.push({
      keyword: 'minItems',
      instancePath: '/forbidden_capabilities',
      message: 'forbidden_capabilities must list at least one capability',
    });
  } else {
    forbidden.forEach((f, i) => {
      if (typeof f !== 'string' || f.length === 0) {
        errors.push({
          keyword: 'type',
          instancePath: `/forbidden_capabilities/${i}`,
          message: 'Each forbidden entry must be a non-empty string',
        });
      }
    });
  }

  if (data['change_id'] !== undefined) {
    if (typeof data['change_id'] !== 'string' || data['change_id'].length === 0) {
      errors.push({
        keyword: 'type',
        instancePath: '/change_id',
        message: 'change_id must be a non-empty string when provided',
      });
    }
  }

  if (
    data['handoff_notes'] !== undefined &&
    typeof data['handoff_notes'] !== 'string'
  ) {
    errors.push({
      keyword: 'type',
      instancePath: '/handoff_notes',
      message: 'handoff_notes must be a string when provided',
    });
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

/** Deterministic Presentador⇄Orquestador brief validation (mirrors schemas/brief.schema.json). */
export class BriefValidator {
  readonly schemaPath: string;

  constructor(repoRoot: string) {
    this.schemaPath = path.join(repoRoot, 'schemas', 'brief.schema.json');
    if (!fs.existsSync(this.schemaPath)) {
      throw new Error(`Missing brief schema file: ${this.schemaPath}`);
    }
  }

  /** Accept JSON object or parseable YAML/JSON string. */
  validatePayload(input: unknown): BriefValidationResult {
    let data: unknown = input;

    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) {
        return {
          valid: false,
          errors: [{ keyword: 'parse', message: 'Brief string is empty' }],
        };
      }
      try {
        if (trimmed.startsWith('{')) {
          data = JSON.parse(trimmed) as unknown;
        } else {
          data = YAML.parse(trimmed) as unknown;
        }
      } catch (e) {
        return {
          valid: false,
          errors: [
            {
              keyword: 'parse',
              message: e instanceof Error ? e.message : 'Failed to parse brief',
            },
          ],
        };
      }
    }

    return validateBriefObject(data);
  }
}
