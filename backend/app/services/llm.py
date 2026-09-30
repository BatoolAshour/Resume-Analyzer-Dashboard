"""Thin wrapper around the Groq chat API that returns validated JSON."""

import json
import logging
import re
from typing import TypeVar

import groq
from groq import Groq
from pydantic import BaseModel, ValidationError

from app.config import Settings
from app.errors import LLMInvalidOutput, LLMNotConfigured, LLMRateLimited, LLMUnavailable

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# Reasoning models occasionally return an empty or truncated answer; one retry
# clears almost all of these.
MAX_ATTEMPTS = 2


def parse_json(raw: str) -> dict:
    """Parse a JSON object out of model output. Robust to stray text/fences around it."""
    raw = (raw or "").strip()
    raw = re.sub(r"^```(json)?|```$", "", raw, flags=re.MULTILINE).strip()

    match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
    if not match:
        raise ValueError("model did not return JSON")

    data = json.loads(match.group(0))
    if not isinstance(data, dict):
        raise ValueError("model did not return a JSON object")
    return data


class UnusableOutput(ValueError):
    """The model answered, but not with JSON that can be used."""


class LLMClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._client: Groq | None = None

    @property
    def configured(self) -> bool:
        return bool(self._settings.groq_api_key)

    def _get_client(self) -> Groq:
        if not self.configured:
            raise LLMNotConfigured(
                "The analysis service is not configured. Set GROQ_API_KEY in the backend .env file."
            )
        if self._client is None:
            self._client = Groq(
                api_key=self._settings.groq_api_key,
                timeout=self._settings.groq_timeout_seconds,
                max_retries=self._settings.groq_max_retries,
            )
        return self._client

    def _complete(
        self,
        model: str,
        prompt: str,
        max_tokens: int | None = None,
        json_mode: bool = False,
    ) -> str:
        params = dict(
            model=model,
            max_tokens=max_tokens or self._settings.groq_max_tokens,
            temperature=0.2,
            frequency_penalty=0.6,  # discourages repetition loops on smaller models
            presence_penalty=0.3,
            messages=[{"role": "user", "content": prompt}],
        )
        if json_mode:
            # The provider constrains the output to syntactically valid JSON.
            params["response_format"] = {"type": "json_object"}
        if self._settings.groq_reasoning_effort:
            # gpt-oss models: cap reasoning so it leaves room for the actual answer
            params["reasoning_effort"] = self._settings.groq_reasoning_effort

        try:
            response = self._get_client().chat.completions.create(**params)
        except groq.RateLimitError as exc:
            raise LLMRateLimited(
                "The AI provider is rate-limiting requests. Wait a moment and try again."
            ) from exc
        except (groq.AuthenticationError, groq.PermissionDeniedError) as exc:
            raise LLMNotConfigured(
                "The AI provider rejected the API key. Check GROQ_API_KEY in the backend .env file."
            ) from exc
        except groq.APITimeoutError as exc:
            raise LLMUnavailable("The AI provider took too long to respond. Try again.") from exc
        except groq.APIConnectionError as exc:
            raise LLMUnavailable("Could not reach the AI provider. Check your connection.") from exc
        except groq.BadRequestError as exc:
            if "json_validate_failed" in str(exc):
                # JSON mode: the model's answer was not valid JSON. Same as any
                # other unusable answer, so let complete() retry it.
                raise UnusableOutput("model did not return valid JSON") from exc
            logger.warning("Groq rejected the request for model %s: %s", model, exc)
            raise LLMUnavailable(
                "The AI provider rejected the request (400). Check the model settings."
            ) from exc
        except groq.APIStatusError as exc:
            logger.warning("Groq returned %s for model %s: %s", exc.status_code, model, exc)
            raise LLMUnavailable(
                f"The AI provider returned an error ({exc.status_code}). Try again shortly."
            ) from exc

        return response.choices[0].message.content or ""

    def complete(
        self,
        model: str,
        prompt: str,
        schema: type[T],
        *,
        max_tokens: int | None = None,
        json_mode: bool = False,
    ) -> T:
        """Send a prompt and return the response validated against `schema`."""
        last_error: Exception | None = None
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                raw = self._complete(model, prompt, max_tokens, json_mode)
                return schema.model_validate(parse_json(raw))
            except (ValueError, ValidationError) as exc:
                last_error = exc
                logger.warning(
                    "Unusable %s response from %s (attempt %d/%d): %s",
                    schema.__name__, model, attempt, MAX_ATTEMPTS, exc,
                )
        raise LLMInvalidOutput(
            "The AI model returned a response that could not be read. Please try again."
        ) from last_error
