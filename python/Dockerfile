FROM python:3.11-slim

WORKDIR /app

# Create non-root user
RUN adduser --system --no-create-home appuser

# Install dependencies in a venv to avoid root pip warning
RUN python -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Switch to non-root user
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
