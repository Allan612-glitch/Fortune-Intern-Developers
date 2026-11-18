from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from Backend.api.deps import get_current_admin
from Backend.database import get_session
from Database.models import founding_member, user
from Database.schemas import FoundingMemberResponse, FoundingMemberUpdate

router = APIRouter(prefix="/api/founders", tags=["founders"])


def _founder_response(founder: founding_member) -> FoundingMemberResponse:
    return FoundingMemberResponse(
        id=founder.id,
        name=founder.name,
        title=founder.title,
        bio=founder.bio,
        email=founder.email,
        phone=founder.phone,
        photo=founder.photo,
    )


@router.get("", response_model=list[FoundingMemberResponse])
def list_founders(session: Session = Depends(get_session)):
    return [
        _founder_response(founder)
        for founder in session.exec(select(founding_member).order_by(founding_member.id)).all()
    ]


@router.put("/{founder_id}", response_model=FoundingMemberResponse)
def save_founder(
    founder_id: str,
    payload: FoundingMemberUpdate,
    session: Session = Depends(get_session),
    _: user = Depends(get_current_admin),
):
    founder = session.get(founding_member, founder_id)
    if founder is None:
        founder = founding_member(id=founder_id, **payload.model_dump())
    else:
        for field, value in payload.model_dump().items():
            setattr(founder, field, value)
    session.add(founder)
    session.commit()
    session.refresh(founder)
    return _founder_response(founder)


@router.delete("/{founder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_founder(
    founder_id: str,
    session: Session = Depends(get_session),
    _: user = Depends(get_current_admin),
):
    founder = session.get(founding_member, founder_id)
    if founder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Founding member not found")
    session.delete(founder)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
