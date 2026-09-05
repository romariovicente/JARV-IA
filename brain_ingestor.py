import os
import datetime
import glob
import json

RAW_DIR = "IA/Raw_Inputs"
NOTES_DIR = "IA/Segundo_Cérebro/Notes"
INDEX_PATH = "IA/Segundo_Cérebro/brain-index.json"

def process_notes():
    os.makedirs(NOTES_DIR, exist_ok=True)
    
    if not os.path.exists(RAW_DIR):
        print(f"Diretório de entrada {RAW_DIR} não encontrado.")
        return

    raw_files = glob.glob(os.path.join(RAW_DIR, "*.md")) + glob.glob(os.path.join(RAW_DIR, "*.txt"))
    
    if not raw_files:
        print("Nenhum arquivo novo para processar.")
        return

    notes_registry = []

    for filepath in raw_files:
        filename = os.path.basename(filepath)
        name_without_ext = os.path.splitext(filename)[0]
        
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        today = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        title = name_without_ext.replace('-', ' ').title()
        theme = "Segundo Cérebro / Automação"
        keywords = ["jarvis", "automacao", "indexacao"]
        
        frontmatter = f"""---
title: "{title}"
date: "{today}"
theme: "{theme}"
keywords: {keywords}
---

"""
        processed_content = frontmatter + "# Sumário Executivo\n\n" + content.strip() + "\n\n---\n*Nota indexada automaticamente pelo J.A.R.V.I.S. Brain Ingestor*"

        output_filename = f"{name_without_ext}.md"
        output_path = os.path.join(NOTES_DIR, output_filename)
        
        with open(output_path, "w", encoding="utf-8") as out_f:
            out_f.write(processed_content)
            
        # Adiciona ao registro para o índice JSON
        notes_registry.path = output_path
        notes_registry.append({
            "title": title,
            "filename": output_filename,
            "date": today,
            "theme": theme,
            "snippet": content[:150] + "..."
        })
        
        print(f"Processado com sucesso: {filename} -> {output_path}")

    # Salva o arquivo de índice consolidado para o Front-End
    existing_index = []
    if os.path.exists(INDEX_PATH):
        try:
            with open(INDEX_PATH, "r", encoding="utf-8") as idx_f:
                existing_index = json.load(idx_f)
        except:
            pass
            
    # Mescla evitando duplicadas por filename
    existing_filenames = {item["filename"] for item in existing_index}
    for note in notes_registry:
        if note["filename"] not in existing_filenames:
            existing_index.append(note)

    with open(INDEX_PATH, "w", encoding="utf-8") as idx_f:
        json.dump(existing_index, idx_f, ensure_ascii=False, indent=4)
        
    print(f"Índice do Segundo Cérebro atualizado: {INDEX_PATH}")

if __name__ == "__main__":
    process_notes()
