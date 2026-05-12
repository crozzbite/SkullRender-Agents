/** Parsed agent manifest YAML (minimal contract for MCP listing). */

export interface AgentManifest {
  id: string;
  display_name?: string;
  summary?: string;
  must?: string[];
  never?: string[];
  [key: string]: unknown;
}

export interface BriefValidationResult {
  valid: boolean;
  errors?: Array<{ keyword: string; instancePath?: string; message?: string }>;
}
