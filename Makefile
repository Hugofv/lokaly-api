.PHONY: help up down logs build restart clean install dev

help: ## Mostra esta mensagem de ajuda
	@echo "Comandos disponíveis:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

up: ## Inicia todos os serviços
	cd docker && docker-compose up -d

down: ## Para todos os serviços
	cd docker && docker-compose down

logs: ## Mostra logs de todos os serviços
	cd docker && docker-compose logs -f

build: ## Constrói as imagens
	cd docker && docker-compose build

restart: ## Reinicia todos os serviços
	cd docker && docker-compose restart

clean: ## Para e remove volumes (limpa dados)
	cd docker && docker-compose down -v

install: ## Instala dependências dentro dos containers
	cd docker && docker-compose exec public-api bun install
	cd docker && docker-compose exec admin-api bun install
	cd docker && docker-compose exec worker bun install

dev: ## Inicia em modo desenvolvimento com hot reload
	cd docker && docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

ps: ## Mostra status dos containers
	cd docker && docker-compose ps

shell-public: ## Abre shell no container da public-api
	cd docker && docker-compose exec public-api sh

shell-admin: ## Abre shell no container da admin-api
	cd docker && docker-compose exec admin-api sh

shell-worker: ## Abre shell no container do worker
	cd docker && docker-compose exec worker sh

shell-postgres: ## Abre shell no PostgreSQL
	cd docker && docker-compose exec postgres psql -U lokaly -d lokaly

shell-redis: ## Abre shell no Redis
	cd docker && docker-compose exec redis redis-cli

