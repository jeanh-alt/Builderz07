@echo off
chdir ..
echo Starting local server for NLP component...
echo.
echo Once server starts, open: http://localhost:8000/nlp_component/
echo.
python -m http.server 8000 --directory .
