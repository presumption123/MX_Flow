export interface OpenDocumentRegistryEntry {
  wc?: { id?: number };
  win?: unknown;
  docs?: Array<{ id?: string; name?: string; path?: string }>;
}

export function canonicalDocumentPath(filePath: unknown, platform?: string): string;
export function findOpenDocumentOwner(
  openDocsByWc: Map<unknown, OpenDocumentRegistryEntry>,
  filePath: unknown,
  platform?: string,
): { entry: OpenDocumentRegistryEntry; doc: { id?: string; name?: string; path?: string } } | null;
export function chooseDocumentOpenTarget(
  owner: ReturnType<typeof findOpenDocumentOwner>,
  senderWebContentsId: number | null | undefined,
  mode: unknown,
): 'current' | 'owner' | 'window';
