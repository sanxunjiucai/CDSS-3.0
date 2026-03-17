from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from api.v1 import auth, search, disease, drug, exam, guideline, formula, assessment, stats, literature, config, sanji
from api.v1 import diagnosis, treatment, lab_result, audit, patient, exam_recommend
from api.v1.admin import knowledge, config as admin_config, account, stats as admin_stats, audit_rule
from api.middleware import LoggingMiddleware
from db.database import init_db
from db.elasticsearch.indices import init_es_indices
from db.seed import auto_seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化
    await init_db()
    await init_es_indices()
    await auto_seed()
    yield
    # 关闭时清理（如有需要）


app = FastAPI(
    title="CDSS 3.0 - 临床辅助决策系统",
    description="Clinical Decision Support System API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.debug else ["https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(LoggingMiddleware)

# ── 路由注册 ───────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth.router,        prefix=API_PREFIX, tags=["认证"])
app.include_router(search.router,      prefix=API_PREFIX, tags=["全局检索"])
app.include_router(stats.router,       prefix=API_PREFIX, tags=["统计"])
app.include_router(disease.router,     prefix=API_PREFIX, tags=["疾病知识"])
app.include_router(drug.router,        prefix=API_PREFIX, tags=["药品知识"])
app.include_router(exam.router,        prefix=API_PREFIX, tags=["检验检查"])
app.include_router(guideline.router,   prefix=API_PREFIX, tags=["临床指南"])
app.include_router(literature.router,  prefix=API_PREFIX, tags=["文献知识"])
app.include_router(sanji.router,       prefix=API_PREFIX, tags=["三基知识"])
app.include_router(formula.router,     prefix=API_PREFIX, tags=["医学公式"])
app.include_router(assessment.router,  prefix=API_PREFIX, tags=["评估量表"])
app.include_router(diagnosis.router,   prefix=API_PREFIX, tags=["辅助诊断"])
app.include_router(treatment.router,   prefix=API_PREFIX, tags=["治疗方案"])
app.include_router(lab_result.router,      prefix=API_PREFIX, tags=["检验结果解读"])
app.include_router(exam_recommend.router,  prefix=API_PREFIX, tags=["检验推荐"])
app.include_router(audit.router,           prefix=API_PREFIX, tags=["诊断审核/预警"])
app.include_router(patient.router,     prefix=API_PREFIX, tags=["患者上下文"])
app.include_router(config.router,      prefix=API_PREFIX, tags=["系统配置"])

# 管理端路由（需要管理员权限）
ADMIN_PREFIX = "/api/v1/admin"
app.include_router(knowledge.router,    prefix=ADMIN_PREFIX, tags=["管理-知识库"])
app.include_router(admin_config.router, prefix=ADMIN_PREFIX, tags=["管理-配置"])
app.include_router(account.router,      prefix=ADMIN_PREFIX, tags=["管理-账号"])
app.include_router(admin_stats.router,  prefix=ADMIN_PREFIX, tags=["管理-统计"])
app.include_router(audit_rule.router,   prefix=ADMIN_PREFIX, tags=["管理-规则"])


@app.get("/api/health", tags=["健康检查"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
