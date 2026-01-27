#!/usr/bin/env node

/**
 * Figma MCP Server
 *
 * An MCP (Model Context Protocol) server that enables AI assistants
 * like Cursor to interact with Figma designs.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  FigmaClient,
  parseFigmaUrl,
  flattenNodes,
  findNodeById,
  summarizeNode,
  type FigmaNode,
} from './figma-client.js';

// Get the Figma access token from environment
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;

if (!FIGMA_ACCESS_TOKEN) {
  console.error('Error: FIGMA_ACCESS_TOKEN environment variable is required');
  console.error('Get your token at: https://www.figma.com/developers/api#access-tokens');
  process.exit(1);
}

const figmaClient = new FigmaClient({ accessToken: FIGMA_ACCESS_TOKEN });

// Create the MCP server
const server = new Server(
  {
    name: 'figma-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Tool input schemas using Zod
const GetFileSchema = z.object({
  file_key: z.string().describe('The Figma file key (from URL)'),
  depth: z.number().optional().describe('How deep to traverse the node tree (default: full depth)'),
});

const GetFileFromUrlSchema = z.object({
  url: z.string().url().describe('The full Figma file URL'),
  depth: z.number().optional().describe('How deep to traverse the node tree'),
});

const GetNodeSchema = z.object({
  file_key: z.string().describe('The Figma file key'),
  node_id: z.string().describe('The node ID to retrieve'),
});

const GetNodesSchema = z.object({
  file_key: z.string().describe('The Figma file key'),
  node_ids: z.array(z.string()).describe('Array of node IDs to retrieve'),
});

const GetImagesSchema = z.object({
  file_key: z.string().describe('The Figma file key'),
  node_ids: z.array(z.string()).describe('Array of node IDs to export as images'),
  format: z.enum(['png', 'jpg', 'svg', 'pdf']).optional().describe('Image format (default: png)'),
  scale: z.number().min(0.01).max(4).optional().describe('Image scale 0.01-4 (default: 1)'),
});

const GetCommentsSchema = z.object({
  file_key: z.string().describe('The Figma file key'),
});

const PostCommentSchema = z.object({
  file_key: z.string().describe('The Figma file key'),
  message: z.string().describe('The comment message'),
  node_id: z.string().optional().describe('Optional node ID to attach comment to'),
});

const GetComponentsSchema = z.object({
  file_key: z.string().describe('The Figma file key'),
});

const GetStylesSchema = z.object({
  file_key: z.string().describe('The Figma file key'),
});

const SearchNodesSchema = z.object({
  file_key: z.string().describe('The Figma file key'),
  query: z.string().describe('Search query (matches node names)'),
  type: z.string().optional().describe('Filter by node type (e.g., FRAME, TEXT, COMPONENT)'),
});

const GetProjectFilesSchema = z.object({
  project_id: z.string().describe('The Figma project ID'),
});

const GetTeamProjectsSchema = z.object({
  team_id: z.string().describe('The Figma team ID'),
});

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_file',
        description: 'Get a Figma file by its key. Returns the file structure including all nodes, components, and styles.',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: { type: 'string', description: 'The Figma file key (from URL)' },
            depth: { type: 'number', description: 'How deep to traverse the node tree (default: full depth)' },
          },
          required: ['file_key'],
        },
      },
      {
        name: 'get_file_from_url',
        description: 'Get a Figma file using its full URL. Automatically extracts the file key.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The full Figma file URL' },
            depth: { type: 'number', description: 'How deep to traverse the node tree' },
          },
          required: ['url'],
        },
      },
      {
        name: 'get_node',
        description: 'Get a specific node from a Figma file by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: { type: 'string', description: 'The Figma file key' },
            node_id: { type: 'string', description: 'The node ID to retrieve' },
          },
          required: ['file_key', 'node_id'],
        },
      },
      {
        name: 'get_nodes',
        description: 'Get multiple nodes from a Figma file by their IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: { type: 'string', description: 'The Figma file key' },
            node_ids: { type: 'array', items: { type: 'string' }, description: 'Array of node IDs to retrieve' },
          },
          required: ['file_key', 'node_ids'],
        },
      },
      {
        name: 'get_images',
        description: 'Export nodes as images. Returns URLs to the rendered images.',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: { type: 'string', description: 'The Figma file key' },
            node_ids: { type: 'array', items: { type: 'string' }, description: 'Array of node IDs to export' },
            format: { type: 'string', enum: ['png', 'jpg', 'svg', 'pdf'], description: 'Image format' },
            scale: { type: 'number', description: 'Image scale 0.01-4' },
          },
          required: ['file_key', 'node_ids'],
        },
      },
      {
        name: 'get_comments',
        description: 'Get all comments on a Figma file.',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: { type: 'string', description: 'The Figma file key' },
          },
          required: ['file_key'],
        },
      },
      {
        name: 'post_comment',
        description: 'Post a comment on a Figma file.',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: { type: 'string', description: 'The Figma file key' },
            message: { type: 'string', description: 'The comment message' },
            node_id: { type: 'string', description: 'Optional node ID to attach comment to' },
          },
          required: ['file_key', 'message'],
        },
      },
      {
        name: 'get_components',
        description: 'Get all components defined in a Figma file.',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: { type: 'string', description: 'The Figma file key' },
          },
          required: ['file_key'],
        },
      },
      {
        name: 'get_styles',
        description: 'Get all styles defined in a Figma file (colors, text styles, effects, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: { type: 'string', description: 'The Figma file key' },
          },
          required: ['file_key'],
        },
      },
      {
        name: 'search_nodes',
        description: 'Search for nodes in a Figma file by name or type.',
        inputSchema: {
          type: 'object',
          properties: {
            file_key: { type: 'string', description: 'The Figma file key' },
            query: { type: 'string', description: 'Search query (matches node names)' },
            type: { type: 'string', description: 'Filter by node type (e.g., FRAME, TEXT, COMPONENT)' },
          },
          required: ['file_key', 'query'],
        },
      },
      {
        name: 'get_project_files',
        description: 'List all files in a Figma project.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'The Figma project ID' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_team_projects',
        description: 'List all projects in a Figma team.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: { type: 'string', description: 'The Figma team ID' },
          },
          required: ['team_id'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_file': {
        const { file_key, depth } = GetFileSchema.parse(args);
        const file = await figmaClient.getFile(file_key, { depth });

        // Create a summary of the file structure
        const nodes = flattenNodes(file.document);
        const summary = {
          name: file.name,
          lastModified: file.lastModified,
          version: file.version,
          totalNodes: nodes.length,
          componentCount: Object.keys(file.components).length,
          styleCount: Object.keys(file.styles).length,
          topLevelFrames: file.document.children?.map((child) => ({
            id: child.id,
            name: child.name,
            type: child.type,
            childCount: child.children?.length || 0,
          })),
          document: file.document,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      case 'get_file_from_url': {
        const { url, depth } = GetFileFromUrlSchema.parse(args);
        const parsed = parseFigmaUrl(url);

        if (!parsed) {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid Figma URL');
        }

        const file = await figmaClient.getFile(parsed.fileKey, { depth });

        // If there's a specific node ID in the URL, highlight it
        let focusedNode: FigmaNode | null = null;
        if (parsed.nodeId) {
          focusedNode = findNodeById(file.document, parsed.nodeId);
        }

        const nodes = flattenNodes(file.document);
        const result = {
          name: file.name,
          fileKey: parsed.fileKey,
          lastModified: file.lastModified,
          totalNodes: nodes.length,
          componentCount: Object.keys(file.components).length,
          focusedNode: focusedNode ? summarizeNode(focusedNode) : null,
          topLevelFrames: file.document.children?.map((child) => ({
            id: child.id,
            name: child.name,
            type: child.type,
          })),
          document: file.document,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_node': {
        const { file_key, node_id } = GetNodeSchema.parse(args);
        const result = await figmaClient.getNodes(file_key, [node_id]);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_nodes': {
        const { file_key, node_ids } = GetNodesSchema.parse(args);
        const result = await figmaClient.getNodes(file_key, node_ids);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_images': {
        const { file_key, node_ids, format, scale } = GetImagesSchema.parse(args);
        const result = await figmaClient.getImages(file_key, node_ids, { format, scale });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_comments': {
        const { file_key } = GetCommentsSchema.parse(args);
        const result = await figmaClient.getComments(file_key);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'post_comment': {
        const { file_key, message, node_id } = PostCommentSchema.parse(args);
        const result = await figmaClient.postComment(file_key, message, node_id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_components': {
        const { file_key } = GetComponentsSchema.parse(args);
        const result = await figmaClient.getFileComponents(file_key);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_styles': {
        const { file_key } = GetStylesSchema.parse(args);
        const result = await figmaClient.getFileStyles(file_key);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'search_nodes': {
        const { file_key, query, type } = SearchNodesSchema.parse(args);
        const file = await figmaClient.getFile(file_key);

        const allNodes = flattenNodes(file.document);
        const queryLower = query.toLowerCase();

        const matches = allNodes.filter((node) => {
          const nameMatch = node.name.toLowerCase().includes(queryLower);
          const typeMatch = !type || node.type === type.toUpperCase();
          return nameMatch && typeMatch;
        });

        const results = matches.map((node) => ({
          id: node.id,
          name: node.name,
          type: node.type,
          summary: summarizeNode(node),
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                query,
                type: type || 'any',
                matchCount: results.length,
                matches: results.slice(0, 50), // Limit to 50 results
              }, null, 2),
            },
          ],
        };
      }

      case 'get_project_files': {
        const { project_id } = GetProjectFilesSchema.parse(args);
        const result = await figmaClient.getProjectFiles(project_id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_team_projects': {
        const { team_id } = GetTeamProjectsSchema.parse(args);
        const result = await figmaClient.getTeamProjects(team_id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, `Figma API error: ${errorMessage}`);
  }
});

// List available resources (currently none, but scaffolded for future use)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: [] };
});

// Read resources (currently none)
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${request.params.uri}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Figma MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
