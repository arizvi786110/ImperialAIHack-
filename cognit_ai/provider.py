"""Anthropic access, with bounded output and graceful errors."""
import json
import os
import logging
from typing import Any
from .call_quota import reserve_call, ModelQuotaExceeded

LOG = logging.getLogger('cognit.provider')

class ProviderUnavailable(RuntimeError):
    pass

def ask(system: str, user_payload: dict[str, Any], *, model: str, max_tokens: int = 500) -> str:
    if os.getenv('COGNIT_AI_ENABLED', 'true').lower() != 'true':
        raise ProviderUnavailable('AI disabled')
    if not os.getenv('ANTHROPIC_API_KEY'):
        raise ProviderUnavailable('ANTHROPIC_API_KEY is missing')
    try:
        reserve_call()
        import anthropic
        client = anthropic.Anthropic(
            api_key=os.environ['ANTHROPIC_API_KEY'],
            timeout=float(os.getenv('COGNIT_AI_TIMEOUT', '12')),
            max_retries=1,
        )
        result = client.messages.create(
            model=model, max_tokens=max_tokens, temperature=0,
            system=system,
            messages=[{'role':'user', 'content':json.dumps(user_payload, ensure_ascii=False)}],
        )
        return '\n'.join(block.text for block in result.content if getattr(block, 'type', '') == 'text')
    except ModelQuotaExceeded as exc:
        LOG.warning("COGNIT_AI_ERROR reason=call_quota_exhausted")
        raise ProviderUnavailable("Model call limit reached") from exc
    except Exception as exc:
        # Log only exception *type* and numerical status. Do not serialize
        # Anthropic request objects, headers, prompts, credentials or response.
        status = getattr(exc, "status_code", None)
        safe_status = status if isinstance(status, int) else "none"
        LOG.warning("COGNIT_AI_ERROR type=%s status=%s model=%s", type(exc).__name__, safe_status, model)
        raise ProviderUnavailable(f"AI provider unavailable: {type(exc).__name__}") from exc
