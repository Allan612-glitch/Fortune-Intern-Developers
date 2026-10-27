"""Server-rendered PDF documents (assessment form + recommendation letter) sent to applicants."""
import re
from datetime import datetime, timezone
from html import escape
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.graphics.shapes import Drawing, Path as DrawingPath, Rect
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    HRFlowable,
    KeepTogether,
    PageTemplate,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

NAVY = colors.HexColor("#0A3161")
GOLD = colors.HexColor("#EDB523")
INK = colors.HexColor("#12365E")
TEXT = colors.HexColor("#16202E")
LINE = colors.HexColor("#C9D2DE")
SIGNATURE_INK = colors.HexColor("#2B3A9E")

# Hand-signature stroke data lifted from the sigsvg path in letter.html (viewBox 0 0 200 150)
SIGNATURE_PATHS = [
    "M112 22 C 84 6, 44 16, 30 48 C 16 82, 24 116, 58 130 C 88 142, 122 134, 132 112 C 136 102, 132 94, 124 92",
    "M66 46 C 74 38, 84 38, 88 44",
    "M70 46 C 68 62, 66 80, 66 98",
    "M68 72 C 74 68, 80 68, 84 70",
    "M84 98 C 88 84, 92 72, 96 66 C 99 76, 101 88, 103 98 C 107 84, 111 72, 115 66 C 118 76, 120 88, 122 98",
    "M108 64 C 102 44, 112 28, 122 32 C 132 36, 128 54, 114 60 C 110 62, 106 62, 104 60",
    "M112 44 C 117 40, 121 43, 119 49",
    "M112 62 C 110 74, 108 86, 106 96",
    "M128 100 C 140 92, 154 90, 168 94 C 159 99, 153 105, 155 112",
]

_styles = getSampleStyleSheet()
_brand_style = ParagraphStyle("FinBrand", parent=_styles["Normal"], fontName="Helvetica-Bold", fontSize=13, textColor=INK, alignment=TA_CENTER)
_tagline_style = ParagraphStyle("FinTagline", parent=_styles["Normal"], fontName="Helvetica-Bold", fontSize=8, textColor=NAVY, alignment=TA_CENTER, spaceAfter=6)
_title_style = ParagraphStyle("FinTitle", parent=_styles["Title"], fontName="Helvetica-Bold", fontSize=15, textColor=NAVY, alignment=TA_CENTER, spaceAfter=0)
_section_style = ParagraphStyle("FinSection", parent=_styles["Heading2"], fontName="Helvetica-Bold", fontSize=11.5, textColor=NAVY, spaceBefore=10, spaceAfter=4)
_body_style = ParagraphStyle("FinBody", parent=_styles["Normal"], fontName="Helvetica", fontSize=10, textColor=TEXT, leading=14, alignment=TA_JUSTIFY, spaceAfter=8)
_label_style = ParagraphStyle("FinLabel", parent=_styles["Normal"], fontName="Helvetica-Bold", fontSize=9.5, textColor=TEXT)
_hint_style = ParagraphStyle("FinHint", parent=_styles["Normal"], fontName="Helvetica-Oblique", fontSize=8.5, textColor=colors.HexColor("#5A6472"), spaceAfter=6)
_footer_style = ParagraphStyle("FinFooter", parent=_styles["Normal"], fontSize=7.6, alignment=TA_CENTER, textColor=INK)
_subject_style = ParagraphStyle("FinSubject", parent=_body_style, alignment=TA_CENTER, spaceBefore=4, spaceAfter=6)


def _header(story: list, title: str) -> None:
    logo_path = _find_logo_path()
    if logo_path:
        story.append(_LetterLogo(logo_path, 32 * mm, 25 * mm))
        story.append(Spacer(1, 4))
    else:
        story.append(Paragraph("FORTUNE", _brand_style))
        story.append(Paragraph('<font color="#EDB523">INTERN</font> <font color="#12365E">NETWORK</font>', _tagline_style))
    story.append(Paragraph(title, _title_style))
    story.append(HRFlowable(width="100%", thickness=1.4, color=NAVY, spaceBefore=4, spaceAfter=10))


def _footer() -> Paragraph:
    return Paragraph(
        "Fortune Intern Network (FIN) &nbsp;|&nbsp; fortuneintern.gh@gmail.com &nbsp;|&nbsp; "
        "+233 25 703 8948 / +233 20 031 3672 &nbsp;|&nbsp; Accra &bull; Kumasi, Ghana",
        _footer_style,
    )


def _ordinal(day: int) -> str:
    suffix = "th" if 11 <= day % 100 <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    return f"{day}{suffix}"


def _formatted_date(dt: datetime) -> str:
    return f"{_ordinal(dt.day)} {dt.strftime('%B')}, {dt.year}"


def _build_signature_drawing(width: float = 38 * mm, height: float = 25 * mm) -> Drawing:
    """Render the fixed FIN managing-director signature as vector strokes (same size as the downloaded letter)."""
    view_w, view_h = 200.0, 150.0
    scale = min(width / view_w, height / view_h)
    x_off = (width - view_w * scale) / 2
    y_off = (height - view_h * scale) / 2
    drawing = Drawing(width, height)
    for path_data in SIGNATURE_PATHS:
        nums = [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?", path_data)]
        path = DrawingPath(strokeColor=SIGNATURE_INK, strokeWidth=5 * scale, fillColor=None, strokeLineCap=1, strokeLineJoin=1)
        path.moveTo(x_off + nums[0] * scale, y_off + (view_h - nums[1]) * scale)
        index = 2
        while index + 6 <= len(nums):
            x1, y1, x2, y2, x3, y3 = nums[index:index + 6]
            path.curveTo(
                x_off + x1 * scale, y_off + (view_h - y1) * scale,
                x_off + x2 * scale, y_off + (view_h - y2) * scale,
                x_off + x3 * scale, y_off + (view_h - y3) * scale,
            )
            index += 6
        drawing.add(path)
    return drawing


def _build_checkbox_drawing(size: float = 9.5, stroke_color=None) -> Drawing:
    """Draw an empty checkbox square (Helvetica has no glyph for \u2610, so a real shape is used instead)."""
    drawing = Drawing(size, size)
    drawing.add(Rect(0.75, 0.75, size - 1.5, size - 1.5, strokeColor=stroke_color or NAVY, strokeWidth=0.9, fillColor=None))
    return drawing


ASSESSMENT_FIELD_LABELS = [
    "Intern's Name:",
    "Institution/School:",
    "Course/Program of Study:",
    "Host Organization:",
    "Department/Unit:",
    "Supervisor's Name & Position:",
    "Duration of Internship (From / To):",
]

ASSESSMENT_CRITERIA = [
    "Punctuality & Attendance",
    "Communication Skills",
    "Teamwork & Collaboration",
    "Initiative & Creativity",
    "Technical/Job Knowledge",
    "Adaptability & Willingness to Learn",
    "Work Quality & Accuracy",
    "Time Management & Efficiency",
    "Professionalism & Discipline",
    "Overall Performance",
]


def build_assessment_form_pdf() -> bytes:
    """Build the blank internship assessment form, to be completed by the host supervisor."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=18 * mm, bottomMargin=14 * mm, leftMargin=16 * mm, rightMargin=16 * mm,
        title="FIN Internship Assessment Form",
    )
    story: list = []
    _header(story, "Internship / Attachment Assessment Form")

    story.append(Paragraph("Section A: Intern Information", _section_style))
    field_rows = [[Paragraph(label, _label_style), ""] for label in ASSESSMENT_FIELD_LABELS]
    field_table = Table(field_rows, colWidths=[62 * mm, 112 * mm])
    field_table.setStyle(TableStyle([
        ("LINEBELOW", (1, 0), (1, -1), 0.6, colors.HexColor("#8E99A6")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
    ]))
    story.append(field_table)

    story.append(Paragraph("Section B: Performance Assessment", _section_style))
    story.append(Paragraph("(Please rate the intern on each criterion by ticking the appropriate box)", _hint_style))
    header_row = ["Criteria", "Excellent (5)", "Very Good (4)", "Good (3)", "Fair (2)", "Poor (1)"]
    rate_rows = [header_row] + [
        [criterion, _build_checkbox_drawing(), _build_checkbox_drawing(), _build_checkbox_drawing(), _build_checkbox_drawing(), _build_checkbox_drawing()]
        for criterion in ASSESSMENT_CRITERIA
    ]
    rate_table = Table(rate_rows, colWidths=[64 * mm, 22.8 * mm, 22.8 * mm, 22.8 * mm, 22.8 * mm, 22.8 * mm])
    rate_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.6),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("VALIGN", (1, 1), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F8FC")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(rate_table)

    story.append(Paragraph("Section C: Supervisor's Comments", _section_style))
    story.append(Paragraph("(Narrative on the intern's strengths, areas of improvement, and overall impression.)", _hint_style))
    comment_lines = Table([[""] for _ in range(9)], colWidths=[178 * mm], rowHeights=[7 * mm] * 9)
    comment_lines.setStyle(TableStyle([("LINEBELOW", (0, 0), (0, -1), 0.4, LINE)]))
    story.append(comment_lines)

    story.append(Paragraph("Section D: Recommendation", _section_style))
    for option_text in [
        "Highly Recommend for future employment",
        "Recommend with reservations",
        "Not recommended",
    ]:
        rec_row = Table(
            [[_build_checkbox_drawing(), Paragraph(option_text, _body_style)]],
            colWidths=[6 * mm, 172 * mm],
        )
        rec_row.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))
        story.append(rec_row)

    sig_rows = [
        [Paragraph("Supervisor's Signature:", _label_style), ""],
        [Paragraph("Date:", _label_style), ""],
    ]
    sig_table = Table(sig_rows, colWidths=[45 * mm, 129 * mm])
    sig_table.setStyle(TableStyle([
        ("LINEBELOW", (1, 0), (1, -1), 0.6, colors.HexColor("#8E99A6")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("Organization's Stamp/Seal:", _label_style))
    story.append(Spacer(1, 22 * mm))

    story.append(HRFlowable(width="100%", thickness=0.8, color=GOLD, spaceBefore=6, spaceAfter=4))
    story.append(_footer())

    doc.build(story)
    return buffer.getvalue()


LETTER_GOLD = colors.HexColor("#E9B427")
LETTER_BACKGROUND = colors.HexColor("#F8FAFC")
LETTER_FOOTER_TEXT = "LinkedIn · X · WhatsApp · Fortune Intern Network · 0200313672"


def _find_logo_path() -> Path | None:
    """Logo used on the letter. Looks in Backend/assets first, then the frontend assets folder."""
    core_dir = Path(__file__).resolve().parent
    for candidate in (
        core_dir.parent / "assets" / "fin_logo.png",
        core_dir.parent.parent / "Frontend" / "src" / "assets" / "attach1.png",
    ):
        if candidate.is_file():
            return candidate
    return None


class _LetterLogo(Flowable):
    """Logo drawn centred inside a fixed box, keeping its shape and transparency (like object-fit: contain)."""

    def __init__(self, path: Path, width: float, height: float):
        super().__init__()
        self.path, self.width, self.height = path, width, height
        self.hAlign = "CENTER"

    def wrap(self, avail_width, avail_height):
        return self.width, self.height

    def draw(self):
        self.canv.drawImage(
            str(self.path), 0, 0, self.width, self.height,
            mask="auto", preserveAspectRatio=True, anchor="c",
        )


def _draw_letter_page(canvas, doc, logo_path: Path | None) -> None:
    """Page background, watermark, gold bands, navy corners and footer line (same as the downloaded letter)."""
    page_w, page_h = A4
    corner_w, corner_h = 25 * mm, 22 * mm
    canvas.saveState()
    canvas.setFillColor(LETTER_BACKGROUND)
    canvas.rect(0, 0, page_w, page_h, stroke=0, fill=1)
    if logo_path:
        size = 95 * mm
        canvas.saveState()
        canvas.setFillAlpha(0.1)
        canvas.drawImage(
            str(logo_path), page_w / 2 - size / 2, page_h * (1 - 0.52) - size / 2, size, size,
            mask="auto", preserveAspectRatio=True, anchor="c",
        )
        canvas.restoreState()
    canvas.setFillColor(LETTER_GOLD)
    canvas.rect(0, page_h - 8 * mm, page_w, 8 * mm, stroke=0, fill=1)
    canvas.rect(0, 0, page_w, 8 * mm, stroke=0, fill=1)
    canvas.setFillColor(NAVY)
    top_right = canvas.beginPath()
    top_right.moveTo(page_w - corner_w + 0.45 * corner_w, page_h)
    top_right.lineTo(page_w, page_h)
    top_right.lineTo(page_w, page_h - corner_h)
    top_right.close()
    canvas.drawPath(top_right, stroke=0, fill=1)
    bottom_left = canvas.beginPath()
    bottom_left.moveTo(0, corner_h)
    bottom_left.lineTo(0, 0)
    bottom_left.lineTo(corner_w, 0)
    bottom_left.close()
    canvas.drawPath(bottom_left, stroke=0, fill=1)
    canvas.setFillColor(INK)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawCentredString(page_w / 2, 7.9, LETTER_FOOTER_TEXT)
    canvas.restoreState()


def build_recommendation_letter_pdf(
    *,
    student_name: str,
    institution: str,
    program_course: str | None,
    contact: str | None,
    email: str,
    host_company: str,
    host_location: str | None,
    reference_no: str,
    index_number: str | None = None,
    opportunity: str | None = None,
    letter_date: datetime | None = None,
) -> bytes:
    """Build the recommendation letter so it looks like the letter students can print from the app."""
    logo_path = _find_logo_path()
    buffer = BytesIO()
    doc = BaseDocTemplate(
        buffer, pagesize=A4,
        title="FIN Internship Recommendation Letter",
    )
    page_w, page_h = A4
    frame = Frame(
        18 * mm, 18 * mm, page_w - 36 * mm, page_h - 36 * mm,
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0, id="letter-body",
    )
    doc.addPageTemplates([PageTemplate(
        id="letter", frames=[frame],
        onPage=lambda canvas, document: _draw_letter_page(canvas, document, logo_path),
    )])

    base = ParagraphStyle("LetterBase", parent=_styles["Normal"], fontName="Helvetica", textColor=TEXT, alignment=TA_LEFT)
    ref_left = ParagraphStyle("LetterRefLeft", parent=base, fontSize=9.75, leading=11.2, textColor=INK)
    ref_right = ParagraphStyle("LetterRefRight", parent=ref_left, alignment=TA_RIGHT)
    row_label = ParagraphStyle("LetterRowLabel", parent=base, fontName="Helvetica-Bold", fontSize=9.5, leading=11)
    row_value = ParagraphStyle("LetterRowValue", parent=base, fontSize=9.5, leading=11)
    address_style = ParagraphStyle("LetterAddress", parent=base, fontName="Helvetica-Bold", fontSize=10.5, leading=15)
    para_style = ParagraphStyle("LetterPara", parent=base, fontSize=10, leading=15, spaceAfter=7)
    subject_style = ParagraphStyle("LetterSubject", parent=para_style, alignment=TA_CENTER, leading=12, spaceBefore=8, spaceAfter=10)
    signature_style = ParagraphStyle("LetterSignature", parent=base, fontSize=10, leading=14)
    wordmark_style = ParagraphStyle(
        "LetterWordmark", parent=base, fontName="Helvetica-Bold", fontSize=16, leading=18,
        textColor=INK, alignment=TA_CENTER, charSpace=2, spaceAfter=8,
    )

    story: list = []
    if logo_path:
        logo_w, logo_h = 36 * mm, 29 * mm
        story.append(_LetterLogo(logo_path, logo_w, logo_h))
        story.append(Spacer(1, 6))
    else:
        # Logo file not found: fall back to a text wordmark so the email still goes out.
        story.append(Paragraph("FORTUNE", wordmark_style))

    today = _formatted_date(letter_date or datetime.now(timezone.utc))
    ref_table = Table(
        [[Paragraph(f"Our Ref: {escape(reference_no)}", ref_left), Paragraph(today, ref_right)]],
        colWidths=[(page_w - 36 * mm) / 2] * 2,
    )
    ref_table.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    story.append(ref_table)

    detail_rows = [
        ("NAME OF STUDENT:", student_name),
        ("INSTITUTION:", institution),
        ("INDEX NUMBER:", index_number or "N/A"),
    ]
    detail_rows += [
        ("CONTACT:", contact or "N/A"),
        ("PROGRAM / COURSE OF STUDY:", program_course or "N/A"),
        ("EMAIL ADDRESS:", email),
    ]
    label_w, gap_w = 135, 9
    value_w = page_w - 36 * mm - label_w - gap_w
    detail_table = Table(
        [[Paragraph(label, row_label), "", Paragraph(escape(value), row_value)] for label, value in detail_rows],
        colWidths=[label_w, gap_w, value_w],
    )
    detail_table.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(detail_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        f"THE HUMAN RESOURCE MANAGER<br/>{escape(host_company).upper()}<br/>{escape(host_location or '').upper()}",
        address_style,
    ))
    story.append(Paragraph("Dear Sir/Madam,", para_style))
    story.append(Paragraph("<u>INTERNSHIP / ATTACHMENT</u>", ParagraphStyle("LetterSubjectBold", parent=subject_style, fontName="Helvetica-Bold")))

    program_phrase = escape(program_course or "their program of study")
    opportunity_phrase = f", specifically for <b>{escape(opportunity)}</b>" if opportunity else ""
    story.append(Paragraph(
        f"We write on behalf of the Fortune Intern Network (FIN) to recommend <b>{escape(student_name)}</b>, "
        f"a student of {escape(institution)} reading {program_phrase}, for an internship/industrial attachment "
        f"opportunity in your esteemed organization{opportunity_phrase}.",
        para_style,
    ))
    story.append(Paragraph(
        "We believe this internship will provide valuable practical experience, strengthen professional "
        "skills, and complement the applicant's academic training. We are confident that the applicant "
        "will demonstrate discipline, professionalism, and a strong commitment throughout the internship.",
        para_style,
    ))
    story.append(Paragraph(
        "We kindly request that you consider granting this opportunity for a duration that suits your "
        "organization's schedule. For any further information, please feel free to contact us on "
        "<b>fortuneintern.gh@gmail.com</b> or <b>+233 25 703 8948</b>.",
        para_style,
    ))
    story.append(Paragraph("Thank you for your support and consideration.", para_style))

    signature = _build_signature_drawing()
    signature.hAlign = "LEFT"
    story.append(KeepTogether([
        Paragraph("Yours sincerely,", ParagraphStyle("LetterSignOff", parent=signature_style, spaceBefore=13)),
        signature,
        Paragraph(
            "<b>Emmanuel Amoasi</b><br/>Managing Director<br/>Fortune Intern Network",
            signature_style,
        ),
    ]))

    doc.build(story)
    return buffer.getvalue()
