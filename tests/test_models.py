"""Tests for RoundDocument models."""

import pytest
from pydantic import ValidationError

from server.models import RoundDocument, Settings, create_empty_round, migrate_round_document


def test_create_empty_round():
    doc = create_empty_round()
    assert doc.schema_version == 1
    assert len(doc.partners) == 2
    assert doc.active_partner_id == "partner-1"


def test_settings_rejects_invalid_side():
    with pytest.raises(ValidationError):
        Settings(side="invalid")  # type: ignore[arg-type]


def test_round_document_validates():
    raw = create_empty_round().model_dump(by_alias=True)
    doc = RoundDocument.model_validate(raw)
    assert doc.schema_version == 1


def test_round_document_rejects_bad_side_in_settings():
    raw = create_empty_round().model_dump(by_alias=True)
    raw["settings"]["side"] = "invalid"
    with pytest.raises(ValidationError):
        RoundDocument.model_validate(raw)
