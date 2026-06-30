"""
Canonical transaction model.
"""
from typing import Optional
from pydantic import BaseModel, Field

class Transaction(BaseModel):
    """
    Represents a single bank transaction.
    """
    id: str = Field(..., description="Unique identifier for the transaction")
    date: str = Field(..., description="Date of the transaction in YYYY-MM-DD format")
    description: str = Field(..., description="Text description of the transaction")
    debit: float = Field(0.0, description="Amount debited, if applicable")
    credit: float = Field(0.0, description="Amount credited, if applicable")
    balance: float = Field(0.0, description="Running balance after the transaction")
    entity: Optional[str] = Field(None, description="Extracted entity (e.g., Merchant name)")
    account_id: str = Field(..., description="Identifier for the associated bank account")
    source_file: str = Field(..., description="Filename from which this transaction was extracted")
    raw_row: Optional[str] = Field(None, description="The raw CSV/PDF row data for auditing")
