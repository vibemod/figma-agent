# Figma MCP Server for Cursor

This guide shows how to configure Cursor to use Figma's official remote MCP server.

## Quick Setup (Recommended)

### Option 1: Deep Link Installation

Click the Figma MCP server deep link from Cursor to automatically configure the connection.

### Option 2: Manual Configuration

Add the following to your Cursor MCP settings file:

**Location:**
- macOS/Linux: `~/.cursor/mcp.json`
- Windows: `%USERPROFILE%\.cursor\mcp.json`

```json
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp",
      "type": "http"
    }
  }
}
```

After adding the configuration:
1. Open Cursor → Settings → Cursor Settings
2. Go to the **MCP** tab
3. Click **Connect** next to the Figma server
4. Complete the OAuth authentication flow

## Alternative: Desktop Server

If you prefer using the Figma desktop app (enables selection-based prompting):

```json
{
  "mcpServers": {
    "figma": {
      "url": "http://127.0.0.1:3845/mcp",
      "type": "http"
    }
  }
}
```

**Note:** The desktop server requires Figma desktop app to be running.

## Features

The Figma MCP server provides AI assistants access to:

- **Read Design Files**: Get file structure, nodes, components, and styles
- **Export Assets**: Export frames and components as images
- **Access Variables**: Read design tokens and variables
- **View Comments**: Read comments and discussions on files

## Usage Examples

Once connected, use natural language in Cursor:

```
"Analyze the design at https://www.figma.com/design/ABC123/My-Design"
```

```
"What components are used in this Figma file?"
```

```
"Export the header frame from my design"
```

## Rate Limits

| Plan | Limit |
|------|-------|
| Starter / View / Collab seats | 6 tool calls per month |
| Dev / Full seats (Professional+) | Per-minute limits (Tier 1 API) |

## Remote vs Desktop Server

| Feature | Remote Server | Desktop Server |
|---------|---------------|----------------|
| Selection-based prompting | No | Yes |
| Requires desktop app | No | Yes |
| Authentication | OAuth | Local |
| Works offline | No | Yes (local files) |

## Troubleshooting

### Connection Failed
- Verify the URL is exactly `https://mcp.figma.com/mcp`
- Check your internet connection
- Try re-authenticating through Cursor settings

### Rate Limit Exceeded
- Wait for the limit to reset
- Consider upgrading to a Dev or Full seat for higher limits

## Resources

- [Figma MCP Server Documentation](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)
- [Figma Help Center - MCP Setup](https://help.figma.com/hc/en-us/articles/35281350665623-Figma-MCP-collection-How-to-set-up-the-Figma-remote-MCP-server)
- [Figma MCP Server Guide (GitHub)](https://github.com/figma/mcp-server-guide/)

## License

MIT
