"""Cloudflare R2 (S3-compatible) storage for resume uploads."""
import os
from pathlib import Path
from urllib.parse import quote

import boto3
from botocore.config import Config

R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")

_client = None


def get_client():
    global _client
    if _client is None:
        if not (R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME):
            raise RuntimeError(
                "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME must be set to upload resumes"
            )
        _client = boto3.client(
            "s3",
            endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
    return _client


def upload_file(key: str, content: bytes, content_type: str | None = None) -> None:
    extra_args = {"ContentType": content_type} if content_type else {}
    get_client().put_object(Bucket=R2_BUCKET_NAME, Key=key, Body=content, **extra_args)


def download_file(key: str) -> tuple[bytes, str | None]:
    obj = get_client().get_object(Bucket=R2_BUCKET_NAME, Key=key)
    return obj["Body"].read(), obj.get("ContentType")


def delete_file(key: str) -> None:
    get_client().delete_object(Bucket=R2_BUCKET_NAME, Key=key)


def build_attachment_content_disposition(filename: str, default_filename: str = "download") -> str:
    safe_filename = Path(filename or "").name.strip()
    safe_filename = safe_filename.replace("\r", "").replace("\n", "").replace('"', "").replace("\\", "")
    safe_filename = "".join(character for character in safe_filename if character >= " " and character not in {"/", "\\"})
    if not safe_filename:
        safe_filename = default_filename

    ascii_filename = safe_filename.encode("ascii", "ignore").decode("ascii").strip() or default_filename
    ascii_filename = ascii_filename.replace('"', "").replace("\\", "")
    encoded_filename = quote(safe_filename, safe="")
    return f'attachment; filename="{ascii_filename}"; filename*=UTF-8\'\'{encoded_filename}'


def upload_resume(key: str, content: bytes, content_type: str | None = None) -> None:
    upload_file(key, content, content_type)


def download_resume(key: str) -> tuple[bytes, str | None]:
    return download_file(key)


def get_resume_download_url(key: str, filename: str, expires_in: int = 300) -> str:
    return get_client().generate_presigned_url(
        "get_object",
        Params={
            "Bucket": R2_BUCKET_NAME,
            "Key": key,
            "ResponseContentDisposition": build_attachment_content_disposition(filename),
        },
        ExpiresIn=expires_in,
    )
