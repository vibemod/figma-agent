/**
 * Figma API Client
 * Handles all interactions with the Figma REST API
 */

const FIGMA_API_BASE = 'https://api.figma.com/v1';

export interface FigmaClientConfig {
  accessToken: string;
}

export interface FigmaFile {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  styles: Record<string, FigmaStyle>;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  [key: string]: unknown;
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
}

export interface FigmaStyle {
  key: string;
  name: string;
  styleType: string;
  description: string;
}

export interface FigmaComment {
  id: string;
  message: string;
  created_at: string;
  user: {
    handle: string;
    img_url: string;
  };
  resolved_at?: string;
}

export interface FigmaImage {
  err: string | null;
  images: Record<string, string>;
}

export class FigmaClient {
  private accessToken: string;

  constructor(config: FigmaClientConfig) {
    this.accessToken = config.accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${FIGMA_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Figma-Token': this.accessToken,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Figma API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get a Figma file by its key
   */
  async getFile(fileKey: string, options?: {
    nodeIds?: string[];
    depth?: number;
  }): Promise<FigmaFile> {
    let endpoint = `/files/${fileKey}`;
    const params = new URLSearchParams();

    if (options?.nodeIds?.length) {
      params.set('ids', options.nodeIds.join(','));
    }
    if (options?.depth !== undefined) {
      params.set('depth', options.depth.toString());
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return this.request<FigmaFile>(endpoint);
  }

  /**
   * Get specific nodes from a Figma file
   */
  async getNodes(fileKey: string, nodeIds: string[]): Promise<{
    nodes: Record<string, { document: FigmaNode; components: Record<string, FigmaComponent> }>;
  }> {
    const endpoint = `/files/${fileKey}/nodes?ids=${nodeIds.join(',')}`;
    return this.request(endpoint);
  }

  /**
   * Get images for specific nodes
   */
  async getImages(fileKey: string, nodeIds: string[], options?: {
    scale?: number;
    format?: 'jpg' | 'png' | 'svg' | 'pdf';
  }): Promise<FigmaImage> {
    const params = new URLSearchParams({
      ids: nodeIds.join(','),
      scale: (options?.scale || 1).toString(),
      format: options?.format || 'png',
    });

    const endpoint = `/images/${fileKey}?${params.toString()}`;
    return this.request<FigmaImage>(endpoint);
  }

  /**
   * Get comments on a file
   */
  async getComments(fileKey: string): Promise<{ comments: FigmaComment[] }> {
    const endpoint = `/files/${fileKey}/comments`;
    return this.request(endpoint);
  }

  /**
   * Post a comment on a file
   */
  async postComment(fileKey: string, message: string, nodeId?: string): Promise<FigmaComment> {
    const endpoint = `/files/${fileKey}/comments`;
    const body: { message: string; client_meta?: { node_id: string } } = { message };

    if (nodeId) {
      body.client_meta = { node_id: nodeId };
    }

    return this.request<FigmaComment>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Get component information from a file
   */
  async getFileComponents(fileKey: string): Promise<{
    meta: { components: FigmaComponent[] };
  }> {
    const endpoint = `/files/${fileKey}/components`;
    return this.request(endpoint);
  }

  /**
   * Get styles from a file
   */
  async getFileStyles(fileKey: string): Promise<{
    meta: { styles: FigmaStyle[] };
  }> {
    const endpoint = `/files/${fileKey}/styles`;
    return this.request(endpoint);
  }

  /**
   * Get team projects
   */
  async getTeamProjects(teamId: string): Promise<{
    projects: { id: string; name: string }[];
  }> {
    const endpoint = `/teams/${teamId}/projects`;
    return this.request(endpoint);
  }

  /**
   * Get project files
   */
  async getProjectFiles(projectId: string): Promise<{
    files: { key: string; name: string; thumbnail_url: string; last_modified: string }[];
  }> {
    const endpoint = `/projects/${projectId}/files`;
    return this.request(endpoint);
  }
}

/**
 * Parse a Figma URL to extract the file key and optional node ID
 */
export function parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } | null {
  try {
    const urlObj = new URL(url);

    // Handle URLs like: https://www.figma.com/file/ABC123/File-Name
    // or: https://www.figma.com/design/ABC123/File-Name
    const pathMatch = urlObj.pathname.match(/\/(file|design)\/([a-zA-Z0-9]+)/);

    if (!pathMatch) {
      return null;
    }

    const fileKey = pathMatch[2];

    // Check for node-id in URL params
    const nodeId = urlObj.searchParams.get('node-id') || undefined;

    return { fileKey, nodeId };
  } catch {
    return null;
  }
}

/**
 * Flatten a Figma node tree into a list
 */
export function flattenNodes(node: FigmaNode, result: FigmaNode[] = []): FigmaNode[] {
  result.push(node);

  if (node.children) {
    for (const child of node.children) {
      flattenNodes(child, result);
    }
  }

  return result;
}

/**
 * Find a node by ID in a tree
 */
export function findNodeById(root: FigmaNode, id: string): FigmaNode | null {
  if (root.id === id) {
    return root;
  }

  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Get a summary of a node (useful for context)
 */
export function summarizeNode(node: FigmaNode): string {
  const parts = [`${node.type}: "${node.name}" (id: ${node.id})`];

  if (node.children) {
    parts.push(`children: ${node.children.length}`);
  }

  // Add relevant properties based on type
  if (node.type === 'TEXT' && 'characters' in node) {
    parts.push(`text: "${(node.characters as string).substring(0, 50)}..."`);
  }

  if ('fills' in node && Array.isArray(node.fills)) {
    parts.push(`fills: ${node.fills.length}`);
  }

  if ('absoluteBoundingBox' in node) {
    const box = node.absoluteBoundingBox as { width: number; height: number };
    parts.push(`size: ${Math.round(box.width)}x${Math.round(box.height)}`);
  }

  return parts.join(' | ');
}
