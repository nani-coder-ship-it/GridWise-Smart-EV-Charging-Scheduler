"""
GridWise Notification Service — Telegram Bot (Recommended for India)

Why Telegram? All Indian SMS providers require TRAI DLT registration (takes days).
Telegram Bot API is free, instant, and works on any phone with WhatsApp-like experience.

Setup (one-time, 2 minutes):
  1. Open Telegram → search @BotFather → /newbot → choose name & username
  2. BotFather gives you a TOKEN (e.g. 7123456789:AAF...)
  3. User opens Telegram → searches your bot → clicks Start (gets their CHAT_ID from /getme)
  4. Set env vars:
       $env:NOTIFY_PROVIDER = "telegram"
       $env:TELEGRAM_TOKEN  = "7123456789:AAF..."
       $env:TELEGRAM_CHAT   = "<user-chat-id>"   # or leave blank to let user paste it

Fallback providers:
  fast2sms — Indian SMS (requires DLT approval, set SMS_PROVIDER=fast2sms + SMS_API_KEY)
  twilio   — WhatsApp/SMS (set SMS_PROVIDER=twilio + credentials)
  dry-run  — Logs to console when no credentials set (safe default, never crashes app)
"""

import os
import json
import urllib.request
import urllib.parse


class WhatsAppService:
    """Send notifications for EV charging events."""

    PROVIDER        = os.getenv('NOTIFY_PROVIDER', os.getenv('SMS_PROVIDER', 'telegram'))
    API_KEY         = os.getenv('SMS_API_KEY', '')
    TELEGRAM_TOKEN  = os.getenv('TELEGRAM_TOKEN', '')
    TELEGRAM_CHAT   = os.getenv('TELEGRAM_CHAT', '')   # admin-wide or per-user
    TWILIO_SID      = os.getenv('TWILIO_ACCOUNT_SID', '')
    TWILIO_FROM     = os.getenv('TWILIO_FROM_NUMBER', 'whatsapp:+14155238886')

    # ── Message Templates ────────────────────────────────────────────────────

    @staticmethod
    def msg_scheduled(vehicle_id: str, start: str, end: str) -> str:
        return (
            f"✅ *Charging Scheduled — GridWise ⚡*\n\n"
            f"Hello! Your EV charging has been confirmed.\n\n"
            f"🚗 Vehicle: *{vehicle_id}*\n"
            f"⏰ Start Time: *{start}*\n"
            f"🏁 End Time: *{end}*\n\n"
            f"Your vehicle will be ready before departure.\n"
            f"Thank you for using GridWise! ⚡"
        )

    @staticmethod
    def msg_started(vehicle_id: str) -> str:
        return (
            f"🔌 *Charging Started — GridWise ⚡*\n\n"
            f"Charging has begun for vehicle *{vehicle_id}*.\n"
            f"Sit back and relax — we've got it covered! 😊"
        )

    @staticmethod
    def msg_completed(vehicle_id: str, battery_pct: int) -> str:
        return (
            f"🏆 *Charging Complete — GridWise ⚡*\n\n"
            f"Vehicle *{vehicle_id}* is fully charged!\n"
            f"🔋 Battery: *{battery_pct}%*\n\n"
            f"Ready to hit the road! 🚗💨"
        )

    @staticmethod
    def msg_delayed(vehicle_id: str, new_start: str) -> str:
        return (
            f"⚠️ *Charging Rescheduled — GridWise ⚡*\n\n"
            f"Vehicle *{vehicle_id}* rescheduled due to grid demand.\n"
            f"📅 New start time: *{new_start}*\n\n"
            f"We'll notify you when charging begins."
        )

    # ── Send Dispatcher ──────────────────────────────────────────────────────

    @classmethod
    def send(cls, phone: str, message: str, event: str = '') -> bool:
        """
        Send notification. phone is stored but Telegram uses chat_id from env.
        Falls back to dry-run console log if no credentials configured.
        """
        provider = cls.PROVIDER.lower()

        # ── Telegram (recommended) ─────────────────────────
        if provider == 'telegram':
            if cls.TELEGRAM_TOKEN and cls.TELEGRAM_CHAT:
                return cls._telegram(message)
            # dry-run
            print(
                f"\n[NOTIFY DRY-RUN | Telegram] Event={event}\n"
                f"  {message}\n"
                f"  → Set TELEGRAM_TOKEN + TELEGRAM_CHAT env vars to send real messages.\n"
                f"  → See sms_service.py header for setup instructions (2 min)."
            )
            return True

        # ── Fast2SMS (requires DLT) ────────────────────────
        if provider == 'fast2sms':
            digits = ''.join(c for c in (phone or '') if c.isdigit())[-10:]
            if len(digits) != 10:
                return False
            if cls.API_KEY:
                return cls._fast2sms(digits, message)
            print(f"[NOTIFY DRY-RUN | Fast2SMS] Event={event} → To={digits}\n  {message}")
            return True

        # ── Twilio WhatsApp ────────────────────────────────
        if provider == 'twilio':
            digits = ''.join(c for c in (phone or '') if c.isdigit())[-10:]
            if len(digits) != 10:
                return False
            if cls.API_KEY and cls.TWILIO_SID:
                return cls._twilio_whatsapp(digits, message)
            print(f"[NOTIFY DRY-RUN | Twilio] Event={event} → To=+91{digits}\n  {message}")
            return True

        # ── Fallback dry-run ───────────────────────────────
        print(f"[NOTIFY DRY-RUN] Event={event}\n  {message}")
        return True

    # ── Telegram ─────────────────────────────────────────────────────────────

    @classmethod
    def _telegram(cls, message: str) -> bool:
        """Send message via Telegram Bot API (MarkdownV2 lite)."""
        url = f'https://api.telegram.org/bot{cls.TELEGRAM_TOKEN}/sendMessage'
        data = urllib.parse.urlencode({
            'chat_id':    cls.TELEGRAM_CHAT,
            'text':       message,
            'parse_mode': 'Markdown',
        }).encode()
        req = urllib.request.Request(url, data=data, method='POST')
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read())
            ok = body.get('ok', False)
            if not ok:
                print(f"[Telegram] Error: {body.get('description', body)}")
            return ok

    # ── Fast2SMS ──────────────────────────────────────────────────────────────

    @classmethod
    def _fast2sms(cls, digits: str, message: str) -> bool:
        """Send SMS via Fast2SMS (requires DLT registration)."""
        payload = json.dumps({
            'route': 'q', 'message': message,
            'language': 'english', 'flash': 0, 'numbers': digits,
        }).encode()
        req = urllib.request.Request(
            'https://www.fast2sms.com/dev/bulkV2', data=payload,
            headers={'authorization': cls.API_KEY, 'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read())
            ok = body.get('return', False)
            if not ok:
                print(f"[Fast2SMS] Error: {body.get('message', body)}")
            return ok

    # ── Twilio WhatsApp ───────────────────────────────────────────────────────

    @classmethod
    def _twilio_whatsapp(cls, digits: str, message: str) -> bool:
        """Send WhatsApp message via Twilio Sandbox."""
        import base64
        url = f'https://api.twilio.com/2010-04-01/Accounts/{cls.TWILIO_SID}/Messages.json'
        data = urllib.parse.urlencode({
            'From': cls.TWILIO_FROM,
            'To':   f'whatsapp:+91{digits}',
            'Body': message,
        }).encode()
        creds = base64.b64encode(f'{cls.TWILIO_SID}:{cls.API_KEY}'.encode()).decode()
        req = urllib.request.Request(
            url, data=data,
            headers={'Authorization': f'Basic {creds}',
                     'Content-Type': 'application/x-www-form-urlencoded'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read())
            ok = body.get('status') not in ('failed', 'undelivered', None)
            if not ok:
                print(f"[Twilio] Error: {body.get('message', body)}")
            return ok
