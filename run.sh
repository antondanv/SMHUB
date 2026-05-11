#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Запуск инфраструктуры SMHUB...${NC}"

# 1. Запуск базы данных через Docker
if command -v docker-compose &> /dev/null; then
    echo -e "${BLUE}Запуск базы данных...${NC}"
    docker-compose up -d
else
    echo -e "${GREEN}Docker-compose не найден, пропускаю запуск БД (убедитесь, что она запущена вручную).${NC}"
fi

# 2. Запуск бэкенда в фоновом режиме
echo -e "${BLUE}Запуск бэкенда (FastAPI) на порту 8000...${NC}"
cd backend
source ../.venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# 3. Запуск фронтенда в фоновом режиме
echo -e "${BLUE}Запуск фронтенда (Vite) на порту 5173...${NC}"
cd frontend
npm run dev -- --port 5173 &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}Все сервисы запускаются!${NC}"
echo -e "${GREEN}Бэкенд: http://localhost:8000${NC}"
echo -e "${GREEN}Фронтенд: http://localhost:5173${NC}"
echo -e "${BLUE}Нажмите Ctrl+C, чтобы остановить все серверы.${NC}"

# Функция для остановки фоновых процессов при выходе
cleanup() {
    echo -e "\n${BLUE}Остановка серверов...${NC}"
    kill \$BACKEND_PID \$FRONTEND_PID
    exit
}

trap cleanup SIGINT

# Ожидание завершения процессов
wait
