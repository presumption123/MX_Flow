"""RoundDocument Pydantic models and migration helpers."""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, Field, field_validator

SCHEMA_VERSION = 1

AFF_COLS = ["1AC", "1NC", "2AC", "Block", "1AR", "2NR", "2AR"]
NEG_COLS = ["1NC", "2AC", "Block", "1AR", "2NR", "2AR"]


class Cell(BaseModel):
    text: str = ""
    mark: Literal["normal", "dropped", "conceded"] = "normal"


class SheetRow(BaseModel):
    cells: dict[str, Cell] = Field(default_factory=dict)


class Sheet(BaseModel):
    id: str
    name: str
    type: Literal["aff", "neg"]
    cols: list[str]
    rows: list[SheetRow]


class Partner(BaseModel):
    id: str
    name: str
    active_sheet_id: str | None = Field(None, alias="activeSheetId")
    sheets: list[Sheet] = Field(default_factory=list)
    aff_count: int = Field(0, alias="affCount")
    neg_count: int = Field(0, alias="negCount")

    model_config = {"populate_by_name": True}


class UploadedFile(BaseModel):
    name: str
    content: str
    owner: Literal["ours", "opponent"] = "ours"


class RoundMeta(BaseModel):
    tournament: str = ""
    opponent: str = ""
    date: str = ""
    side: Literal["aff", "neg", ""] = ""


class Settings(BaseModel):
    side: Literal["aff", "neg", ""] = ""
    model: str = "claude-sonnet-4-6"
    max_tokens: int = Field(1000, alias="maxTokens")
    insert_mode: bool = Field(True, alias="insertMode")
    partner1_name: str = Field("Partner 1", alias="partner1Name")
    partner2_name: str = Field("Partner 2", alias="partner2Name")

    model_config = {"populate_by_name": True}

    @field_validator("side")
    @classmethod
    def validate_side(cls, v: str) -> str:
        if v not in ("aff", "neg", ""):
            raise ValueError("side must be aff, neg, or empty")
        return v


class RoundDocument(BaseModel):
    schema_version: int = Field(SCHEMA_VERSION, alias="schemaVersion")
    id: str
    meta: RoundMeta = Field(default_factory=RoundMeta)
    partners: list[Partner]
    uploaded_files: list[UploadedFile] = Field(default_factory=list, alias="uploadedFiles")
    settings: Settings = Field(default_factory=Settings)
    active_partner_id: str | None = Field(None, alias="activePartnerId")

    model_config = {"populate_by_name": True}


def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _make_row(cols: list[str]) -> SheetRow:
    return SheetRow(cells={c: Cell() for c in cols})


def _empty_partner(pid: str, name: str) -> Partner:
    return Partner(id=pid, name=name, sheets=[], activeSheetId=None, affCount=0, negCount=0)


def create_empty_round() -> RoundDocument:
    p1 = _empty_partner("partner-1", "Partner 1")
    p2 = _empty_partner("partner-2", "Partner 2")
    return RoundDocument(
        schemaVersion=SCHEMA_VERSION,
        id=_uid(),
        partners=[p1, p2],
        activePartnerId="partner-1",
    )


def migrate_round_document(doc: dict) -> RoundDocument:
    """Migrate legacy formats to schema v1."""
    if doc.get("schemaVersion") == SCHEMA_VERSION:
        return RoundDocument.model_validate(doc)

    # v0: prototype localStorage { sheets, affCount, negCount } at top level
    if "sheets" in doc and "partners" not in doc:
        sheets_raw = doc.get("sheets", [])
        sheets = []
        for s in sheets_raw:
            rows = []
            for row in s.get("rows", []):
                cells = {}
                for col, cell in (row.get("cells") or {}).items():
                    if isinstance(cell, dict):
                        cells[col] = Cell(**cell)
                    else:
                        cells[col] = Cell(text=str(cell))
                rows.append(SheetRow(cells=cells))
            sheets.append(
                Sheet(
                    id=s.get("id", _uid()),
                    name=s.get("name", "Flow"),
                    type=s.get("type", "aff"),
                    cols=s.get("cols", AFF_COLS),
                    rows=rows,
                )
            )
        p1 = Partner(
            id="partner-1",
            name=doc.get("settings", {}).get("partner1Name", "Partner 1"),
            activeSheetId=doc.get("activeId") or (sheets[0].id if sheets else None),
            sheets=sheets,
            affCount=doc.get("affCount", 0),
            negCount=doc.get("negCount", 0),
        )
        p2 = _empty_partner("partner-2", "Partner 2")
        settings = Settings.model_validate(doc.get("settings", {}))
        return RoundDocument(
            schemaVersion=SCHEMA_VERSION,
            id=doc.get("id", _uid()),
            meta=RoundMeta.model_validate(doc.get("meta", {})),
            partners=[p1, p2],
            uploadedFiles=[UploadedFile.model_validate(f) for f in doc.get("uploadedFiles", [])],
            settings=settings,
            activePartnerId="partner-1",
        )

    # Bump unknown versions through validation
    doc = dict(doc)
    doc["schemaVersion"] = SCHEMA_VERSION
    if "id" not in doc:
        doc["id"] = _uid()
    if "partners" not in doc:
        doc["partners"] = [_empty_partner("partner-1", "Partner 1"), _empty_partner("partner-2", "Partner 2")]
    return RoundDocument.model_validate(doc)
