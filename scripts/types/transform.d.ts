/**
 * scripts/types/transform.d.ts
 *
 * Ambient declarations for document scanners, conversion options, and frontmatter payloads.
 */

interface SourceFrontmatterExtra {
  source_url?: string;
  downloaded_at?: string;
  title?: string;
  description?: string;
  author?: string;
  [key: string]: any;
}

interface SourceFrontmatterFields {
  source_file?: string;
  sha256?: string;
  size_bytes?: string | number;
  normalized_at?: string;
  normalized_by?: string;
  source_url?: string;
  downloaded_at?: string;
  title?: string;
  description?: string;
  author?: string;
  [key: string]: any;
}

interface ScannerWalkFile {
  absPath: string;
  relPath: string;
}

interface ScannerConversionResult {
  body: string;
  info?: any;
  partial?: boolean;
  note?: string;
}

interface ScannerProcessResult {
  format: string;
  status: string;
  action: string;
  outcome: 'processed' | 'skipped';
}

interface DependencyCheckResult {
  ok: boolean;
  status?: string;
  reason?: string;
}

interface ScanOptions {
  formats?: string[];
  webImportMeta?: Record<string, SourceFrontmatterExtra>;
  autoAcceptPrompt?: boolean;
  promptCallback?: (sourceFile: string) => Promise<boolean> | boolean;
  depPromptCallback?: (ext: string) => Promise<boolean> | boolean;
}

interface RegistryEntry {
  name: string;
  format: string;
  size: number;
  status: string;
  action: string;
}

interface ScanSummary {
  totalDiscovered: number;
  processedCount: number;
  skippedCount: number;
  registry: RegistryEntry[];
}

declare module 'mammoth' {
  export function convertToMarkdown(options: { path: string }): Promise<{ value: string }>;
}

declare module 'pdf-parse' {
  function pdfParse(dataBuffer: Buffer | Uint8Array, options?: any): Promise<{ text: string; info?: any; [key: string]: any }>;
  export = pdfParse;
}

declare module 'xlsx' {
  export const utils: any;
  export function readFile(filename: string, opts?: any): any;
}

declare module 'minimist' {
  function minimist(args?: string[], opts?: any): any;
  export = minimist;
}

declare module 'prompts' {
  function prompts(questions: any, options?: any): Promise<any>;
  export = prompts;
}

declare module 'sharp' {
  function sharp(input?: any, options?: any): any;
  export = sharp;
}
