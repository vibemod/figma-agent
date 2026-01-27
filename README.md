# Figma MCP

## Installation

1. Open Cursor
2. Go to **Settings** → **MCP**
3. Click **Add new global MCP server**
4. Paste the configuration below and save
5. Click **Connect** and authorize with Figma
6. Use via prompt in Cursor chat

## Configuration

Add to `~/.cursor/mcp.json`:

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

## Usage

```
"Analyze the design at https://www.figma.com/design/ABC123/My-Design"
```
