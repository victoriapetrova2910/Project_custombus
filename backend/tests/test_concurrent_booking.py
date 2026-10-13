
import asyncio
import httpx

URL = "http://127.0.0.1:8000/api/v1/preorders"

# Укажем ID нового тестового рейса перед запуском теста.
TRIP_ID = 5


async def book(user_id, client):
    try:
        response = await client.post(
            URL,
            json={
                "user_id": user_id,
                "trip_id": TRIP_ID,
                "seats_count": 1,
            },
        )
        return user_id, response.status_code, response.text

    except httpx.RequestError as error:
        return user_id, "REQUEST_ERROR", str(error)


async def main():
    timeout = httpx.Timeout(10.0)

    async with httpx.AsyncClient(
        timeout=timeout,
        trust_env=False,
    ) as client:
        results = await asyncio.gather(
            book(101, client),
            book(102, client),
        )

    for result in results:
        print(result)


if __name__ == "__main__":
    asyncio.run(main())
