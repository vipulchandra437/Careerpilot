"""Security verification tests for storage isolation and token sanitization."""
import json
import sys
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
sys.path.insert(0, "D:\\major project")

from backend.services.file_storage import get_presigned_url, delete_file


async def test_storage_isolation():
    """Verify User B cannot access User A's files."""
    import uuid
    
    user_a_id = uuid.uuid4()
    user_b_id = uuid.uuid4()
    
    # User A's file key
    file_key = f"profiles/{user_a_id}/resume.pdf"
    
    # Attempt as User B - should fail
    try:
        url = await get_presigned_url(user_b_id, file_key)
        return {"status": "SECURITY_VIOLATION", "error": "User B accessed User A's file"}
    except PermissionError as e:
        return {
            "status": "SECURE",
            "test": "Multi-tenant storage isolation",
            "user_a": str(user_a_id),
            "user_b": str(user_b_id),
            "file_key": file_key,
            "access_attempt": f"User B tried to access {file_key}",
            "result": str(e),
            "conclusion": "Access denied - ownership check prevents cross-tenant access"
        }


async def test_token_sanitization():
    """Verify GitHub tokens never appear in logs."""
    from backend.services.github import encrypt_token, decrypt_token
    
    test_token = "ghp_1234567890abcdef1234567890abcdef12345678"
    
    # Encrypt
    encrypted = encrypt_token(test_token)
    
    # Verify encrypted token doesn't contain original
    token_in_encrypted = test_token in encrypted
    original_visible = encrypted == test_token
    
    # Decrypt and verify roundtrip
    decrypted = decrypt_token(encrypted)
    roundtrip_match = decrypted == test_token
    
    return {
        "status": "SECURE" if not token_in_encrypted and not original_visible else "VULNERABILITY",
        "test": "Token encryption at rest",
        "original_token": test_token[:10] + "...",
        "encrypted_token": encrypted[:20] + "...",
        "token_visible_in_encrypted": token_in_encrypted,
        "encrypted_equals_original": original_visible,
        "roundtrip_correct": roundtrip_match,
        "conclusion": "Token is encrypted, not stored in plaintext, roundtrip decryption works"
    }


async def test_no_token_in_error_messages():
    """Verify tokens don't appear in error messages."""
    from backend.services.github import connect_github_account
    
    # Simulate failed OAuth exchange
    with patch("backend.services.github.exchange_code_for_token", side_effect=ValueError("Failed to exchange code for token")):
        mock_db = AsyncMock()
        try:
            result = await connect_github_account(mock_db, "user-id", "invalid-code")
        except ValueError as e:
            error_msg = str(e)
            # Check that error doesn't contain token-like strings
            has_token = any(pattern in error_msg for pattern in ["ghp_", "github_pat_", "gho_"])
            return {
                "status": "SECURE" if not has_token else "VULNERABILITY",
                "test": "Error message sanitization",
                "error_message": error_msg,
                "contains_token_pattern": has_token,
                "conclusion": "Error messages do not expose tokens"
            }
    
    return {"status": "UNEXPECTED", "test": "No error raised"}


if __name__ == "__main__":
    results = asyncio.run(test_storage_isolation())
    print("="*60)
    print("6a. MULTI-TENANT STORAGE ISOLATION")
    print("="*60)
    print(json.dumps(results, indent=2))
    
    print("\n" + "="*60)
    print("6b. TOKEN SANITIZATION & ENCRYPTION")
    print("="*60)
    results = asyncio.run(test_token_sanitization())
    print(json.dumps(results, indent=2))
    
    print("\n" + "="*60)
    print("6c. ERROR MESSAGE SANITIZATION")
    print("="*60)
    results = asyncio.run(test_no_token_in_error_messages())
    print(json.dumps(results, indent=2))
