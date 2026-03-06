from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Ollama
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    ollama_timeout: int = 60

    # RabbitMQ
    rabbitmq_url: str = "amqp://diggai:changeme@localhost:5672/"
    rabbitmq_prefetch: int = 5

    # PostgreSQL (für Direkt-Updates aus Python)
    database_url: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Security
    agent_core_secret: str = "change_this_in_production"

    # App
    environment: str = "development"
    log_level: str = "INFO"
    port: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
