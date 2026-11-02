import pandas as pd
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

def Search_cpcb_rag(query: str,embedding:SentenceTransformer,index:faiss.Index,df_rag:pd.DataFrame,k:int)->list[dict]:

    query_embedding = embedding.encode([query],normalize_embeddings=True)

    query_embedding = np.asarray(query_embedding,dtype="float32")

    scores, indices = index.search(
        query_embedding,
        k
    )

    results : list[dict] = []

    for rank, idx in enumerate(indices[0], start=1):

        if idx == -1:
            continue

        row = df_rag.iloc[idx]

        results.append({
            "rank": rank,
            "score": float(scores[0][rank - 1]),
            "requirement_id": row["requirement_id"],
            "chapter": row["chapter_title"],
            "requirement_type": row["requirement_type"],
            "parameter": row["parameter"],
            "requirement": row["requirement"],
            "applicability": row["applicability"],
            "condition": row["condition"],
            "limit_value": row["limit_value"],
            "unit": row["unit"],
            "comparison_operator": row["comparison_operator"],
            "monitoring_location": row["monitoring_location"],
            "required_action": row["required_action"],
            "responsible_entity": row["responsible_entity"],
            "compliance_category": row["compliance_category"],
            "risk_category": row["risk_category"],
            "notes": row["notes"]
        })

    return results
