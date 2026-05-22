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

TRANSCRIPT_LANGUAGES = ["ru", "uk", "en"]
REQUEST_DELAY = 1.5
MAX_VIDEOS = None
SKIP_MISSING = True

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
CLAUDE_MODEL = "claude-haiku-4-5"  # ~$1.50 total for 396 videos; swap to claude-sonnet-4-6 for higher quality

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
