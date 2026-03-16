"""重置 admin 密码"""
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from db.database import AsyncSessionLocal
from db.repositories.user_repo import UserRepository
from core.security import get_password_hash, verify_password


async def reset():
    async with AsyncSessionLocal() as session:
        new_hash = get_password_hash("admin123")
        await session.execute(
            text("UPDATE users SET hashed_password = :h WHERE username = 'admin'"),
            {"h": new_hash},
        )
        await session.commit()
        print("密码已重置为 admin123")

        repo = UserRepository(session)
        user = await repo.get_by_username("admin")
        ok = verify_password("admin123", user.hashed_password)
        print(f"验证结果: {ok}")


asyncio.run(reset())
