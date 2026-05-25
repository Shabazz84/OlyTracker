"""Generate docs/key.js from .env — gitignored, never committed."""
import re, pathlib

env = pathlib.Path(".env").read_text()

def get(name):
    m = re.search(rf"{name}=(.+)", env)
    return m.group(1).strip() if m else ""

claude_key = get("ANTHROPIC_API_KEY")
if not claude_key:
    raise SystemExit("ANTHROPIC_API_KEY not found in .env")

sb_url = get("SUPABASE_URL")
sb_key = get("SUPABASE_ANON_KEY")

lines = [f'window.__CLAUDE_KEY="{claude_key}";\n']
if sb_url:
    lines.append(f'window.__SUPABASE_URL="{sb_url}";\n')
if sb_key:
    lines.append(f'window.__SUPABASE_KEY="{sb_key}";\n')

pathlib.Path("docs/key.js").write_text("".join(lines))
print(f"docs/key.js written (claude: {claude_key[:12]}..., supabase: {'✓' if sb_url else '✗'})")
