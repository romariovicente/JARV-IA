import os
import datetime
import glob

RAW_DIR = "IA/Raw_Inputs"
NOTES_DIR = "IA/Segundo_Cérebro/Notes"

def process_notes():
    # Garante que o diretório de destino existe
    os.makedirs(NOTES_DIR, exist_ok=True)
    
    if not os.path.exists(RAW_DIR):
        print(f"Diretório de entrada {RAW_DIR} não encontrado.")
        return

    # Busca arquivos Markdown (.md) e Texto (.txt) na pasta de entradas brutas
    raw_files = glob.glob(os.path.join(RAW_DIR, "*.md")) + glob.glob(os.path.join(RAW_DIR, "*.txt"))
    
    if not raw_files:
        print("Nenhum arquivo novo para processar.")
        return

    for filepath in raw_files:
        filename = os.path.basename(filepath)
        name_without_ext = os.path.splitext(filename)[0]
        
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Metadados gerados automaticamente
        today = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        title = name_without_ext.replace('-', ' ').title()
        theme = "Segundo Cérebro / Automação"
        keywords = ["jarvis", "automacao", "indexacao"]
        
        # Constrói o Frontmatter (metadados estruturados) + Conteúdo formatado
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
        
        # Salva a nota processada na pasta do Segundo Cérebro
        with open(output_path, "w", encoding="utf-8") as out_f:
            out_f.write(processed_content)
            
        print(f"Processado com sucesso: {filename} -> {output_path}")
        
        # Opcional: Remove o arquivo bruto original após o processamento bem-sucedido
        # os.remove(filepath)

if __name__ == "__main__":
    process_notes()
