from typing import Literal
from pydantic import Field
from backend.app.schemas.contracts import Strict


class DocumentInput(Strict):
    filename: str = Field(min_length=1, max_length=120)
    media_type: Literal["application/pdf", "image/png"]
    content_base64: str = Field(min_length=4, max_length=44000)
