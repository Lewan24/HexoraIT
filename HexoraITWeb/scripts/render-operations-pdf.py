"""Offline PDF QA using pypdfium2 installed only into ignored output/pdf-qa."""
import json
from pathlib import Path
import struct
import sys
import zlib

output = Path(__file__).resolve().parents[2] / "output"
sys.path.insert(0, str(output / "pdf-qa"))
import pypdfium2 as pdfium

document = pdfium.PdfDocument(str(output / "operations-gpo-synthetic.pdf"))
all_text = []
for index, page in enumerate(document):
    all_text.append(page.get_textpage().get_text_range())
    bitmap = page.render(scale=1.15, force_bitmap_format=pdfium.raw.FPDFBitmap_BGR)
    raw = bytes(bitmap.buffer)
    scanlines = bytearray()
    for row in range(bitmap.height):
        scanlines.append(0)
        start = row * bitmap.stride
        for col in range(bitmap.width):
            b, g, r = raw[start + col * 3:start + col * 3 + 3]
            scanlines.extend((r, g, b))
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", bitmap.width, bitmap.height, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(scanlines)) + chunk(b"IEND", b"")
    (output / f"operations-gpo-page-{index + 1}.png").write_bytes(png)
text = "\n".join(all_text)
assert "ąćęłńóśźż" in text, "Polish glyph extraction failed"
assert "Independent approval" in text
assert "Synthetic closure" in text
(output / "operations-gpo-text.txt").write_text(text, encoding="utf-8")
print(json.dumps({"pages": len(document), "polish_text": True, "approval_and_closure": True}))
