# ⛏️ GeoMine AI — AI-Powered Coal Mine Intelligence System

<p align="center">
  <strong>Intelligent Mining Compliance • Semantic Search • AI-Powered Safety Monitoring</strong>
</p>

GeoMine AI is an AI-powered coal mine intelligence platform designed to simplify environmental compliance, mining regulation discovery, and workplace safety monitoring.

The platform integrates **Central Pollution Control Board (CPCB)** and **Directorate General of Mines Safety (DGMS)** regulatory information with semantic search and Retrieval-Augmented Generation (RAG), alongside an AI-powered Personal Protective Equipment (PPE) detection system.

It provides a centralized interface for mining-related regulatory intelligence, secure user access, and real-time safety monitoring.

---

## 🚀 Key Features

### 1. CPCB Semantic Search
- AI-powered semantic search over CPCB environmental compliance requirements.
- Natural-language query processing.
- Sentence Transformer-based text embeddings.
- FAISS-based similarity search.
- Retrieves relevant regulatory requirements and recommended actions.

### 2. DGMS Semantic Search
- Intelligent search over DGMS mining safety regulations.
- Context-aware retrieval of relevant mining requirements.
- Vector similarity search using FAISS.
- Structured regulatory search results.

### 3. AI-Powered PPE Detection
- Real-time PPE detection using a trained YOLO model.
- Camera-based safety monitoring.
- Bounding-box visualization for detected objects.
- Confidence scores and class identification.
- WebSocket-based communication for real-time detection.

### 4. Authentication & User Management
- User registration and login.
- Google OAuth authentication.
- Session-based authentication.
- Forgot password and OTP verification.
- Password reset functionality.

### 5. Query History Management
- Stores users' previous CPCB and DGMS searches.
- User-specific search history.
- View previous search results.
- Delete individual history records.

### 6. Interactive Web Interface
- React-based frontend.
- Dedicated CPCB and DGMS search interfaces.
- Authentication and dashboard components.
- PPE monitoring interface.
- Search result visualization.

---

## 🧠 System Architecture

The platform consists of three major components:

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React, TypeScript, Vite | User interface |
| Backend | Python, FastAPI | API and application logic |
| Semantic Search | Sentence Transformers, FAISS | Regulatory document retrieval |
| AI Detection | YOLO, PyTorch, OpenCV | PPE detection |
| Data Processing | Pandas, NumPy | Data handling and preprocessing |
| Authentication | Authlib, Session Middleware | Secure user authentication |
| Communication | REST API, WebSocket | Frontend-backend communication |

### Semantic Search Pipeline

1. User submits a natural-language query.
2. Sentence Transformer converts the query into an embedding.
3. FAISS searches the corresponding vector index.
4. Relevant regulatory records are retrieved.
5. Structured results are returned to the frontend.

### PPE Detection Pipeline

1. Camera captures a video frame.
2. Frame is transmitted to the backend through WebSocket.
3. YOLO processes the incoming frame.
4. Detected objects are classified and localized.
5. Annotated frames and detection information are returned.

---

## 🛠️ Technology Stack

**Programming Languages**
- Python
- JavaScript
- TypeScript

**Backend & APIs**
- FastAPI
- Uvicorn
- Pydantic
- REST APIs
- WebSockets

**Artificial Intelligence & Machine Learning**
- Sentence Transformers
- FAISS
- YOLO
- PyTorch
- Hugging Face Transformers

**Frontend**
- React
- Vite
- TypeScript
- Tailwind CSS

**Computer Vision & Data Processing**
- OpenCV
- NumPy
- Pandas
- Scikit-learn

**Authentication**
- Google OAuth
- Authlib
- Session-based authentication
- OTP verification

---

## 📂 Project Structure

```text
coal_mine/
│
├── CPCB/
│   ├── model/
│   ├── schemas/
│   ├── Search_cpcb_rag.py
│   └── load_model.py
│
├── DGMS/
│   ├── model/
│   ├── Schemas/
│   ├── search_dgms_rag.py
│   └── load_model.py
│
├── Login/
│   ├── routes.py
│   └── schemas.py
│
├── otp_reset/
│   ├── email_service.py
│   ├── routes.py
│   └── store.py
│
├── register_app/
│   ├── models.py
│   ├── routes.py
│   └── schemas.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── services/
│   ├── package.json
│   └── vite.config.ts
│
├── frontend_ppe/
│
├── nexus-auth/
│
├── models/
│   └── best.pt
│
├── main.py
├── main_ppe.py
├── coal_main.py
├── requirements.txt
├── .gitignore
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites

- Python 3.10+
- Node.js and npm
- Git
- A compatible environment for PyTorch and FAISS

### 1. Clone the Repository

```bash
git clone https://github.com/anirban1800d/coal_mine.git

cd coal_mine
```

### 2. Create a Virtual Environment

```bash
python -m venv myenv
```

Activate on Windows:

```powershell
myenv\Scripts\activate
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the project root.

Configure the required application credentials and settings, including:

```env
SESSION_SECRET=your_session_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

FRONTEND_URL=http://localhost:5173
```

Add any additional environment variables required by your local configuration.

**Important:** Never commit your `.env` file or expose API keys and authentication credentials.

### 5. Start the Backend

```bash
uvicorn main:app --reload
```

Backend development server:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

### 6. Start the Frontend

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## 🔌 Important API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | User registration |
| POST | `/login` | User login |
| GET | `/login/google` | Google OAuth |
| POST | `/logout` | User logout |
| POST | `/forgot-password` | Password recovery |
| POST | `/verify-otp` | OTP verification |
| POST | `/reset-password` | Reset password |
| POST | `/cpcb/search` | CPCB semantic search |
| POST | `/dgms/search` | DGMS semantic search |
| GET | `/history` | Retrieve query history |
| GET | `/health` | Backend health check |
| WebSocket | `/ws/detect` | Standalone PPE detection service |

Authenticated endpoints require a valid user session.

---

## 🎯 Project Objectives

- Simplify access to complex mining and environmental regulations.
- Improve regulatory information retrieval through semantic search.
- Support mining safety monitoring through computer vision.
- Integrate multiple mining intelligence services into one platform.
- Provide secure and personalized access to mining compliance information.

---

## 🔮 Future Improvements

- Expand regulatory document coverage.
- Improve contextual retrieval and answer generation.
- Add advanced PPE compliance analytics.
- Introduce automated safety violation alerts.
- Build mining compliance dashboards and reporting.
- Improve scalability and deployment infrastructure.

---

## 👨‍💻 Author

**Anirban Chandra**

B.Tech Computer Science Engineering — Cyber Security

GitHub: [@anirban1800d](https://github.com/anirban1800d)

---

## 📜 License

No license has currently been specified for this repository.

---

⭐ If you find this project interesting, consider starring the repository!
