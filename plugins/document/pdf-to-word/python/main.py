#!/usr/bin/env python3
"""PDF -> DOCX conversion"""

import sys
import os
import json
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
        if not os.path.isfile(pdf_path):
            _send({"type": "error", "message": f"文件不存在: {pdf_path}"})
            return

        try:
            from pdf2docx import Converter
        except ImportError:
            _send({"type": "error", "message": "缺少 pdf2docx 库，请 pip install pdf2docx"})
            return

        output_dir = options.get("output_dir") or os.path.dirname(pdf_path)
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"{Path(pdf_path).stem}.docx")

        _send({"type": "progress", "percent": 10, "stage": "正在解析 PDF..."})

        cv = Converter(pdf_path)
        try:
            cv.convert(output_path, start=0, end=None)
        finally:
            cv.close()

        _send({"type": "progress", "percent": 95, "stage": "正在保存..."})
        _send({"type": "result", "outputFiles": [output_path], "stats": {"pages": "n/a"}})

    except Exception as e:
        import traceback
        _send({"type": "error", "message": f"转换失败: {e}\n{traceback.format_exc()}"})

if __name__ == "__main__":
    main()
