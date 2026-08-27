name: JARV Auto-Heal Agent  
  
on:  
  workflow_run:  
    workflows: ["Pages build and deployment"]  
    types:  
      - completed  
  
jobs:  
  healing-bot:  
    runs-on: ubuntu-latest  
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}  
    steps:  
      - name: 1. Clonar Repositório  
        uses: actions/checkout@v4  
  
      - name: 2. Configurar Node.js  
        uses: actions/setup-node@v4  
        with:  
          node-version: '20'  
  
      - name: 3. Executar Script de Diagnóstico e Correção via IA  
        env:  
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}  
        run: |  
          node scripts/jarv-heal.js  
  
      - name: 4. Enviar Correção Automática (Commit & Push)  
        uses: stefanzweifel/git-auto-commit-action@v5  
        with:  
          commit_message: "[JARV-BOT] Auto-correção de erro detectada no build"  
          branch: main
