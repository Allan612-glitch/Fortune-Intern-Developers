import logging
import warnings
from datetime import datetime, timezone
from io import BytesIO
from typing import Literal
from urllib.parse import urlsplit
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlmodel import Session, select

from Backend.api.deps import get_current_admin
from Backend.core.audit import record_audit_event
from Backend.core.config import settings
from Backend.database import get_session
from Database.models import site_image, user

logger = logging.getLogger(__name__)
router = APIRouter(tags=["site images"])
SiteImageSlot = Literal["fin-connect-programs", "fin-connect-guide", "fin-connect-lab", "fin-connect-partners"]
MAX_IMAGE_BYTES = 2 * 1024 * 1024
IMAGE_TYPES = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


class SiteImageResponse(BaseModel):
    slot: SiteImageSlot
    url: str
    updated_at: datetime


def image_url(slot: str, version: UUID) -> str:
    base = settings.site_images_base_url.rstrip("/")
    parsed = urlsplit(base)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        logger.error("SITE_IMAGES_BASE_URL must be an HTTPS backend base URL")
        raise HTTPException(status_code=503, detail="Site image hosting is not configured")
    return f"{base}/api/site-images/{slot}/{version}"


def validated_content_type(content: bytes) -> str:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as image:
                content_type = IMAGE_TYPES.get(image.format)
                if content_type is None:
                    raise HTTPException(status_code=415, detail="Only JPEG, PNG and WebP images are allowed")
                image.verify()
            with Image.open(BytesIO(content)) as image:
                image.load()
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise HTTPException(status_code=415, detail="Invalid or unsupported image") from error
    return content_type


@router.get("/api/site-images", response_model=list[SiteImageResponse])
def list_site_images(session: Session = Depends(get_session)):
    rows = session.exec(select(site_image.slot, site_image.version, site_image.updated_at)).all()
    return [
        SiteImageResponse(
            slot=slot,
            url=image_url(slot, version),
            updated_at=updated_at.replace(tzinfo=timezone.utc) if updated_at.tzinfo is None else updated_at,
        )
        for slot, version, updated_at in rows
    ]


@router.get("/api/site-images/{slot}/{version}")
def get_site_image(slot: SiteImageSlot, version: UUID, session: Session = Depends(get_session)):
    row = session.get(site_image, slot)
    if row is None or row.version != version:
        raise HTTPException(status_code=404, detail="Site image not found")
    return Response(content=row.content, media_type=row.content_type)


@router.put("/api/admin/site-images/{slot}", response_model=SiteImageResponse)
def upload_site_image(
    slot: SiteImageSlot,
    request: Request,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    admin: user = Depends(get_current_admin),
):
    content = file.file.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be no larger than 2 MB")
    content_type = validated_content_type(content)
    version = uuid4()
    url = image_url(slot, version)
    updated_at = datetime.now(timezone.utc)
    values = dict(slot=slot, version=version, content_type=content_type, content=content, updated_at=updated_at)
    dialect = session.get_bind().dialect.name
    if dialect == "postgresql":
        statement = postgresql_insert(site_image).values(**values)
    elif dialect == "sqlite":
        statement = sqlite_insert(site_image).values(**values)
    else:
        raise RuntimeError(f"Site image uploads do not support database dialect {dialect}")
    session.execute(statement.on_conflict_do_update(index_elements=["slot"], set_={
        key: value for key, value in values.items() if key != "slot"
    }))
    record_audit_event(session, request, actor_id=admin.id, action="site_image.upload", object_type="site_image", object_id=slot)
    session.commit()
    return SiteImageResponse(slot=slot, url=url, updated_at=updated_at)


@router.delete("/api/admin/site-images/{slot}", status_code=204)
def delete_site_image(
    slot: SiteImageSlot,
    request: Request,
    session: Session = Depends(get_session),
    admin: user = Depends(get_current_admin),
):
    row = session.get(site_image, slot)
    if row is not None:
        session.delete(row)
    record_audit_event(session, request, actor_id=admin.id, action="site_image.delete", object_type="site_image", object_id=slot)
    session.commit()
    return Response(status_code=204)
