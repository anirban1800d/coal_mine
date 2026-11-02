import pandas as pd
import faiss
from sentence_transformers import SentenceTransformer
from DGMS.paths import index_path, data_path

def load_model_DGMS(index_path=index_path, data_path=data_path):

    model = SentenceTransformer('all-MiniLM-L6-v2')

    # Load the FAISS index
    try:
        index = faiss.read_index(str(index_path))
    except Exception as e:
        print(f"Error occurred while loading FAISS index DGMS: {e}")
        index = None


    # Load the data
    try:
        data = pd.read_csv(str(data_path))
    except Exception as e:
        print(f"Error occurred while loading RAG data DGMS: {e}")
        rag_data = None

   

    return model, index, data
