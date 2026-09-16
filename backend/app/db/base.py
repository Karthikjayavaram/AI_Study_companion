# Import all models here so Alembic detects them automatically
from app.db.session import Base  # noqa
from app.models.user import User  # noqa
from app.models.space import Space  # noqa
from app.models.project import Project  # noqa
from app.models.material import Material, MaterialChunk  # noqa
from app.models.conversation import Conversation, Message  # noqa
from app.models.concept import Concept, ConceptMastery  # noqa
from app.models.assessment import Quiz, Question, QuizAttempt, Assessment  # noqa
from app.models.recommendation import Recommendation  # noqa
from app.models.activity import ActivityEvent  # noqa
from app.models.ai_usage import AIUsage  # noqa
