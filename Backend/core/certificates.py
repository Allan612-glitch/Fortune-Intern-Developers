"""Personalize the supplied HTML completion-certificate design."""
from datetime import date, datetime
from html import escape
from pathlib import Path
import re


_TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "certificate.html"
_INPUT_FIELD = re.compile(
    r'(<input\b[^>]*\bdata-field="([^"]+)"[^>]*\bvalue=")[^"]*(")',
    re.IGNORECASE,
)
_OUTPUT_FIELD = re.compile(
    r'(?P<opening><(?P<tag>(?!input\b)[a-z][\w:-]*)\b'
    r'(?=[^>]*\bdata-field="(?P<field>[^"]+)")[^>]*>)'
    r'.*?'
    r'(?P<closing></(?P=tag)\s*>)',
    re.IGNORECASE | re.DOTALL,
)


def format_certificate_date(value: date | datetime) -> str:
    day = value.day
    suffix = "th" if 11 <= day % 100 <= 13 else {
        1: "st", 2: "nd", 3: "rd"
    }.get(day % 10, "th")
    return f"{day}{suffix} {value.strftime('%B')}, {value.year}"


def build_completion_certificate_html(fields: dict[str, str]) -> str:
    template = _TEMPLATE_PATH.read_text(encoding="utf-8")
    seen_fields: set[str] = set()

    def replace_input(match: re.Match[str]) -> str:
        field = match.group(2)
        if field not in fields:
            return match.group(0)
        seen_fields.add(field)
        return f"{match.group(1)}{escape(fields[field], quote=True)}{match.group(3)}"

    rendered = _INPUT_FIELD.sub(replace_input, template)
    if seen_fields != fields.keys():
        missing = sorted(fields.keys() - seen_fields)
        raise RuntimeError(f"Certificate template is missing input fields: {', '.join(missing)}")

    seen_output_fields: set[str] = set()

    def replace_output(match: re.Match[str]) -> str:
        field = match.group("field")
        if field not in fields:
            return match.group(0)
        seen_output_fields.add(field)
        return (
            f"{match.group('opening')}{escape(fields[field], quote=False)}"
            f"{match.group('closing')}"
        )

    rendered = _OUTPUT_FIELD.sub(replace_output, rendered)
    if seen_output_fields != fields.keys():
        missing = sorted(fields.keys() - seen_output_fields)
        raise RuntimeError(f"Certificate template is missing display fields: {', '.join(missing)}")

    download_styles = """<style>
body { background: #fff; padding: 0; }
.toolbar { display: none !important; }
.sheet { box-shadow: none; }
</style>
"""
    if "</head>" not in rendered:
        raise RuntimeError("Certificate template is missing its closing head tag")
    rendered = rendered.replace("</head>", f"{download_styles}</head>")

    auto_download = """<script>
window.addEventListener('load', function () {
  var button = document.getElementById('btnPng');
  if (button) button.click();
});
</script>
"""
    if "</body>" not in rendered:
        raise RuntimeError("Certificate template is missing its closing body tag")
    return rendered.replace("</body>", f"{auto_download}</body>")
