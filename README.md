# Figma MCP Server

A Model Context Protocol (MCP) server that enables AI assistants like Cursor to interact with Figma designs.

## Features

- **Get File Information**: Retrieve complete Figma file structure including nodes, components, and styles
- **Node Operations**: Get specific nodes or search for nodes by name/type
- **Export Images**: Export any node as PNG, JPG, SVG, or PDF
- **Comments**: Read and post comments on Figma files
- **Components & Styles**: List all components and design styles in a file
- **Project Management**: List team projects and project files

## Prerequisites

- Node.js 18.0.0 or higher
- A Figma account with API access
- Figma Personal Access Token

## Getting Your Figma Access Token

1. Log in to your Figma account
2. Go to **Settings** → **Account** → **Personal access tokens**
3. Click **Create new token**
4. Give it a name (e.g., "Cursor MCP")
5. Copy the token (you won't be able to see it again)

Or visit: https://www.figma.com/developers/api#access-tokens

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/figma-mcp-server.git
cd figma-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration for Cursor

Add the following to your Cursor MCP settings file (`~/.cursor/mcp.json` on macOS/Linux or `%USERPROFILE%\.cursor\mcp.json` on Windows):

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["/path/to/figma-mcp-server/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your-figma-access-token"
      }
    }
  }
}
```

Replace:
- `/path/to/figma-mcp-server` with the actual path to this repository
- `your-figma-access-token` with your Figma Personal Access Token

### Alternative: Using npx (after publishing)

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["figma-mcp-server"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your-figma-access-token"
      }
    }
  }
}
```

## Available Tools

### File Operations

| Tool | Description |
|------|-------------|
| `get_file` | Get a Figma file by its key |
| `get_file_from_url` | Get a Figma file using its full URL |
| `get_node` | Get a specific node by ID |
| `get_nodes` | Get multiple nodes by their IDs |
| `search_nodes` | Search for nodes by name or type |

### Export

| Tool | Description |
|------|-------------|
| `get_images` | Export nodes as images (PNG, JPG, SVG, PDF) |

### Comments

| Tool | Description |
|------|-------------|
| `get_comments` | Get all comments on a file |
| `post_comment` | Post a comment on a file |

### Design System

| Tool | Description |
|------|-------------|
| `get_components` | Get all components in a file |
| `get_styles` | Get all styles in a file |

### Project Management

| Tool | Description |
|------|-------------|
| `get_team_projects` | List all projects in a team |
| `get_project_files` | List all files in a project |

## Usage Examples

Once configured, you can use natural language in Cursor to interact with Figma:

### Get file information
```
"Get the structure of my Figma file: https://www.figma.com/file/ABC123/My-Design"
```

### Search for components
```
"Search for all button components in file key XYZ789"
```

### Export a frame as PNG
```
"Export the frame with ID 123:456 from file ABC as a PNG at 2x scale"
```

### Get design styles
```
"What are all the text styles defined in this Figma file?"
```

### Post a comment
```
"Add a comment 'Needs review' to the header component in my Figma file"
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Troubleshooting

### "FIGMA_ACCESS_TOKEN environment variable is required"
Make sure you've added your Figma access token to the MCP configuration.

### "Figma API error (403)"
Your access token may have expired or doesn't have permission to access the requested file.

### "Invalid Figma URL"
Make sure you're using a valid Figma file URL (e.g., `https://www.figma.com/file/...` or `https://www.figma.com/design/...`).

## Finding Figma IDs

- **File Key**: The alphanumeric string in the URL after `/file/` or `/design/`
  - Example: In `https://www.figma.com/file/ABC123xyz/My-File`, the file key is `ABC123xyz`

- **Node ID**: Select a layer in Figma, then look at the URL for `?node-id=X:Y`
  - Or use the `search_nodes` tool to find nodes by name

- **Team ID**: Go to your team page, the ID is in the URL after `/team/`

- **Project ID**: Go to a project page, the ID is in the URL after `/project/`

## License

MIT
