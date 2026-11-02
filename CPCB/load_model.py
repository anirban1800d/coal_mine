import faiss
import pandas as pd
from sentence_transformers import SentenceTransformer
from CPCB.paths import index_path, data_path

def load_model(index_path=index_path, data_path=data_path):
    # Load the pre-trained sentence transformer model
    model = SentenceTransformer('all-MiniLM-L6-v2')

    # Load the FAISS index
    try:
        index = faiss.read_index(str(index_path))
    except Exception as e:
        print(f"Error occurred while loading FAISS index: {e}")
        index = None

    # Load the RAG data
    try:
        rag_data = pd.read_csv(str(data_path))
    except Exception as e:
        print(f"Error occurred while loading RAG data: {e}")
        rag_data = None

    return model, index, rag_data