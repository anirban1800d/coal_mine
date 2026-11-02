from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent 

model_path = BASE_DIR / "CPCB" / "model"
index_path = model_path / "cpcb_faiss.index"
data_path = model_path / "cpcb_rag_data.csv"