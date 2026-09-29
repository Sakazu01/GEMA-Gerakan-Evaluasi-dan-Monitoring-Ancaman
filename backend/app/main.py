from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analyze, my_reports, nearby, reports, votes
from app.core.config import settings

app = FastAPI(title="GEMA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(nearby.router, prefix="/api")
app.include_router(my_reports.router, prefix="/api")
app.include_router(votes.router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
