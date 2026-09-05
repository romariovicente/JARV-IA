import os
import glob
from datetime import datetime

# Diretórios de trabalho do ecossistema
RAW_INPUT_DIR = "IA/Raw_Inputs/"
BRAIN_STORAGE_DIR = "IA/Segundo_Cérebro/Notes/"

def ensure_directories():
    os.makedirs(RAW_INPUT_DIR, exist_ok=True)
    os.makedirs(BRAIN_STORAGE_DIR, exist_ok=True)

def process_raw_files():
    ensure_directories()
    search_path = os.path.join(RAW_INPUT_DIR, "*.*")
    files = glob.glob(search_path)
    
    if not files:
        print("[JARV-CORE] Nenhum arquivo novo encontrado na fila de entrada.")
        return

    print(f"[JARV-CORE] Processando {len(files)} novo(s) item(ns) para o Segundo Cérebro...")

    for file_path in files:
        filename = os.path.basename(file_path)
        name_without_ext, ext = os.path.splitext(filename)
        
        # Leitura do conteúdo (compatível com textos/markdown)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            print(f"⚠️ Erro ao ler o arquivo {filename}: {e}")
            continue

        # Geração de metadados automáticos
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        word_count = len(content.split())
        
        # Estruturação da nota processada (Formato Markdown rico para indexação)
        structured_note = f"""---
title: "{name_without_ext}"
date_ingested: "{timestamp}"
source_format: "{ext}"
words: {word_count}
status: "Indexed"
---

# Nota Indexada: {name_without_ext}

> **Metadados do Ingestor Automático**
> * **Data de Ingestão:** {timestamp}
> * **Origem:** Pipeline Python / Ingestão Contínua

## Conteúdo Bruto / Resumo Analítico
{content}
"""

        output_filename = f"{name_without_ext}.md"
        output_path = os.path.join(BRAIN_STORAGE_DIR, output_filename)

        with open(output_path, "w", encoding="utf-8") as out_f:
            out_f.write(structured_note)

        print(f"✅ Processado e salvo com sucesso: {output_filename}")
        
        # Opcional: remover arquivo bruto após o processamento bem-sucedido
        # os.remove(file_path)

if __name__ == "__main__":
    process_raw_files()
