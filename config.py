import os

CHANNELS = [
    "https://www.youtube.com/@pavlukhinweightlifting",
    "https://www.youtube.com/@athletists",
    "https://www.youtube.com/@catalystathletics",
    "https://www.youtube.com/@torokhtiy",
    "https://www.youtube.com/channel/UCvHbRb9z_sIRzO7EHnN66SQ",
    "https://www.youtube.com/@DozerWeightlifting",
    "https://www.youtube.com/user/sonnywebsterGB",
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

SUMMARIZE_ON_EXTRACT = True

SUMMARY_CHUNK_TOKENS = 6000

OLY_PRIORITY_CHANNELS = [
    "UCvHbRb9z_sIRzO7EHnN66SQ",
]

DOZER_CHANNEL_HANDLE = "@DozerWeightlifting"
DOZER_CUE_INDEX_OUTPUT = "summaries/dozer_cue_index.md"
DOZER_CUE_KEYWORDS = ["back", "demon", "snatch receive", "overhead squat", "jerk", "position", "cue"]

WEBSTER_CHANNEL_HANDLE = "sonnywebsterGB"
WEBSTER_MOBILITY_KEYWORDS = ["mobility", "flexibility", "thoracic", "shoulder", "hip", "ankle", "stretch"]
