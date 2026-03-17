"""
规则引擎执行器
根据数据库中的规则配置，动态执行条件判断
"""
from typing import List, Dict, Any


def execute_rule_condition(condition: dict, context: dict) -> bool:
    """
    执行规则条件判断

    condition 结构：
    {
        "all": [{"op": "contains_any", "field": "diagnoses", "values": ["心肌梗死"]}],
        "any": [{"op": "contains_any", "field": "drug_names", "values": ["布洛芬"]}],
        "not": []
    }

    context 结构：
    {
        "diagnoses": ["急性心肌梗死"],
        "drug_names": ["布洛芬"],
        "exam_names": ["心电图"],
        "patient_allergies": ["青霉素"],
        "lab_results": [...]
    }
    """
    if not condition or not isinstance(condition, dict):
        return False

    # all: 所有条件必须满足
    all_conditions = condition.get("all", [])
    if all_conditions:
        if not all(_check_condition(cond, context) for cond in all_conditions):
            return False

    # any: 至少一个条件满足
    any_conditions = condition.get("any", [])
    if any_conditions:
        if not any(_check_condition(cond, context) for cond in any_conditions):
            return False

    # not: 所有条件都不能满足
    not_conditions = condition.get("not", [])
    if not_conditions:
        if any(_check_condition(cond, context) for cond in not_conditions):
            return False

    return True


def _check_condition(cond: dict, context: dict) -> bool:
    """检查单个条件"""
    op = cond.get("op")
    field = cond.get("field")

    if not op or not field:
        return False

    field_value = context.get(field, [])

    # contains_any: 字段值包含任意一个目标值
    if op == "contains_any":
        values = cond.get("values", [])
        if isinstance(field_value, list):
            return any(
                any(v in item for v in values)
                for item in field_value
            )
        return any(v in str(field_value) for v in values)

    # contains_all: 字段值包含所有目标值
    if op == "contains_all":
        values = cond.get("values", [])
        if isinstance(field_value, list):
            return all(
                any(v in item for item in field_value)
                for v in values
            )
        return all(v in str(field_value) for v in values)

    # not_contains_any: 字段值不包含任意目标值
    if op == "not_contains_any":
        values = cond.get("values", [])
        if isinstance(field_value, list):
            return not any(
                any(v in item for v in values)
                for item in field_value
            )
        return not any(v in str(field_value) for v in values)

    # equals: 字段值等于目标值
    if op == "equals":
        value = cond.get("value")
        return str(field_value) == str(value)

    # in: 字段值在目标集合中
    if op == "in":
        values = cond.get("values", [])
        return str(field_value) in [str(v) for v in values]

    # 检验相关操作
    if op.startswith("lab_"):
        return _check_lab_condition(op, cond, context)

    return False


def _check_lab_condition(op: str, cond: dict, context: dict) -> bool:
    """检查检验相关条件"""
    item_code = cond.get("item_code")
    if not item_code:
        return False

    lab_results = context.get("lab_results", [])
    target_lab = None

    for lab in lab_results:
        if lab.get("item_code") == item_code:
            target_lab = lab
            break

    if not target_lab:
        return False

    # lab_is_abnormal: 检验是否异常
    if op == "lab_is_abnormal":
        expected = cond.get("value", True)
        return target_lab.get("is_abnormal") == expected

    # lab_value_ge: 检验值 >=
    if op == "lab_value_ge":
        threshold = float(cond.get("value", 0))
        value = float(target_lab.get("value", 0))
        return value >= threshold

    # lab_value_le: 检验值 <=
    if op == "lab_value_le":
        threshold = float(cond.get("value", 0))
        value = float(target_lab.get("value", 0))
        return value <= threshold

    return False
