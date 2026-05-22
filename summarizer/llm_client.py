import re
import logging

import requests

import config

logger = logging.getLogger(__name__)

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
_claude_client = None


class LLMError(Exception):
    """Raised when the LLM backend is unreachable or returns an error."""


def _strip_thinking(text: str) -> str:
    return _THINK_RE.sub("", text).strip()


def _get_claude_client():
    global _claude_client
    if _claude_client is None:
        try:
            import anthropic
        except ImportError:
            raise LLMError("anthropic package not installed — run: pip install anthropic")
        _claude_client = anthropic.Anthropic(
            api_key=config.CLAUDE_API_KEY,
            max_retries=3,
        )
    return _claude_client


def _claude_chat(prompt: str, system: str | None, max_tokens: int | None) -> str:
    client = _get_claude_client()
    system_msg = system or "You are a concise weightlifting analyst."
    try:
        msg = client.messages.create(
            model=config.CLAUDE_MODEL,
            max_tokens=max_tokens or config.LLM_MAX_TOKENS,
            system=system_msg,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text
    except Exception as e:
        raise LLMError(f"Claude API request failed: {e}") from e


def _lm_studio_chat(prompt: str, system: str | None, max_tokens: int | None) -> str:
    url = f"{config.LLM_BASE_URL}/chat/completions"
    # "/no_think" is Qwen3's soft switch to skip <think> reasoning — without it
    # the model burns ~100s/call generating reasoning we discard anyway.
    system_msg = (system or "You are a concise weightlifting analyst.") + " /no_think"
    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": prompt},
    ]
    payload = {
        "model": config.LLM_MODEL,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": max_tokens or config.LLM_MAX_TOKENS,
        "stream": False,
    }
    try:
        resp = requests.post(url, json=payload, timeout=config.LLM_TIMEOUT)
        resp.raise_for_status()
    except requests.RequestException as e:
        raise LLMError(f"LLM request failed: {e}") from e
    try:
        content = resp.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, ValueError) as e:
        raise LLMError(f"Unexpected LLM response: {resp.text[:300]}") from e
    return _strip_thinking(content)


def chat(prompt: str, system: str | None = None, max_tokens: int | None = None) -> str:
    """Send a prompt to the configured LLM backend (Claude API or LM Studio).

    Returns:
        The assistant's reply text.

    Raises:
        LLMError: On network failure, auth error, or malformed response.
    """
    if getattr(config, "USE_CLAUDE_API", False):
        return _claude_chat(prompt, system, max_tokens)
    return _lm_studio_chat(prompt, system, max_tokens)
