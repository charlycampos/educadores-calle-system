import uvicorn
from fastapi import FastAPI, Depends
from src.infrastructure.http.routers import statistics_router

app = FastAPI(title="SEC Auth Service Test", version="1.0.0")

app.include_router(statistics_router.router, prefix="/api/statistics", tags=["Statistics"])

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3009)
