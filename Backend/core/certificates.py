"""Build personalized completion certificates as PDF documents."""
from datetime import date, datetime
from io import BytesIO
import math

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from xml.sax.saxutils import escape


_NAVY = colors.HexColor("#12365E")
_GOLD = colors.HexColor("#EDB523")
_MAROON = colors.HexColor("#7A2321")
_INK = colors.HexColor("#14181D")
_MUTED = colors.HexColor("#6B7280")


def format_certificate_date(value: date | datetime) -> str:
    day = value.day
    suffix = "th" if 11 <= day % 100 <= 13 else {
        1: "st", 2: "nd", 3: "rd"
    }.get(day % 10, "th")
    return f"{day}{suffix} {value.strftime('%B')}, {value.year}"


def _draw_star(certificate: canvas.Canvas, center_x: float, center_y: float) -> None:
    path = certificate.beginPath()
    for point in range(10):
        angle = point * 36 - 90
        radius = (27 if point % 2 == 0 else 12) * mm
        x = center_x + radius * math.cos(math.radians(angle))
        y = center_y + radius * math.sin(math.radians(angle))
        if point == 0:
            path.moveTo(x, y)
        else:
            path.lineTo(x, y)
    path.close()
    certificate.setFillColor(_GOLD)
    certificate.drawPath(path, stroke=0, fill=1)


def _draw_fitted_centered_text(
    certificate: canvas.Canvas,
    text: str,
    center_x: float,
    y: float,
    max_width: float,
    font_name: str,
    font_size: float,
    min_font_size: float = 12,
) -> None:
    while font_size > min_font_size and stringWidth(text, font_name, font_size) > max_width:
        font_size -= 1
    certificate.setFont(font_name, font_size)
    certificate.drawCentredString(center_x, y, text)


def build_completion_certificate_pdf(fields: dict[str, str]) -> bytes:
    buffer = BytesIO()
    page_width, page_height = landscape(A4)
    certificate = canvas.Canvas(
        buffer,
        pagesize=(page_width, page_height),
        pageCompression=0,
        title="Fortune Intern Network Certificate of Completion",
    )

    certificate.setFillColor(colors.HexColor("#F8FAFC"))
    certificate.rect(0, 0, page_width, page_height, stroke=0, fill=1)

    margin = 14 * mm
    panel_x = 199 * mm
    panel_y = 14 * mm
    panel_width = 84 * mm
    panel_height = 181 * mm
    certificate.setStrokeColor(_MAROON)
    certificate.setLineWidth(1.5)
    certificate.rect(margin, margin, page_width - 2 * margin, page_height - 2 * margin)
    certificate.setStrokeColor(_GOLD)
    certificate.setLineWidth(0.6)
    certificate.rect(margin + 1.6 * mm, margin + 1.6 * mm, page_width - 2 * margin - 3.2 * mm, page_height - 2 * margin - 3.2 * mm)

    certificate.setFillColor(_NAVY)
    certificate.rect(panel_x, panel_y, panel_width, panel_height, stroke=0, fill=1)
    certificate.setStrokeColor(_GOLD)
    certificate.setLineWidth(2)
    certificate.line(panel_x, panel_y + panel_height - 3 * mm, panel_x + panel_width, panel_y + panel_height - 3 * mm)
    certificate.line(panel_x, panel_y + 3 * mm, panel_x + panel_width, panel_y + 3 * mm)

    center_x = 106.5 * mm
    certificate.setFillColor(_NAVY)
    certificate.setFont("Helvetica-Bold", 11)
    certificate.drawString(27 * mm, 177 * mm, "FORTUNE INTERN")
    certificate.setFillColor(_GOLD)
    certificate.setFont("Helvetica-Bold", 7)
    certificate.drawString(27 * mm, 173 * mm, "NETWORK")

    certificate.setFillColor(_INK)
    certificate.setFont("Helvetica-Bold", 28)
    certificate.drawCentredString(center_x, 151 * mm, "CERTIFICATE")
    certificate.setFont("Helvetica", 12)
    certificate.drawCentredString(center_x, 141 * mm, "O F   C O M P L E T I O N")
    certificate.setStrokeColor(_GOLD)
    certificate.setLineWidth(1)
    certificate.line(73 * mm, 137 * mm, 140 * mm, 137 * mm)

    certificate.setFillColor(colors.HexColor("#2A2F36"))
    certificate.setFont("Helvetica", 12)
    certificate.drawCentredString(center_x, 126 * mm, "This certificate is proudly presented to")
    _draw_fitted_centered_text(
        certificate,
        fields["name"],
        center_x,
        112 * mm,
        158 * mm,
        "Helvetica-Bold",
        29,
    )
    certificate.setStrokeColor(_INK)
    certificate.setLineWidth(0.6)
    certificate.line(34 * mm, 107 * mm, 179 * mm, 107 * mm)

    description = Paragraph(
        "for successfully completing the <b>{}</b> internship program "
        "({}) {}.".format(
            escape(fields["prog"]),
            escape(fields["duration"]),
            escape(fields["grade"]),
        ),
        ParagraphStyle(
            "CertificateDescription",
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            alignment=1,
            textColor=_INK,
        ),
    )
    description_width = 154 * mm
    _, description_height = description.wrap(description_width, 22 * mm)
    description.drawOn(
        certificate,
        center_x - description_width / 2,
        97 * mm - description_height,
    )

    certificate.setFillColor(_MUTED)
    certificate.setFont("Helvetica-Bold", 8)
    certificate.drawCentredString(
        center_x,
        80 * mm,
        f"{fields['inst']}  |  {fields['start']} - {fields['end']}",
    )

    signature_y = 42 * mm
    certificate.setStrokeColor(_NAVY)
    certificate.setLineWidth(1.2)
    signature = certificate.beginPath()
    signature.moveTo(77 * mm, signature_y + 8 * mm)
    signature.curveTo(84 * mm, signature_y + 20 * mm, 93 * mm, signature_y - 4 * mm, 101 * mm, signature_y + 9 * mm)
    signature.curveTo(108 * mm, signature_y + 21 * mm, 115 * mm, signature_y - 1 * mm, 123 * mm, signature_y + 11 * mm)
    signature.curveTo(129 * mm, signature_y + 18 * mm, 134 * mm, signature_y + 2 * mm, 140 * mm, signature_y + 9 * mm)
    certificate.drawPath(signature, stroke=1, fill=0)
    certificate.setStrokeColor(colors.HexColor("#4A5563"))
    certificate.setLineWidth(0.5)
    certificate.line(76 * mm, signature_y, 141 * mm, signature_y)
    certificate.setFillColor(_INK)
    certificate.setFont("Helvetica-Bold", 8)
    certificate.drawCentredString(center_x, signature_y - 4 * mm, fields["sname"].upper())
    certificate.setFillColor(_MUTED)
    certificate.setFont("Helvetica", 7)
    certificate.drawCentredString(center_x, signature_y - 8 * mm, fields["srole"].upper())

    badge_x = panel_x + panel_width / 2
    badge_y = 119 * mm
    ribbon = certificate.beginPath()
    ribbon.moveTo(badge_x - 8 * mm, badge_y - 21 * mm)
    ribbon.lineTo(badge_x - 3 * mm, badge_y - 44 * mm)
    ribbon.lineTo(badge_x, badge_y - 40 * mm)
    ribbon.lineTo(badge_x + 3 * mm, badge_y - 44 * mm)
    ribbon.lineTo(badge_x + 8 * mm, badge_y - 21 * mm)
    ribbon.close()
    certificate.setFillColor(_GOLD)
    certificate.drawPath(ribbon, stroke=0, fill=1)
    _draw_star(certificate, badge_x, badge_y)
    certificate.setFillColor(_NAVY)
    certificate.setStrokeColor(colors.HexColor("#C89A3C"))
    certificate.setLineWidth(1.2)
    certificate.circle(badge_x, badge_y, 19 * mm, stroke=1, fill=1)
    certificate.setFillColor(_GOLD)
    certificate.setFont("Helvetica-Bold", 12)
    certificate.drawCentredString(badge_x, badge_y - 3 * mm, "FIN")
    certificate.setFillColor(colors.white)
    certificate.setFont("Helvetica-Bold", 8)
    certificate.drawCentredString(badge_x, 73 * mm, "CERTIFICATE")
    certificate.drawCentredString(badge_x, 68 * mm, "OF COMPLETION")
    certificate.setFillColor(colors.HexColor("#D7E0EB"))
    certificate.setFont("Helvetica", 7)
    certificate.drawCentredString(badge_x, 26 * mm, fields["certno"])
    certificate.drawCentredString(badge_x, 21 * mm, f"Issued {fields['issued']}")

    certificate.showPage()
    certificate.save()
    return buffer.getvalue()
