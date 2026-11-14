"""Personalize the supplied HTML completion-certificate design."""
from html import escape
from pathlib import Path
import re


_TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "certificate.html"
_INPUT_FIELD = re.compile(
    r'(<input\b[^>]*\bdata-field="([^"]+)"[^>]*\bvalue=")[^"]*(")',
    re.IGNORECASE,
)


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
