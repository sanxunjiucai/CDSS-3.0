import asyncio
from db.database import engine, Base
from db.models import Literature

async def create_table():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, tables=[Literature.__table__])
    print("Literature table created successfully")

if __name__ == "__main__":
    asyncio.run(create_table())
