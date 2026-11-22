import json
import os
from datetime import date, datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request as ProviderRequest, urlopen
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from Backend.api.routes.finance import audit, finance_access, refund_date_filters, reporting_dates
from Backend.database import get_session
from Backend.core.finance_documents import ISSUER, branded_finance_pdf
from Database.admin_records import FinanceRecord
from Database.models import user
from Database.reconciliation_records import InvoiceMatch, RecordedRefund

router = APIRouter(prefix="/api/admin/finance/reconciliation", tags=["finance"])


class MatchRequest(BaseModel):
    reference: str = Field(min_length=4, max_length=100, pattern=r"^[A-Za-z0-9.=\-]+$")


class RefundRequest(MatchRequest):
    refund_id: str = Field(pattern=r"^[1-9][0-9]{0,18}$")


def paystack(path):
    secret = os.getenv("PAYSTACK_SECRET_KEY", "").strip()
    if not secret.startswith(("sk_test_", "sk_live_")):
        raise HTTPException(503, "Paystack is not configured")
    try:
        result = ProviderRequest(f"https://api.paystack.co{path}", headers={"Authorization": f"Bearer {secret}"})
        with urlopen(result, timeout=8) as response:
            body = json.load(response)
        if not isinstance(body, dict) or body.get("status") is not True:
            raise HTTPException(502, "Paystack did not confirm the request")
    except HTTPError as error:
        if error.code in (400, 404):
            raise HTTPException(422, "Paystack could not find this record") from error
        raise HTTPException(503, "Paystack is temporarily unavailable") from error
    except (URLError, TimeoutError, ValueError) as error:
        raise HTTPException(503, "Paystack is temporarily unavailable") from error
    return body, secret.startswith("sk_test_")


def payment_by_reference(session, reference, lock=False):
    query = select(FinanceRecord).where(FinanceRecord.kind == "payment", FinanceRecord.reference == reference)
    row = session.exec(query.with_for_update() if lock else query).first()
    if row is None:
        raise HTTPException(404, "Verify the payment in Finance before reconciling it")
    return row


@router.get("")
def reconciliation_view(page: int = Query(default=1, ge=1, le=10000),
                        month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
                        day: date | None = None, start_date: date | None = None, end_date: date | None = None,
                        account: user = Depends(finance_access),
                        session: Session = Depends(get_session)):
    offset = (page - 1) * 25
    invoices = session.exec(select(FinanceRecord, InvoiceMatch.payment_id)
        .outerjoin(InvoiceMatch, InvoiceMatch.invoice_id == FinanceRecord.id).where(FinanceRecord.kind == "invoice")
        .order_by(FinanceRecord.record_date.desc(), FinanceRecord.id).offset(offset).limit(25)).all()
    unmatched = session.exec(select(FinanceRecord).outerjoin(InvoiceMatch, InvoiceMatch.payment_id == FinanceRecord.id)
        .where(FinanceRecord.kind == "payment", FinanceRecord.test_mode.is_(False), InvoiceMatch.payment_id.is_(None))
        .order_by(FinanceRecord.record_date.desc(), FinanceRecord.id).offset(offset).limit(25)).all()
    refunds_stmt = select(RecordedRefund, FinanceRecord.reference).join(FinanceRecord, FinanceRecord.id == RecordedRefund.payment_id)
    start, end = reporting_dates(month, day, start_date, end_date)
    if start and end:
        refunds_stmt = refunds_stmt.where(RecordedRefund.test_mode.is_(False), *refund_date_filters(start, end))
    refunds = session.exec(refunds_stmt.order_by(RecordedRefund.refunded_at.desc(), RecordedRefund.id).offset(offset).limit(25)).all()
    adjusted = dict(session.exec(select(RecordedRefund.payment_id, func.sum(RecordedRefund.amount_minor))
        .where(RecordedRefund.payment_id.in_([pay for _, pay in invoices if pay is not None]))
        .group_by(RecordedRefund.payment_id)).all())
    return {
        "invoices": [{"id": row.id, "recipient": row.recipient_name, "amount_minor": row.amount_minor, "linked": payment is not None,
                      "refunded_minor": adjusted.get(payment, 0)} for row, payment in invoices],
        "unmatched_payments": [{"reference": row.reference, "amount_minor": row.amount_minor,
                                "recipient": row.recipient_name} for row in unmatched],
        "refunds": [{**row.model_dump(), "reference": reference} for row, reference in refunds],
    }


@router.put("/invoices/{invoice_id}")
def match_invoice(invoice_id: UUID, payload: MatchRequest, request: Request,
                  account: user = Depends(finance_access), session: Session = Depends(get_session)):
    invoice = session.get(FinanceRecord, invoice_id, with_for_update=True)
    if invoice is None or invoice.kind != "invoice":
        raise HTTPException(404, "Invoice was not found")
    payment = payment_by_reference(session, payload.reference, lock=True)
    if payment.test_mode or not invoice.account_id or invoice.account_id != payment.account_id or invoice.amount_minor != payment.amount_minor:
        raise HTTPException(422, "The payment must be live and match the invoice account and full amount")
    match = session.get(InvoiceMatch, invoice_id)
    if match and match.payment_id == payment.id:
        return {"linked": True}
    if match or session.exec(select(InvoiceMatch).where(InvoiceMatch.payment_id == payment.id)).first():
        raise HTTPException(409, "This invoice or payment is already matched")
    session.add(InvoiceMatch(invoice_id=invoice.id, payment_id=payment.id))
    audit(session, request, account, "finance.invoice.matched", invoice_id, context={"record_ids": [str(payment.id)]})
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise HTTPException(409, "This invoice or payment is already matched") from error
    return {"linked": True}


@router.delete("/invoices/{invoice_id}")
def unmatch_invoice(invoice_id: UUID, request: Request, account: user = Depends(finance_access),
                    session: Session = Depends(get_session)):
    invoice = session.get(FinanceRecord, invoice_id, with_for_update=True)
    if invoice is None or invoice.kind != "invoice":
        raise HTTPException(404, "Invoice was not found")
    match = session.get(InvoiceMatch, invoice_id)
    if match:
        session.delete(match)
        audit(session, request, account, "finance.invoice.unmatched", invoice_id, context={"record_ids": [str(match.payment_id)]})
        session.commit()
    return {"linked": False}


@router.post("/refunds")
def record_refund(payload: RefundRequest, request: Request, account: user = Depends(finance_access),
                  session: Session = Depends(get_session)):
    payment = payment_by_reference(session, payload.reference)
    transaction, test_mode = paystack(f"/transaction/verify/{payload.reference}")
    refund, _ = paystack(f"/refund/{payload.refund_id}")
    record = refund.get("data")
    tx = transaction.get("data")
    mode = "test" if test_mode else "live"
    if (not isinstance(record, dict) or not isinstance(tx, dict) or not tx.get("id")
            or str(record.get("id")) != payload.refund_id or str(record.get("transaction")) != str(tx["id"])
            or record.get("domain") != mode or tx.get("domain") != mode or payment.test_mode != test_mode
            or tx.get("reference") != payload.reference or tx.get("currency") != "GHS"
            or tx.get("amount") != payment.amount_minor or record.get("currency") != "GHS"
            or record.get("status") != "processed"):
        raise HTTPException(422, "Paystack did not confirm a processed refund for this payment")
    try:
        refunded_at = datetime.fromisoformat(record["refunded_at"])
        if refunded_at.tzinfo is None:
            raise ValueError("Missing timezone")
        refunded_date = refunded_at.astimezone(timezone.utc).date()
    except (KeyError, TypeError, ValueError) as error:
        raise HTTPException(422, "Paystack did not return a valid refund date") from error
    payment = payment_by_reference(session, payload.reference, lock=True)
    key = f"{mode}:{payload.refund_id}"
    existing = session.get(RecordedRefund, key)
    if existing:
        if existing.payment_id != payment.id:
            raise HTTPException(409, "This refund is already linked to a different payment")
        return existing
    amount = record.get("amount")
    total = session.exec(select(func.coalesce(func.sum(RecordedRefund.amount_minor), 0))
                         .where(RecordedRefund.payment_id == payment.id)).one()
    if type(amount) is not int or amount <= 0 or total + amount > payment.amount_minor:
        raise HTTPException(422, "The refund total cannot exceed the recorded payment")
    row = RecordedRefund(id=key, payment_id=payment.id, amount_minor=amount, refunded_at=refunded_date, test_mode=test_mode)
    session.add(row)
    audit(session, request, account, "finance.refund.recorded", payment.id)
    session.commit()
    return row


@router.get("/refunds/{refund_id}/document")
def refund_document(refund_id: str, request: Request,
                    account: user = Depends(finance_access), session: Session = Depends(get_session)):
    row = session.get(RecordedRefund, refund_id)
    if row is None:
        raise HTTPException(404, "Refund was not found")
    payment = session.get(FinanceRecord, row.payment_id)
    if payment is None:
        raise HTTPException(404, "Original payment was not found")
    pdf = branded_finance_pdf(
        title=("TEST " if row.test_mode else "") + "Refund confirmation",
        filename=f"refund-{refund_id.replace(':', '-')}.pdf", number=refund_id, kind="refund",
        from_party=("PROCESSED BY", f"Paystack on behalf of {ISSUER}"),
        to_party=("REFUNDED TO", payment.recipient_name),
        dates=[("Refund date", row.refunded_at.strftime("%d %B %Y"))],
        lines=[{"description": f"Refund for {payment.description}", "quantity": 1, "unit_amount_minor": row.amount_minor}],
        total=row.amount_minor, reference=("Paystack payment reference", payment.reference),
        linked_document=("Original receipt", str(payment.id)), test_mode=row.test_mode,
    )
    audit(session, request, account, "finance.refund.document.accessed", payment.id)
    session.commit()
    return pdf


@router.get("/settlement")
def check_settlement(settlement_id: str = Query(pattern=r"^[1-9][0-9]{0,18}$"),
                     page: int = Query(default=1, ge=1, le=10000),
                     account: user = Depends(finance_access), session: Session = Depends(get_session)):
    query = urlencode({"page": page, "perPage": 50})
    result, test_mode = paystack(f"/settlement/{settlement_id}/transactions?{query}")
    raw_rows = result.get("data")
    if not isinstance(raw_rows, list):
        raise HTTPException(502, "Paystack returned an unexpected statement")
    remote = [row for row in raw_rows[:50] if isinstance(row, dict) and row.get("currency") == "GHS" and isinstance(row.get("reference"), str)]
    references = [row["reference"] for row in remote]
    local = {row.reference: row for row in session.exec(select(FinanceRecord).where(
        FinanceRecord.kind == "payment", FinanceRecord.test_mode == test_mode, FinanceRecord.reference.in_(references)))}
    items = []
    for row in remote:
        reference = row["reference"]
        payment = local.get(reference)
        result_code = "missing_receipt" if payment is None else (
            "matched" if payment.amount_minor == row.get("amount") and row.get("status") == "success" else "check_amount_or_status")
        items.append({"reference": reference, "amount_minor": row.get("amount"), "result": result_code})
    meta = result.get("meta") or {}
    return {"items": items, "has_next": page < meta.get("pageCount", page), "test_mode": test_mode}
