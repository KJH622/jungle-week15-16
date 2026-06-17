from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import rag

app = FastAPI()

# React(5173)에서 오는 요청 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# RAG 라우터 등록 — /rag/embed, /rag/search
app.include_router(rag.router, prefix="/rag")

@app.get("/")
def root():
    return {"message": "AI Server running"}