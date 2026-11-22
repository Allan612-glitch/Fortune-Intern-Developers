from io import BytesIO
from xml.sax.saxutils import escape, quoteattr

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import LongTable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from starlette.responses import Response

from Backend.core.admin_reports import LOGO, NAVY
from Backend.core.config import settings

INK = colors.HexColor(NAVY)
MUTED = colors.HexColor("#46546D")
LINE = colors.HexColor("#DCE1ED")
PALE = colors.HexColor("#EFF2F9")
GOLD = colors.HexColor("#F5B731")
ISSUER = "Fortune Intern Network"

STATEMENTS = {
    "income": "This receipt records income received by Fortune Intern Network. Quote the document number for queries.",
    "payment": "This receipt confirms the payment shown. Payment of the processing fee does not guarantee a placement.",
    "invoice": "This invoice requests payment. Use the official FIN portal and keep the Paystack reference. A payment receipt confirms verified payment.",
    "expense": "This voucher records the expense shown. Retain the supporting evidence and quote the voucher number for queries.",
    "refund": "This confirmation records a refund marked processed by Paystack. Check the original payment channel for the credit.",
}


def amount(value):
    return f"{value // 100:,}.{value % 100:02d}"


def branded_finance_pdf(*, title, filename, number, kind, from_party, to_party, dates, lines, total,
                        reference=None, linked_document=None, memo=None, test_mode=False):
    output = BytesIO()
    width, height = A4
    doc = SimpleDocTemplate(output, pagesize=A4, topMargin=104, leftMargin=36, rightMargin=36, bottomMargin=47)
    body = ParagraphStyle("Body", fontName="Helvetica", fontSize=10, leading=14, textColor=INK)
    meta = ParagraphStyle("Label", parent=body, fontName="Helvetica-Bold", fontSize=9, textColor=MUTED)
    white = ParagraphStyle("Table heading", parent=meta, textColor=colors.white)
    heading = ParagraphStyle("Heading", parent=body, fontName="Helvetica-Bold", fontSize=17, leading=22)
    bold = ParagraphStyle("Bold", parent=body, fontName="Helvetica-Bold")
    right = ParagraphStyle("Amount", parent=body, alignment=2)
    strong = ParagraphStyle("Total", parent=right, fontName="Helvetica-Bold", fontSize=15, leading=20)
    terms_url = settings.frontend_url.rstrip("/") + "/terms"
    refund_url = terms_url + "#refunds"
    contact = settings.contact_email
    terms_link = f'<link href={quoteattr(terms_url)} color="{NAVY}"><u>Full Terms and Conditions</u></link>'
    refund_link = f'<link href={quoteattr(refund_url)} color="{NAVY}"><u>Refund policy</u></link>'

    def p(value, style=body):
        clean = "".join(char for char in str(value) if char >= " " or char == "\n")
        return Paragraph(escape(clean).replace("\n", "<br/>"), style)

    def panel(rows, widths):
        table = Table(rows, colWidths=widths, hAlign="LEFT")
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PALE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, 0), 8),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
        ]))
        return table

    parties = panel([[p(from_party[0], meta), p(to_party[0], meta)], [p(from_party[1]), p(to_party[1])]],
                    [doc.width / 2] * 2)
    fields = [*dates, ("Currency", "GHS")]
    if reference:
        fields.append(reference)
    if linked_document:
        fields.append(linked_document)
    metadata = Table([[p(key, meta), p(value)] for key, value in fields], colWidths=[145, doc.width - 145])
    metadata.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                                  ("LINEBELOW", (0, 0), (-1, -1), .45, LINE)]))
    table_rows = [[p("DESCRIPTION", white), p("QTY", white), p("UNIT PRICE (GHS)", white), p("AMOUNT (GHS)", white)]]
    table_rows.extend([p(line["description"]), p(line["quantity"], right), p(amount(line["unit_amount_minor"]), right),
                       p(amount(line["quantity"] * line["unit_amount_minor"]), right)] for line in lines)
    items = LongTable(table_rows, colWidths=[doc.width - 232, 42, 98, 92], repeatRows=1, hAlign="LEFT")
    items.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 1), (-1, -1), .45, LINE),
    ]))
    total_label = {"income": "Total received", "payment": "Total received", "invoice": "Invoice total", "expense": "Total recorded", "refund": "Total refunded"}[kind]
    totals = panel([[p(total_label, bold), p(f"GHS {amount(total)}", strong)]], [doc.width - 187, 187])
    notice = "Test document. No live funds are represented." if test_mode else STATEMENTS[kind]
    body_parts = [parties, Spacer(1, 11), metadata, Spacer(1, 15), items, Spacer(1, 6), totals, Spacer(1, 17)]
    if memo:
        body_parts.extend([p("Notes", bold), p(memo), Spacer(1, 10)])
    body_parts.extend([
        p("Payment notice", bold), p(notice),
        Paragraph(f"Keep this PDF for your records. See the attached payment terms and {terms_link}.", body),
        PageBreak(), p("Payment terms and conditions", heading), Spacer(1, 9),
        Paragraph(f"This page accompanies document {escape(number)}. Read it with the {terms_link} and {refund_link}.", body),
    ])
    terms_sections = [
        ("Application fee", "The processing fee shown at checkout covers verification, document generation and placement administration. Official application documents are released after verified payment. Host organisations make their own selection decisions."),
        ("Refund eligibility", "The published policy covers duplicate payment for the same application reference, an unverified debit, a system fault that prevented an application record after successful payment, and programme or cycle cancellation by FIN before processing."),
        ("When the policy excludes refunds", "Examples include a change of mind after processing starts or documents are issued, disqualification for false information or breach of terms, and non-selection by a host organisation."),
        ("Refund requests", f"Email {contact} with ‘Refund Request’ and the Paystack reference within 14 days of payment. The published policy allows up to five working days for verification. Approved refunds return to the original payment channel within 7 to 14 working days under the published policy."),
        ("Questions and applicable rights", f"Quote the document number and the payment reference when contacting {contact}. Nothing in this notice limits any rights that apply under Ghanaian law."),
    ]
    if kind in ("expense", "income"):
        body_parts.append(p("The application-fee conditions below apply where the transaction relates to a student application fee."))
    for label, content in terms_sections:
        body_parts.extend([Spacer(1, 13), p(label, bold), p(content)])
    body_parts.extend([Spacer(1, 14), Paragraph(f"{terms_link} · {refund_link}", body),
                       p(f"Terms page: {terms_url}", meta)])

    def layout(canvas, document):
        canvas.setTitle(f"{ISSUER} | {title}")
        canvas.drawImage(str(LOGO), 37, height - 73, width=37, height=37, preserveAspectRatio=True, mask="auto")
        canvas.setFillColor(INK)
        canvas.setFont("Helvetica-Bold", 12)
        canvas.drawString(84, height - 51, ISSUER)
        canvas.setFont("Helvetica", 9)
        canvas.drawString(84, height - 66, contact)
        canvas.setFont("Helvetica-Bold", 18)
        canvas.drawRightString(width - 36, height - 50, title)
        canvas.setFont("Helvetica", 9)
        canvas.drawRightString(width - 36, height - 66, number)
        canvas.setStrokeColor(GOLD)
        canvas.line(36, height - 84, width - 36, height - 84)
        canvas.setStrokeColor(LINE)
        canvas.line(36, 34, width - 36, 34)
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 8)
        canvas.drawString(36, 23, ISSUER)
        canvas.drawRightString(width - 36, 23, f"Page {document.page}")

    doc.build(body_parts, onFirstPage=layout, onLaterPages=layout)
    return Response(output.getvalue(), media_type="application/pdf", headers={
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Cache-Control": "no-store",
    })
