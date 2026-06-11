import os
import requests
from functools import wraps
from flask import request, jsonify, g
import jwt
from jwt.algorithms import RSAAlgorithm
import json

_jwks_cache = None


def _get_clerk_jwks():
    """Fetch and cache Clerk's public JWKS for JWT verification."""
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache

    clerk_secret = os.environ.get("CLERK_SECRET_KEY", "").strip()
    pub_key = os.environ.get("CLERK_PUBLISHABLE_KEY", "").strip()
    jwks_url = None

    if pub_key:
        try:
            import base64
            encoded = pub_key.split("_", 1)[1] if "_" in pub_key else pub_key
            padded = encoded + "=" * (-len(encoded) % 4)
            domain = base64.urlsafe_b64decode(padded).decode("utf-8").rstrip("$")
            if domain:
                jwks_url = f"https://{domain}/.well-known/jwks.json"
        except Exception:
            jwks_url = None

    if not jwks_url:
        jwks_url = "https://api.clerk.com/v1/jwks"

    def fetch(headers=None):
        return requests.get(jwks_url, headers=headers or {}, timeout=5)

    resp = fetch()
    if resp.status_code in {401, 403} and clerk_secret:
        resp = fetch({"Authorization": f"Bearer {clerk_secret}"})

    resp.raise_for_status()
    _jwks_cache = resp.json()
    return _jwks_cache


def verify_clerk_token(token: str) -> dict:
    """Verify a Clerk session JWT and return the payload."""
    jwks = _get_clerk_jwks()
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")

    # Find the matching key
    public_key = None
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            public_key = RSAAlgorithm.from_jwk(json.dumps(key_data))
            break

    if not public_key:
        raise ValueError("No matching key found in JWKS")

    payload = jwt.decode(
        token,
        public_key,
        algorithms=["RS256"],
        options={"verify_aud": False},  # Clerk doesn't always set aud
    )
    return payload


def require_auth(f):
    """Decorator that validates the Clerk JWT and sets g.user_id."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ", 1)[1]
        try:
            payload = verify_clerk_token(token)
            g.user_id = payload.get("sub")  # Clerk user ID
            if not g.user_id:
                return jsonify({"error": "Invalid token: no user ID"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except Exception as e:
            return jsonify({"error": f"Token verification failed: {str(e)}"}), 401

        return f(*args, **kwargs)
    return decorated
