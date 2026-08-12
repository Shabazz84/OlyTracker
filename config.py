import os

# Load .env if present (never commit .env to git)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

CHANNELS = [
    "https://www.youtube.com/@pavlukhinweightlifting",
    "https://www.youtube.com/@athletists",
    "https://www.youtube.com/@berestovteam",
    "https://www.youtube.com/@catalystathletics",
    "https://www.youtube.com/@torokhtiy",
    "https://www.youtube.com/channel/UCvHbRb9z_sIRzO7EHnN66SQ",
    "https://www.youtube.com/@DozerWeightlifting",
    "https://www.youtube.com/user/sonnywebsterGB",
    "https://www.youtube.com/@sikastrength",
]

PLAYLISTS = [
    "https://youtube.com/playlist?list=PLf-VoST4p_FpSx1M4hV2RY4IsupbJhMU1",
]

# last-man.org is deliberately excluded: a 619-page scrape of it (still under
# transcripts/web/last_manorg/, gitignored) turned out to carry a site-wide
# WordPress theme compromise (a PHP eval() backdoor + gambling spam-link
# injection on every page). The summarization pipeline filtered it out before
# it reached any summary or master_synthesis.md, but the site itself is still
# compromised — do not re-add it or scrape it again.
WEB_SOURCES = [
    "https://berestovteam.ru",
    "https://www.catalystathletics.com/article/",
    "https://blog.torokhtiy.com/",
    "https://power35.ru/biblioteka/last-man-standing-lms-trenirovki-s-dmitriem-golovinskim-denis-pikljaev/",
    "https://dozerweightlifting.com/",
    "https://www.theliftingzone.com/",
    "https://www.sonnywebster.com/",
]

TELEGRAM_EXPORT = "data/telegram_atletisty.json"

USE_YOUTUBE_API = False
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

TRANSCRIPT_DIR = "transcripts"
SUMMARY_DIR = "summaries"
AUDIO_DIR = "audio"

TRANSCRIPT_LANGUAGES = ["ru", "uk", "en"]
REQUEST_DELAY = 1.5
MAX_VIDEOS = None
SKIP_MISSING = True

# ── Local Whisper transcription (faster-whisper) ──────────────────────────────
# Used via --whisper: downloads real audio and transcribes locally instead of
# scraping YouTube's auto-generated captions (which are low quality for
# Russian weightlifting terminology).
WHISPER_MODEL = "large-v3"
WHISPER_DEVICE = "cuda"
WHISPER_COMPUTE_TYPE = "float16"

# yt-dlp audio download auth: prefer a live browser cookie jar (set to
# "firefox", "edge", etc.) over the static data/cookies.txt export below —
# a live jar survives YouTube's bot-check better since it's never stale.
# None = fall back to data/cookies.txt if present.
YTDLP_COOKIES_BROWSER = None
AUDIO_DOWNLOAD_DELAY = 4.0  # seconds between yt-dlp audio downloads (bot-check mitigation)

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen2.5:32b"
OLLAMA_FALLBACK_MODEL = "qwen2.5:14b"
OLLAMA_TIMEOUT = 120

# ── LLM backend (LM Studio — OpenAI-compatible API) ───────────────────────────
LLM_BASE_URL = "http://localhost:1234/v1"
LLM_MODEL = "qwen/qwen3.5-35b-a3b"
LLM_TIMEOUT = 600
LLM_MAX_TOKENS = 1400

# ── Claude API (Anthropic) — faster alternative to local LLM ─────────────────
USE_CLAUDE_API = True
CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-haiku-4-5"  # ~$1.50 total for 396 videos — per-video/channel summaries
CLAUDE_SYNTHESIS_MODEL = "claude-sonnet-5"  # master_synthesis.md is the single highest-leverage
# output of the whole pipeline (21 sources → one document) — worth the extra cost over Haiku.

SUMMARIZE_ON_EXTRACT = True

SUMMARY_CHUNK_TOKENS = 6000

OLY_PRIORITY_CHANNELS = [
    "UCvHbRb9z_sIRzO7EHnN66SQ",
    "sikastrength",
]

# Title keywords for filtering OLY-relevant videos on mixed channels (Golovinsky)
OLY_VIDEO_KEYWORDS = [
    "тяжел", "рывок", "толчок", "тяга", "штанга", "атлетик", "олимп",
    "weightlift", "snatch", "clean", "jerk", "oly",
]

DOZER_CHANNEL_HANDLE = "@DozerWeightlifting"
DOZER_CUE_INDEX_OUTPUT = "summaries/dozer_cue_index.md"
DOZER_CUE_KEYWORDS = ["back", "demon", "snatch receive", "overhead squat", "jerk", "position", "cue"]

WEBSTER_CHANNEL_HANDLE = "sonnywebsterGB"
WEBSTER_MOBILITY_KEYWORDS = ["mobility", "flexibility", "thoracic", "shoulder", "hip", "ankle", "stretch"]

# ── BRAINDUMP integration ─────────────────────────────────────────────────────
# OlyTracker no longer extracts anything. BRAINDUMP is the sole extractor; we
# index the raw transcripts it persists and retrieve from them for the master
# synthesis. See docs/superpowers/specs/2026-08-07-braindump-unified-extraction-design.md
BRAINDUMP_PATH = os.getenv("BRAINDUMP_PATH", r"D:\Programming\Brain_Dump")
# Must default to a path inside BRAINDUMP_PATH, not a bare relative filename —
# indexer.config_loader.load_config() resolves it against cwd, and OlyTracker
# has no config.yaml of its own. Running `python main.py synthesize` from this
# repo (the documented migration runbook) would otherwise fail with
# "Config not found: config.yaml" instead of finding Brain_Dump's config.
BRAINDUMP_CONFIG = os.getenv("BRAINDUMP_CONFIG", os.path.join(BRAINDUMP_PATH, "config.yaml"))

# Our OWN collection. Never braindump_hybrid — transcript chunks must not
# compete with summary chunks in the Telegram bot's retrieval budget.
SYNTHESIS_COLLECTION = "oly_transcripts"

# Retrieval budget for synthesis. Deliberately far above the chat path's
# qdrant.max_chunks=5: a synthesis section needs breadth, a chat answer does not.
SYNTHESIS_MAX_CHUNKS = 30

MASTER_SYNTHESIS_PATH = "summaries/master_synthesis.md"

# Evidence packs: one directory per run, written under EVIDENCE_DIR/<date>/.
# Gitignored — a pack is verbatim transcript text.
EVIDENCE_DIR = "evidence"
# Per-question retrieval budget. Wide enough to show whether a claim is one
# coach's opinion or a consensus, narrow enough that the file stays readable.
EVIDENCE_MAX_CHUNKS = 12
