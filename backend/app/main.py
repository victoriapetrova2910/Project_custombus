
from fastapi import FastAPI

from app.api.preorders import router as preorders_router
from app.api.preorders import my_router

from app.api.payments import router as payments_router

from app.api.trips import router as trips_router

app = FastAPI(
    title="По пути",
    description="Сервис предварительного бронирования поездок",
    version="1.0.0",
)

app.include_router(preorders_router)
app.include_router(my_router)
app.include_router(payments_router)
app.include_router(trips_router)

@app.get("/")
def root():
    return {"message": "Сервис «По пути» работает!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
