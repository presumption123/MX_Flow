"""Tests for coach context building and truncation."""

from server.coach import build_files_text, build_flows_text, truncate_context
from server.models import Cell, Partner, RoundDocument, Settings, Sheet, SheetRow, UploadedFile


def _big_round() -> RoundDocument:
    rows = [SheetRow(cells={"1AC": Cell(text="x" * 500)}) for _ in range(100)]
    sheet = Sheet(
        id="s1",
        name="Big",
        type="aff",
        cols=["1AC", "1NC"],
        rows=rows,
    )
    partner = Partner(id="partner-1", name="Alex", sheets=[sheet])
    files = [UploadedFile(name="card.docx", content="y" * 20000, owner="ours")]
    return RoundDocument(
        schemaVersion=1,
        id="r1",
        partners=[partner, Partner(id="partner-2", name="Jordan", sheets=[])],
        uploadedFiles=files,
        settings=Settings(side="aff"),
        activePartnerId="partner-1",
    )


def test_truncate_context_caps_large_input():
    side = "=== SIDE ===\n"
    flows = "f" * 100000
    files = "c" * 100000
    combined, truncated = truncate_context(side, flows, files)
    assert truncated is True
    assert len(combined) < len(side + flows + files)


def test_build_flows_includes_partner_name():
    doc = _big_round()
    text = build_flows_text(doc)
    assert "Alex" in text
    assert "Big" in text


def test_build_files_truncates_long_cards():
    doc = _big_round()
    text = build_files_text(doc)
    assert "truncated" in text or len(text) < 25000
