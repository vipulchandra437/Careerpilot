import pytest
import uuid
from unittest.mock import patch, MagicMock
from backend.services.file_storage import upload_file, get_presigned_url, delete_file


@pytest.mark.asyncio
async def test_upload_file_returns_key():
    """Test upload returns an object key (never a URL)."""
    user_id = uuid.uuid4()
    content = b"test file content"

    with patch("backend.services.file_storage.get_s3_client") as mock_s3:
        mock_client = MagicMock()
        mock_s3.return_value = mock_client

        key = await upload_file(user_id, "test.pdf", content)

        assert key.startswith(f"profiles/{user_id}/")
        assert key.endswith(".pdf")
        mock_client.put_object.assert_called_once()


@pytest.mark.asyncio
async def test_presigned_url_owner_check():
    """Test presigned URL validates ownership."""
    user_id = uuid.uuid4()
    other_user_id = uuid.uuid4()

    with pytest.raises(PermissionError, match="Access denied"):
        await get_presigned_url(user_id, f"uploads/{other_user_id}/file.pdf")


@pytest.mark.asyncio
async def test_delete_file_owner_check():
    """Test delete validates ownership."""
    user_id = uuid.uuid4()
    other_user_id = uuid.uuid4()

    with pytest.raises(PermissionError, match="Access denied"):
        await delete_file(user_id, f"uploads/{other_user_id}/file.pdf")
