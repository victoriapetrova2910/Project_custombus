from sqlalchemy import text

from app.database import engine

try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT version()"))
        print("Подключение успешно!")
        print(result.scalar())

except Exception as error:
    print("Ошибка подключения:")
    print(error)