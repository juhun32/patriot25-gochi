package route

import (
	"net/http"

	"github.com/juhun32/patriot25-gochi/go/api"
	"github.com/juhun32/patriot25-gochi/go/handlers"
	"github.com/juhun32/patriot25-gochi/go/middleware"
)

func NewRouter(authHandler *api.AuthHandler, todosHandler *handlers.TodosHandler, userHandler *handlers.UserHandler, jwtSecret string) http.Handler {
	mux := http.NewServeMux()

	// Auth routes
	mux.HandleFunc("/auth/google/login", authHandler.GoogleLogin)
	mux.HandleFunc("/auth/google/callback", authHandler.GoogleCallback)

	// Protected routes
	todosMux := http.NewServeMux()
	todosMux.HandleFunc("/api/todos", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			todosHandler.ListTodos(w, r)
		case http.MethodPost:
			todosHandler.CreateTodo(w, r)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})

	protected := middleware.AuthMiddleware(jwtSecret, todosMux)
	mux.Handle("/api/todos", protected)

	mux.Handle("/user", middleware.AuthMiddleware(jwtSecret, http.HandlerFunc(userHandler.GetUser)))

	// apply CORS middleware for a specific origin and return wrapped mux
	return middleware.CORS("http://localhost:3000")(mux)
}
