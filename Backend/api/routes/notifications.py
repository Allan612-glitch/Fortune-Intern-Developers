from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from Backend.api.deps import get_current_user
from Backend.database import get_session
from Database.models import notification, user, user_profile
from Database.schemas import (
	NotificationPreferencesResponse,
	NotificationPreferencesUpdateRequest,
	NotificationResponse,
)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def read_value(value: bool | str) -> bool:
	return value is True or str(value).lower() in {"true", "1", "yes"}


def serialize_notification(row: notification) -> NotificationResponse:
	return NotificationResponse(
		id=str(row.id),
		message=row.message,
		target_type=row.target_type,
		target_id=row.target_id,
		read=read_value(row.read),
		created_at=row.created_at.isoformat(),
	)


@router.get("", response_model=list[NotificationResponse])
def list_notifications(account: user = Depends(get_current_user), session: Session = Depends(get_session)):
	rows = session.exec(
		select(notification).where(notification.user_id == account.id).order_by(notification.created_at.desc())
	).all()
	return [serialize_notification(row) for row in rows]


@router.get("/unread-count")
def unread_count(account: user = Depends(get_current_user), session: Session = Depends(get_session)):
	rows = session.exec(select(notification).where(notification.user_id == account.id)).all()
	return {"count": sum(not read_value(row.read) for row in rows)}


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(notification_id: str, account: user = Depends(get_current_user), session: Session = Depends(get_session)):
	try:
		row = session.get(notification, UUID(notification_id))
	except ValueError:
		row = None
	if not row or row.user_id != account.id:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
	row.read = "true"
	session.add(row)
	session.commit()
	session.refresh(row)
	return serialize_notification(row)


@router.put("/read-all")
def mark_all_notifications_read(account: user = Depends(get_current_user), session: Session = Depends(get_session)):
	rows = session.exec(select(notification).where(notification.user_id == account.id)).all()
	for row in rows:
		row.read = "true"
		session.add(row)
	session.commit()
	return {"updated": len(rows)}


@router.get("/preferences", response_model=NotificationPreferencesResponse)
def get_notification_preferences(account: user = Depends(get_current_user), session: Session = Depends(get_session)):
	profile = session.exec(select(user_profile).where(user_profile.user_id == account.id)).first()
	return NotificationPreferencesResponse(
		email_notifications=profile.email_notifications if profile else True,
		sms_notifications=profile.sms_notifications if profile else False,
		opportunity_alerts=profile.opportunity_alerts if profile else True,
	)


@router.put("/preferences", response_model=NotificationPreferencesResponse)
def update_notification_preferences(payload: NotificationPreferencesUpdateRequest, account: user = Depends(get_current_user), session: Session = Depends(get_session)):
	profile = session.exec(select(user_profile).where(user_profile.user_id == account.id)).first()
	if not profile:
		profile = user_profile(user_id=account.id)
	profile.email_notifications = payload.email_notifications
	profile.sms_notifications = payload.sms_notifications
	profile.opportunity_alerts = payload.opportunity_alerts
	session.add(profile)
	session.commit()
	session.refresh(profile)
	return NotificationPreferencesResponse(
		email_notifications=profile.email_notifications,
		sms_notifications=profile.sms_notifications,
		opportunity_alerts=profile.opportunity_alerts,
	)
