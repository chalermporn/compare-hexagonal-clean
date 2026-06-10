package web

import (
	"embed"
	_ "embed"
	"io/fs"
	"net/http"
)

// The spec is hand-authored (Go has no annotation processor like
// micronaut-openapi) and embedded in the binary — no CDN, works offline.
//
//go:embed openapi.yml
var openAPISpec []byte

//go:embed docs.html
var docsPage []byte

// Swagger UI assets are vendored (swagger-ui-dist 5.32.6) and embedded too —
// same self-hosted approach as the Kotlin version's bundled doc UIs.
//
//go:embed swagger-ui
var swaggerUIFS embed.FS

func swaggerUIHandler() http.Handler {
	sub, err := fs.Sub(swaggerUIFS, "swagger-ui")
	if err != nil {
		panic(err) // embedded path is fixed at compile time
	}
	return http.StripPrefix("/swagger-ui/", http.FileServerFS(sub))
}

func serveOpenAPISpec(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/yaml")
	_, _ = w.Write(openAPISpec)
}

func serveDocsPage(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(docsPage)
}
