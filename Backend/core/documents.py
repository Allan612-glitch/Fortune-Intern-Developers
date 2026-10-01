"""Server-rendered PDF documents (assessment form + recommendation letter) sent to applicants."""
import re
from datetime import datetime, timezone
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.graphics.shapes import Drawing, Path, Rect
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

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
    suffix = "th" if 11 <= (day % 100) <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    return f"{day}{suffix}"


def _formatted_date(dt: datetime) -> str:
    months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]
    return f"{_ordinal(dt.day)} {months[dt.month - 1]}, {dt.year}"


def _build_signature_drawing(width: float = 58, height: float = 43.5) -> Drawing:
    """Render the fixed FIN managing-director signature as vector strokes."""
    view_w, view_h = 200.0, 150.0
    scale = width / view_w
    drawing = Drawing(width, height)
    for path_data in SIGNATURE_PATHS:
        nums = [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?", path_data)]
        path = Path(strokeColor=SIGNATURE_INK, strokeWidth=1.3, fillColor=None, strokeLineCap=1, strokeLineJoin=1)
        path.moveTo(nums[0] * scale, (view_h - nums[1]) * scale)
        index = 2
        while index + 6 <= len(nums):
            x1, y1, x2, y2, x3, y3 = nums[index:index + 6]
            path.curveTo(
                x1 * scale, (view_h - y1) * scale,
                x2 * scale, (view_h - y2) * scale,
                x3 * scale, (view_h - y3) * scale,
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
) -> bytes:
    """Build the recommendation letter, filled in with the applicant's own name and institution."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=18 * mm, bottomMargin=14 * mm, leftMargin=20 * mm, rightMargin=20 * mm,
        title="FIN Internship Recommendation Letter",
    )
    story: list = []
    _header(story, "Internship / Attachment Letter")

    today = _formatted_date(datetime.now(timezone.utc))
    ref_table = Table(
        [[Paragraph(f"<b>Our Ref:</b> {reference_no}", _body_style), Paragraph(f"<b>{today}</b>", _body_style)]],
        colWidths=[89 * mm, 89 * mm],
    )
    ref_table.setStyle(TableStyle([("ALIGN", (1, 0), (1, 0), "RIGHT"), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    story.append(ref_table)
    story.append(Spacer(1, 4 * mm))

    detail_rows = [
        ("Name of Student:", student_name.upper()),
        ("Institution:", institution.upper()),
        ("Contact:", contact or "N/A"),
        ("Program / Course of Study:", (program_course or "N/A").upper()),
        ("Email Address:", email),
    ]
    detail_table = Table(
        [[Paragraph(f"<b>{label}</b>", _body_style), Paragraph(value, _body_style)] for label, value in detail_rows],
        colWidths=[58 * mm, 120 * mm],
    )
    detail_table.setStyle(TableStyle([("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))
    story.append(detail_table)
    story.append(Spacer(1, 5 * mm))

    story.append(Paragraph(
        f"<b>The Human Resource Manager</b><br/>{host_company.upper()}<br/>{(host_location or '').upper()}",
        _body_style,
    ))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph("Dear Sir/Madam,", _body_style))
    story.append(Paragraph("<u><b>Internship / Attachment</b></u>", _subject_style))

    program_phrase = program_course or "their program of study"
    story.append(Paragraph(
        f"We write on behalf of the Fortune Intern Network (FIN) to recommend <b>{student_name}</b>, "
        f"a student of {institution} reading {program_phrase}, for an internship/industrial attachment "
        f"opportunity in your esteemed organization.",
        _body_style,
    ))
    story.append(Paragraph(
        "We believe this internship will provide valuable practical experience, strengthen professional "
        "skills, and complement the applicant's academic training. We are confident that the applicant "
        "will demonstrate discipline, professionalism, and a strong commitment throughout the internship.",
        _body_style,
    ))
    story.append(Paragraph(
        "We kindly request that you consider granting this opportunity for a duration that suits your "
        "organization's schedule. For any further information, please feel free to contact us on "
        "<b>fortuneintern.gh@gmail.com</b> or <b>+233 25 703 8948</b>.",
        _body_style,
    ))
    story.append(Paragraph("Thank you for your support and consideration.", _body_style))

    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("Yours sincerely,", _body_style))
    story.append(Spacer(1, 2 * mm))
    story.append(_build_signature_drawing())
    story.append(Spacer(1, 1 * mm))
    story.append(Paragraph("<b>Emmanuel Amoasi</b>", _body_style))
    story.append(Paragraph("<b>Managing Director</b><br/>Fortune Intern Network", _body_style))

    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width="100%", thickness=0.8, color=GOLD, spaceBefore=4, spaceAfter=4))
    story.append(_footer())

    doc.build(story)
    return buffer.getvalue()
