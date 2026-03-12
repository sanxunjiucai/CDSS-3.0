from celery import Celery
from config import settings

celery_app = Celery(
    "cdss",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["tasks.import_task"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Shanghai",
    enable_utc=True,
)
