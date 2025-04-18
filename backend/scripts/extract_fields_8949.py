# FILE: scripts/debug_pdf_fields.py

import os
from pypdf import PdfReader

def list_pdf_form_fields(pdf_path: str):
    reader = PdfReader(pdf_path)
    fields = reader.get_fields()
    
    if not fields:
        print("⚠️ No form fields found in the PDF.")
        return

    print(f"🔍 Found {len(fields)} fields:\n")
    for name, field in fields.items():
        print(f"- {name}: {field.get('/FT')}")

if __name__ == "__main__":
    # Adjust path relative to this script’s location
    base_dir = os.path.dirname(__file__)
    template_path = os.path.join(base_dir, "../assets/irs_templates/Form_8949_Fillable_2024.pdf")
    list_pdf_form_fields(template_path)
