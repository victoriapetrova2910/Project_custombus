from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def _has(table: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table)


def upgrade() -> None:
    if not _has("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("full_name", sa.String(255), nullable=False),
            sa.Column("email", sa.String(255), nullable=True),
            sa.Column("phone", sa.String(32), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("email", name="uq_users_email"),
            sa.UniqueConstraint("phone", name="uq_users_phone"),
        )

    if not _has("stops"):
        op.create_table(
            "stops",
            sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=False),
            sa.Column("stop_code", sa.String(32), nullable=True),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("latitude", sa.Float(), nullable=False),
            sa.Column("longitude", sa.Float(), nullable=False),
            sa.Column("zone", sa.String(64), nullable=True),
            sa.Column("subzone", sa.String(255), nullable=True),
            sa.Column("service_active", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("is_drt_hub", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("transport_type", sa.String(64), nullable=True),
            sa.Column("has_pavilion", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("operating_org", sa.String(255), nullable=True),
            sa.Column("electrification", sa.String(64), nullable=True),
            sa.CheckConstraint("latitude BETWEEN -90 AND 90", name="ck_stops_latitude"),
            sa.CheckConstraint("longitude BETWEEN -180 AND 180", name="ck_stops_longitude"),
        )
        op.create_index("ix_stops_name", "stops", ["name"])
        op.create_index("ix_stops_stop_code", "stops", ["stop_code"])
        op.create_index("ix_stops_zone", "stops", ["zone"])
        op.create_index("ix_stops_service_active", "stops", ["service_active"])
        op.create_index("ix_stops_lat_lon", "stops", ["latitude", "longitude"])

    if not _has("vehicles"):
        op.create_table(
            "vehicles",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("plate_number", sa.String(16), nullable=False),
            sa.Column("model", sa.String(100), nullable=True),
            sa.Column("capacity", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(20), nullable=False, server_default="active"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("plate_number", name="uq_vehicles_plate_number"),
            sa.CheckConstraint("capacity > 0", name="ck_vehicles_capacity_positive"),
            sa.CheckConstraint(
                "status IN ('active', 'maintenance', 'inactive')", name="ck_vehicles_status"
            ),
        )

    
        op.create_table(
            "trips",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("departure_point", sa.String(255), nullable=False),
            sa.Column("destination_point", sa.String(255), nullable=False),
            sa.Column("departure_time", sa.DateTime(), nullable=False),
            sa.Column("total_seats", sa.Integer(), nullable=False),
            sa.Column("available_seats", sa.Integer(), nullable=False),
        )
        op.create_index("ix_trips_id", "trips", ["id"])

    if not _has("preorders"):
        op.create_table(
            "preorders",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("trip_id", sa.Integer(), sa.ForeignKey("trips.id"), nullable=True),
            sa.Column("departure_point", sa.String(255), nullable=False),
            sa.Column("destination_point", sa.String(255), nullable=False),
            sa.Column("departure_time", sa.DateTime(), nullable=False),
            sa.Column("seats_count", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(20), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_preorders_id", "preorders", ["id"])

    if not _has("payments"):
        op.create_table(
            "payments",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("preorder_id", sa.Integer(), sa.ForeignKey("preorders.id"), nullable=False),
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("status", sa.String(20), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_payments_id", "payments", ["id"])


def downgrade() -> None:
    op.drop_table("payments")
    op.drop_table("preorders")
    op.drop_table("trips")
    op.drop_table("vehicles")
    op.drop_table("stops")
    op.drop_table("users")
