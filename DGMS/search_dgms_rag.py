

import pandas as pd
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import re


ALL_FIELDS = [
    "Requirement ID",
    "Regulation Number",
    "Regulation Title",
    "Chapter",
    "Clause Number",
    "Requirement Type",
    "Project Relevance",
    "Requirement",
    "Responsible Role",
    "Responsible Entity",
    "Applicability",
    "Trigger Event",
    "Frequency",
    "Deadline",
    "Reporting Required",
    "Reporting Method",
    "Reporting Authority",
    "Document Required",
    "Record Required",
    "Required Evidence",
    "Inspection Required",
    "Inspection Frequency",
    "Equipment Requirement",
    "Hazard",
    "Risk Category",
    "Corrective Action",
    "Violation Condition",
    "Relevance Reason",
]


REQUIRED_FIELDS = [
    "Requirement Type",
    "Requirement",
    "Responsible Role",
    "Responsible Entity",
    "Applicability",
    "Trigger Event",
    "Frequency",
    "Document Required",
    "Record Required",
    "Required Evidence",
    "Risk Category",
    "Corrective Action",
    "Violation Condition",
    "Project Relevance",
    "Relevance Reason",
]


def extract_required_fields(rag_text: str) -> dict[str, str]:

    if not rag_text:
        return {}

    all_fields_pattern = "|".join(
        re.escape(field)
        for field in sorted(
            ALL_FIELDS,
            key=len,
            reverse=True
        )
    )

    required_fields_pattern = "|".join(
        re.escape(field)
        for field in sorted(
            REQUIRED_FIELDS,
            key=len,
            reverse=True
        )
    )

    normalized_text = re.sub(
        rf"\s+(?=({all_fields_pattern})\s*:)",
        "\n",
        str(rag_text),
        flags=re.IGNORECASE
    )

    pattern = re.compile(
        rf"^\s*({required_fields_pattern})\s*:\s*(.*?)\s*$",
        flags=re.IGNORECASE
    )

    extracted_fields = {}

    for line in normalized_text.splitlines():

        match = pattern.match(line)

        if match:
            field_name = match.group(1).strip()
            field_value = match.group(2).strip()

            extracted_fields[field_name] = field_value

    return extracted_fields


def search_dgms(query: str,embedding_model: SentenceTransformer,index: faiss.Index,df: pd.DataFrame,k: int) -> list[dict]:

    df = df.copy()

    df.columns = (
        df.columns
        .astype(str)
        .str.strip()
        .str.lower()
        .str.replace(" ", "_", regex=False)
    )

    required_columns = [
        "requirement_id",
        "regulation_number",
        "regulation_title",
        "chapter",
        "clause_number",
        "requirement_type",
        "project_relevance",
        "rag_text",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing DGMS columns: {missing_columns}\n"
            f"Available columns: {df.columns.tolist()}"
        )

    query_embedding = embedding_model.encode(
        [query],
        normalize_embeddings=True
    )

    query_embedding = np.asarray(
        query_embedding,
        dtype="float32"
    )

    scores, indices = index.search(
        query_embedding,
        k
    )

    results = []

    for rank, idx in enumerate(indices[0], start=1):

        if idx == -1:
            continue

        row = df.iloc[int(idx)]

        extracted_fields = extract_required_fields(
            row["rag_text"]
        )

        result = {
            "Rank": rank,
            "Score": float(scores[0][rank - 1]),

            "Requirement ID": str(row["requirement_id"]),
            "Regulation Number": (
                None
                if pd.isna(row["regulation_number"])
                else str(row["regulation_number"])
            ),
            "Regulation Title": (
                None
                if pd.isna(row["regulation_title"])
                else str(row["regulation_title"])
            ),
            "Chapter": (
                None
                if pd.isna(row["chapter"])
                else str(row["chapter"])
            ),
            "Clause Number": (
                None
                if pd.isna(row["clause_number"])
                else str(row["clause_number"])
            ),
            "Requirement Type": (
                None
                if pd.isna(row["requirement_type"])
                else str(row["requirement_type"])
            ),
            "Project Relevance": (
                None
                if pd.isna(row["project_relevance"])
                else str(row["project_relevance"])
            ),
        }

        # Add Requirement, Responsible Role, Frequency, etc.
        # as separate JSON fields.
        result.update(extracted_fields)

        results.append(result)

    return results