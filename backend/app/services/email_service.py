from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import quote

from fastapi import BackgroundTasks

from app.core.config import settings


logger = logging.getLogger(__name__)


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


def _send_smtp(to: str, subject: str, text: str, html: str) -> None:
    if not settings.smtp_host:
        print(
            f"\n[SMHUB:email-dev] to={to} subject={subject}\n{text}\n",
            flush=True,
        )
        return

    message = EmailMessage()
    message["From"] = settings.smtp_from or settings.smtp_user
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    message.add_alternative(html, subtype="html")

    try:
        if settings.smtp_use_tls:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
                smtp.starttls(context=ssl.create_default_context())
                if settings.smtp_user:
                    smtp.login(settings.smtp_user, settings.smtp_password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
                if settings.smtp_user:
                    smtp.login(settings.smtp_user, settings.smtp_password)
                smtp.send_message(message)
    except Exception:
        logger.exception("Failed to send email to %s (subject=%s)", to, subject)


def send_confirm_email(background_tasks: BackgroundTasks, to: str, raw_token: str) -> None:
    subject, text, html = _render_confirm(_confirm_link(raw_token))
    background_tasks.add_task(_send_smtp, to, subject, text, html)


def send_reset_email(background_tasks: BackgroundTasks, to: str, raw_token: str) -> None:
    subject, text, html = _render_reset(_reset_link(raw_token))
    background_tasks.add_task(_send_smtp, to, subject, text, html)
