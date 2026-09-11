from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from Backend.api.deps import get_current_user
from Backend.database import get_session
from Database.models import user, user_profile
from Database.schemas import ProfileResponse, ProfileUpdateRequest

router = APIRouter(prefix="/api/profile", tags=["profile"])


def serialize_profile(profile: user_profile) -> ProfileResponse:
    return ProfileResponse(
        id=str(profile.id),
        user_id=str(profile.user_id),
        bio=profile.bio,
        profile_picture=profile.profile_picture,
        major=profile.major,
        graduation_year=profile.graduation_year,
        university=profile.university,
        course=profile.course,
        year_of_study=profile.year_of_study,
        skills=profile.skills,
        phone_number=profile.phone_number,
        location=profile.location,
        email_notifications=profile.email_notifications,
        sms_notifications=profile.sms_notifications,
        opportunity_alerts=profile.opportunity_alerts,
    )


@router.get("", response_model=ProfileResponse)
def get_profile(
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    profile = session.exec(
        select(user_profile).where(user_profile.user_id == account.id)
    ).first()

    if not profile:
        profile = user_profile(
            user_id=account.id,
            bio="",
            profile_picture="",
            major="",
            graduation_year=None,
            university="",
            course="",
            year_of_study=None,
            skills="",
            phone_number="",
            location="",
            email_notifications=True,
            sms_notifications=False,
            opportunity_alerts=True,
        )
        session.add(profile)
        session.commit()
        session.refresh(profile)

    return serialize_profile(profile)


@router.put("", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    account: user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    profile = session.exec(
        select(user_profile).where(user_profile.user_id == account.id)
    ).first()

    if not profile:
        profile = user_profile(user_id=account.id)
        session.add(profile)

    profile.bio = payload.bio or ""
    profile.profile_picture = payload.profile_picture or ""
    profile.major = payload.major or ""
    profile.graduation_year = payload.graduation_year
    profile.university = payload.university or ""
    profile.course = payload.course or ""
    profile.year_of_study = payload.year_of_study
    profile.skills = payload.skills or ""
    profile.phone_number = payload.phone_number or ""
    profile.location = payload.location or ""
    profile.email_notifications = payload.email_notifications
    profile.sms_notifications = payload.sms_notifications
    profile.opportunity_alerts = payload.opportunity_alerts

    session.add(profile)
    session.commit()
    session.refresh(profile)
    return serialize_profile(profile)
