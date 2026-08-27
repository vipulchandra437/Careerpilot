import uuid
import boto3
from botocore.config import Config

from backend.config import get_settings

settings = get_settings()


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4"),
    )


def _get_content_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    content_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc": "application/msword",
        "txt": "text/plain",
        "json": "application/json",
        "csv": "text/csv",
    }
    return content_types.get(ext, "application/octet-stream")


async def upload_file(user_id: uuid.UUID, filename: str, file_content: bytes) -> str:
    """Upload a file to private S3 bucket. Returns the object key (never a direct URL)."""
    key = f"profiles/{user_id}/{uuid.uuid4()}/{filename}"
    client = get_s3_client()
    client.put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=file_content,
        ContentType=_get_content_type(filename),
    )
    return key


async def get_presigned_url(user_id: uuid.UUID, key: str, expires_in: int = 3600) -> str:
    """Generate a presigned URL for authenticated access. Validates ownership."""
    if not key.startswith(f"profiles/{user_id}/"):
        raise PermissionError("Access denied: not the owner of this file")
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": key},
        ExpiresIn=expires_in,
    )


async def delete_file(user_id: uuid.UUID, key: str) -> None:
    """Delete a file. Validates ownership."""
    if not key.startswith(f"profiles/{user_id}/"):
        raise PermissionError("Access denied: not the owner of this file")
    client = get_s3_client()
    client.delete_object(Bucket=settings.s3_bucket, Key=key)
