
from app.database import Base, engine
from app.models import Preorder, Payment, Trip

Base.metadata.create_all(bind=engine)

print("Таблицы созданы успешно!")
print("Таблицы:", list(Base.metadata.tables.keys()))
