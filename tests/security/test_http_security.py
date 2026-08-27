"""Direct HTTP-level security verification."""
import json
import sys
import asyncio
import uuid
sys.path.insert(0, "D:\\major project")

from backend.services.file_storage import get_presigned_url, delete_file
from backend.services.github import encrypt_token, decrypt_token


async def storage_isolation_http_test():
    """Simulate cross-user file access attempt."""
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()
    file_key = f"profiles/{user_a}/resume.pdf"
    
    print(f"USER_A_ID: {user_a}")
    print(f"USER_B_ID: {user_b}")
    print(f"FILE_KEY: {file_key}")
    print(f"\nATTEMPT: User B calls get_presigned_url(user_b_id, file_key)")
    
    try:
        url = await get_presigned_url(user_b, file_key)
        print(f"RESULT: Unexpected success - {url}")
    except PermissionError as e:
        print(f"RESULT: PermissionError raised: {e}")
    except Exception as e:
        print(f"RESULT: Unexpected exception: {type(e).__name__}: {e}")


async def token_log_search():
    """Search for token patterns in codebase to verify they're not logged."""
    import subprocess
    import os
    
    # Search for patterns that would log tokens
    search_patterns = [
        r"print.*token",
        r"log.*token",
        r"logger.*token",
        r"logging.*token",
        r"print.*ghp_",
        r"log.*ghp_",
        r"print.*secret",
        r"log.*secret",
    ]
    
    print("\nLOG AUDIT: Searching for token/logging patterns in backend/")
    for pattern in search_patterns:
        result = subprocess.run(
            ["findstr", "/s", "/i", pattern, "backend\\*.py"],
            capture_output=True, text=True, cwd="D:\\major project"
        )
        if result.stdout:
            print(f"\nPATTERN '{pattern}' FOUND:")
            print(result.stdout)
        else:
            print(f"PATTERN '{pattern}': No matches")


async def forced_error_token_check():
    """Force an error in GitHub OAuth and verify token doesn't appear."""
    from backend.services.github import exchange_code_for_token
    
    print("\nFORCED ERROR TEST: Calling exchange_code_for_token with invalid code")
    try:
        token = await exchange_code_for_token("invalid_code_12345")
        print(f"Unexpected success: {token}")
    except ValueError as e:
        error_msg = str(e)
        print(f"Error message: {error_msg}")
        
        # Check for token patterns
        has_ghp = "ghp_" in error_msg
        has_pat = "github_pat_" in error_msg
        has_secret = "secret" in error_msg.lower()
        
        print(f"Contains 'ghp_': {has_ghp}")
        print(f"Contains 'github_pat_': {has_pat}")
        print(f"Contains 'secret': {has_secret}")


if __name__ == "__main__":
    print("="*60)
    print("6a. STORAGE ISOLATION - HTTP LEVEL")
    print("="*60)
    asyncio.run(storage_isolation_http_test())
    
    print("\n" + "="*60)
    print("6b. TOKEN LOG SEARCH")
    print("="*60)
    asyncio.run(token_log_search())
    
    print("\n" + "="*60)
    print("6c. FORCED ERROR - TOKEN CHECK")
    print("="*60)
    asyncio.run(forced_error_token_check())
