# ---------- build stage: static binary ----------
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# ---------- run stage: slim, non-root ----------
FROM alpine:3.22
RUN apk add --no-cache curl && adduser -D -u 10001 appuser
WORKDIR /app
COPY --from=build /out/server /app/server
USER appuser
ENV PORT=8091
EXPOSE 8091
HEALTHCHECK --interval=10s --timeout=3s --retries=12 \
  CMD curl -fsS http://localhost:8091/health || exit 1
ENTRYPOINT ["/app/server"]
