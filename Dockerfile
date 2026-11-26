# ---- Stage 1: PHP dependencies (vendor/ is needed by tsc for ziggy-js types) ----
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --ignore-platform-reqs
COPY . .
RUN composer dump-autoload --optimize --no-dev --ignore-platform-reqs

# ---- Stage 2: build the React/Vite frontend ----
FROM node:22-alpine AS assets
WORKDIR /app
COPY . .
COPY --from=vendor /app/vendor ./vendor
RUN npm ci --legacy-peer-deps && npm run build

# ---- Stage 3: runtime ----
FROM php:8.3-cli
COPY --from=ghcr.io/mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions pdo_mysql pdo_sqlite zip intl bcmath
WORKDIR /var/www/html
COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY --from=assets /app/public/build ./public/build
RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache database \
 && chmod -R 777 storage bootstrap/cache database
COPY docker-start.sh /usr/local/bin/docker-start.sh
RUN chmod +x /usr/local/bin/docker-start.sh
EXPOSE 10000
CMD ["docker-start.sh"]
