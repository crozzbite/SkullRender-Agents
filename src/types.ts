/** Parsed agent manifest YAML (minimal contract for MCP listing). */

export interface AgentManifest {
  id: string;
  display_name?: string;
  summary?: string;
  must?: string[];
  never?: string[];
  /** Legion: spine | saep | sae | personality_pack */
  office?: "spine" | "saep" | "sae" | "personality_pack";
  stage?: string;
  reports_to?: string;
  handoff_owner?: boolean;
  rasci_rows?: string[];
  permissions?: {
    tools?: string[];
    mcp?: string[];
    skills?: string[];
    rules?: string[];
  };
  /** Pack id injected on-demand (e.g. PackLich). */
  personality_pack?: string;
  personality_pack_default?: boolean;
  [key: string]: unknown;
}

export interface BriefValidationResult {
  valid: boolean;
  errors?: Array<{ keyword: string; instancePath?: string; message?: string }>;
}
