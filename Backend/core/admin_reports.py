from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, TableStyle
from starlette.responses import Response

NAVY = "#2D3561"
LOGO = Path(__file__).resolve().parents[1] / "assets" / "fin_logo.png"


def table_report(title: str, headers: list[str], rows: list[list[str]], pdf: bool, subtitle: str | None = None) -> Response:
    rows = [["".join(char for char in str(value or "") if char >= " " or char in "\t\n") for value in row] for row in rows]
    output = BytesIO()
    if pdf:
        width, height = landscape(A4)
        doc = SimpleDocTemplate(output, pagesize=(width, height), topMargin=120 if subtitle else 104,
                                leftMargin=34, rightMargin=34, bottomMargin=38)
        styles = getSampleStyleSheet()
        body = styles["BodyText"]
        body.fontSize, body.leading, body.splitLongWords = 9, 12, 1
        heading = body.clone("ColumnHeading", fontName="Helvetica-Bold", textColor=colors.white)

        def cell(value, style):
            return Paragraph(escape(value).replace("\n", "<br/>"), style)

        table = LongTable([[cell(name, heading) for name in headers]] +
                          [[cell(value, body) for value in row] for row in rows],
                          colWidths=[(width - 80) / len(headers)] * len(headers), repeatRows=1, splitInRow=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(NAVY)),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#EEF0F8")]),
        ]))

        def page(canvas, document):
            canvas.setTitle(f"Fortune Intern Network | {title}")
            canvas.drawImage(str(LOGO), 40, height - 78, width=54, height=54, preserveAspectRatio=True, mask="auto")
            canvas.setFillColor(colors.HexColor(NAVY))
            canvas.setFont("Helvetica-Bold", 21)
            canvas.drawString(110, height - 47, title)
            canvas.setFont("Helvetica", 10)
            count_label = "record" if len(rows) == 1 else "records"
            canvas.drawString(110, height - 65, f"Fortune Intern Network  |  {len(rows)} {count_label}  |  {datetime.now(timezone.utc):%d %b %Y} UTC")
            if subtitle:
                canvas.drawString(110, height - 81, subtitle[:125])
            canvas.setStrokeColor(colors.HexColor("#F5B731"))
            canvas.line(40, height - 87, width - 40, height - 87)
            canvas.drawRightString(width - 40, 22, f"Page {document.page}")

        doc.build([table], onFirstPage=page, onLaterPages=page)
        extension, mime = "pdf", "application/pdf"
    else:
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = title[:31]
        sheet.append(headers)
        for row in rows:
            sheet.append(row)
        for row in sheet.iter_rows():
            for cell in row:
                if isinstance(cell.value, str):
                    cell.data_type = "s"
                cell.alignment = Alignment(vertical="top", wrap_text=True)
                if cell.row == 1:
                    cell.font = Font(bold=True, color="FFFFFF")
                    cell.fill = PatternFill("solid", fgColor=NAVY[1:])
        for column in sheet.columns:
            sheet.column_dimensions[column[0].column_letter].width = min(42, max(14, max(len(str(cell.value or "")) for cell in column) + 2))
        if subtitle:
            metadata = workbook.create_sheet("Report details")
            metadata.append(["Generated (UTC)", datetime.now(timezone.utc).isoformat()])
            metadata.append(["Filters", subtitle])
            metadata["B2"].data_type = "s"
        sheet.freeze_panes = "A2"
        sheet.auto_filter.ref = sheet.dimensions
        workbook.save(output)
        extension, mime = "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    filename = title.lower().replace(" ", "-")
    return Response(output.getvalue(), media_type=mime, headers={
        "Content-Disposition": f'attachment; filename="{filename}.{extension}"',
        "Cache-Control": "no-store",
    })
