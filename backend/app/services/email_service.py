from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from urllib.parse import quote

from fastapi import BackgroundTasks

from app.core.config import settings


logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def _confirm_link(raw_token: str) -> str:
    return f"{settings.frontend_base_url.rstrip('/')}/confirm-email?token={quote(raw_token)}"


def _reset_link(raw_token: str) -> str:
    return f"{settings.frontend_base_url.rstrip('/')}/reset-password?token={quote(raw_token)}"


def _render_confirm(link: str) -> tuple[str, str, str]:
    subject = "Подтвердите ваш email в SMHUB"
    text = (
        "Здравствуйте!\n\n"
        "Чтобы завершить регистрацию в SMHUB, подтвердите ваш email, перейдя по ссылке:\n"
        f"{link}\n\n"
        "Ссылка действительна 24 часа. Если вы не регистрировались, проигнорируйте письмо."
    )
    html = (
        "<p>Здравствуйте!</p>"
        "<p>Чтобы завершить регистрацию в SMHUB, подтвердите ваш email:</p>"
        f'<p><a href="{link}">Подтвердить email</a></p>'
        f"<p>Или скопируйте ссылку: {link}</p>"
        "<p>Ссылка действительна 24 часа. Если вы не регистрировались, проигнорируйте письмо.</p>"
    )
    return subject, text, html


def _render_reset(link: str) -> tuple[str, str, str]:
    subject = "Сброс пароля в SMHUB"
    text = (
        "Здравствуйте!\n\n"
        "Чтобы задать новый пароль, перейдите по ссылке:\n"
        f"{link}\n\n"
        "Ссылка действительна 1 час. Если вы не запрашивали сброс, проигнорируйте письмо."
    )
    html = (
        "<p>Здравствуйте!</p>"
        "<p>Чтобы задать новый пароль для SMHUB:</p>"
        f'<p><a href="{link}">Сбросить пароль</a></p>'
        f"<p>Или скопируйте ссылку: {link}</p>"
        "<p>Ссылка действительна 1 час. Если вы не запрашивали сброс, проигнорируйте письмо.</p>"
    )
    return subject, text, html


def _send(to: str, subject: str, text: str, html: str) -> None:
    if not settings.resend_api_key:
        print(
            f"\n[SMHUB:email-dev] to={to} subject={subject}\n{text}\n",
            flush=True,
        )
        return

    payload = json.dumps({
        "from": settings.resend_from,
        "to": [to],
        "subject": subject,
        "text": text,
        "html": html,
    }).encode("utf-8")

    request = urllib.request.Request(
        RESEND_API_URL,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            body = response.read().decode("utf-8", errors="replace")
            logger.info("Resend OK to=%s status=%s body=%s", to, response.status, body)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace") if exc.fp else ""
        logger.error("Resend HTTP %s for %s (subject=%s): %s", exc.code, to, subject, body)
    except Exception:
        logger.exception("Resend send failed for %s (subject=%s)", to, subject)


def send_confirm_email(background_tasks: BackgroundTasks, to: str, raw_token: str) -> None:
    subject, text, html = _render_confirm(_confirm_link(raw_token))
    background_tasks.add_task(_send, to, subject, text, html)


def send_reset_email(background_tasks: BackgroundTasks, to: str, raw_token: str) -> None:
    subject, text, html = _render_reset(_reset_link(raw_token))
    background_tasks.add_task(_send, to, subject, text, html)
