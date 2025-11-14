package route

import (
	"net/http"

	"github.com/juhun32/patriot25-gochi/go/api"
)

func NewRouter(authHandler *api.AuthHandler) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/auth/google/login", authHandler.GoogleLogin)
	mux.HandleFunc("/auth/google/callback", authHandler.GoogleCallback)

	// You can add other routes (todos, chat) later

	return mux
}
