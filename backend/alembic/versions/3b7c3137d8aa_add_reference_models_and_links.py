"""add reference models and links

Revision ID: 3b7c3137d8aa
Revises: 8f464019c18f
Create Date: 2026-04-28 15:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3b7c3137d8aa"
down_revision: Union[str, None] = "8f464019c18f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


roles_table = sa.table(
    "roles",
    sa.column("id", sa.SmallInteger()),
    sa.column("name", sa.String()),
    sa.column("description", sa.Text()),
)

material_statuses_table = sa.table(
    "material_statuses",
    sa.column("id", sa.SmallInteger()),
    sa.column("name", sa.String()),
    sa.column("description", sa.Text()),
)

mime_types_table = sa.table(
    "mime_types",
    sa.column("id", sa.SmallInteger()),
    sa.column("name", sa.String()),
    sa.column("extension", sa.String()),
    sa.column("description", sa.Text()),
)


def _reset_sequence(table_name: str) -> None:
    op.execute(
        sa.text(
            f"""
            SELECT setval(
                pg_get_serial_sequence('{table_name}', 'id'),
                COALESCE((SELECT MAX(id) FROM {table_name}), 1)
            )
            """
        )
    )


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "roles",
        sa.Column("id", sa.SmallInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "material_statuses",
        sa.Column("id", sa.SmallInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "mime_types",
        sa.Column("id", sa.SmallInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("extension", sa.String(length=20), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.UniqueConstraint("name"),
    )

    op.bulk_insert(
        roles_table,
        [
            {
                "id": 1,
                "name": "student",
                "description": "Базовая роль обучающегося с доступом к материалам.",
            },
            {
                "id": 2,
                "name": "moderator",
                "description": "Модератор, который проверяет и публикует материалы.",
            },
            {
                "id": 3,
                "name": "admin",
                "description": "Администратор системы с полным доступом.",
            },
        ],
    )
    op.bulk_insert(
        material_statuses_table,
        [
            {"id": 1, "name": "draft", "description": "Черновик материала."},
            {"id": 2, "name": "pending", "description": "Материал ожидает модерации."},
            {"id": 3, "name": "published", "description": "Материал опубликован."},
            {"id": 4, "name": "rejected", "description": "Материал отклонён."},
            {"id": 5, "name": "archived", "description": "Материал архивирован."},
        ],
    )
    op.bulk_insert(
        mime_types_table,
        [
            {
                "id": 1,
                "name": "application/octet-stream",
                "extension": None,
                "description": "Фолбэк-тип для старых записей без MIME.",
            },
            {
                "id": 2,
                "name": "application/pdf",
                "extension": ".pdf",
                "description": "PDF-документ.",
            },
            {
                "id": 3,
                "name": "application/msword",
                "extension": ".doc",
                "description": "Документ Microsoft Word.",
            },
            {
                "id": 4,
                "name": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "extension": ".docx",
                "description": "Документ Microsoft Word Open XML.",
            },
            {
                "id": 5,
                "name": "application/vnd.ms-powerpoint",
                "extension": ".ppt",
                "description": "Презентация Microsoft PowerPoint.",
            },
            {
                "id": 6,
                "name": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "extension": ".pptx",
                "description": "Презентация Microsoft PowerPoint Open XML.",
            },
        ],
    )

    _reset_sequence("roles")
    _reset_sequence("material_statuses")
    _reset_sequence("mime_types")

    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("last_name", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("first_name", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("middle_name", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("role_id", sa.SmallInteger(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=True,
                server_default=sa.text("now()"),
            )
        )

    op.execute(
        """
        UPDATE users
        SET
            last_name = COALESCE(NULLIF(split_part(trim(COALESCE(full_name, '')), ' ', 1), ''), username),
            first_name = COALESCE(NULLIF(split_part(trim(COALESCE(full_name, '')), ' ', 2), ''), username),
            middle_name = NULLIF(split_part(trim(COALESCE(full_name, '')), ' ', 3), ''),
            updated_at = COALESCE(updated_at, created_at)
        """
    )
    op.execute(
        """
        UPDATE users u
        SET role_id = r.id
        FROM roles r
        WHERE r.name = u.role::text
        """
    )
    op.execute("UPDATE users SET role_id = 1 WHERE role_id IS NULL")

    with op.batch_alter_table("users") as batch_op:
        batch_op.create_foreign_key("users_role_id_fkey", "roles", ["role_id"], ["id"])
        batch_op.alter_column("last_name", existing_type=sa.String(length=255), nullable=False)
        batch_op.alter_column("first_name", existing_type=sa.String(length=255), nullable=False)
        batch_op.alter_column("role_id", existing_type=sa.SmallInteger(), nullable=False)
        batch_op.drop_column("full_name")
        batch_op.drop_column("role")

    with op.batch_alter_table("subjects") as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_active",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("true"),
            )
        )

    with op.batch_alter_table("comments") as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_deleted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            )
        )
        batch_op.alter_column(
            "updated_at",
            existing_type=sa.DateTime(timezone=True),
            nullable=True,
        )

    with op.batch_alter_table("materials") as batch_op:
        batch_op.add_column(sa.Column("mime_type_id", sa.SmallInteger(), nullable=True))
        batch_op.add_column(sa.Column("status_id", sa.SmallInteger(), nullable=True))
        batch_op.alter_column(
            "updated_at",
            existing_type=sa.DateTime(timezone=True),
            nullable=True,
        )

    op.execute(
        """
        INSERT INTO mime_types (name)
        SELECT DISTINCT m.mime_type
        FROM materials m
        WHERE m.mime_type IS NOT NULL
          AND btrim(m.mime_type) <> ''
          AND NOT EXISTS (
              SELECT 1
              FROM mime_types mt
              WHERE mt.name = m.mime_type
          )
        """
    )
    _reset_sequence("mime_types")

    op.execute(
        """
        UPDATE materials m
        SET mime_type_id = mt.id
        FROM mime_types mt
        WHERE mt.name = m.mime_type
          AND m.mime_type_id IS NULL
        """
    )
    op.execute("UPDATE materials SET mime_type_id = 1 WHERE mime_type_id IS NULL")
    op.execute(
        """
        UPDATE materials m
        SET status_id = ms.id
        FROM material_statuses ms
        WHERE ms.name = m.status::text
          AND m.status_id IS NULL
        """
    )
    op.execute("UPDATE materials SET status_id = 2 WHERE status_id IS NULL")

    op.execute(
        """
        INSERT INTO material_types (name)
        SELECT 'Не указан'
        WHERE NOT EXISTS (
            SELECT 1
            FROM material_types
            WHERE name = 'Не указан'
        )
        """
    )
    op.execute(
        """
        UPDATE materials
        SET material_type_id = (
            SELECT id
            FROM material_types
            WHERE name = 'Не указан'
            LIMIT 1
        )
        WHERE material_type_id IS NULL
        """
    )
    op.execute("UPDATE materials SET file_size = 0 WHERE file_size IS NULL")
    op.execute(
        """
        UPDATE materials m
        SET course_id = u.course_id
        FROM users u
        WHERE m.author_id = u.id
          AND m.course_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE materials m
        SET program_id = u.program_id
        FROM users u
        WHERE m.author_id = u.id
          AND m.program_id IS NULL
        """
    )

    with op.batch_alter_table("materials") as batch_op:
        batch_op.create_foreign_key(
            "materials_mime_type_id_fkey",
            "mime_types",
            ["mime_type_id"],
            ["id"],
        )
        batch_op.create_foreign_key(
            "materials_status_id_fkey",
            "material_statuses",
            ["status_id"],
            ["id"],
        )
        batch_op.alter_column("material_type_id", existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column("course_id", existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column("program_id", existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column("file_size", existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column("mime_type_id", existing_type=sa.SmallInteger(), nullable=False)
        batch_op.alter_column("status_id", existing_type=sa.SmallInteger(), nullable=False)
        batch_op.drop_column("mime_type")
        batch_op.drop_column("status")

    op.drop_table("ratings")
    op.execute("DROP TYPE IF EXISTS user_role")
    op.execute("DROP TYPE IF EXISTS material_status")


def downgrade() -> None:
    """Downgrade schema."""
    user_role_enum = sa.Enum(
        "student",
        "moderator",
        "admin",
        name="user_role",
    )
    material_status_enum = sa.Enum(
        "draft",
        "pending",
        "published",
        "rejected",
        "archived",
        name="material_status",
    )

    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)
    material_status_enum.create(bind, checkfirst=True)

    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("full_name", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("role", user_role_enum, nullable=True))

    op.execute(
        """
        UPDATE users u
        SET
            full_name = concat_ws(' ', u.last_name, u.first_name, u.middle_name),
            role = r.name::user_role
        FROM roles r
        WHERE r.id = u.role_id
        """
    )
    op.execute("UPDATE users SET role = 'student'::user_role WHERE role IS NULL")

    with op.batch_alter_table("materials") as batch_op:
        batch_op.add_column(sa.Column("mime_type", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("status", material_status_enum, nullable=True))

    op.execute(
        """
        UPDATE materials m
        SET
            mime_type = mt.name,
            status = ms.name::material_status
        FROM mime_types mt, material_statuses ms
        WHERE mt.id = m.mime_type_id
          AND ms.id = m.status_id
        """
    )
    op.execute("UPDATE materials SET status = 'pending'::material_status WHERE status IS NULL")

    with op.batch_alter_table("materials") as batch_op:
        batch_op.drop_constraint("materials_status_id_fkey", type_="foreignkey")
        batch_op.drop_constraint("materials_mime_type_id_fkey", type_="foreignkey")
        batch_op.drop_column("status_id")
        batch_op.drop_column("mime_type_id")
        batch_op.alter_column("updated_at", existing_type=sa.DateTime(timezone=True), nullable=False)

    with op.batch_alter_table("comments") as batch_op:
        batch_op.drop_column("is_deleted")
        batch_op.alter_column("updated_at", existing_type=sa.DateTime(timezone=True), nullable=False)

    with op.batch_alter_table("subjects") as batch_op:
        batch_op.drop_column("is_active")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("users_role_id_fkey", type_="foreignkey")
        batch_op.drop_column("updated_at")
        batch_op.drop_column("role_id")
        batch_op.drop_column("middle_name")
        batch_op.drop_column("first_name")
        batch_op.drop_column("last_name")
        batch_op.alter_column("role", existing_type=user_role_enum, nullable=False)

    op.create_table(
        "ratings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("material_id", sa.Integer(), nullable=False),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["material_id"], ["materials.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "material_id", name="uq_user_material_rating"),
    )

    op.drop_table("mime_types")
    op.drop_table("material_statuses")
    op.drop_table("roles")
