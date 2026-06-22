# Import all the models, so that Base has them before being
# imported by Alembic or database initialization scripts.
from app.db.base_class import Base  # noqa
from app.models.models import User, Document, ChatSession, ChatMessage  # noqa
