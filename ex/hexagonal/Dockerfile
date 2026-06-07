# ---------- build stage: compile a runnable fat jar ----------
FROM gradle:8.14-jdk21 AS build
WORKDIR /home/gradle/src
COPY --chown=gradle:gradle . .
# shadowJar (provided by the Micronaut application plugin) -> build/libs/*-all.jar
RUN gradle --no-daemon clean shadowJar -x test

# ---------- run stage: slim JRE, non-root ----------
FROM eclipse-temurin:21-jre
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -r -u 10001 appuser
WORKDIR /app
COPY --from=build /home/gradle/src/build/libs/*-all.jar /app/app.jar
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=12 \
  CMD curl -fsS http://localhost:8080/health || exit 1
ENTRYPOINT ["sh", "-c", "exec java ${JAVA_OPTS} -jar /app/app.jar"]
