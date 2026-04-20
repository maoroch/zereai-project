# Базовый Node.js образ
FROM node:18

# Рабочая директория
WORKDIR /app/back-end

# Копируем package.json и package-lock.json из back-end
COPY back-end/package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь код back-end
COPY back-end/. .


# Копируем фронтенд в ../front-end, чтобы path в Express совпадал
COPY front-end ../front-end

# Переменные окружения и порт
EXPOSE 8080
# Запуск сервера
CMD ["node", "server.js"]