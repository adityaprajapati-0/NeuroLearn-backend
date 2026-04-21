
FROM nikolaik/python-nodejs:python3.11-nodejs20

# Install system dependencies (GCC, G++, Java)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    default-jdk \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy tutor service requirements and install
COPY tutor_service/requirements.txt ./tutor_service/
RUN pip install -r tutor_service/requirements.txt

# Copy all backend code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV TUTOR_SERVICE_URL=http://localhost:5001

# Start script
COPY start.sh .
RUN dos2unix start.sh
RUN chmod +x start.sh

CMD ["./start.sh"]
