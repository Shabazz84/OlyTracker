import argparse
import logging
import time

import config
from extractor.channel import get_channel_videos, channel_name_from_url
from extractor.playlist import get_playlist_videos
from extractor.transcript import fetch_transcript
from extractor.export import exists, save_transcript, merge_transcripts
from extractor.web import scrape_url, save_web_transcript
from extractor.telegram import parse_export, save_telegram_transcript

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("extraction.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def _maybe_summarize(channel_name: str, video_id: str, title: str, text: str) -> None:
    if not config.SUMMARIZE_ON_EXTRACT:
        return
    try:
        from summarizer.video_summarizer import summarize_video
        summarize_video(channel_name, video_id, title, text)
    except Exception as e:
        logger.error(f"Summarization failed for {video_id}: {e}")


def process_channel(url: str, force: bool = False, max_videos: int | None = None) -> tuple[int, int, int]:
    channel_name = channel_name_from_url(url)
    logger.info(f"Channel: {channel_name} ({url})")
    videos = get_channel_videos(url, max_videos=max_videos)
    logger.info(f"  {len(videos)} videos found")
    extracted = skipped = errors = 0
    for video in videos:
        vid_id = video["video_id"]
        title = video["title"]
        if not force and exists(channel_name, vid_id, title):
            skipped += 1
            continue
        result = fetch_transcript(vid_id)
        time.sleep(config.REQUEST_DELAY)
        if result is None:
            if config.SKIP_MISSING:
                skipped += 1
            else:
                errors += 1
            continue
        save_transcript(channel_name, vid_id, title, result["language"], result["text"])
        _maybe_summarize(channel_name, vid_id, title, result["text"])
        extracted += 1
    if extracted > 0:
        merge_transcripts(channel_name)
    return extracted, skipped, errors


def process_playlist(url: str, force: bool = False, max_videos: int | None = None) -> tuple[int, int, int]:
    playlist_id = url.split("list=")[-1][:24]
    name = f"playlist_{playlist_id}"
    logger.info(f"Playlist: {name}")
    videos = get_playlist_videos(url, max_videos=max_videos)
    extracted = skipped = errors = 0
    for video in videos:
        vid_id = video["video_id"]
        title = video["title"]
        if not force and exists(name, vid_id, title):
            skipped += 1
            continue
        result = fetch_transcript(vid_id)
        time.sleep(config.REQUEST_DELAY)
        if result is None:
            if config.SKIP_MISSING:
                skipped += 1
            else:
                errors += 1
            continue
        save_transcript(name, vid_id, title, result["language"], result["text"])
        _maybe_summarize(name, vid_id, title, result["text"])
        extracted += 1
    if extracted > 0:
        merge_transcripts(name)
    return extracted, skipped, errors


def process_web() -> int:
    saved = 0
    for url in config.WEB_SOURCES:
        text = scrape_url(url)
        if text:
            save_web_transcript(url, text)
            saved += 1
        time.sleep(config.REQUEST_DELAY)
    return saved


def process_telegram() -> int:
    messages = parse_export(config.TELEGRAM_EXPORT)
    if messages:
        save_telegram_transcript(messages)
    return len(messages)


def main() -> None:
    parser = argparse.ArgumentParser(description="OlyTracker transcript extractor")
    parser.add_argument("--channel", help="Extract single channel URL")
    parser.add_argument("--playlist", help="Extract single playlist URL")
    parser.add_argument("--web", action="store_true")
    parser.add_argument("--telegram", action="store_true")
    parser.add_argument("--extract-only", action="store_true", help="Skip LLM summarization")
    parser.add_argument("--summarize-only", action="store_true", help="Run summarizer on existing transcripts")
    parser.add_argument("--force", action="store_true", help="Re-download existing transcripts")
    parser.add_argument("--max", type=int, help="Max videos per channel/playlist")
    parser.add_argument("--priority-oly", action="store_true", help="Only Golovinsky OLY channel")
    parser.add_argument("--synthesize", action="store_true", help="Generate master synthesis (not yet implemented)")
    parser.add_argument("--cue-index", action="store_true", help="Generate cue index (not yet implemented)")
    args = parser.parse_args()

    if args.extract_only:
        config.SUMMARIZE_ON_EXTRACT = False

    if args.summarize_only:
        logger.info("--summarize-only: summarizer not yet implemented")
        return

    if args.synthesize or args.cue_index:
        logger.info("--synthesize / --cue-index: not yet implemented")
        return

    totals = {"extracted": 0, "skipped": 0, "errors": 0}

    def _add(e, s, err):
        totals["extracted"] += e
        totals["skipped"] += s
        totals["errors"] += err

    if args.channel:
        _add(*process_channel(args.channel, force=args.force, max_videos=args.max))
    elif args.playlist:
        _add(*process_playlist(args.playlist, force=args.force, max_videos=args.max))
    elif args.web:
        saved = process_web()
        logger.info(f"Web: saved {saved} pages")
    elif args.telegram:
        n = process_telegram()
        logger.info(f"Telegram: {n} messages parsed")
    else:
        channels = config.CHANNELS
        if args.priority_oly:
            channels = [
                url for url in config.CHANNELS
                if any(p in url for p in config.OLY_PRIORITY_CHANNELS)
            ]
        for url in channels:
            _add(*process_channel(url, force=args.force, max_videos=args.max))
        if not args.priority_oly:
            for url in config.PLAYLISTS:
                _add(*process_playlist(url, force=args.force, max_videos=args.max))
        process_web()
        process_telegram()

    logger.info(
        f"\nDone — extracted: {totals['extracted']}, "
        f"skipped: {totals['skipped']}, errors: {totals['errors']}"
    )


if __name__ == "__main__":
    main()
