import base64
import json
import os
from datetime import date, datetime, time, timedelta, timezone
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.request import Request as ProviderRequest, urlopen
from uuid import UUID

import resend
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import extract, func, or_, update
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from Backend.api.deps import can_manage_staff, get_current_user, workspace_permission
from Backend.core.admin_reports import table_report
from Backend.core.audit import record_audit_event
from Backend.core.config import settings
from Backend.core.finance_documents import ISSUER, branded_finance_pdf
from Backend.database import get_session
from Database.admin_records import FinanceCategory, FinanceRecord
from Database.models import user
from Database.reconciliation_records import InvoiceMatch, RecordedRefund

router = APIRouter(tags=["finance"])
finance_access = workspace_permission("finance")
LABELS = {"income": "Income Receipt", "payment": "Payment Receipt", "expense": "Payment Voucher", "invoice": "Invoice"}
APPLICATION_AMOUNT = 400


class PaymentReference(BaseModel):
    reference: str = Field(min_length=4, max_length=100, pattern=r"^[A-Za-z0-9.=\-]+$")


class ImportPayment(PaymentReference):
    account_id: UUID


class FinanceLine(BaseModel):
    description: str = Field(min_length=1, max_length=180)
    quantity: int = Field(ge=1, le=9999, strict=True)
    unit_amount_minor: int = Field(gt=0, le=100000000, strict=True)

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str):
        if not value.strip():
            raise ValueError("Enter a line-item description")
        return value.strip()


class RecordInput(BaseModel):
    kind: Literal["expense", "invoice", "income"]
    account_id: UUID | None = None
    recipient_name: str = Field(default="", max_length=180)
    recipient_email: str = Field(default="", max_length=254, pattern=r"^(?:[^@\s]+@[^@\s]+\.[^@\s]+)?$")
    description: str = Field(min_length=1, max_length=300)
    category: str | None = Field(default=None, max_length=60)
    amount_minor: int = Field(gt=0, le=100000000)
    record_date: date
    line_items: list[FinanceLine] | None = Field(default=None, min_length=1, max_length=40)
    due_date: date | None = None
    external_reference: str | None = Field(default=None, max_length=100)

    @field_validator("description")
    @classmethod
    def reject_blank(cls, value: str):
        if not value.strip():
            raise ValueError("Enter a value")
        return value.strip()


class ExportInput(BaseModel):
    ids: list[UUID] = Field(min_length=1, max_length=50)
    format: Literal["pdf", "xlsx"]


def audit(session, request, account, action, record_id=None, **fields):
    return record_audit_event(session, request, actor_id=account.id, action=action, object_type="finance",
                              object_id=str(record_id) if record_id else None, **fields)


def verify_provider(reference, account):
    secret = os.getenv("PAYSTACK_SECRET_KEY", "").strip()
    if not secret:
        raise HTTPException(503, "Payment verification is not configured")
    provider_request = ProviderRequest(f"https://api.paystack.co/transaction/verify/{reference}",
                                       headers={"Authorization": f"Bearer {secret}"})
    try:
        with urlopen(provider_request, timeout=8) as response:
            body = json.load(response)
        transaction = body.get("data") or {}
    except HTTPError as error:
        if error.code in (400, 404):
            raise HTTPException(422, "Paystack could not find a completed payment for this reference") from error
        raise HTTPException(503, "Payment verification is temporarily unavailable") from error
    except (URLError, TimeoutError, ValueError, KeyError, TypeError, AttributeError) as error:
        raise HTTPException(503, "Payment verification is temporarily unavailable") from error
    domain = "test" if secret.startswith("sk_test_") else "live"
    if (body.get("status") is not True or transaction.get("status") != "success"
            or transaction.get("reference") != reference or transaction.get("currency") != "GHS"
            or transaction.get("domain") != domain or transaction.get("amount") != APPLICATION_AMOUNT
            or (transaction.get("customer") or {}).get("email", "").strip().lower() != account.email.lower()):
        raise HTTPException(422, "Payment does not match this account and the application fee")
    try:
        paid_at = datetime.fromisoformat(transaction["paid_at"])
        if paid_at.tzinfo is None:
            raise ValueError("Missing timezone")
    except (ValueError, KeyError, TypeError) as error:
        raise HTTPException(503, "Paystack did not return a valid payment date") from error
    return paid_at.astimezone(timezone.utc).date(), domain == "test"


def capture_payment(payload, request, actor, student, session):
    def existing():
        row = session.exec(select(FinanceRecord).where(FinanceRecord.reference == payload.reference)).first()
        if row and row.account_id != student.id:
            raise HTTPException(409, "This reference is already recorded")
        return row

    row = existing()
    if row:
        return row
    paid_date, test_mode = verify_provider(payload.reference, student)
    row = FinanceRecord(kind="payment", account_id=student.id, recipient_name=student.name,
                        recipient_email=student.email, description="Internship application fee", category="Application fees",
                        amount_minor=APPLICATION_AMOUNT, record_date=paid_date,
                        reference=payload.reference, test_mode=test_mode)
    session.add(row)
    audit(session, request, actor, "finance.payment.verified", row.id)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        row = existing()
        if row is None:
            raise
    return row


@router.get("/api/finance/checkout")
def checkout_configuration(account: user = Depends(get_current_user)):
    secret = os.getenv("PAYSTACK_SECRET_KEY", "").strip()
    if not secret.startswith(("sk_test_", "sk_live_")):
        raise HTTPException(503, "Checkout verification is not configured")
    return {"amount_minor": APPLICATION_AMOUNT, "currency": "GHS",
            "mode": "test" if secret.startswith("sk_test_") else "live"}


@router.post("/api/finance/verify")
def verify_checkout(payload: PaymentReference, request: Request,
                    account: user = Depends(get_current_user), session: Session = Depends(get_session)):
    record = capture_payment(payload, request, account, account, session)
    return {"id": record.id, "test_mode": record.test_mode}


@router.post("/api/admin/finance/payments/verify")
def import_payment(payload: ImportPayment, request: Request,
                   account: user = Depends(finance_access), session: Session = Depends(get_session)):
    student = session.get(user, payload.account_id)
    if not student or can_manage_staff(student):
        raise HTTPException(404, "Student account is unavailable")
    return capture_payment(payload, request, account, student, session)


def month_range(month: str):
    try:
        start = date.fromisoformat(f"{month}-01")
        end = date(start.year + (start.month == 12), start.month % 12 + 1, 1)
    except ValueError as error:
        raise HTTPException(422, "Choose a valid month") from error
    return start, end


def reporting_dates(month, day, start_date, end_date, *, default_month=False):
    if sum((bool(month), bool(day), bool(start_date or end_date))) > 1:
        raise HTTPException(422, "Choose one reporting period")
    if (start_date is None) != (end_date is None):
        raise HTTPException(422, "Choose both the start and end dates")
    if start_date and end_date and start_date > end_date:
        raise HTTPException(422, "Start date must be on or before the end date")
    if default_month and not (month or day or start_date):
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    if month:
        start, next_month = month_range(month)
        return start, next_month - timedelta(days=1)
    return (day, day) if day else (start_date, end_date)


def refund_date_filters(start, end):
    filters = [RecordedRefund.refunded_at >= datetime.combine(start, time.min, timezone.utc)]
    if end < date.max:
        filters.append(RecordedRefund.refunded_at < datetime.combine(end + timedelta(days=1), time.min, timezone.utc))
    return filters


def finance_totals(session, start, end, *, compare_months=False):
    report_kinds = ("payment", "income", "expense")
    record_filters = (FinanceRecord.test_mode.is_(False), FinanceRecord.kind.in_(report_kinds))
    rows = session.exec(select(FinanceRecord.kind, FinanceRecord.category, func.count(), func.sum(FinanceRecord.amount_minor))
                        .where(*record_filters, FinanceRecord.record_date.between(start, end))
                        .group_by(FinanceRecord.kind, FinanceRecord.category)).all()
    totals = {kind: sum(amount for row_kind, _, _, amount in rows if row_kind == kind) for kind in report_kinds}
    refunds = session.exec(select(func.coalesce(func.sum(RecordedRefund.amount_minor), 0))
                           .where(RecordedRefund.test_mode.is_(False), *refund_date_filters(start, end))).one()
    revenue = totals["payment"] + totals["income"]
    trend = []
    if compare_months:
        month_index = start.year * 12 + start.month - 1
        indexes = range(max(12, month_index - 5), month_index + 1)
        periods = [date(index // 12, index % 12 + 1, 1) for index in indexes]
        year = extract("year", FinanceRecord.record_date)
        month_number = extract("month", FinanceRecord.record_date)
        trend_rows = session.exec(select(year, month_number, FinanceRecord.kind, func.sum(FinanceRecord.amount_minor))
            .where(*record_filters, FinanceRecord.record_date.between(periods[0], end))
            .group_by(year, month_number, FinanceRecord.kind)).all()
        trend_totals = {(int(y), int(m), kind): amount for y, m, kind, amount in trend_rows}
        refund_month = extract("month", RecordedRefund.refunded_at)
        refund_year = extract("year", RecordedRefund.refunded_at)
        refund_rows = session.exec(select(refund_year, refund_month, func.sum(RecordedRefund.amount_minor))
            .where(RecordedRefund.test_mode.is_(False), *refund_date_filters(periods[0], end))
            .group_by(refund_year, refund_month)).all()
        refund_totals = {(int(y), int(m)): amount for y, m, amount in refund_rows}
        for period in periods:
            key = (period.year, period.month)
            trend.append({"month": period.isoformat()[:7],
                          "revenue": trend_totals.get((*key, "payment"), 0) + trend_totals.get((*key, "income"), 0),
                          "expenses": trend_totals.get((*key, "expense"), 0),
                          "refunds": refund_totals.get(key, 0)})
    categories = [{"kind": kind, "category": category, "count": count, "amount": amount}
                  for kind, category, count, amount in sorted(rows, key=lambda row: (row[0], -row[3], row[1]))]
    return {"payments": sum(count for kind, _, count, _ in rows if kind == "payment"),
            "portal_income": totals["payment"], "internal_income": totals["income"], "revenue": revenue,
            "expenses": totals["expense"], "refunds": refunds, "net": revenue - totals["expense"] - refunds,
            "start_date": start.isoformat(), "end_date": end.isoformat(), "categories": categories, "trend": trend}


@router.get("/api/admin/finance/summary")
def finance_summary(month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
                    day: date | None = None, start_date: date | None = None, end_date: date | None = None,
                    account: user = Depends(finance_access), session: Session = Depends(get_session)):
    start, end = reporting_dates(month, day, start_date, end_date, default_month=True)
    return finance_totals(session, start, end, compare_months=not (day or start_date))


@router.get("/api/admin/finance/report")
def export_summary(request: Request, format: Literal["pdf", "xlsx"],
                   month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
                   day: date | None = None, start_date: date | None = None, end_date: date | None = None,
                   account: user = Depends(finance_access), session: Session = Depends(get_session)):
    start, end = reporting_dates(month, day, start_date, end_date, default_month=True)
    report = finance_totals(session, start, end)
    rows = [["Student payments", "Verified portal payments", str(report["payments"]), money(report["portal_income"])],
            ["Internal income", "Manually recorded", "", money(report["internal_income"])],
            ["Total income", "", "", money(report["revenue"])],
            ["Expenses", "", "", money(report["expenses"])],
            ["Verified refunds", "", "", money(report["refunds"])],
            ["Net cash flow", "", "", money(report["net"])]]
    rows += [[r["kind"].title() + " category", r["category"], str(r["count"]), money(r["amount"])] for r in report["categories"]]
    response = table_report("Finance summary", ["Type", "Category or description", "Records", "Amount"], rows,
                            format == "pdf", f"{start:%d %b %Y} to {end:%d %b %Y} | GHS | UTC | Test payments excluded")
    audit(session, request, account, "finance.summary.export", context={"format": format, "result_count": len(rows)})
    session.commit()
    return response


MANUAL_CATEGORIES = {
    "income": ("Other income", "Sponsorship", "Donations", "Service income"),
    "expense": ("Other expense", "Operations", "Administration", "Technology", "Marketing", "Travel", "Other"),
}


class CategoryInput(BaseModel):
    kind: Literal["income", "expense"]
    name: str = Field(min_length=1, max_length=60)
    is_default: bool = False


def category_choices(session, kind):
    choices = {name.casefold(): {"name": name, "is_default": False} for name in MANUAL_CATEGORIES[kind]}
    for row in session.exec(select(FinanceCategory).where(FinanceCategory.kind == kind)).all():
        choices[row.name.casefold()] = {"name": row.name, "is_default": row.is_default}
    if not any(item["is_default"] for item in choices.values()):
        choices[MANUAL_CATEGORIES[kind][0].casefold()]["is_default"] = True
    return sorted(choices.values(), key=lambda item: (not item["is_default"], item["name"].casefold()))


@router.get("/api/admin/finance/categories")
def get_categories(account: user = Depends(finance_access), session: Session = Depends(get_session)):
    return {kind: category_choices(session, kind) for kind in MANUAL_CATEGORIES}


@router.post("/api/admin/finance/categories")
def save_category(payload: CategoryInput, request: Request,
                  account: user = Depends(finance_access), session: Session = Depends(get_session)):
    name = " ".join(payload.name.split())
    if not name:
        raise HTTPException(422, "Enter a category name")
    existing = {item["name"].casefold(): item["name"] for item in category_choices(session, payload.kind)}
    name = existing.get(name.casefold(), name)
    key = f"{payload.kind}:{name.casefold()}"
    category = session.get(FinanceCategory, key)
    if payload.is_default:
        session.execute(update(FinanceCategory)
                        .where(FinanceCategory.kind == payload.kind, FinanceCategory.is_default.is_(True))
                        .values(is_default=False))
    if category is None:
        category = FinanceCategory(key=key, kind=payload.kind, name=name)
    if payload.is_default:
        category.is_default = True
    session.add(category)
    audit(session, request, account, "finance.category.configured", changes={"category": (None, name)})
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise HTTPException(409, "Another category changed. Refresh and try again.") from error
    return get_categories(account, session)


@router.get("/api/admin/finance")
def finance_list(kind: Literal["payment", "expense", "invoice", "income"] = "payment", month: str | None = None,
                 q: str = Query(default="", max_length=120), page: int = Query(default=1, ge=1, le=10000),
                 day: date | None = None, start_date: date | None = None, end_date: date | None = None,
                 category: str | None = Query(default=None, max_length=60),
                 include_test: bool = False, account_id: UUID | None = None, account: user = Depends(finance_access), session: Session = Depends(get_session)):
    stmt = select(FinanceRecord).where(FinanceRecord.kind == kind)
    if account_id:
        stmt = stmt.where(FinanceRecord.account_id == account_id)
    if not include_test:
        stmt = stmt.where(FinanceRecord.test_mode.is_(False))
    start, end = reporting_dates(month, day, start_date, end_date)
    if start and end:
        stmt = stmt.where(FinanceRecord.record_date.between(start, end))
    if category:
        stmt = stmt.where(func.lower(FinanceRecord.category) == category.lower())
    if q.strip():
        search = f"%{q.strip()}%"
        stmt = stmt.where(or_(*(column.ilike(search) for column in (
            FinanceRecord.recipient_name, FinanceRecord.category, FinanceRecord.description, FinanceRecord.reference))))
    total = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    items = session.exec(stmt.order_by(FinanceRecord.record_date.desc(), FinanceRecord.id.desc())
                         .offset((page - 1) * 25).limit(25)).all()
    return {"items": items, "total": total}


def record_values(payload, session, *, previous_category=None):
    recipient = session.get(user, payload.account_id) if payload.account_id else None
    if payload.account_id and recipient is None:
        raise HTTPException(404, "Recipient account was not found")
    if payload.kind == "invoice" and not recipient:
        raise HTTPException(422, "Select the account to invoice")
    if payload.kind in MANUAL_CATEGORIES and payload.record_date > datetime.now(timezone.utc).date():
        raise HTTPException(422, "The transaction date cannot be in the future")
    if payload.due_date and (payload.kind != "invoice" or payload.due_date < payload.record_date):
        raise HTTPException(422, "An invoice due date must be on or after its issue date")
    if payload.line_items and sum(line.quantity * line.unit_amount_minor for line in payload.line_items) != payload.amount_minor:
        raise HTTPException(422, "The total must match the line items")
    name = recipient.name if recipient else payload.recipient_name.strip()
    if not name:
        raise HTTPException(422, "Enter the payer or payee name")
    values = payload.model_dump()
    if payload.kind in MANUAL_CATEGORIES:
        choices = category_choices(session, payload.kind)
        if not payload.category:
            values["category"] = next(item["name"] for item in choices if item["is_default"])
        elif payload.category != previous_category:
            match = next((item["name"] for item in choices if item["name"].casefold() == payload.category.casefold()), None)
            if match is None:
                raise HTTPException(422, "Choose a configured category")
            values["category"] = match
    elif not payload.category:
        raise HTTPException(422, "Enter an invoice category")
    return {**values, "recipient_name": name, "recipient_email": recipient.email if recipient else payload.recipient_email}


@router.post("/api/admin/finance", status_code=201)
def create_record(payload: RecordInput, request: Request,
                  account: user = Depends(finance_access), session: Session = Depends(get_session)):
    record = FinanceRecord(**record_values(payload, session))
    session.add(record)
    audit(session, request, account, f"finance.{record.kind}.created", record.id)
    session.commit()
    return record


@router.put("/api/admin/finance/{record_id}")
def edit_record(record_id: UUID, payload: RecordInput, request: Request,
                account: user = Depends(finance_access), session: Session = Depends(get_session)):
    record = session.exec(select(FinanceRecord).where(FinanceRecord.id == record_id).with_for_update()).first()
    if record is None:
        raise HTTPException(404, "Finance record was not found")
    if record.kind not in MANUAL_CATEGORIES or record.kind != payload.kind or record.reference or record.test_mode:
        raise HTTPException(409, "Only manually recorded income and expenses can be edited")
    values = record_values(payload, session, previous_category=record.category)
    changes = {key: (str(getattr(record, key)), str(values[key])) if key == "record_date" else (getattr(record, key), values[key])
               for key in ("amount_minor", "category", "record_date", "description")}
    record.sqlmodel_update(values)
    session.add(record)
    audit(session, request, account, f"finance.{record.kind}.updated", record.id, changes=changes)
    session.commit()
    return record


def document_title(record):
    return f"{'TEST ' if record.test_mode else ''}{LABELS[record.kind]}"


def money(value):
    sign = "-" if value < 0 else ""
    value = abs(value)
    return f"{sign}GHS {value // 100:,}.{value % 100:02d}"


def render_document(record, session=None):
    counterparty = record.recipient_name
    if record.recipient_email:
        counterparty += f"\n{record.recipient_email}"
    issuer = f"{ISSUER}\n{settings.contact_email}"
    parties = {
        "income": (("RECEIVED FROM", counterparty), ("RECEIVED BY", issuer)),
        "payment": (("RECEIVED FROM", counterparty), ("RECEIVED BY", issuer)),
        "expense": (("PAID BY", issuer), ("PAYEE", counterparty)),
        "invoice": (("ISSUED BY", issuer), ("BILL TO", counterparty)),
    }
    date_label = {"income": "Received on", "payment": "Payment date", "expense": "Expense date", "invoice": "Issue date"}[record.kind]
    dates = [(date_label, record.record_date.strftime("%d %B %Y"))]
    if record.category:
        dates.append(("Category", record.category))
    if record.due_date:
        dates.append(("Due date", record.due_date.strftime("%d %B %Y")))
    if record.kind != "invoice":
        dates.append(("Recorded on", record.created_at.strftime("%d %B %Y")))
    lines = record.line_items or [{"description": record.description, "quantity": 1, "unit_amount_minor": record.amount_minor}]
    reference = None
    if record.reference:
        reference = ("Paystack reference", record.reference)
    elif record.external_reference:
        reference = ("Reference", record.external_reference)
    linked_document = None
    if session is not None and record.kind == "payment":
        invoice_id = session.exec(select(InvoiceMatch.invoice_id).where(InvoiceMatch.payment_id == record.id)).first()
        if invoice_id is not None:
            linked_document = ("Applied to invoice", str(invoice_id))
    elif session is not None and record.kind == "invoice":
        match = session.get(InvoiceMatch, record.id)
        if match:
            linked_document = ("Matched receipt", str(match.payment_id))
    return branded_finance_pdf(title=document_title(record), filename=f"{record.kind}-{record.id}.pdf",
        number=str(record.id), kind=record.kind, from_party=parties[record.kind][0], to_party=parties[record.kind][1],
        dates=dates, lines=lines, total=record.amount_minor, reference=reference, linked_document=linked_document,
        memo=record.description if record.line_items else None, test_mode=record.test_mode)


def require_record(session, record_id):
    record = session.get(FinanceRecord, record_id)
    if record is None:
        raise HTTPException(404, "Document was not found")
    return record


@router.get("/api/admin/finance/{record_id}/document")
def document(record_id: UUID, request: Request,
             account: user = Depends(finance_access), session: Session = Depends(get_session)):
    response = render_document(require_record(session, record_id), session)
    audit(session, request, account, "finance.document.accessed", record_id)
    session.commit()
    return response


@router.get("/api/finance/documents")
def own_documents(page: int = Query(default=1, ge=1, le=10000),
                  account: user = Depends(get_current_user), session: Session = Depends(get_session)):
    stmt = select(FinanceRecord).where(FinanceRecord.account_id == account.id,
                                       FinanceRecord.kind.in_(("payment", "invoice")))
    total = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    items = session.exec(stmt.order_by(FinanceRecord.record_date.desc(), FinanceRecord.id.desc())
                         .offset((page - 1) * 25).limit(25)).all()
    return {"items": [{"id": row.id, "kind": row.kind, "description": row.description,
                       "record_date": row.record_date, "amount_minor": row.amount_minor,
                       "test_mode": row.test_mode, "line_items": row.line_items, "due_date": row.due_date,
                       "reference": row.reference or row.external_reference} for row in items], "total": total}


@router.get("/api/finance/documents/{record_id}")
def own_document(record_id: UUID, account: user = Depends(get_current_user), session: Session = Depends(get_session)):
    record = require_record(session, record_id)
    if record.account_id != account.id or record.kind not in ("payment", "invoice"):
        raise HTTPException(404, "Document was not found")
    return render_document(record, session)


@router.post("/api/admin/finance/{record_id}/send")
def send_document(record_id: UUID, request: Request,
                  account: user = Depends(finance_access), session: Session = Depends(get_session)):
    record = require_record(session, record_id)
    if record.test_mode:
        raise HTTPException(422, "Test documents cannot be emailed")
    recipient = session.get(user, record.account_id) if record.account_id else None
    email = recipient.email if recipient else record.recipient_email if not record.account_id else ""
    if not email:
        raise HTTPException(422, "No current recipient email is available for this record")
    if not settings.resend_api_key or not settings.resend_from_email:
        raise HTTPException(503, "Document email is not configured")
    pdf = render_document(record, session)
    resend.api_key = settings.resend_api_key
    send_request = audit(session, request, account, "finance.document.email.requested", record_id, result="pending")
    session.commit()
    try:
        resend.Emails.send({
            "from": settings.resend_from_email, "to": [email],
            "subject": f"Fortune Intern Network | {document_title(record)}",
            "text": f"Your {document_title(record).lower()} from Fortune Intern Network is attached, together with the payment terms and links to the full Terms and Conditions.",
            "attachments": [{"filename": f"{record.kind}-{record.id}.pdf",
                             "content": base64.b64encode(pdf.body).decode("ascii")}],
        })
    except Exception as error:
        audit(session, request, account, "finance.document.email.failed", record_id, result="failure", parent_id=send_request.id)
        session.commit()
        raise HTTPException(502, "The email provider did not accept the document") from error
    audit(session, request, account, "finance.document.email.accepted", record_id, parent_id=send_request.id)
    session.commit()
    return {"message": "Email accepted for delivery"}


@router.post("/api/admin/finance/export")
def export_finance(payload: ExportInput, request: Request,
                   account: user = Depends(finance_access), session: Session = Depends(get_session)):
    rows = session.exec(select(FinanceRecord).where(FinanceRecord.id.in_(set(payload.ids)))
                        .order_by(FinanceRecord.record_date.desc(), FinanceRecord.id)).all()
    if len(rows) != len(set(payload.ids)):
        raise HTTPException(404, "Some selected records were not found")
    report = table_report("Finance records", ["Date", "Document", "Recipient", "Category", "Amount", "Mode"],
                          [[r.record_date.isoformat(), document_title(r), r.recipient_name, r.category,
                            money(r.amount_minor), "Test" if r.test_mode else "Recorded"] for r in rows],
                          payload.format == "pdf")
    audit(session, request, account, "finance.export", context={"format": payload.format, "result_count": len(rows)})
    session.commit()
    return report
