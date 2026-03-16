import math
from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from fastapi import HTTPException

from db.models.formula import Formula
from core.pagination import PaginationParams


class FormulaService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_list(
        self,
        params: PaginationParams,
        q: Optional[str] = None,
        category: Optional[str] = None,
    ):
        stmt = select(Formula).where(Formula.is_published == True)
        count_stmt = select(func.count()).select_from(Formula).where(Formula.is_published == True)

        if q:
            pattern = f"%{q}%"
            cond = or_(Formula.name.ilike(pattern), Formula.description.ilike(pattern))
            stmt = stmt.where(cond)
            count_stmt = count_stmt.where(cond)
        if category:
            stmt = stmt.where(Formula.category == category)
            count_stmt = count_stmt.where(Formula.category == category)

        total = (await self.session.execute(count_stmt)).scalar() or 0
        stmt = stmt.order_by(Formula.name).offset(params.offset).limit(params.page_size)
        items = (await self.session.execute(stmt)).scalars().all()
        return list(items), total

    async def get_detail(self, formula_id: UUID) -> Formula:
        obj = await self.session.get(Formula, formula_id)
        if not obj:
            raise HTTPException(status_code=404, detail="公式不存在")
        return obj

    async def create(self, data: dict) -> Formula:
        obj = Formula(**{k: v for k, v in data.items() if hasattr(Formula, k)})
        obj.is_published = True
        self.session.add(obj)
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def update(self, formula_id: UUID, data: dict) -> Formula:
        obj = await self.get_detail(formula_id)
        for k, v in data.items():
            if hasattr(obj, k):
                setattr(obj, k, v)
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def delete(self, formula_id: UUID) -> None:
        obj = await self.get_detail(formula_id)
        await self.session.delete(obj)
        await self.session.commit()

    async def calculate(self, formula_id: UUID, inputs: dict) -> dict:
        """对常见公式执行服务端计算（前端也可自行计算）"""
        formula = await self.get_detail(formula_id)
        name_lower = formula.name.lower()

        try:
            result = _calculate_formula(name_lower, formula.name, inputs)
            # 匹配解读规则
            interpretation = ""
            level = ""
            color = "default"
            if result.get("value") is not None and formula.interpretation_rules:
                val = float(result["value"])
                for rule in formula.interpretation_rules:
                    lo = rule.get("min", float("-inf"))
                    hi = rule.get("max", float("inf"))
                    if lo <= val < hi or (hi == float("inf") and val >= lo):
                        interpretation = rule.get("interpretation", "")
                        level = rule.get("level", "")
                        color = rule.get("color", "default")
                        break
            result["interpretation"] = interpretation
            result["level"] = level
            result["color"] = color
            return result
        except (ValueError, ZeroDivisionError, KeyError) as e:
            raise HTTPException(status_code=422, detail=f"计算失败：{e}")


def _calculate_formula(name_lower: str, name: str, inputs: dict) -> dict:
    """根据公式名称计算结果"""
    def f(key):
        v = inputs.get(key)
        if v is None or v == "":
            raise ValueError(f"缺少参数：{key}")
        return float(v)

    # BMI
    if "bmi" in name_lower:
        weight = f("weight")
        height_cm = f("height")
        height_m = height_cm / 100
        bmi = weight / (height_m ** 2)
        return {"value": round(bmi, 1), "unit": "kg/m²"}

    # eGFR (CKD-EPI)
    if "egfr" in name_lower or "gfr" in name_lower:
        scr = f("scr")       # 血肌酐 mg/dL
        age = f("age")
        sex = inputs.get("sex", "male")
        kappa = 0.7 if sex == "female" else 0.9
        alpha = -0.241 if sex == "female" else -0.302
        sex_factor = 1.012 if sex == "female" else 1.0
        ratio = scr / kappa
        if ratio < 1:
            egfr = 142 * (ratio ** alpha) * (0.9938 ** age) * sex_factor
        else:
            egfr = 142 * (ratio ** -1.200) * (0.9938 ** age) * sex_factor
        return {"value": round(egfr, 1), "unit": "mL/min/1.73m²"}

    # 体表面积 BSA (Mosteller)
    if "体表面积" in name_lower or "bsa" in name_lower:
        weight = f("weight")
        height = f("height")
        bsa = math.sqrt((height * weight) / 3600)
        return {"value": round(bsa, 2), "unit": "m²"}

    # MELD评分
    if "meld" in name_lower:
        creatinine = f("creatinine")
        bilirubin  = f("bilirubin")
        inr        = f("inr")
        creatinine = min(creatinine, 4.0)
        creatinine = max(creatinine, 1.0)
        bilirubin  = max(bilirubin, 1.0)
        inr        = max(inr, 1.0)
        meld = round(9.57 * math.log(creatinine) + 3.78 * math.log(bilirubin) + 11.2 * math.log(inr) + 6.43)
        return {"value": meld, "unit": "分"}

    # Cockcroft-Gault 肌酐清除率
    if "cockcroft" in name_lower or "肌酐清除率" in name_lower:
        age     = f("age")
        weight  = f("weight")
        scr     = f("scr")
        sex     = inputs.get("sex", "male")
        ccr = ((140 - age) * weight) / (72 * scr)
        if sex == "female":
            ccr *= 0.85
        return {"value": round(ccr, 1), "unit": "mL/min"}

    # 平均动脉压 MAP
    if "平均动脉压" in name_lower or "map" in name_lower:
        sbp = f("sbp")
        dbp = f("dbp")
        map_val = dbp + (sbp - dbp) / 3
        return {"value": round(map_val, 1), "unit": "mmHg"}

    # 校正QT间期 QTc (Bazett)
    if "qtc" in name_lower or "qt" in name_lower:
        qt  = f("qt")    # ms
        rr  = f("rr")    # ms
        qtc = qt / math.sqrt(rr / 1000)
        return {"value": round(qtc, 0), "unit": "ms"}

    # Anion Gap 阴离子间隙
    if "阴离子间隙" in name_lower or "anion gap" in name_lower:
        na = f("na")
        cl = f("cl")
        hco3 = f("hco3")
        ag = na - cl - hco3
        return {"value": round(ag, 1), "unit": "mEq/L"}

    # 渗透压 Osm
    if "渗透压" in name_lower or "osmolality" in name_lower:
        na   = f("na")
        gluc = f("glucose")
        bun  = f("bun")
        osm  = 2 * na + gluc / 18 + bun / 2.8
        return {"value": round(osm, 1), "unit": "mOsm/kg"}

    # 理想体重 IBW
    if "理想体重" in name_lower or "ibw" in name_lower:
        height = f("height")
        sex    = inputs.get("sex", "male")
        if sex == "male":
            ibw = 50 + 0.91 * (height - 152.4)
        else:
            ibw = 45.5 + 0.91 * (height - 152.4)
        return {"value": round(max(ibw, 0), 1), "unit": "kg"}

    raise ValueError(f"暂不支持自动计算公式：{name}，请手动套用公式表达式")
