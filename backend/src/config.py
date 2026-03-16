from pydantic import BaseSettings

class Settings(BaseSettings):
    app_name: str
    admin_email: str
    app_env: str = 'development'
    debug: bool = True

    class Config:
        env_file = '.env'

settings = Settings()