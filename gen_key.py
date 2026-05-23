"""Generate docs/key.js from .env — gitignored, never committed."""
import re, pathlib

env = pathlib.Path(".env").read_text()
m = re.search(r"ANTHROPIC_API_KEY=(.+)", env)
if not m:
    raise SystemExit("ANTHROPIC_API_KEY not found in .env")

key = m.group(1).strip()
pathlib.Path("docs/key.js").write_text(f'window.__CLAUDE_KEY="{key}";\n')
print(f"docs/key.js written ({key[:12]}...)")
