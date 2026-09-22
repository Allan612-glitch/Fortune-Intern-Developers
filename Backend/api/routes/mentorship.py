# from uuid import UUID

# from fastapi import APIRouter, Depends, HTTPException, status
# from sqlmodel import Session, select

# from Backend.api.deps import get_current_user
# from Backend.database import get_session
# from Database.models import message, mentorship, mentor, notification, user
# from Database.schemas import (
#     MentorCreateRequest,
#     MentorResponse,
#     MessageCreateRequest,
#     MessageResponse,
#     MentorshipCreateRequest,
#     MentorshipDecisionRequest,
#     MentorshipResponse,
#     MentorDashboardResponse,
#     MentorMessageResponse,
# )

# router = APIRouter(tags=["mentorship"])


# def mentor_response(row: mentor, account: user) -> MentorResponse:
#     return MentorResponse(id=str(row.id), user_id=str(row.user_id), name=account.name, expertise=row.expertise)


# def mentorship_response(row: mentorship, mentor_user: user, mentee_user: user | None = None) -> MentorshipResponse:
#     return MentorshipResponse(
#         id=str(row.id), mentor_id=str(row.mentor_id), mentor_name=mentor_user.name,
#         mentee_id=str(row.mentee_id), mentee_name=mentee_user.name if mentee_user else None,
#         status=row.status, created_at=row.created_at.isoformat(),
#     )


# def get_owned_mentor(account: user, session: Session) -> mentor:
#     mentor_record = session.exec(select(mentor).where(mentor.user_id == account.id)).first()
#     if not mentor_record:
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not registered as a mentor")
#     return mentor_record


# @router.get("/api/mentors", response_model=list[MentorResponse])
# def list_mentors(session: Session = Depends(get_session)):
#     rows = session.exec(select(mentor).where(mentor.is_approved == True).order_by(mentor.created_at.desc())).all()
#     results = []
#     for row in rows:
#         account = session.get(user, row.user_id)
#         if account:
#             results.append(mentor_response(row, account))
#     return results


# @router.post("/api/mentors/me", response_model=MentorResponse, status_code=status.HTTP_201_CREATED)
# def create_mentor(payload: MentorCreateRequest, account: user = Depends(get_current_user), session: Session = Depends(get_session)):
#     expertise = payload.expertise.strip()
#     if not expertise:
#         raise HTTPException(status_code=422, detail="Expertise is required")
#     row = session.exec(select(mentor).where(mentor.user_id == account.id)).first()
#     if row:
#         row.expertise = expertise
#     else:
#         row = mentor(user_id=account.id, expertise=expertise)
#     session.add(row)
#     session.commit()
#     session.refresh(row)
#     return mentor_response(row, account)


# @router.get("/api/mentorships", response_model=list[MentorshipResponse])
# def list_mentorships(account: user = Depends(get_current_user), session: Session = Depends(get_session)):
#     rows = session.exec(
#         select(mentorship).where(mentorship.mentee_id == account.id).order_by(mentorship.created_at.desc())
#     ).all()
#     results = []
#     for row in rows:
#         mentor_record = session.get(mentor, row.mentor_id)
#         mentor_user = session.get(user, mentor_record.user_id) if mentor_record else None
#         if mentor_user:
#             results.append(mentorship_response(row, mentor_user))
#     return results


# @router.post("/api/mentorships", response_model=MentorshipResponse, status_code=status.HTTP_201_CREATED)
# def request_mentorship(payload: MentorshipCreateRequest, account: user = Depends(get_current_user), session: Session = Depends(get_session)):
#     try:
#         mentor_id = UUID(payload.mentor_id)
#     except ValueError:
#         raise HTTPException(status_code=404, detail="Mentor not found")
#     mentor_record = session.get(mentor, mentor_id)
#     if not mentor_record or mentor_record.user_id == account.id:
#         raise HTTPException(status_code=404, detail="Mentor not found")
#     existing = session.exec(select(mentorship).where(mentorship.mentee_id == account.id, mentorship.mentor_id == mentor_id)).first()
#     if existing:
#         raise HTTPException(status_code=409, detail="Mentorship request already exists")
#     row = mentorship(mentee_id=account.id, mentor_id=mentor_id, status="pending")
#     session.add(row)
#     session.add(notification(user_id=mentor_record.user_id, message=f"{account.name} sent you a mentorship request.", target_type="mentorship", target_id=str(row.id), read="false"))
#     session.commit()
#     session.refresh(row)
#     mentor_user = session.get(user, mentor_record.user_id)
#     return mentorship_response(row, mentor_user)


# @router.get("/api/mentor/dashboard", response_model=MentorDashboardResponse)
# def mentor_dashboard(account: user = Depends(get_current_user), session: Session = Depends(get_session)):
#     mentor_record = get_owned_mentor(account, session)
#     requests = session.exec(
#         select(mentorship).where(
#             mentorship.mentor_id == mentor_record.id,
#             mentorship.status == "pending",
#         ).order_by(mentorship.created_at.desc())
#     ).all()
#     pending_requests = []
#     for row in requests:
#             pending_requests.append(mentorship_response(row, account, session.get(user, row.mentee_id)))

#     incoming = session.exec(
#         select(message).where(message.receiver_id == account.id).order_by(message.created_at.desc())
#     ).all()
#     messages = []
#     for row in incoming:
#         sender = session.get(user, row.sender_id)
#         if sender:
#             messages.append(MentorMessageResponse(
#                 id=str(row.id), sender_id=str(row.sender_id), sender_name=sender.name,
#                 content=row.content, created_at=row.created_at.isoformat(),
#             ))
#     return MentorDashboardResponse(pending_requests=pending_requests, messages=messages)


# @router.put("/api/mentorships/{mentorship_id}/decision", response_model=MentorshipResponse)
# def decide_mentorship(
#     mentorship_id: str,
#     payload: MentorshipDecisionRequest,
#     account: user = Depends(get_current_user),
#     session: Session = Depends(get_session),
# ):
#     if payload.status not in {"accepted", "declined"}:
#         raise HTTPException(status_code=422, detail="Status must be accepted or declined")
#     mentor_record = get_owned_mentor(account, session)
#     try:
#         row = session.get(mentorship, UUID(mentorship_id))
#     except ValueError:
#         row = None
#     if not row or row.mentor_id != mentor_record.id:
#         raise HTTPException(status_code=404, detail="Mentorship request not found")
#     if row.status != "pending":
#         raise HTTPException(status_code=409, detail="Mentorship request has already been decided")
#     row.status = payload.status
#     session.add(row)
#     session.add(notification(
#         user_id=row.mentee_id,
#         message=f"Your mentorship request was {payload.status} by {account.name}.",
#         target_type="mentorship",
#         target_id=str(row.id),
#         read="false",
#     ))
#     session.commit()
#     session.refresh(row)
#     return mentorship_response(row, account, session.get(user, row.mentee_id))


# @router.get("/api/messages/{other_user_id}", response_model=list[MessageResponse])
# def list_messages(other_user_id: str, account: user = Depends(get_current_user), session: Session = Depends(get_session)):
#     try:
#         other_id = UUID(other_user_id)
#     except ValueError:
#         raise HTTPException(status_code=404, detail="User not found")
#     rows = session.exec(
#         select(message).where(
#             ((message.sender_id == account.id) & (message.receiver_id == other_id))
#             | ((message.sender_id == other_id) & (message.receiver_id == account.id))
#         ).order_by(message.created_at.asc())
#     ).all()
#     return [MessageResponse(id=str(row.id), sender_id=str(row.sender_id), receiver_id=str(row.receiver_id), content=row.content, created_at=row.created_at.isoformat()) for row in rows]


# @router.post("/api/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
# def send_message(payload: MessageCreateRequest, account: user = Depends(get_current_user), session: Session = Depends(get_session)):
#     content = payload.content.strip()
#     try:
#         receiver_id = UUID(payload.receiver_id)
#     except ValueError:
#         raise HTTPException(status_code=404, detail="Recipient not found")
#     receiver = session.get(user, receiver_id)
#     if not receiver or receiver.id == account.id:
#         raise HTTPException(status_code=404, detail="Recipient not found")
#     if not content:
#         raise HTTPException(status_code=422, detail="Message cannot be empty")
#     row = message(sender_id=account.id, receiver_id=receiver.id, content=content)
#     session.add(row)
#     session.add(notification(user_id=receiver.id, message=f"You received a new message from {account.name}.", target_type="message", target_id=str(account.id), read="false"))
#     session.commit()
#     session.refresh(row)
#     return MessageResponse(id=str(row.id), sender_id=str(row.sender_id), receiver_id=str(row.receiver_id), content=row.content, created_at=row.created_at.isoformat())