"""Alembic environment configuration."""

import asyncio
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# Add project root to Python path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.core.config import settings
from src.core.database import Base

# Import all models so Alembic can detect them
from src.models.user import User
from src.models.resume import Resume
from src.models.interview import Interview
from src.models.problem import Problem
from src.models.message import Message
from src.models.code_snapshot import CodeSnapshot
from src.models.code_submission import CodeSubmission
from src.models.ai_evaluation import AIEvaluation
from src.models.session_event import SessionEvent


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def get_database_url() -> str:
    """Return SQLAlchemy async database URL."""
    database_url = settings.DATABASE_URL

    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Neon normal URLs often use sslmode/channel_binding.
    # asyncpg expects ssl=require instead.
    database_url = database_url.replace("sslmode=require", "ssl=require")
    database_url = database_url.replace("&channel_binding=require", "")
    database_url = database_url.replace("?channel_binding=require", "")

    return database_url


config.set_main_option("sqlalchemy.url", get_database_url())

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in offline mode."""
    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations with an active connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run async migrations."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in online mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()