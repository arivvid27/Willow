"""
supabase_client.py — Supabase client singleton for Willow backend
Uses the service-role key so it bypasses RLS for server-side queries.
"""

import os
from supabase import create_client, Client

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # service role for server-side
        _client = create_client(url, key)
    return _client
