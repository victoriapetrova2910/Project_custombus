from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_cols = {c["name"] for c in insp.get_columns("trips")}

    with op.batch_alter_table("trips") as batch:
        if "origin_stop_id" not in existing_cols:
            batch.add_column(sa.Column("origin_stop_id", sa.BigInteger(), nullable=True))
            batch.create_foreign_key(
                "fk_trips_origin_stop", "stops", ["origin_stop_id"], ["id"], ondelete="SET NULL"
            )
        if "destination_stop_id" not in existing_cols:
            batch.add_column(sa.Column("destination_stop_id", sa.BigInteger(), nullable=True))
            batch.create_foreign_key(
                "fk_trips_destination_stop", "stops", ["destination_stop_id"], ["id"],
                ondelete="SET NULL",
            )
        if "vehicle_id" not in existing_cols:
            batch.add_column(sa.Column("vehicle_id", sa.Integer(), nullable=True))
            batch.create_foreign_key(
                "fk_trips_vehicle", "vehicles", ["vehicle_id"], ["id"], ondelete="SET NULL"
            )
        if "arrival_time" not in existing_cols:
            batch.add_column(sa.Column("arrival_time", sa.DateTime(), nullable=True))
        if "status" not in existing_cols:
            batch.add_column(
                sa.Column("status", sa.String(20), nullable=False, server_default="scheduled")
            )
        if "created_at" not in existing_cols:
            batch.add_column(
                sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now())
            )

    op.create_check_constraint("ck_trips_total_seats_positive", "trips", "total_seats > 0")
    op.create_check_constraint(
        "ck_trips_available_seats_range",
        "trips",
        "available_seats >= 0 AND available_seats <= total_seats",
    )
    op.create_check_constraint(
        "ck_trips_status",
        "trips",
        "status IN ('scheduled', 'in_progress', 'completed', 'cancelled')",
    )


    op.create_index("ix_trips_departure_time", "trips", ["departure_time"])
    op.create_index("ix_trips_status_departure", "trips", ["status", "departure_time"])
    op.create_index("ix_trips_vehicle_id", "trips", ["vehicle_id"])

    op.create_table(
        "trip_stops",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "trip_id", sa.Integer(), sa.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("stop_id", sa.BigInteger(), sa.ForeignKey("stops.id"), nullable=False),
        sa.Column("stop_sequence", sa.Integer(), nullable=False),
        sa.Column("arrival_time", sa.DateTime(), nullable=False),
        sa.Column("departure_time", sa.DateTime(), nullable=False),
        sa.Column("fare_from_start", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.UniqueConstraint("trip_id", "stop_sequence", name="uq_trip_stops_trip_sequence"),
        sa.UniqueConstraint("trip_id", "stop_id", name="uq_trip_stops_trip_stop"),
        sa.CheckConstraint("stop_sequence >= 1", name="ck_trip_stops_sequence_positive"),
        sa.CheckConstraint("departure_time >= arrival_time", name="ck_trip_stops_times"),
        sa.CheckConstraint("fare_from_start >= 0", name="ck_trip_stops_fare_nonneg"),
    )
    op.create_index("ix_trip_stops_stop_id", "trip_stops", ["stop_id"])
    op.create_index("ix_trip_stops_trip_id", "trip_stops", ["trip_id"])


def downgrade() -> None:
    op.drop_table("trip_stops")

    op.drop_index("ix_trips_vehicle_id", table_name="trips")
    op.drop_index("ix_trips_status_departure", table_name="trips")
    op.drop_index("ix_trips_departure_time", table_name="trips")

    op.drop_constraint("ck_trips_status", "trips", type_="check")
    op.drop_constraint("ck_trips_available_seats_range", "trips", type_="check")
    op.drop_constraint("ck_trips_total_seats_positive", "trips", type_="check")

    with op.batch_alter_table("trips") as batch:
        batch.drop_constraint("fk_trips_vehicle", type_="foreignkey")
        batch.drop_constraint("fk_trips_destination_stop", type_="foreignkey")
        batch.drop_constraint("fk_trips_origin_stop", type_="foreignkey")
        batch.drop_column("created_at")
        batch.drop_column("status")
        batch.drop_column("arrival_time")
        batch.drop_column("vehicle_id")
        batch.drop_column("destination_stop_id")
        batch.drop_column("origin_stop_id")
