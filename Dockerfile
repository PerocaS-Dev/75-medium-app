# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:24-alpine AS frontend
WORKDIR /workspace
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
# vite outDir is ../backend/src/main/resources/static — create it before build
RUN mkdir -p ./backend/src/main/resources/static
RUN cd frontend && npm run build

# ── Stage 2: Build Spring Boot fat JAR ────────────────────────────────────────
FROM eclipse-temurin:21-jdk AS jar
WORKDIR /workspace
COPY backend/.mvn ./backend/.mvn
COPY backend/mvnw ./backend/
COPY backend/pom.xml ./backend/
RUN chmod +x ./backend/mvnw && cd backend && ./mvnw dependency:go-offline -q
COPY backend/src ./backend/src
# Overlay the built frontend into Spring's static resources
COPY --from=frontend /workspace/backend/src/main/resources/static \
     ./backend/src/main/resources/static
RUN cd backend && ./mvnw package -DskipTests -q

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=jar /workspace/backend/target/app-0.0.1-SNAPSHOT.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
