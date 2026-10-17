openapi: 3.0.3
info:
  title: По пути — API предварительного бронирования
  version: 1.0.0
  description: |
    Контракт, написанный по фактическому коду backend (FastAPI) из репозитория
    victoriapetrova2910/Project_custombus. Всё, что помечено x-status: planned,
    в коде ещё не реализовано и описано как план.
servers:
  - url: http://127.0.0.1:8000

tags:
  - name: Рейсы
  - name: Бронирования
  - name: Мои бронирования
  - name: Оплата

paths:
  /api/v1/trips:
    post:
      tags: [Рейсы]
      summary: Создать рейс
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/TripCreate' }
      responses:
        '201':
          description: Рейс создан, available_seats = total_seats
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Trip' }
        '422': { description: Ошибка валидации }

  /api/v1/trips/{trip_id}:
    get:
      tags: [Рейсы]
      summary: Получить рейс
      parameters:
        - { name: trip_id, in: path, required: true, schema: { type: integer } }
      responses:
        '200':
          description: Рейс
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Trip' }
        '404': { $ref: '#/components/responses/NotFound' }

  /api/v1/preorders:
    post:
      tags: [Бронирования]
      summary: Создать предзаказ и занять места
      description: |
        Места списываются атомарным UPDATE ... WHERE available_seats >= N.
        Два одновременных запроса на последнее место не могут пройти оба.
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/PreorderCreate' }
      responses:
        '201':
          description: Предзаказ создан, статус pending
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Preorder' }
        '404': { $ref: '#/components/responses/NotFound' }
        '409': { $ref: '#/components/responses/Conflict' }

  /api/v1/preorders/{preorder_id}:
    get:
      tags: [Бронирования]
      summary: Получить предзаказ
      parameters:
        - { name: preorder_id, in: path, required: true, schema: { type: integer } }
      responses:
        '200':
          description: Предзаказ
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Preorder' }
        '404': { $ref: '#/components/responses/NotFound' }

  /api/v1/preorders/{preorder_id}/pay:
    post:
      tags: [Оплата]
      summary: Оплатить предзаказ (быстрый путь, mock)
      description: |
        Создаёт платёж сразу в статусе paid и переводит предзаказ в confirmed.
        ВНИМАНИЕ: сумма захардкожена (500). В интервью цена 75–200 руб.
        Это расхождение нужно исправить.
      parameters:
        - { name: preorder_id, in: path, required: true, schema: { type: integer } }
      responses:
        '201':
          description: Платёж создан и подтверждён
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Payment' }
        '400': { $ref: '#/components/responses/BadRequest' }
        '404': { $ref: '#/components/responses/NotFound' }

  /api/v1/preorders/{preorder_id}/cancel:
    post:
      tags: [Бронирования]
      summary: Отменить предзаказ и вернуть места
      description: |
        Возвращает места в рейс. Сумму возврата сейчас НЕ считает:
        правила возврата реализованы в algorithm/refund.py и ещё не подключены.
      parameters:
        - { name: preorder_id, in: path, required: true, schema: { type: integer } }
      responses:
        '200':
          description: Предзаказ отменён
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Preorder' }
        '400': { $ref: '#/components/responses/BadRequest' }
        '404': { $ref: '#/components/responses/NotFound' }
        '409': { $ref: '#/components/responses/Conflict' }

  /api/v1/my/preorders:
    get:
      tags: [Мои бронирования]
      summary: Список предзаказов пользователя
      parameters:
        - name: user_id
          in: query
          required: true
          schema: { type: integer }
      responses:
        '200':
          description: Предзаказы, новые сверху
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Preorder' }

  /api/v1/payments:
    post:
      tags: [Оплата]
      summary: Создать платёж в статусе pending (пошаговый путь)
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/PaymentCreate' }
      responses:
        '201':
          description: Платёж создан
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Payment' }
        '400': { $ref: '#/components/responses/BadRequest' }
        '404': { $ref: '#/components/responses/NotFound' }
        '409': { $ref: '#/components/responses/Conflict' }

  /api/v1/payments/{payment_id}:
    get:
      tags: [Оплата]
      summary: Получить платёж
      parameters:
        - { name: payment_id, in: path, required: true, schema: { type: integer } }
      responses:
        '200':
          description: Платёж
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Payment' }
        '404': { $ref: '#/components/responses/NotFound' }

  /api/v1/payments/{payment_id}/confirm:
    post:
      tags: [Оплата]
      summary: Подтвердить платёж (pending → paid, предзаказ → confirmed)
      parameters:
        - { name: payment_id, in: path, required: true, schema: { type: integer } }
      responses:
        '200':
          description: Платёж подтверждён
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Payment' }
        '400': { $ref: '#/components/responses/BadRequest' }
        '404': { $ref: '#/components/responses/NotFound' }

  /api/v1/payments/{payment_id}/fail:
    post:
      tags: [Оплата]
      summary: Отметить платёж неуспешным
      parameters:
        - { name: payment_id, in: path, required: true, schema: { type: integer } }
      responses:
        '200':
          description: Платёж отмечен как failed
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Payment' }
        '400': { $ref: '#/components/responses/BadRequest' }
        '404': { $ref: '#/components/responses/NotFound' }

  /api/v1/stops:
    get:
      x-status: planned
      tags: [Рейсы]
      summary: Список остановок (план, см. задание 1)
      responses:
        '200': { description: Остановки }

  /api/v1/preorders/search:
    post:
      x-status: planned
      tags: [Бронирования]
      summary: Поиск рейсов по остановкам и времени (план)
      responses:
        '200': { description: Найденные рейсы }

components:
  responses:
    BadRequest:
      description: Неверное действие для текущего статуса
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    NotFound:
      description: Не найдено
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
    Conflict:
      description: Конфликт (мест нет, превышено число мест, платёж уже существует)
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }

  schemas:
    Error:
      type: object
      properties:
        detail:
          type: string
          description: Текст ошибки на русском (так сейчас возвращает FastAPI)

    TripCreate:
      type: object
      required: [departure_point, destination_point, departure_time, total_seats]
      properties:
        departure_point: { type: string, maxLength: 255 }
        destination_point: { type: string, maxLength: 255 }
        departure_time: { type: string, format: date-time }
        total_seats: { type: integer, minimum: 1 }

    Trip:
      type: object
      properties:
        id: { type: integer }
        departure_point: { type: string }
        destination_point: { type: string }
        departure_time: { type: string, format: date-time }
        total_seats: { type: integer }
        available_seats: { type: integer }

    PreorderCreate:
      type: object
      required: [user_id, trip_id]
      properties:
        user_id: { type: integer, minimum: 1 }
        trip_id: { type: integer, minimum: 1 }
        seats_count: { type: integer, minimum: 1, default: 1 }

    Preorder:
      type: object
      properties:
        id: { type: integer }
        user_id: { type: integer }
        trip_id: { type: integer, nullable: true }
        departure_point: { type: string }
        destination_point: { type: string }
        departure_time: { type: string, format: date-time }
        seats_count: { type: integer }
        status:
          type: string
          description: "pending, confirmed, cancelled (в коде статусы строками)"
          enum: [pending, confirmed, cancelled]
        created_at: { type: string, format: date-time }

    PaymentCreate:
      type: object
      required: [preorder_id, amount]
      properties:
        preorder_id: { type: integer, minimum: 1 }
        amount: { type: number, exclusiveMinimum: 0 }

    Payment:
      type: object
      properties:
        id: { type: integer }
        preorder_id: { type: integer }
        amount: { type: number }
        status:
          type: string
          enum: [pending, paid, failed]
