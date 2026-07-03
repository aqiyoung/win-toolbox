#!/usr/bin/env python3
"""PDF text/table extraction"""

import sys, os, json, csv, io
from pathlib import Path

def _send(obj):
    print(json.dumps(obj, ensure_ascii=False), flush=True)

def main():
    try:
        payload = json.loads(sys.stdin.read())
        inputs = payload["inputs"]
        options = payload.get("options", {})
        if not inputs:
            _send({"type": "error", "message": "无输入文件"})
            return

        pdf_path = inputs[0]
        mode = options.get("extract_mode", "text")
        fmt = options.get("format", "txt")
        output_dir = options.get("output_dir") or os.path.dirname(pdf_path)
        os.makedirs(output_dir, exist_ok=True)

        try:
            import fitz
        except ImportError:
            _send({"type": "error", "message": "缺少 PyMuPDF"})
            return

        doc = fitz.open(pdf_path)
        out_name = f"{Path(pdf_path).stem}_extract.{fmt}"
        out_path = os.path.join(output_dir, out_name)
        _send({"type": "progress", "percent": 10, "stage": "正在读取 PDF..."})

        if mode == "text":
            text_parts = []
            for i, page in enumerate(doc):
                text_parts.append(page.get_text())
                _send({"type": "progress", "percent": int(10 + (i+1)/len(doc)*80),
                       "stage": f"提取文本 {i+1}/{len(doc)}", current=i+1, total=len(doc)})
            full_text = "\n\n".join(text_parts)
            if fmt == "json":
                data = {"pages": [{"index": i, "text": p} for i, p in enumerate(text_parts)]}
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            else:
                with open(out_path, "w", encoding="utf-8") as f:
                    f.write(full_text)

        elif mode == "tables":
            import pdfplumber
            tables = []
            with pdfplumber.open(pdf_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    for tbl in page.extract_tables():
                        tables.append(tbl)
                    _send({"type": "progress", "percent": int(10 + (i+1)/len(pdf.pages)*80),
                           "stage": f"提取表格 {i+1}", current=i+1, total=len(pdf.pages)})

            if fmt == "json":
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(tables, f, ensure_ascii=False, indent=2)
            else:
                with open(out_path, "w", encoding="utf-8", newline="") as f:
                    w = csv.writer(f)
                    for tbl in tables:
                        for row in tbl:
                            w.writerow(row or [""])
                        w.writerow([])

        doc.close()
        _send({"type": "result", "outputFiles": [out_path]})

    except Exception as e:
        import traceback
        _send({"type": "error", "message": f"失败: {e}\n{traceback.format_exc()}"})

if __name__ == "__main__":
    main()
