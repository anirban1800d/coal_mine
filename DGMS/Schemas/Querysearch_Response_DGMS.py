
from pydantic import BaseModel, Field, ConfigDict


class QuerysearchDGMS(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True
    )

    Rank: int
    Score: float

    Requirement_ID: str = Field(alias="Requirement ID")
    Regulation_Number: str | None = Field(
        default=None,
        alias="Regulation Number"
    )
    Regulation_Title: str | None = Field(
        default=None,
        alias="Regulation Title"
    )
    Chapter: str | None = None
    Clause_Number: str | None = Field(
        default=None,
        alias="Clause Number"
    )
    Requirement_Type: str | None = Field(
        default=None,
        alias="Requirement Type"
    )
    Project_Relevance: str | None = Field(
        default=None,
        alias="Project Relevance"
    )

    Requirement: str | None = None
    Responsible_Role: str | None = Field(
        default=None,
        alias="Responsible Role"
    )
    Responsible_Entity: str | None = Field(
        default=None,
        alias="Responsible Entity"
    )
    Applicability: str | None = None
    Trigger_Event: str | None = Field(
        default=None,
        alias="Trigger Event"
    )
    Frequency: str | None = None
    Document_Required: str | None = Field(
        default=None,
        alias="Document Required"
    )
    Record_Required: str | None = Field(
        default=None,
        alias="Record Required"
    )
    Required_Evidence: str | None = Field(
        default=None,
        alias="Required Evidence"
    )
    Risk_Category: str | None = Field(
        default=None,
        alias="Risk Category"
    )
    Corrective_Action: str | None = Field(
        default=None,
        alias="Corrective Action"
    )
    Violation_Condition: str | None = Field(
        default=None,
        alias="Violation Condition"
    )
    Relevance_Reason: str | None = Field(
        default=None,
        alias="Relevance Reason"
    )