"""Bounded CSV contracts and formula-safe output. No database or network access."""

import csv
import io
from pydantic import ValidationError
from backend.app.core.errors import AppError
from backend.app.schemas.contracts import PatientInput

COLUMNS = ("full_name", "date_of_birth", "gender", "contact_number", "email", "address")


def parse_patients(text):
    if "\x00" in text:
        raise AppError("INVALID_IMPORT", "CSV contains unsupported characters", 422)
    try:
        reader = csv.DictReader(io.StringIO(text), strict=True)
        if (
            not reader.fieldnames
            or len(reader.fieldnames) != len(set(reader.fieldnames))
            or set(reader.fieldnames) != set(COLUMNS)
        ):
            raise AppError(
                "INVALID_IMPORT",
                "CSV must contain exactly the six supported demographic columns",
                422,
                {"columns": list(COLUMNS)},
            )
        rows = []
        errors = []
        for number, row in enumerate(reader, start=2):
            if number > 101:
                raise AppError("IMPORT_LIMIT", "Use batches of at most 100 patients", 422)
            try:
                if None in row:
                    raise ValueError("Extra cells")
                data = PatientInput.model_validate(row)
                rows.append(data.model_dump(mode="json"))
            except (ValidationError, ValueError, TypeError):
                errors.append(number)
        if errors:
            raise AppError(
                "INVALID_IMPORT",
                "Correct invalid rows before preview",
                422,
                {"row_numbers": errors},
            )
        if not rows:
            raise AppError("INVALID_IMPORT", "CSV has no patient rows", 422)
        return rows
    except csv.Error:
        raise AppError("INVALID_IMPORT", "CSV could not be parsed", 422) from None


def spreadsheet_safe(value):
    text = str(value or "")
    if text.startswith(("\t", "\r", "\n")) or text.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + text
    return text


def patients_csv(rows):
    out = io.StringIO(newline="")
    writer = csv.writer(out, quoting=csv.QUOTE_ALL)
    writer.writerow(("patient_id", *COLUMNS))
    for row in rows:
        writer.writerow([spreadsheet_safe(row["id"]), *(spreadsheet_safe(row[k]) for k in COLUMNS)])
    return out.getvalue()
