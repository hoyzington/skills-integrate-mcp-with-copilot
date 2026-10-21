"""Teacher credential helpers for the activities API."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
from pathlib import Path


PBKDF2_ITERATIONS = 310_000


def hash_password(password: str) -> str:
    """Return a salted PBKDF2 password hash suitable for the teacher JSON file."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded_hash: str) -> bool:
    """Check a password against the supported PBKDF2 hash format."""
    try:
        algorithm, iterations, salt_hex, digest_hex = encoded_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256" or int(iterations) != PBKDF2_ITERATIONS:
            return False
        salt = bytes.fromhex(salt_hex)
        expected_digest = bytes.fromhex(digest_hex)
    except (AttributeError, ValueError):
        return False

    actual_digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return hmac.compare_digest(actual_digest, expected_digest)


def load_teacher_credentials() -> dict[str, str]:
    """Load teacher username-to-password-hash mappings from a JSON file."""
    default_path = Path(__file__).with_name("teachers.json")
    credentials_path = Path(
        os.environ.get("TEACHER_CREDENTIALS_FILE", str(default_path))
    )

    with credentials_path.open(encoding="utf-8") as credentials_file:
        data = json.load(credentials_file)

    teachers = data.get("teachers") if isinstance(data, dict) else None
    if not isinstance(teachers, list):
        raise ValueError("Teacher credentials must contain a teachers list")

    credentials: dict[str, str] = {}
    for teacher in teachers:
        if not isinstance(teacher, dict):
            raise ValueError("Each teacher entry must be an object")
        username = teacher.get("username")
        password_hash = teacher.get("password_hash")
        if not isinstance(username, str) or not username.strip():
            raise ValueError("Each teacher must have a username")
        if not isinstance(password_hash, str) or not password_hash:
            raise ValueError("Each teacher must have a password_hash")
        credentials[username] = password_hash

    return credentials


if __name__ == "__main__":
    from getpass import getpass

    print(hash_password(getpass("Teacher password: ")))