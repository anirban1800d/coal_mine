from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

model_path = BASE_DIR / "DGMS" / "model"
index_path = model_path / "dgms_faiss.index"
data_path = model_path / "dgms_rag_data.csv"