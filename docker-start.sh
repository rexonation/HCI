#!/bin/sh
set -e
cd /var/www/html

# SQLite fallback: file lives inside the container (resets on redeploy — fine for a demo)
if [ "$DB_CONNECTION" = "sqlite" ] || [ -z "$DB_CONNECTION" ]; then
  export DB_CONNECTION=sqlite
  export DB_DATABASE=/var/www/html/database/database.sqlite
  touch "$DB_DATABASE"
fi

php artisan storage:link --force || true
php artisan migrate --force --seed
php artisan config:cache
php artisan route:cache

exec php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"
