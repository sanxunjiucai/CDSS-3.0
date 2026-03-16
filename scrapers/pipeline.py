"""
知识库爬取总流水线

用法：
  python pipeline.py              # 运行所有爬虫
  python pipeline.py --disease    # 只运行疾病爬虫
  python pipeline.py --drug       # 只运行药品爬虫（杏林医学西药 + 维基百科补充 + 中成药/中药饮片）
  python pipeline.py --exam       # 只运行检验检查爬虫（实验室 + 影像/功能/内镜）
  python pipeline.py --guideline  # 只运行临床指南爬虫（医脉通 + NHC官网）
  python pipeline.py --literature # 只运行文献爬虫（PubMed 动态文献库 + 案例文献库）
  python pipeline.py --builtin    # 只写出内置数据（量表、公式、三基、影像检查、核心指南48条）
  python pipeline.py --sanji      # 只写出三基知识库
  python pipeline.py --status     # 查看当前进度

输出目录：scrapers/data/processed/
  diseases.json           —— 疾病知识库
  drugs.json              —— 药品知识库（西药 + 维基百科补充 + 中成药 + 中药饮片）
  exams.json              —— 检验检查知识库（实验室 + 影像/功能/内镜）
  guidelines.json         —— 临床指南知识库（医脉通 + NHC官网 + 内置48条核心指南）
  literature_dynamic.json —— 动态文献库（PubMed 系统评价/Meta分析/指南，中国作者）
  literature_cases.json   —— 案例文献库（PubMed 病例报告，中国作者）
  assessments.json        —— 量表库（内置，22条）
  formulas.json           —— 医学公式库（内置，88条）
  sanji.json              —— 三基知识库（内置，62条：临床医学+护理+影像检验）
"""

import argparse
import json
import sys
from pathlib import Path

from loguru import logger
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
console = Console()

PROCESSED_DIR = Path(__file__).parent / "data" / "processed"
CHECKPOINT_DIR = Path(__file__).parent / "data" / "checkpoints"


def run_disease():
    console.print(Panel("[bold cyan]疾病知识库爬取[/bold cyan] 来源：默沙东诊疗手册中文专业版"))
    from disease_scraper import DiseaseScraper
    scraper = DiseaseScraper()
    result = scraper.run()
    console.print(f"[green]✅ 疾病知识库完成：{len(result)} 条[/green]")
    return result


def run_drug():
    console.print(Panel(
        "[bold cyan]药品知识库爬取[/bold cyan] "
        "来源：杏林医学 (a-hospital.com) 西药 + 维基百科补充 + 中成药/中药饮片"
    ))

    # 1) 杏林医学西药
    from drug_scraper_ahospital import DrugScraperAhospital
    scraper = DrugScraperAhospital()
    result = scraper.run()
    console.print(f"[green][OK] 杏林医学西药完成：{len(result)} 条[/green]")

    # 2) 维基百科补充现代新药（SGLT-2抑制剂、GLP-1激动剂、生物制剂等）
    console.print("[cyan]>> 维基百科补充现代新药...[/cyan]")
    from drug_supplement_wiki import DrugWikiScraper
    wiki_scraper = DrugWikiScraper()
    result = wiki_scraper.run()
    console.print(f"[green][OK] 西药知识库合并完成：{len(result)} 条[/green]")

    # 3) 中成药 + 中药饮片（补充中药知识库）
    console.print("[cyan]>> 爬取中成药 + 中药饮片...[/cyan]")
    from drug_scraper_tcm import DrugScraperTCM
    tcm_scraper = DrugScraperTCM()
    result = tcm_scraper.run()
    console.print(f"[green][OK] 药品知识库（含中成药/中药饮片）完成：{len(result)} 条[/green]")
    return result


def run_guideline():
    console.print(Panel(
        "[bold cyan]临床指南知识库爬取[/bold cyan] "
        "来源：医脉通 (guide.medlive.cn) + NHC官网 + 内置48条核心指南"
    ))

    # 1) 内置核心指南（无需网络，优先写入）
    _write_core_guidelines()

    # 2) 医脉通爬虫
    from guideline_scraper import GuidelineScraper
    scraper = GuidelineScraper(max_pages=300)
    result = scraper.run()
    console.print(f"[green][OK] 医脉通指南完成：{len(result)} 条[/green]")

    # 3) NHC官网（国家卫生健康委员会）
    console.print("[cyan]>> NHC官网临床诊疗规范...[/cyan]")
    from guideline_scraper_nhc import NHCGuidelineScraper
    nhc_scraper = NHCGuidelineScraper()
    nhc_result = nhc_scraper.run()
    console.print(f"[green][OK] NHC指南完成：{len(nhc_result)} 条[/green]")

    # 读取最终合并结果
    guidelines_path = PROCESSED_DIR / "guidelines.json"
    final = json.loads(guidelines_path.read_text(encoding="utf-8")) if guidelines_path.exists() else []
    console.print(f"[green]✅ 临床指南知识库合并完成：{len(final)} 条[/green]")
    return final


def run_literature():
    console.print(Panel(
        "[bold cyan]文献知识库爬取[/bold cyan] "
        "来源：PubMed E-utilities API（免费）\n"
        "动态文献库：系统评价/Meta分析/指南，中国作者，近3年\n"
        "案例文献库：病例报告，中国作者，近2年"
    ))
    from literature_scraper_pubmed import PubmedLiteratureScraper
    scraper = PubmedLiteratureScraper()
    result = scraper.run()
    console.print(f"[green]✅ 动态文献库：{result['dynamic']} 条 → literature_dynamic.json[/green]")
    console.print(f"[green]✅ 案例文献库：{result['cases']} 条 → literature_cases.json[/green]")
    return result


def _write_core_guidelines():
    """将内置核心指南并入 guidelines.json"""
    from guideline_core_data import CORE_GUIDELINES

    guidelines_path = PROCESSED_DIR / "guidelines.json"
    existing = []
    if guidelines_path.exists():
        with open(guidelines_path, encoding="utf-8") as f:
            existing = json.load(f)

    existing_titles = {g.get("title", "") for g in existing}
    added = 0
    for g in CORE_GUIDELINES:
        if g["title"] not in existing_titles:
            existing.append(g)
            existing_titles.add(g["title"])
            added += 1

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    with open(guidelines_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    console.print(f"[green]✅ 内置核心指南写入完成：新增 {added} 条，总计 {len(existing)} 条[/green]")


def run_exam():
    console.print(Panel("[bold cyan]检验检查知识库爬取[/bold cyan] 来源：MSD参考值 + 卫健委标准"))
    from exam_scraper import ExamScraper
    scraper = ExamScraper()
    result = scraper.run()
    console.print(f"[green]✅ 检验检查知识库完成：{len(result)} 条[/green]")
    return result


def run_builtin():
    console.print(Panel(
        "[bold cyan]内置数据写出[/bold cyan] "
        "量表库 + 医学公式库 + 三基知识库 + 影像检查库 + 核心指南"
    ))

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    # 量表库
    from assessment_data import ASSESSMENTS
    output = PROCESSED_DIR / "assessments.json"
    with open(output, "w", encoding="utf-8") as f:
        json.dump(ASSESSMENTS, f, ensure_ascii=False, indent=2)
    console.print(f"[green]✅ 量表库完成：{len(ASSESSMENTS)} 条 → {output}[/green]")

    # 医学公式库
    from formula_data import FORMULAS
    output2 = PROCESSED_DIR / "formulas.json"
    with open(output2, "w", encoding="utf-8") as f:
        json.dump(FORMULAS, f, ensure_ascii=False, indent=2)
    console.print(f"[green]✅ 医学公式库完成：{len(FORMULAS)} 条 → {output2}[/green]")

    # 三基知识库
    run_sanji()

    # 影像/功能/内镜检查（内置数据写入 exams.json）
    _write_imaging_exams()

    # 内置核心指南（写入 guidelines.json）
    _write_core_guidelines()


def run_sanji():
    from sanji_data import SANJI
    output = PROCESSED_DIR / "sanji.json"
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        json.dump(SANJI, f, ensure_ascii=False, indent=2)
    console.print(f"[green]✅ 三基知识库完成：{len(SANJI)} 条 → {output}[/green]")
    return SANJI


def _write_imaging_exams():
    """将影像/功能/内镜检查内置数据并入 exams.json"""
    from imaging_exam_data import IMAGING_EXAMS

    exams_path = PROCESSED_DIR / "exams.json"
    existing = []
    if exams_path.exists():
        with open(exams_path, encoding="utf-8") as f:
            existing = json.load(f)

    existing_names = {e.get("name", "") for e in existing}
    added = 0
    for exam in IMAGING_EXAMS:
        if exam["name"] not in existing_names:
            existing.append(exam)
            existing_names.add(exam["name"])
            added += 1

    with open(exams_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    console.print(f"[green]✅ 影像/功能/内镜检查写入完成：新增 {added} 条，总计 {len(existing)} 条 → {exams_path}[/green]")


def show_status():
    """显示所有知识库的当前数据量"""
    table = Table(title="知识库数据状态", show_header=True)
    table.add_column("知识库", style="cyan")
    table.add_column("文件", style="dim")
    table.add_column("数据量", justify="right", style="green")
    table.add_column("状态")

    files = [
        ("疾病知识库", "diseases.json"),
        ("药品知识库", "drugs.json"),
        ("检验检查知识库", "exams.json"),
        ("临床指南知识库", "guidelines.json"),
        ("动态文献库", "literature_dynamic.json"),
        ("案例文献库", "literature_cases.json"),
        ("量表库", "assessments.json"),
        ("医学公式库", "formulas.json"),
        ("三基知识库", "sanji.json"),
    ]

    for name, filename in files:
        path = PROCESSED_DIR / filename
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            count = len(data)
            status = "[green]✅ 已完成[/green]"
        else:
            count = 0
            status = "[yellow]⏳ 待爬取[/yellow]"
        table.add_row(name, filename, str(count), status)

    # 断点进度
    console.print(table)

    # 显示爬取进度
    if CHECKPOINT_DIR.exists():
        console.print("\n[bold]断点进度：[/bold]")
        for cp_file in CHECKPOINT_DIR.glob("*_checkpoint.json"):
            cp = json.loads(cp_file.read_text(encoding="utf-8"))
            done = len(cp.get("done", []))
            failed = len(cp.get("failed", []))
            console.print(f"  {cp_file.stem}: 已完成 {done} 条，失败 {failed} 条")


def main():
    parser = argparse.ArgumentParser(description="CDSS 3.0 知识库爬取流水线")
    parser.add_argument("--disease", action="store_true", help="爬取疾病知识库")
    parser.add_argument("--drug", action="store_true", help="爬取药品知识库（杏林医学+维基百科补充+中成药/中药饮片）")
    parser.add_argument("--exam", action="store_true", help="爬取检验检查知识库（实验室+影像内置数据）")
    parser.add_argument("--guideline", action="store_true", help="爬取临床指南知识库（医脉通+NHC官网）")
    parser.add_argument("--literature", action="store_true", help="爬取文献知识库（PubMed动态文献+案例文献）")
    parser.add_argument("--builtin", action="store_true", help="写出所有内置数据（量表+公式+三基+影像）")
    parser.add_argument("--sanji", action="store_true", help="写出三基知识库")
    parser.add_argument("--status", action="store_true", help="查看当前进度")
    parser.add_argument("--all", action="store_true", help="运行所有爬虫（默认）")
    args = parser.parse_args()

    # 无参数 → 运行全部
    run_all = args.all or not any([args.disease, args.drug, args.exam,
                                   args.guideline, args.literature,
                                   args.builtin, args.sanji, args.status])

    if args.status:
        show_status()
        return

    console.print(Panel("[bold]CDSS 3.0 知识库爬取流水线[/bold]", subtitle="v1.0"))

    results = {}

    try:
        if run_all or args.builtin:
            run_builtin()

        if args.sanji and not run_all and not args.builtin:
            run_sanji()

        if run_all or args.exam:
            results["exams"] = run_exam()

        if run_all or args.disease:
            results["diseases"] = run_disease()

        if run_all or args.drug:
            results["drugs"] = run_drug()

        if run_all or args.guideline:
            results["guidelines"] = run_guideline()

        if run_all or args.literature:
            results["literature"] = run_literature()

    except KeyboardInterrupt:
        console.print("\n[yellow]⚠️  爬取中断，断点已保存，下次运行将从断点恢复[/yellow]")
        sys.exit(0)
    except Exception as e:
        logger.exception(f"爬取失败：{e}")
        sys.exit(1)

    # 最终汇总
    console.print("\n")
    show_status()


if __name__ == "__main__":
    main()
