from backend.config import get_settings
s = get_settings()
print(f"GITHUB_CLIENT_ID: '{s.github_client_id}' empty={s.github_client_id == ''}")
print(f"GITHUB_CLIENT_SECRET: '{s.github_client_secret[:5]}...' empty={s.github_client_secret == ''}")
