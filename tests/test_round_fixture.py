"""Round-document JSON fixtures align JS and Python migration."""

import json
from pathlib import Path

from server.models import migrate_round_document

FIXTURE = Path(__file__).parent / "fixtures" / "v0_localstorage.json"


def test_js_fixture_migrates_same_as_python():
    raw = json.loads(FIXTURE.read_text())
    doc = migrate_round_document(raw)
    assert doc.schema_version == 1
    assert doc.partners[0].sheets[0].rows[0].cells["1AC"].text == "Trade good"
    assert doc.partners[1].name == "Partner 2"
    assert doc.uploaded_files[0].owner == "ours"
