"""Generate KESHAVAI-ARCHITECTURE.pdf from markdown (stdlib + fpdf2)."""
import re
import sys
from pathlib import Path

try:
    from fpdf import FPDF
except ImportError:
    import subprocess

    subprocess.check_call([sys.executable, "-m", "pip", "install", "fpdf2", "-q"])
    from fpdf import FPDF


class ArchPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(120, 120, 120)
            self.cell(0, 8, "Keshavai - Architecture & System Guide", align="C")
            self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")


def sanitize(text: str) -> str:
    replacements = {
        "\u2014": "-",
        "\u2013": "-",
        "\u2192": "->",
        "\u2190": "<-",
        "\u2502": "|",
        "\u2500": "-",
        "\u2514": "+",
        "\u251c": "+",
        "\u250c": "+",
        "\u2510": "+",
        "\u2518": "+",
        "\u2022": "-",
        "\u201c": '"',
        "\u201d": '"',
        "\u2018": "'",
        "\u2019": "'",
        "\u2026": "...",
        "\u2193": "v",
        "\u2191": "^",
        "\u25bc": "v",
        "\u25b2": "^",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return text.encode("latin-1", "replace").decode("latin-1")


def write_wrapped(pdf: ArchPDF, text: str, size: int = 10, style: str = "") -> None:
    pdf.set_font("Helvetica", style, size)
    pdf.set_text_color(30, 30, 30)
    pdf.multi_cell(0, 5.5, sanitize(text))
    pdf.ln(2)


def render_md(pdf: ArchPDF, md_path: Path) -> None:
    lines = md_path.read_text(encoding="utf-8").splitlines()
    in_code = False
    code_buf: list[str] = []

    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=20)

    for raw in lines:
        line = raw.rstrip()

        if line.strip().startswith("```"):
            if in_code:
                pdf.set_font("Courier", "", 8)
                pdf.set_fill_color(245, 245, 245)
                block = sanitize("\n".join(code_buf))
                pdf.multi_cell(0, 4.5, block, fill=True)
                pdf.ln(3)
                code_buf = []
                in_code = False
            else:
                in_code = True
            continue

        if in_code:
            code_buf.append(line)
            continue

        if not line.strip():
            pdf.ln(2)
            continue

        if line.startswith("# "):
            pdf.ln(4)
            write_wrapped(pdf, line[2:], size=18, style="B")
            pdf.ln(2)
        elif line.startswith("## "):
            pdf.ln(3)
            write_wrapped(pdf, line[3:], size=14, style="B")
            pdf.ln(1)
        elif line.startswith("### "):
            pdf.ln(2)
            write_wrapped(pdf, line[4:], size=12, style="B")
        elif line.startswith("---"):
            pdf.ln(2)
            pdf.set_draw_color(200, 200, 200)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(4)
        elif line.startswith("|") and "|" in line[1:]:
            write_wrapped(pdf, line, size=9)
        elif line.startswith("- ") or line.startswith("* "):
            write_wrapped(pdf, "  - " + line[2:], size=10)
        elif re.match(r"^\d+\.\s", line):
            write_wrapped(pdf, "  " + line, size=10)
        else:
            write_wrapped(pdf, line, size=10)


def main() -> None:
    docs = Path(__file__).parent
    md = docs / "KESHAVAI-ARCHITECTURE.md"
    out = docs / "KESHAVAI-ARCHITECTURE.pdf"

    pdf = ArchPDF()
    pdf.set_margins(15, 15, 15)
    render_md(pdf, md)
    pdf.output(str(out))
    print(f"Created: {out}")


if __name__ == "__main__":
    main()
