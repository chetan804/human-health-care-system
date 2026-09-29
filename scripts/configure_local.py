"""Generate local-only random credentials; never reuse these in staging/production."""

import base64
import os
from pathlib import Path
import secrets

path = Path(".env")
if path.exists():
    raise SystemExit(".env already exists; refusing to overwrite keys and risk data loss")
password = secrets.token_urlsafe(32)
content = f"""APP_ENV=development
POSTGRES_USER=hcs
POSTGRES_PASSWORD={password}
POSTGRES_DB=hcs
DATABASE_URL=postgresql+psycopg://hcs:{password}@localhost:5432/hcs
REDIS_URL=redis://localhost:6379/0
JWT_SECRET={secrets.token_urlsafe(64)}
ENCRYPTION_BACKEND=local-development
ENCRYPTION_KEY={base64.b64encode(os.urandom(32)).decode()}
COOKIE_SECURE=false
ALLOWED_ORIGINS=["http://localhost:5173"]
"""
fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, "w") as stream:
    stream.write(content)
print("Created ignored .env with random local-only secrets. No credentials printed.")
