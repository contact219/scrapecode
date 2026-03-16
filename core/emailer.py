"""
core/emailer.py
SMTP email sender with attachment support.
"""

import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
from pathlib import Path


class Emailer:
    def __init__(self, cfg):
        self.cfg = cfg

    def send(self, filepath: str, profile_name: str = "") -> tuple[bool, str]:
        if not self.cfg.get("email_enabled"):
            return False, "Email is not enabled."

        smtp_host = self.cfg.get("smtp_host", "smtp.gmail.com")
        smtp_port = int(self.cfg.get("smtp_port", 587))
        user = self.cfg.get("smtp_user", "")
        password = self.cfg.get("smtp_password", "")
        from_addr = self.cfg.get("email_from", user)
        to_addr = self.cfg.get("email_to", "")

        if not all([smtp_host, user, password, to_addr]):
            return False, "Email configuration is incomplete."

        try:
            msg = MIMEMultipart()
            msg["From"] = from_addr
            msg["To"] = to_addr
            msg["Subject"] = f"JobSearch Pro Results — {profile_name}"

            body = (
                f"Your job search results for profile '{profile_name}' are attached.\n\n"
                "Open the Excel file to view Job Listings, Summary, and Search Config tabs.\n\n"
                "— JobSearch Pro"
            )
            msg.attach(MIMEText(body, "plain"))

            path = Path(filepath)
            if path.exists():
                with open(filepath, "rb") as f:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f'attachment; filename="{path.name}"'
                )
                msg.attach(part)

            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(user, password)
                server.sendmail(from_addr, to_addr, msg.as_string())

            return True, f"Email sent to {to_addr}"
        except Exception as e:
            return False, f"Email failed: {e}"

    def test(self) -> tuple[bool, str]:
        return self.send("", "Test")
