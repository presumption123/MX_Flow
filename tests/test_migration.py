"""Tests for v0 → v1 migration."""

from server.models import SCHEMA_VERSION, migrate_round_document


def test_migrate_v0_localstorage_shape():
    v0 = {
        "sheets": [
            {
                "id": "s1",
                "name": "Aff 1",
                "type": "aff",
                "cols": ["1AC", "1NC", "2AC", "Block", "1AR", "2NR", "2AR"],
                "rows": [
                    {"cells": {"1AC": {"text": "Trade good", "mark": "normal"}}},
                ],
            }
        ],
        "affCount": 1,
        "negCount": 0,
        "activeId": "s1",
        "settings": {"side": "aff", "partner1Name": "Alex"},
    }
    doc = migrate_round_document(v0)
    assert doc.schema_version == SCHEMA_VERSION
    assert doc.partners[0].name == "Alex"
    assert len(doc.partners[0].sheets) == 1
    assert doc.partners[0].sheets[0].rows[0].cells["1AC"].text == "Trade good"
    assert doc.partners[1].sheets == []
    assert doc.active_partner_id == "partner-1"


def test_migrate_preserves_uploaded_files():
    v0 = {
        "schemaVersion": 1,
        "id": "r1",
        "partners": [
            {
                "id": "partner-1",
                "name": "P1",
                "sheets": [],
                "affCount": 0,
                "negCount": 0,
            },
            {
                "id": "partner-2",
                "name": "P2",
                "sheets": [],
                "affCount": 0,
                "negCount": 0,
            },
        ],
        "uploadedFiles": [
            {"name": "1AC.docx", "content": "⟦HL⟧warrant⟦/HL⟧", "owner": "ours"}
        ],
        "settings": {"side": "aff"},
        "activePartnerId": "partner-1",
    }
    doc = migrate_round_document(v0)
    assert len(doc.uploaded_files) == 1
    assert "⟦HL⟧" in doc.uploaded_files[0].content
