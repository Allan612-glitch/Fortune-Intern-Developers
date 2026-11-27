from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile, ZipFile

from fastapi import HTTPException, UploadFile, status

MAX_UPLOAD_SIZE = 10 * 1024 * 1024
ALLOWED_UPLOAD_TYPES = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


async def read_validated_document(
    file: UploadFile, label: str, *, pdf_only: bool = False, max_size: int = MAX_UPLOAD_SIZE
) -> tuple[bytes, str, str]:
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()
    if not filename or extension not in ALLOWED_UPLOAD_TYPES or (pdf_only and extension != ".pdf"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{label} must be a PDF file" if pdf_only else f"{label} must be a PDF, DOC, or DOCX file",
        )

    content = await file.read(max_size + 1)
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"{label}s must be {max_size // (1024 * 1024)} MB or smaller",
        )
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"The selected {label.lower()} is empty",
        )

    if extension == ".pdf":
        valid_content = content.startswith(b"%PDF-")
    elif extension == ".doc":
        valid_content = content.startswith(bytes.fromhex("D0CF11E0A1B11AE1"))
    else:
        try:
            with ZipFile(BytesIO(content)) as document:
                valid_content = "word/document.xml" in document.namelist()
        except BadZipFile:
            valid_content = False

    if not valid_content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{label} content does not match its file extension",
        )
    return content, filename, ALLOWED_UPLOAD_TYPES[extension]
